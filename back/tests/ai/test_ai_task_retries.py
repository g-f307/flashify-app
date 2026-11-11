"""Verify the real Celery autoretry wrapper without broker, DB or providers."""
import contextlib
import io
import unittest
from types import SimpleNamespace
from unittest.mock import Mock, patch

from celery.exceptions import Retry

from app import ai_generator as domain, models, tasks
from app.ai.errors import (
    AIAuthenticationError, AIConfigurationError, AIInvalidResponseError,
    AIRateLimitError, AITimeoutError, AIProviderUnavailableError,
)


class TaskRetryTests(unittest.TestCase):
    def test_only_transient_ai_errors_are_retried_and_status_matches(self):
        for content_type in ("flashcards", "quiz", "both"):
            for error_cls, retryable in (
                (AIAuthenticationError, False), (AIConfigurationError, False),
                (AIInvalidResponseError, False), (AIRateLimitError, True),
                (AITimeoutError, True), (AIProviderUnavailableError, True),
                (ValueError, False), (RuntimeError, False),
            ):
                with self.subTest(content_type=content_type, error=error_cls.__name__), contextlib.ExitStack() as stack:
                    doc = SimpleNamespace(id=1, user_id=2, extracted_text="Test", study_language=None,
                                          status=models.DocumentStatus.PROCESSING)
                    session = Mock()
                    stack.enter_context(patch.object(tasks, "Session")).return_value.__enter__.return_value = session
                    stack.enter_context(patch.object(tasks.crud, "get_document", return_value=doc))
                    stack.enter_context(patch.object(tasks, "track_product_event"))
                    increment = stack.enter_context(patch.object(tasks.crud, "increment_user_generation_count"))
                    retry = stack.enter_context(patch.object(tasks.process_document, "retry", side_effect=Retry()))
                    stack.enter_context(patch.object(tasks, "generate_flashcards_from_text", side_effect=error_cls("sanitized")))
                    # Quiz uses the real domain function: its exception must reach Celery intact.
                    provider = Mock()
                    provider.generate.side_effect = error_cls("sanitized")
                    stack.enter_context(patch.object(domain, "get_ai_provider", return_value=provider))
                    stack.enter_context(contextlib.redirect_stdout(io.StringIO()))
                    tasks.process_document.push_request(retries=0)
                    try:
                        expected = error_cls
                        with self.assertRaises(Retry if retryable else expected):
                            tasks.process_document.run(1, content_type, 1, "Médio", 1)
                    finally:
                        tasks.process_document.pop_request()
                    self.assertEqual(retry.call_count, int(retryable))
                    self.assertEqual(doc.status, models.DocumentStatus.PROCESSING if retryable else models.DocumentStatus.FAILED)
                    increment.assert_not_called()

    def test_retry_exhaustion_marks_failed(self):
        task = tasks.process_document
        self.assertEqual(task.max_retries, 3)
        self.assertEqual(task.retry_backoff, 60)
        self.assertEqual(task.retry_backoff_max, 600)
        self.assertTrue(task.retry_jitter)
        doc = SimpleNamespace(id=1, user_id=2, extracted_text="Test", study_language=None,
                              status=models.DocumentStatus.PROCESSING)
        with (patch.object(tasks, "Session"),
              patch.object(tasks.crud, "get_document", return_value=doc),
              patch.object(tasks, "track_product_event"),
              patch.object(tasks, "generate_flashcards_from_text", side_effect=AITimeoutError("timeout")),
              patch.object(task, "retry", side_effect=Retry()),
              contextlib.redirect_stdout(io.StringIO())):
            task.push_request(retries=3)
            try:
                with self.assertRaises(Retry):
                    task.run(1, "flashcards", 1, "Médio", 1)
            finally:
                task.pop_request()
        self.assertEqual(doc.status, models.DocumentStatus.FAILED)
        self.assertIn("4 tentativa(s)", doc.current_step)

    def test_real_celery_wrapper_stops_after_three_retries(self):
        doc = SimpleNamespace(id=1, user_id=2, extracted_text="Test", study_language=None,
                              status=models.DocumentStatus.PROCESSING)
        with (patch.object(tasks, "Session"),
              patch.object(tasks.crud, "get_document", return_value=doc),
              patch.object(tasks, "track_product_event"),
              patch.object(tasks, "generate_flashcards_from_text", side_effect=AITimeoutError("timeout")) as generate,
              contextlib.redirect_stdout(io.StringIO())):
            result = tasks.process_document.apply(args=(1, "flashcards", 1, "Médio", 1), throw=False)
        self.assertEqual(result.state, "FAILURE")
        self.assertEqual(generate.call_count, 4)
        self.assertEqual(doc.status, models.DocumentStatus.FAILED)

    def test_quiz_repair_and_guided_study_propagate_normalized_errors(self):
        provider = Mock()
        provider.name = "gemini"
        for error_cls in (AIAuthenticationError, AIConfigurationError, AIInvalidResponseError,
                          AIRateLimitError, AITimeoutError, AIProviderUnavailableError):
            with self.subTest(error=error_cls.__name__), patch.object(domain, "get_ai_provider", return_value=provider):
                provider.generate.side_effect = error_cls("sanitized")
                with self.assertRaises(error_cls):
                    domain._repair_quiz_response("bad JSON", num_questions=1, study_language=None,
                                                 foreign_language_study_mode=False)
                with self.assertRaises(error_cls), contextlib.redirect_stdout(io.StringIO()):
                    domain.generate_guided_study_topics("Test", [{"id": 1, "front": "F", "back": "B"}], [{"id": 2, "text": "Q"}])
