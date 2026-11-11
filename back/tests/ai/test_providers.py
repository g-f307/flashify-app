import ast
import inspect
import os
from pathlib import Path
import subprocess
import sys
import unittest
from types import SimpleNamespace
from unittest.mock import Mock, patch

from google.api_core import exceptions as sdk_errors

from app.ai.contracts import AIRequest, AIResponse, AIUsage
from app.ai.errors import (
    AIAuthenticationError, AIConfigurationError, AIInvalidResponseError,
    AIRateLimitError, AITimeoutError, AIProviderUnavailableError,
)
from app.ai.factory import clear_provider_cache, get_ai_provider
from app.ai.providers.gemini import GeminiProvider
from app import ai_generator as domain


class ProviderTests(unittest.TestCase):
    def setUp(self):
        self.env = patch.dict(os.environ, {"GOOGLE_API_KEY": "test-key", "AI_TIMEOUT_SECONDS": "90", "GEMINI_MODEL": "test-model"}, clear=True)
        self.env.start()
        self.addCleanup(self.env.stop)
        clear_provider_cache()
        self.addCleanup(clear_provider_cache)
        self.sdk = patch("google.generativeai.GenerativeModel")
        self.model_cls = self.sdk.start()
        self.addCleanup(self.sdk.stop)
        self.model = self.model_cls.return_value
        self.model.generate_content.return_value = SimpleNamespace(
            text='{"topics": []}', usage_metadata=SimpleNamespace(
                prompt_token_count=10, candidates_token_count=5, total_token_count=15),
            response_id="test-request",
        )

    def test_factory_defaults_normalizes_and_caches(self):
        first = get_ai_provider()
        self.assertEqual(first.name, "gemini")
        with patch.dict(os.environ, {"AI_PROVIDER": " GeMiNi "}):
            self.assertIs(first, get_ai_provider())

    def test_factory_rejects_unknown_provider(self):
        with patch.dict(os.environ, {"AI_PROVIDER": "unknown"}):
            with self.assertRaises(AIConfigurationError):
                get_ai_provider()

    def test_credentials_required_only_when_selected(self):
        with patch.dict(os.environ, {"GOOGLE_API_KEY": ""}):
            with self.assertRaises(AIConfigurationError):
                get_ai_provider()

    def test_import_without_credentials_or_sdk(self):
        script = '''
import os, sys
os.environ.pop("GOOGLE_API_KEY", None)
os.environ["PYTHON_DOTENV_DISABLED"] = "1"
from unittest.mock import patch
with patch("dotenv.load_dotenv"), patch.dict(sys.modules, {"google.generativeai": None}):
    import app.ai_generator
assert "app.ai.providers.gemini" not in sys.modules
'''
        subprocess.run([sys.executable, "-c", script], check=True, capture_output=True)

    def test_invalid_timeouts(self):
        for value in ("0", "-1", "nan", "inf", "invalid"):
            with self.subTest(value=value), patch.dict(os.environ, {"AI_TIMEOUT_SECONDS": value}):
                with self.assertRaises(AIConfigurationError):
                    GeminiProvider()

    def test_payload_safety_cache_usage_and_response(self):
        provider = get_ai_provider()
        request = AIRequest(prompt=["context", "question"], temperature=.35,
                            max_output_tokens=4096, response_format="json", operation="guided_study")
        response = provider.generate(request)
        self.assertEqual(response, AIResponse(text='{"topics": []}', parsed={"topics": []},
                         usage=AIUsage(10, 5, 15), provider="gemini", model="test-model", request_id="test-request"))
        config = self.model_cls.call_args.kwargs
        self.assertEqual(config["generation_config"], {
            "temperature": .35, "top_p": 1, "top_k": 1,
            "max_output_tokens": 4096, "response_mime_type": "application/json"})
        self.assertEqual(len(config["safety_settings"]), 4)
        self.model.generate_content.assert_called_with(request.prompt, request_options={"timeout": 90.0})
        provider.generate(request)
        self.assertEqual(self.model_cls.call_count, 1)
        provider.generate(AIRequest(prompt="other", timeout_seconds=60))
        self.assertEqual(self.model_cls.call_count, 2)
        self.model.generate_content.assert_called_with("other", request_options={"timeout": 60.0})

    def test_sdk_errors_are_sanitized_and_categorized(self):
        cases = [
            (sdk_errors.Unauthorized("secret"), AIAuthenticationError, False),
            (sdk_errors.Forbidden("secret"), AIAuthenticationError, False),
            (sdk_errors.TooManyRequests("secret"), AIRateLimitError, True),
            (sdk_errors.BadRequest("secret"), AIConfigurationError, False),
            (sdk_errors.Unauthenticated("secret"), AIAuthenticationError, False),
            (sdk_errors.PermissionDenied("secret"), AIAuthenticationError, False),
            (sdk_errors.ResourceExhausted("secret"), AIRateLimitError, True),
            (sdk_errors.DeadlineExceeded("secret"), AITimeoutError, True),
            (TimeoutError("secret"), AITimeoutError, True),
            (sdk_errors.ServiceUnavailable("secret"), AIProviderUnavailableError, True),
            (sdk_errors.InternalServerError("secret"), AIProviderUnavailableError, True),
            (ConnectionError("secret"), AIProviderUnavailableError, True),
            (sdk_errors.InvalidArgument("secret"), AIConfigurationError, False),
            (sdk_errors.FailedPrecondition("secret"), AIConfigurationError, False),
            (sdk_errors.NotFound("secret"), AIConfigurationError, False),
            (RuntimeError("secret"), AIInvalidResponseError, False),
        ]
        for error, expected, retryable in cases:
            with self.subTest(error=type(error).__name__):
                self.model.generate_content.side_effect = error
                with self.assertRaises(expected) as caught:
                    get_ai_provider().generate(AIRequest(prompt="private"))
                self.assertNotIn("secret", str(caught.exception))
                self.assertIsNone(caught.exception.__cause__)
                self.assertEqual(caught.exception.retryable, retryable)

    def test_model_construction_errors_do_not_escape(self):
        self.model_cls.side_effect = sdk_errors.InvalidArgument("private")
        with self.assertRaises(AIConfigurationError):
            get_ai_provider().generate(AIRequest(prompt="private"))

    def test_empty_or_blocked_response_is_invalid(self):
        self.model.generate_content.return_value = SimpleNamespace(text="", candidates=[])
        with self.assertRaises(AIInvalidResponseError):
            get_ai_provider().generate(AIRequest(prompt="test"))

    def test_candidate_text_extraction(self):
        class Multipart:
            @property
            def text(self):
                raise ValueError("multipart")
            candidates = [SimpleNamespace(content=SimpleNamespace(parts=[SimpleNamespace(text="a"), SimpleNamespace(text="b")]))]
        self.model.generate_content.return_value = Multipart()
        self.assertEqual(get_ai_provider().generate(AIRequest(prompt="test")).text, "a\nb")

    def test_jsonish_remains_domain_responsibility(self):
        self.model.generate_content.return_value = SimpleNamespace(text="```json\n{}\n```", usage_metadata=None)
        response = get_ai_provider().generate(AIRequest(prompt="test", response_format="json"))
        self.assertIsNone(response.parsed)
        self.assertEqual(domain._parse_jsonish_object(response.text), {})


class DomainTests(unittest.TestCase):
    def setUp(self):
        self.provider = Mock(name="fake-provider")
        self.patch = patch.object(domain, "get_ai_provider", return_value=self.provider)
        self.patch.start()
        self.addCleanup(self.patch.stop)

    def respond(self, *payloads):
        import json
        self.provider.generate.side_effect = [AIResponse(
            text=json.dumps(p, ensure_ascii=False) if not isinstance(p, str) else p,
            provider="fake", model="test") for p in payloads]

    @staticmethod
    def card(front="O que é fotossíntese?"):
        return {"front": front, "back": "Conversão de luz em energia química.", "type": "concept"}

    @staticmethod
    def question(text="Qual processo converte luz em energia?"):
        return {"text": text, "answers": [{"text": f"Alternativa {i}", "is_correct": i == 0, "explanation": "Explicação"} for i in range(5)]}

    def test_flashcards_normalization_and_completion_use_provider(self):
        self.respond({"flashcards": [self.card()]}, {"flashcards": [self.card("Qual é o produto da fotossíntese?")]})
        result = domain.generate_flashcards_from_text("Fotossíntese", num_flashcards=2)
        self.assertEqual(len(result), 2)
        requests = [call.args[0] for call in self.provider.generate.call_args_list]
        self.assertEqual([r.operation for r in requests], ["flashcards", "completion"])
        self.assertTrue(all((r.temperature, r.max_output_tokens, r.timeout_seconds) == (.7, 8192, 60) for r in requests))
        self.assertIn(result[0]["front"], "\n".join(requests[1].prompt))

    def test_flashcard_completion_limit_is_preserved(self):
        self.respond(*[{"flashcards": [self.card()]}] * 4)
        result = domain.generate_flashcards_from_text("Fotossíntese", num_flashcards=2)
        self.assertEqual(len(result), 1)
        self.assertEqual(self.provider.generate.call_count, 4)

    def test_quiz_uses_provider_and_preserves_shape(self):
        self.respond({"title": "Energia", "questions": [self.question()]})
        result = domain.generate_quiz_from_text("Fotossíntese", num_questions=1)
        self.assertEqual(result["title"], "Energia")
        self.assertEqual(len(result["questions"][0]["answers"]), 5)
        request = self.provider.generate.call_args.args[0]
        self.assertEqual((request.operation, request.temperature, request.timeout_seconds), ("quiz", .8, 90))

    def test_quiz_repair_uses_provider(self):
        self.respond("broken JSON", {"title": "Energia", "questions": [self.question()]})
        self.assertIsNotNone(domain.generate_quiz_from_text("Fotossíntese", num_questions=1))
        request = self.provider.generate.call_args.args[0]
        self.assertEqual((request.operation, request.temperature, request.response_format, request.timeout_seconds), ("repair", .2, "json", 60))

    def test_quiz_supplement_uses_provider(self):
        self.respond({"title": "Energia", "questions": [self.question()]},
                     {"title": "Energia", "questions": [self.question()]},
                     {"title": "Energia", "questions": [self.question("Qual é o produto final?")]})
        result = domain.generate_quiz_from_text("Fotossíntese", num_questions=2)
        self.assertEqual(len(result["questions"]), 2)
        self.assertEqual([c.args[0].operation for c in self.provider.generate.call_args_list], ["quiz", "repair", "completion"])

    def test_guided_study_both_attempts_use_provider(self):
        payload = {"topics": [{"title": "Energia", "flashcard_ids": [1], "question_ids": [2]}]}
        self.respond("invalid", payload)
        result = domain.generate_guided_study_topics("Contexto", [dict(self.card(), id=1)], [dict(self.question(), id=2)])
        self.assertEqual(result, payload)
        requests = [c.args[0] for c in self.provider.generate.call_args_list]
        self.assertEqual([(r.operation, r.temperature, r.max_output_tokens, r.response_format, r.timeout_seconds) for r in requests], [
            ("guided_study", .35, 4096, "json", 90), ("guided_study", .2, 3072, "text", 90)])

    def test_chat_uses_provider_and_limits_history(self):
        self.respond("  **Explicação**  ")
        result = domain.chat_about_flashcard("Por quê?", "Frente", "Verso", "Contexto", [
            {"user": f"message-{i}", "assistant": "Resposta"} for i in range(5)])
        self.assertEqual(result, "**Explicação**")
        request = self.provider.generate.call_args.args[0]
        self.assertEqual((request.operation, request.temperature, request.max_output_tokens), ("chat", .45, 4096))
        self.assertNotIn("message-1", request.prompt)
        self.assertIn("message-2", request.prompt)

    def test_empty_inputs_never_select_provider(self):
        self.assertEqual(domain.generate_flashcards_from_text(""), [])
        self.assertIsNone(domain.generate_quiz_from_text(""))
        self.assertIsNone(domain.generate_guided_study_topics("", [], []))
        self.assertEqual(domain.chat_about_flashcard("", "", "", ""), "Por favor, faça uma pergunta sobre este tópico.")
        self.provider.generate.assert_not_called()

    def test_public_signatures_remain_compatible(self):
        expected = {
            "generate_flashcards_from_text": ["text", "num_flashcards", "difficulty", "study_language", "_attempt", "_allow_completion", "_existing_fronts"],
            "generate_quiz_from_text": ["text", "num_questions", "difficulty", "study_language", "_attempt"],
            "generate_guided_study_topics": ["text", "flashcards", "questions"],
            "chat_about_flashcard": ["message", "flashcard_front", "flashcard_back", "document_context", "conversation_history"],
        }
        for name, parameters in expected.items():
            self.assertEqual(list(inspect.signature(getattr(domain, name)).parameters), parameters)

    def test_sdk_imports_are_isolated(self):
        root = Path(domain.__file__).parent
        for path in root.rglob("*.py"):
            imports = [node for node in ast.walk(ast.parse(path.read_text())) if isinstance(node, (ast.Import, ast.ImportFrom))]
            for node in imports:
                names = [a.name for a in node.names] if isinstance(node, ast.Import) else [node.module or ""]
                if any(n.startswith("google.generativeai") for n in names):
                    self.assertEqual(path.relative_to(root).as_posix(), "ai/providers/gemini.py")
