"""Offline integration with real SQLModel persistence, Celery and FastAPI.

Only SQLite test metadata adapts PostgreSQL ARRAY and timezone result handling;
production types, connections, migrations and external services are not used.
"""
import contextlib
import io
import unittest
from datetime import timezone
from unittest.mock import patch

from fastapi import Depends
from fastapi.testclient import TestClient
from sqlalchemy import JSON, DateTime, TypeDecorator
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine, select

from app import ai_generator as domain, crud, guided_study, models, schemas, security, tasks
from app.database import get_session
from app.main import app
from app.routers import documents
from app.ai.errors import AIAuthenticationError, AIInvalidResponseError, AITimeoutError
from ai.fixtures import FakeProvider, card, question, guided_for_request


class SQLiteUTC(TypeDecorator):
    impl = DateTime
    cache_ok = True

    def process_result_value(self, value, dialect):
        return value.replace(tzinfo=timezone.utc) if value is not None else None


class StructuredIntegrationTests(unittest.TestCase):
    def setUp(self):
        self.array_column = models.Document.__table__.c.studied_flashcard_ids
        self.time_column = models.User.__table__.c.last_generation_reset
        self.original_array_type = self.array_column.type
        self.original_time_type = self.time_column.type
        self.array_column.type = self.original_array_type.with_variant(JSON(), "sqlite")
        self.time_column.type = self.original_time_type.with_variant(SQLiteUTC(), "sqlite")
        self.engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        tables = [m.__table__ for m in (models.User, models.Folder, models.Document, models.Flashcard,
                  models.Quiz, models.Question, models.Answer, models.FlashcardConversation, models.SharedDeck, models.GuidedStudySession, models.ProductEvent)]
        SQLModel.metadata.create_all(self.engine, tables=tables)
        self.addCleanup(self.cleanup)

    def cleanup(self):
        app.dependency_overrides.clear()
        self.engine.dispose()
        self.array_column.type = self.original_array_type
        self.time_column.type = self.original_time_type

    def seed(self):
        with Session(self.engine) as session:
            user = models.User(username="student", email="student@example.com", hashed_password="unused", is_team=True)
            session.add(user); session.commit(); session.refresh(user)
            doc = models.Document(file_path="fixture.txt", title="Energia", extracted_text="Energia e fotossíntese", user_id=user.id)
            session.add(doc); session.commit(); session.refresh(doc)
            return user.id, doc.id

    def run_task(self, doc_id, content_type, provider, *, throw=False):
        with (patch.object(tasks, "engine", self.engine),
              patch.object(domain, "get_ai_provider", return_value=provider),
              contextlib.redirect_stdout(io.StringIO())):
            return tasks.process_document.apply(args=(doc_id, content_type, 1, "Médio", 1), throw=throw)

    def test_tasks_persist_all_content_types_and_charge_once(self):
        for name in ("openai", "gemini"):
            for content_type in ("flashcards", "quiz", "both"):
                with self.subTest(name=name, content_type=content_type):
                    # Each combination receives a fresh database and identities.
                    user_id, doc_id = self.seed_unique()
                    outputs = []
                    if content_type in ("flashcards", "both"):
                        outputs.append({"flashcards": [card()]})
                    if content_type in ("quiz", "both"):
                        outputs.append({"title": "Energia", "questions": [question()]})
                    if content_type == "both":
                        outputs.append(guided_for_request)
                    provider = FakeProvider(name, *outputs)
                    with patch.object(crud, "shuffle_quiz_answers", wraps=crud.shuffle_quiz_answers) as shuffle:
                        result = self.run_task(doc_id, content_type, provider)
                    self.assertEqual(result.state, "SUCCESS", str(result.result))
                    self.assertEqual(shuffle.call_count, int(content_type != "flashcards"))
                    with Session(self.engine) as session:
                        doc = crud.get_document_with_details_for_update(session, doc_id)
                        self.assertEqual(doc.status, models.DocumentStatus.COMPLETED)
                        self.assertEqual(len(doc.flashcards), int(content_type != "quiz"))
                        self.assertEqual(len(doc.quiz.questions) if doc.quiz else 0, int(content_type != "flashcards"))
                        expected_units = 2 if content_type == "both" else 1
                        self.assertEqual(session.get(models.User, user_id).daily_generation_count, expected_units)
                        if content_type == "both":
                            cached = schemas.GuidedStudyResponse.model_validate(doc.guided_study_cache)
                            self.assertEqual(cached.document_id, doc_id)
                            self.assertFalse(cached.summary.is_fallback)
                            self.assertEqual(cached.topics[0].steps[0].front, card()["front"])
                            self.assertEqual(len(cached.topics[0].steps[1].answers), 5)
                            with patch.object(domain, "get_ai_provider", side_effect=AssertionError("cache should avoid AI")):
                                self.assertEqual(guided_study.build_guided_study_response(doc, session), cached)
                                self.assertEqual(documents._build_guided_study_response(doc, session), cached)
                    # Duplicate delivery of a completed task neither calls AI nor charges again.
                    self.assertEqual(self.run_task(doc_id, content_type, FakeProvider(name)).state, "SUCCESS")
                    with Session(self.engine) as session:
                        self.assertEqual(session.get(models.User, user_id).daily_generation_count, expected_units)

    def seed_unique(self):
        with Session(self.engine) as session:
            index = len(session.exec(select(models.User)).all()) + 1
            user = models.User(username=f"student{index}", email=f"student{index}@example.com", hashed_password="unused", is_team=True)
            session.add(user); session.commit(); session.refresh(user)
            doc = models.Document(file_path="fixture.txt", title="Energia", extracted_text="Energia e fotossíntese", user_id=user.id)
            session.add(doc); session.commit(); session.refresh(doc)
            return user.id, doc.id

    def test_guided_failure_rolls_back_content_before_retry_and_does_not_charge(self):
        for name in ("openai", "gemini"):
            with self.subTest(name=name):
                user_id, doc_id = self.seed_unique()
                outputs = []
                for _ in range(4):
                    outputs.extend([{"flashcards": [card()]}, {"title": "Energia", "questions": [question()]}, AITimeoutError("timeout")])
                provider = FakeProvider(name, *outputs)
                result = self.run_task(doc_id, "both", provider)
                self.assertEqual(result.state, "FAILURE")
                self.assertEqual(len(provider.requests), 12)
                with Session(self.engine) as session:
                    doc = crud.get_document_with_details_for_update(session, doc_id)
                    self.assertEqual(doc.status, models.DocumentStatus.FAILED)
                    self.assertEqual(doc.flashcards, [])
                    self.assertIsNone(doc.quiz)
                    self.assertIsNone(doc.guided_study_cache)
                    self.assertEqual(session.get(models.User, user_id).daily_generation_count, 0)

    def test_completion_event_failure_rolls_back_content_and_quota(self):
        user_id, doc_id = self.seed()
        provider = FakeProvider("openai", {"flashcards": [card()]})
        with patch.object(tasks, "track_product_event", side_effect=[RuntimeError("event unavailable"), None]):
            result = self.run_task(doc_id, "flashcards", provider)
        self.assertEqual(result.state, "FAILURE")
        with Session(self.engine) as session:
            doc = crud.get_document_with_details_for_update(session, doc_id)
            self.assertEqual(doc.status, models.DocumentStatus.FAILED)
            self.assertEqual(doc.flashcards, [])
            self.assertEqual(session.get(models.User, user_id).daily_generation_count, 0)

    def test_permanent_generation_failure_does_not_persist_or_charge(self):
        user_id, doc_id = self.seed()
        provider = FakeProvider("openai", {"flashcards": [card()]}, AIAuthenticationError("auth"))
        result = self.run_task(doc_id, "both", provider)
        self.assertEqual(result.state, "FAILURE")
        self.assertEqual(len(provider.requests), 2)
        with Session(self.engine) as session:
            doc = crud.get_document_with_details_for_update(session, doc_id)
            self.assertEqual(doc.flashcards, [])
            self.assertIsNone(doc.quiz)
            self.assertEqual(session.get(models.User, user_id).daily_generation_count, 0)

    def client(self, user_id):
        def session_dependency():
            with Session(self.engine) as session:
                yield session
        def user_dependency(session: Session = Depends(get_session)):
            return session.get(models.User, user_id)
        app.dependency_overrides[get_session] = session_dependency
        app.dependency_overrides[security.get_current_user] = user_dependency
        return TestClient(app)

    def test_http_generation_and_chat_keep_response_shapes(self):
        user_id, doc_id = self.seed()
        outputs = [{"flashcards": [card(f"Conceito {i}?") for i in range(10)]},
                   {"title": "Energia", "questions": [question(f"Pergunta {i}?") for i in range(10)]},
                   "**Explicação**",
                   {"flashcards": [card("Novo conceito A?"), card("Novo conceito B?")]},
                   {"title": "Mais energia", "questions": [question("Nova pergunta A?"), question("Nova pergunta B?")]},
                   guided_for_request, guided_for_request]
        provider = FakeProvider("openai", *outputs)
        with self.client(user_id) as client, patch.object(domain, "get_ai_provider", return_value=provider):
            result = client.post(f"/documents/{doc_id}/generate-flashcards")
            self.assertEqual(result.status_code, 201, result.text)
            self.assertEqual(len(result.json()), 10)
            fc_id = result.json()[0]["id"]
            result = client.post(f"/documents/{doc_id}/generate-quiz")
            self.assertEqual(result.status_code, 201, result.text)
            self.assertEqual(len(result.json()["questions"]), 10)
            result = client.post(f"/flashcards/{fc_id}/chat", json={"message": "Explique"})
            self.assertEqual(result.status_code, 200, result.text)
            self.assertEqual(result.json()["response"], "**Explicação**")
            self.assertIsInstance(result.json()["conversation_id"], int)
            history = client.get(f"/flashcards/{fc_id}/conversations")
            self.assertEqual(history.status_code, 200, history.text)
            self.assertEqual(history.json()[0]["assistant_response"], "**Explicação**")
            result = client.post(f"/documents/{doc_id}/add-flashcards", json={"num_flashcards": 2, "difficulty": "Médio"})
            self.assertEqual(result.status_code, 201, result.text)
            self.assertEqual(len(result.json()), 2)
            result = client.post(f"/documents/{doc_id}/add-questions", json={"num_questions": 2, "difficulty": "Médio"})
            self.assertEqual(result.status_code, 201, result.text)
            self.assertEqual(len(result.json()["questions"]), 12)
            with Session(self.engine) as session:
                doc = session.get(models.Document, doc_id)
                doc.status = models.DocumentStatus.COMPLETED
                session.add(doc); session.commit()
            result = client.get(f"/documents/{doc_id}/guided-study")
            self.assertEqual(result.status_code, 200, result.text)
            self.assertEqual(result.json()["summary"]["steps_count"], 24)
            self.assertEqual(client.get(f"/documents/{doc_id}/guided-study").status_code, 200)
            result = client.post(f"/documents/{doc_id}/guided-study/restructure")
            self.assertEqual(result.status_code, 200, result.text)
            self.assertEqual(result.json(), {"message": "Trilha reestruturada com sucesso."})
            self.assertEqual(client.get(f"/documents/{doc_id}/guided-study").json()["summary"]["steps_count"], 24)
        with Session(self.engine) as session:
            self.assertEqual(session.get(models.User, user_id).daily_generation_count, 6)

    def test_http_failure_is_generic_500_without_charge(self):
        user_id, doc_id = self.seed()
        provider = FakeProvider("openai", AIInvalidResponseError("sensitive-provider-detail"))
        with self.client(user_id) as client, patch.object(domain, "get_ai_provider", return_value=provider):
            result = client.post(f"/documents/{doc_id}/generate-quiz")
        self.assertEqual(result.status_code, 500)
        self.assertIn("detail", result.json())
        self.assertNotIn("sensitive-provider-detail", result.text)
        with Session(self.engine) as session:
            self.assertEqual(session.get(models.User, user_id).daily_generation_count, 0)

    def test_legacy_guided_builder_cold_cache_uses_the_same_structured_contract(self):
        user_id, doc_id = self.seed()
        result = self.run_task(doc_id, "both", FakeProvider("gemini", {"flashcards": [card()]},
                               {"title": "Energia", "questions": [question()]}, guided_for_request))
        self.assertEqual(result.state, "SUCCESS", str(result.result))
        with Session(self.engine) as session:
            doc = crud.get_document_with_details_for_update(session, doc_id)
            doc.guided_study_cache = None
            session.add(doc); session.commit()
            provider = FakeProvider("openai", guided_for_request)
            with patch.object(domain, "get_ai_provider", return_value=provider):
                response = documents._build_guided_study_response(doc, session)
            self.assertEqual(response.document_id, doc_id)
            self.assertFalse(response.summary.is_fallback)
            self.assertEqual(response.summary.steps_count, 2)
            self.assertEqual(len(provider.requests), 1)
            self.assertEqual(response.model_dump(), schemas.GuidedStudyResponse.model_validate(doc.guided_study_cache).model_dump())

    def test_shared_snapshot_preserves_guided_http_contract(self):
        from datetime import datetime
        user_id, doc_id = self.seed()
        result = self.run_task(doc_id, "both", FakeProvider("openai", {"flashcards": [card()]},
                               {"title": "Energia", "questions": [question()]}, guided_for_request))
        self.assertEqual(result.state, "SUCCESS", str(result.result))
        with Session(self.engine) as session:
            doc = crud.get_document_with_details_for_update(session, doc_id)
            shared = models.SharedDeck(owner_user_id=user_id, title="Energia", created_at=datetime.now(timezone.utc),
                        generates_flashcards=True, generates_quizzes=True, guided_study_snapshot=doc.guided_study_cache,
                        flashcards_snapshot=[card()], quiz_snapshot={"title": "Energia", "questions": [question()]})
            view = documents._build_shared_deck_response(shared)
            self.assertEqual(view.guided_study.summary.steps_count, 2)
            self.assertEqual(view.guided_study.topics[0].steps[0].front, card()["front"])
