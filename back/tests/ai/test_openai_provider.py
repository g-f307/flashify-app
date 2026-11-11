"""Responses payloads and failures, using SDK mocks and an offline HTTP transport."""
import ast
import json
import os
from pathlib import Path
import subprocess
import sys
import unittest
from dataclasses import replace
from types import SimpleNamespace
from unittest.mock import Mock, patch

import httpx
import openai

from app.ai.contracts import AIRequest, AIUsage
from app.ai.errors import (
    AIAuthenticationError, AIConfigurationError, AIInvalidResponseError,
    AIRateLimitError, AITimeoutError, AIProviderUnavailableError,
)
from app.ai.factory import clear_provider_cache, get_ai_provider
from app.ai.providers.openai import OpenAIProvider
from app import ai_generator as domain

SCHEMA = {
    "type": "object", "properties": {"answer": {"type": "string"}},
    "required": ["answer"], "additionalProperties": False,
}


def response(text="**Resposta**", **kwargs):
    return SimpleNamespace(
        **dict({"output_text": text, "status": "completed", "output": [], "error": None,
                "usage": SimpleNamespace(input_tokens=15, output_tokens=8, total_tokens=23),
                "_request_id": "req_test"}, **kwargs))


class OpenAIProviderTests(unittest.TestCase):
    def setUp(self):
        self.env = patch.dict(os.environ, {"OPENAI_API_KEY": "test-secret", "AI_PROVIDER": "openai"}, clear=True)
        self.env.start()
        self.addCleanup(self.env.stop)
        clear_provider_cache()
        self.addCleanup(clear_provider_cache)
        self.constructor_patch = patch("app.ai.providers.openai.openai.OpenAI")
        self.constructor = self.constructor_patch.start()
        self.addCleanup(self.constructor_patch.stop)
        self.client = self.constructor.return_value
        self.client.responses.create.return_value = response()
        self.request = AIRequest(prompt=["private-document", "private-chat"], temperature=.45,
                                 max_output_tokens=4096, operation="chat")

    def test_lazy_factory_and_text_payload(self):
        provider = get_ai_provider()
        self.assertIs(get_ai_provider(), provider)
        self.constructor.assert_not_called()
        result = provider.generate(self.request)
        self.constructor.assert_called_once_with(api_key="test-secret", timeout=90.0, max_retries=0)
        self.client.responses.create.assert_called_once_with(
            model="gpt-6-luna", input=[{"role": "user", "content": "private-document\nprivate-chat"}],
            max_output_tokens=4096, timeout=90.0, reasoning={"effort": "none"}, temperature=.45, store=False)
        self.assertEqual((result.text, result.parsed, result.provider, result.model, result.request_id),
                         ("**Resposta**", None, "openai", "gpt-6-luna", "req_test"))
        self.assertEqual(result.usage, AIUsage(15, 8, 23))
        provider.generate(self.request)
        self.assertEqual(self.constructor.call_count, 1)

    def test_json_schema_payload_and_parsed_result(self):
        self.client.responses.create.return_value = response('{"answer":"42"}')
        for operation in ("flashcards", "quiz", "guided_study"):
            with self.subTest(operation=operation):
                result = get_ai_provider().generate(replace(self.request, operation=operation, response_format="json", schema=SCHEMA))
                self.assertEqual(result.parsed, {"answer": "42"})
                self.assertEqual(self.client.responses.create.call_args.kwargs["text"], {"format": {
                    "type": "json_schema", "name": f"flashify_{operation}", "strict": True, "schema": SCHEMA}})

    def test_factory_still_defaults_to_gemini_without_openai_key(self):
        with patch.dict(os.environ, {"AI_PROVIDER": " GeMiNi ", "GOOGLE_API_KEY": "test-google"}):
            os.environ.pop("OPENAI_API_KEY")
            self.assertEqual(get_ai_provider().name, "gemini")
        self.constructor.assert_not_called()

    def test_import_does_not_require_inactive_sdk_or_key(self):
        script = '''
from unittest.mock import patch
import sys
with patch("dotenv.load_dotenv"), patch.dict(sys.modules, {"openai": None, "google.generativeai": None}):
    import app.ai_generator
assert "app.ai.providers.openai" not in sys.modules
'''
        subprocess.run([sys.executable, "-c", script], check=True, capture_output=True,
                       env={**os.environ, "PYTHONPATH": str(Path(domain.__file__).parents[1])})

    def test_client_configuration_error_is_sanitized(self):
        self.constructor.side_effect = ValueError("private-client-config")
        with self.assertRaises(AIConfigurationError) as caught:
            get_ai_provider().generate(self.request)
        self.assertNotIn("private", str(caught.exception))
        self.client.responses.create.assert_not_called()

    def test_missing_key(self):
        with patch.dict(os.environ, {"OPENAI_API_KEY": ""}):
            with self.assertRaises(AIConfigurationError):
                OpenAIProvider()
        self.constructor.assert_not_called()

    def test_empty_model_defaults_and_configured_model(self):
        for value, expected in ((" ", "gpt-6-luna"), ("gpt-6-luna-custom", "gpt-6-luna-custom")):
            with self.subTest(value=value), patch.dict(os.environ, {"OPENAI_MODEL": value}):
                self.assertEqual(OpenAIProvider().model, expected)

    def test_invalid_configuration(self):
        for name, value in [("AI_TIMEOUT_SECONDS", v) for v in ("0", "-1", "nan", "inf", "text")] + [("OPENAI_REASONING_EFFORT", "invalid")]:
            with self.subTest(name=name, value=value), patch.dict(os.environ, {name: value}):
                with self.assertRaises(AIConfigurationError):
                    OpenAIProvider()

    def test_temperature_only_when_supported(self):
        for model, effort, temperature, reasoning in [
            ("gpt-6-luna", "none", True, True), ("gpt-6-luna", "low", False, True),
            ("gpt-6-astra", "high", False, True), ("gpt-4o", "none", True, False),
        ]:
            with self.subTest(model=model, effort=effort), patch.dict(os.environ, {"OPENAI_MODEL": model, "OPENAI_REASONING_EFFORT": effort}):
                OpenAIProvider().generate(self.request)
                payload = self.client.responses.create.call_args.kwargs
                self.assertEqual("temperature" in payload, temperature)
                self.assertEqual("reasoning" in payload, reasoning)
                if reasoning:
                    self.assertEqual(payload["reasoning"], {"effort": effort})

    def test_request_timeout_override(self):
        get_ai_provider().generate(replace(self.request, timeout_seconds=60))
        self.assertEqual(self.client.responses.create.call_args.kwargs["timeout"], 60)

    def test_invalid_parameters_fail_without_call(self):
        for changes in ({"operation": "private-operation"}, {"response_format": "xml"},
                        {"max_output_tokens": 0}, {"max_output_tokens": True},
                        {"temperature": float("nan")}, {"temperature": 3},
                        {"prompt": " "}, {"prompt": [None]}, {"timeout_seconds": 0},
                        {"response_format": "json"}):
            with self.subTest(changes=changes), self.assertRaises(AIConfigurationError):
                get_ai_provider().generate(replace(self.request, **changes))
        self.client.responses.create.assert_not_called()

    def test_invalid_or_non_strict_or_remote_schema_fails_without_call(self):
        for schema in ({"type": "invalid"}, {"type": "array"},
                       {"type": "object", "properties": {}},
                       dict(SCHEMA, required=[]), dict(SCHEMA, **{"$ref": "https://example.invalid/private"})):
            with self.subTest(schema=schema), self.assertRaises(AIConfigurationError):
                get_ai_provider().generate(replace(self.request, response_format="json", schema=schema))
        self.client.responses.create.assert_not_called()

    def test_invalid_json_and_schema_mismatch_never_repaired(self):
        for text in ('```json\n{"answer":"42"}\n```', '{"answer":42}', '{}',
                     '{"answer":"42","extra":true}', '{"answer":NaN}'):
            with self.subTest(text=text):
                self.client.responses.create.reset_mock()
                self.client.responses.create.return_value = response(text)
                with self.assertRaises(AIInvalidResponseError):
                    get_ai_provider().generate(replace(self.request, response_format="json", schema=SCHEMA))
                self.assertEqual(self.client.responses.create.call_count, 1)

    def test_empty_refused_and_incomplete_responses_are_invalid(self):
        for result in (response(" "), response(status="incomplete"), response(status="failed"),
                       response(output=[SimpleNamespace(content=[SimpleNamespace(type="refusal")])])):
            with self.subTest(result=result):
                self.client.responses.create.return_value = result
                with self.assertRaises(AIInvalidResponseError):
                    get_ai_provider().generate(self.request)

    def test_absent_usage_and_request_id_stay_unknown(self):
        self.client.responses.create.return_value = response(usage=None, _request_id=None)
        result = get_ai_provider().generate(self.request)
        self.assertEqual(result.usage, AIUsage())
        self.assertIsNone(result.request_id)

    def test_http_errors_and_rate_limit_retry_after(self):
        for status, expected, retryable in [(400, AIConfigurationError, False),
                (401, AIAuthenticationError, False), (403, AIAuthenticationError, False),
                (404, AIConfigurationError, False), (408, AITimeoutError, True), (422, AIConfigurationError, False),
                (429, AIRateLimitError, True), (500, AIProviderUnavailableError, True),
                (503, AIProviderUnavailableError, True)]:
            with self.subTest(status=status):
                self.client.responses.create.side_effect = openai.APIStatusError(
                    "private-error-secret", response=httpx.Response(status, request=httpx.Request("POST", "https://example.invalid"),
                    headers={"retry-after": "7", "x-request-id": "req_error"}), body={"private": "secret"})
                with self.assertLogs("app.ai.providers.openai", level="INFO") as logs:
                    with self.assertRaises(expected) as caught:
                        get_ai_provider().generate(self.request)
                self.assertEqual(caught.exception.retryable, retryable)
                self.assertNotIn("private", str(caught.exception))
                self.assertIsNone(caught.exception.__cause__)
                event = json.loads(logs.records[0].getMessage())
                self.assertEqual(event["error"], expected.__name__)
                self.assertFalse(event["success"])
                self.assertEqual(event["request_id"], "req_error")
                if status == 429:
                    self.assertEqual(caught.exception.retry_after, 7)

    def test_rate_limit_headers_support_ms_dates_and_invalid_values(self):
        from datetime import datetime, timedelta, timezone
        from email.utils import format_datetime
        for headers, minimum, maximum in (
            ({"retry-after-ms": "1500"}, 1.5, 1.5),
            ({"retry-after": format_datetime(datetime.now(timezone.utc) + timedelta(seconds=60))}, 55, 60),
            ({"retry-after": "invalid"}, None, None),
            ({"retry-after": "nan"}, None, None),
        ):
            with self.subTest(headers=headers):
                self.client.responses.create.side_effect = openai.APIStatusError(
                    "offline", response=httpx.Response(429, request=httpx.Request("POST", "https://example.invalid"), headers=headers), body=None)
                with self.assertRaises(AIRateLimitError) as caught:
                    get_ai_provider().generate(self.request)
                if minimum is None:
                    self.assertIsNone(caught.exception.retry_after)
                else:
                    self.assertGreaterEqual(caught.exception.retry_after, minimum)
                    self.assertLessEqual(caught.exception.retry_after, maximum)

    def test_nested_schema_and_refs_validate_without_network(self):
        schema = {
            "type": "object", "properties": {"properties": {"$ref": "#/$defs/item"}},
            "required": ["properties"], "additionalProperties": False,
            "$defs": {"item": {"type": "object", "properties": {"$ref": {"type": "string"}},
                               "required": ["$ref"], "additionalProperties": False}},
        }
        self.client.responses.create.return_value = response('{"properties":{"$ref":"value"}}')
        result = get_ai_provider().generate(replace(self.request, response_format="json", schema=schema))
        self.assertEqual(result.parsed, {"properties": {"$ref": "value"}})

    def test_transport_errors(self):
        request = httpx.Request("POST", "https://example.invalid")
        for error, expected in [
            (openai.APITimeoutError(request=request), AITimeoutError),
            (openai.APIConnectionError(request=request), AIProviderUnavailableError),
            (openai.APIResponseValidationError(response=httpx.Response(200, request=request), body={"private": "content"}), AIInvalidResponseError),
        ]:
            with self.subTest(error=error):
                self.client.responses.create.side_effect = error
                with self.assertRaises(expected):
                    get_ai_provider().generate(self.request)

    def test_safe_single_log_per_call_on_success_and_failure(self):
        for error in (None, RuntimeError("private-error-secret")):
            self.client.responses.create.side_effect = error
            with self.assertLogs("app.ai.providers.openai", level="INFO") as logs:
                try:
                    get_ai_provider().generate(self.request)
                except AIInvalidResponseError:
                    pass
            self.assertEqual(len(logs.records), 1)
            event = json.loads(logs.records[0].getMessage())
            self.assertEqual(set(event), {"event", "operation", "provider", "model", "duration_ms", "input_tokens", "output_tokens", "total_tokens", "success", "error", "request_id"})
            self.assertGreaterEqual(event["duration_ms"], 0)
            for secret in ("test-secret", "private-document", "private-chat", "private-error-secret", "**Resposta**"):
                self.assertNotIn(secret, logs.output[0])

    def test_real_sdk_transport_has_no_retries(self):
        # Exercise the installed SDK itself, not a mock of responses.create.
        self.constructor_patch.stop()
        for status in (429, 500):
            calls = []
            def handler(request):
                calls.append(request)
                return httpx.Response(status, json={"error": {"message": "offline", "type": "server_error"}})
            with httpx.Client(transport=httpx.MockTransport(handler)) as http_client:
                provider = OpenAIProvider()
                client = openai.OpenAI(api_key="test-only", http_client=http_client, max_retries=0)
                with patch("app.ai.providers.openai.openai.OpenAI", return_value=client) as constructor:
                    with self.assertRaises((AIRateLimitError, AIProviderUnavailableError)):
                        provider.generate(self.request)
                    self.assertEqual(constructor.call_args.kwargs["max_retries"], 0)
                self.assertEqual(len(calls), 1)

    def test_multimessage_text_is_consolidated_by_real_sdk(self):
        self.constructor_patch.stop()
        def handler(request):
            return httpx.Response(200, headers={"x-request-id": "req_offline"}, json={
                "id": "resp_offline", "created_at": 1, "model": "gpt-6-luna", "object": "response", "status": "completed",
                "output": [{"id": "msg_1", "type": "message", "role": "assistant", "status": "completed", "content": [
                    {"type": "output_text", "text": "Parte 1", "annotations": []},
                    {"type": "output_text", "text": "Parte 2", "annotations": []}]}],
                "usage": {"input_tokens": 10, "output_tokens": 5, "total_tokens": 15},
            })
        with httpx.Client(transport=httpx.MockTransport(handler)) as http_client:
            provider = OpenAIProvider()
            provider._client = openai.OpenAI(api_key="test-only", http_client=http_client, max_retries=0)
            result = provider.generate(self.request)
            self.assertEqual(result.text, "Parte 1Parte 2")
            self.assertEqual(result.request_id, "req_offline")
            self.assertEqual(result.usage, AIUsage(10, 5, 15))

    def test_sdk_imports_are_isolated(self):
        root = Path(domain.__file__).parent
        for path in root.rglob("*.py"):
            for node in ast.walk(ast.parse(path.read_text())):
                if isinstance(node, ast.Import):
                    modules = [a.name for a in node.names]
                elif isinstance(node, ast.ImportFrom):
                    modules = [node.module or ""]
                else:
                    continue
                if any(m == "openai" or m.startswith("openai.") for m in modules):
                    self.assertEqual(path.relative_to(root).as_posix(), "ai/providers/openai.py")
