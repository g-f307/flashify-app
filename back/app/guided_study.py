from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Sequence, TypeVar

from fastapi import HTTPException
from sqlmodel import Session

from . import models, schemas
from .ai_generator import generate_guided_study_topics
from .study_ordering import order_for_start

T = TypeVar("T")

_PEDAGOGICAL_STAGE_NAMES = [
    "Fundamentos",
    "Conceitos centrais",
    "Desenvolvimento",
    "Aprofundamento",
    "Aplicações",
    "Consolidação",
]


def _truncate_topic_title(text: str, fallback: str) -> str:
    cleaned = " ".join((text or "").split()).strip()
    if not cleaned:
        return fallback
    return cleaned if len(cleaned) <= 48 else f"{cleaned[:45].rstrip()}..."


def _distribute_evenly(items: Sequence[T], bucket_count: int) -> list[list[T]]:
    if bucket_count <= 0:
        return []

    buckets: list[list[T]] = [[] for _ in range(bucket_count)]
    for index, item in enumerate(items):
        buckets[index % bucket_count].append(item)
    return buckets


def _build_guided_steps(
    flashcards: Sequence[models.Flashcard],
    questions: Sequence[models.Question],
) -> list[schemas.GuidedStudyStep]:
    steps: list[schemas.GuidedStudyStep] = []
    step_order = 1

    for flashcard in flashcards:
        steps.append(
            schemas.GuidedStudyStep(
                id=f"step-fc-{flashcard.id}",
                type="flashcard",
                order=step_order,
                flashcard_id=flashcard.id,
                front=flashcard.front,
                back=flashcard.back,
            )
        )
        step_order += 1

    for question in questions:
        steps.append(
            schemas.GuidedStudyStep(
                id=f"step-q-{question.id}",
                type="question",
                order=step_order,
                question_id=question.id,
                prompt=question.text,
                answers=[
                    schemas.Answer.model_validate(answer, from_attributes=True)
                    for answer in (question.answers or [])
                ],
            )
        )
        step_order += 1

    return steps


def _pedagogical_title(topic_index: int, topic_count: int) -> str:
    if topic_count == 1:
        return "Conteúdo completo"
    if topic_count == 2:
        return ["Introdução", "Consolidação"][topic_index]
    if topic_count == 3:
        return ["Fundamentos", "Desenvolvimento", "Consolidação"][topic_index]
    if topic_index == 0:
        return "Fundamentos"
    if topic_index == topic_count - 1:
        return "Consolidação"
    mid_labels = _PEDAGOGICAL_STAGE_NAMES[1:-1]
    return mid_labels[(topic_index - 1) % len(mid_labels)]


def _build_guided_topics_from_even_distribution(
    ordered_flashcards: Sequence[models.Flashcard],
    ordered_questions: Sequence[models.Question],
) -> list[schemas.GuidedStudyTopic]:
    fc_count = len(ordered_flashcards)
    q_count = len(ordered_questions)

    flashcards_per_topic = 3
    ideal_by_flashcards = max(1, (fc_count + flashcards_per_topic - 1) // flashcards_per_topic)
    topic_count = max(1, min(ideal_by_flashcards, q_count))

    flashcard_buckets = _distribute_evenly(ordered_flashcards, topic_count)
    question_buckets = _distribute_evenly(ordered_questions, topic_count)

    topics: list[schemas.GuidedStudyTopic] = []

    for topic_index in range(topic_count):
        topic_flashcards = flashcard_buckets[topic_index]
        topic_questions = question_buckets[topic_index]
        steps = _build_guided_steps(topic_flashcards, topic_questions)

        topics.append(
            schemas.GuidedStudyTopic(
                id=f"topic-{topic_index + 1}",
                title=_pedagogical_title(topic_index, topic_count),
                order=topic_index + 1,
                steps=steps,
            )
        )

    return topics


def guided_study_requires_ai_generation(db_document: models.Document) -> bool:
    if not db_document.guided_study_cache:
        return True

    try:
        cached = schemas.GuidedStudyResponse.model_validate(db_document.guided_study_cache)
        if not cached.summary.is_fallback:
            return False

        raw_cache = db_document.guided_study_cache or {}
        retry_not_before = raw_cache.get("_fallback_retry_not_before")
        if isinstance(retry_not_before, str):
            try:
                retry_not_before_dt = datetime.fromisoformat(retry_not_before)
                if retry_not_before_dt.tzinfo is None:
                    retry_not_before_dt = retry_not_before_dt.replace(tzinfo=timezone.utc)
                if datetime.now(timezone.utc) < retry_not_before_dt:
                    return False
            except ValueError:
                pass

        return True
    except Exception:
        return True


def build_guided_study_response(
    db_document: models.Document,
    session: Session,
) -> schemas.GuidedStudyResponse:
    if db_document.guided_study_cache:
        try:
            cached = schemas.GuidedStudyResponse.model_validate(db_document.guided_study_cache)
            if not cached.summary.is_fallback:
                return cached

            raw_cache = db_document.guided_study_cache or {}
            retry_not_before = raw_cache.get("_fallback_retry_not_before")
            if isinstance(retry_not_before, str):
                try:
                    retry_not_before_dt = datetime.fromisoformat(retry_not_before)
                    if retry_not_before_dt.tzinfo is None:
                        retry_not_before_dt = retry_not_before_dt.replace(tzinfo=timezone.utc)
                    if datetime.now(timezone.utc) < retry_not_before_dt:
                        return cached
                except ValueError:
                    pass
        except Exception:
            pass

    ordered_flashcards = order_for_start(list(db_document.flashcards or []))
    ordered_questions = order_for_start(list(db_document.quiz.questions or [])) if db_document.quiz else []

    if not ordered_flashcards or not ordered_questions:
        raise HTTPException(
            status_code=400,
            detail="O estudo guiado precisa de flashcards e quiz gerados neste deck.",
        )

    flashcards_by_id = {flashcard.id: flashcard for flashcard in ordered_flashcards}
    questions_by_id = {question.id: question for question in ordered_questions}

    guided_topics_data = generate_guided_study_topics(
        text=db_document.extracted_text or db_document.file_path,
        flashcards=[
            {"id": flashcard.id, "front": flashcard.front, "back": flashcard.back}
            for flashcard in ordered_flashcards
        ],
        questions=[
            {"id": question.id, "text": question.text}
            for question in ordered_questions
        ],
    )

    topics: list[schemas.GuidedStudyTopic] = []

    if guided_topics_data:
        used_flashcard_ids: set[int] = set()
        used_question_ids: set[int] = set()

        for topic_index, raw_topic in enumerate(guided_topics_data.get("topics", []), start=1):
            raw_flashcard_ids = raw_topic.get("flashcard_ids", [])
            raw_question_ids = raw_topic.get("question_ids", [])

            topic_flashcards = []
            for flashcard_id in raw_flashcard_ids:
                if (
                    isinstance(flashcard_id, int)
                    and flashcard_id in flashcards_by_id
                    and flashcard_id not in used_flashcard_ids
                ):
                    topic_flashcards.append(flashcards_by_id[flashcard_id])
                    used_flashcard_ids.add(flashcard_id)

            topic_questions = []
            for question_id in raw_question_ids:
                if (
                    isinstance(question_id, int)
                    and question_id in questions_by_id
                    and question_id not in used_question_ids
                ):
                    topic_questions.append(questions_by_id[question_id])
                    used_question_ids.add(question_id)

            if not topic_flashcards and not topic_questions:
                continue

            if topic_flashcards and not topic_questions:
                for flashcard in topic_flashcards:
                    used_flashcard_ids.discard(flashcard.id)
                continue

            if not topic_flashcards and topic_questions:
                for question in topic_questions:
                    used_question_ids.discard(question.id)
                continue

            topic_title = _truncate_topic_title(
                raw_topic.get("title", ""),
                f"Tópico {topic_index}",
            )

            topics.append(
                schemas.GuidedStudyTopic(
                    id=f"topic-{len(topics) + 1}",
                    title=topic_title,
                    order=len(topics) + 1,
                    steps=_build_guided_steps(topic_flashcards, topic_questions),
                )
            )

        remaining_flashcards = [
            flashcard for flashcard in ordered_flashcards if flashcard.id not in used_flashcard_ids
        ]
        remaining_questions = [
            question for question in ordered_questions if question.id not in used_question_ids
        ]

        if remaining_flashcards or remaining_questions:
            fallback_topics = (
                _build_guided_topics_from_even_distribution(
                    remaining_flashcards or [],
                    remaining_questions or [],
                )
                if remaining_flashcards and remaining_questions
                else []
            )

            if fallback_topics:
                for fallback_topic in fallback_topics:
                    topics.append(
                        schemas.GuidedStudyTopic(
                            id=f"topic-{len(topics) + 1}",
                            title=_truncate_topic_title(
                                fallback_topic.title,
                                f"Tópico {len(topics) + 1}",
                            ),
                            order=len(topics) + 1,
                            steps=fallback_topic.steps,
                        )
                    )
            elif topics:
                extra_steps = _build_guided_steps(remaining_flashcards, remaining_questions)
                if extra_steps:
                    last_topic = topics[-1]
                    merged_steps = []
                    for index, step in enumerate(last_topic.steps + extra_steps, start=1):
                        merged_steps.append(step.model_copy(update={"order": index}))
                    topics[-1] = last_topic.model_copy(update={"steps": merged_steps})

    is_fallback = not topics
    if is_fallback:
        topics = _build_guided_topics_from_even_distribution(ordered_flashcards, ordered_questions)

    total_steps = sum(len(topic.steps) for topic in topics)

    response = schemas.GuidedStudyResponse(
        document_id=db_document.id,
        title=db_document.title or db_document.file_path,
        topics=topics,
        summary=schemas.GuidedStudySummary(
            topics_count=len(topics),
            steps_count=total_steps,
            flashcards_count=len(ordered_flashcards),
            questions_count=len(ordered_questions),
            is_fallback=is_fallback,
        ),
    )

    cache_payload = response.model_dump()
    if is_fallback:
        cache_payload["_fallback_retry_not_before"] = (
            datetime.now(timezone.utc) + timedelta(seconds=20)
        ).isoformat()

    db_document.guided_study_cache = cache_payload
    session.add(db_document)
    session.commit()

    return response
