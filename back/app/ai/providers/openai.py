"""OpenAI Responses adapter. No prompts, repairs or vendor fallback live here."""
import json
import logging
import math
import os
import time
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime

import openai
from jsonschema import Draft202012Validator, SchemaError, ValidationError

from ..contracts import AIRequest, AIResponse, AIUsage
from ..errors import (
    AIError, AIAuthenticationError, AIConfigurationError, AIInvalidResponseError,
    AIRateLimitError, AITimeoutError, AIProviderUnavailableError,
)

logger = logging.getLogger(__name__)
_OPERATIONS = {"flashcards", "quiz", "guided_study", "chat", "repair", "completion"}
_EFFORTS = {"none", "minimal", "low", "medium", "high", "xhigh", "max"}


def _timeout(value: object) -> float:
    try:
        result = float(value)
        if not math.isfinite(result) or result <= 0:
            raise ValueError
        return result
    except (TypeError, ValueError):
        raise AIConfigurationError("Timeout de IA deve ser positivo e finito.") from None


def _retry_after(exc: Exception) -> float | None:
    headers = getattr(getattr(exc, "response", None), "headers", {})
    try:
        milliseconds = headers.get("retry-after-ms")
        if milliseconds is not None:
            result = float(milliseconds) / 1000
        else:
            value = headers.get("retry-after")
            if value is None:
                return None
            try:
                result = float(value)
            except ValueError:
                result = (parsedate_to_datetime(value) - datetime.now(timezone.utc)).total_seconds()
        return max(0.0, result) if math.isfinite(result) else None
    except (ValueError, TypeError, OverflowError):
        return None


def _error(exc: Exception) -> AIError:
    if isinstance(exc, AIError):
        return exc
    if isinstance(exc, openai.APITimeoutError):
        return AITimeoutError("Tempo limite do provedor de IA excedido.")
    if isinstance(exc, openai.APIConnectionError):
        return AIProviderUnavailableError("Provedor de IA temporariamente indisponível.")
    if isinstance(exc, openai.APIStatusError):
        status = exc.status_code
        if status in (401, 403):
            return AIAuthenticationError("Credencial de IA rejeitada.")
        if status == 408:
            return AITimeoutError("Tempo limite do provedor de IA excedido.")
        if status == 429:
            return AIRateLimitError("Limite do provedor de IA atingido.", retry_after=_retry_after(exc))
        if status >= 500:
            return AIProviderUnavailableError("Provedor de IA temporariamente indisponível.")
        return AIConfigurationError("Configuração de IA rejeitada pelo provedor.")
    return AIInvalidResponseError("Não foi possível obter uma resposta válida da IA.")


def _check_strict_schema(schema: dict) -> None:
    """Reject invalid schemas and nonlocal refs before validating any output."""
    try:
        Draft202012Validator.check_schema(schema)
    except SchemaError:
        raise AIConfigurationError("JSON Schema de IA inválido.") from None

    def check(node):
        if isinstance(node, dict):
            for keyword in ("$ref", "$dynamicRef"):
                if keyword in node and not node[keyword].startswith("#"):
                    raise AIConfigurationError("JSON Schema deve usar referências locais.")
            if node.get("type") == "object" or "properties" in node:
                properties = node.get("properties", {})
                if node.get("additionalProperties") is not False or set(node.get("required", [])) != set(properties):
                    raise AIConfigurationError("JSON Schema deve exigir todos os campos e proibir campos extras.")
            for keyword in ("properties", "$defs", "definitions", "patternProperties", "dependentSchemas"):
                for child in node.get(keyword, {}).values():
                    check(child)
            for keyword in ("items", "additionalProperties", "not", "if", "then", "else", "contains", "propertyNames",
                            "additionalItems", "unevaluatedItems", "unevaluatedProperties", "contentSchema"):
                if keyword in node:
                    check(node[keyword])
            for keyword in ("anyOf", "oneOf", "allOf", "prefixItems"):
                for child in node.get(keyword, []):
                    check(child)

    if schema.get("type") != "object":
        raise AIConfigurationError("JSON Schema deve ter objeto na raiz.")
    check(schema)


class OpenAIProvider:
    name = "openai"

    def __init__(self) -> None:
        self.model = os.getenv("OPENAI_MODEL", "gpt-6-luna").strip() or "gpt-6-luna"
        self.reasoning_effort = os.getenv("OPENAI_REASONING_EFFORT", "none").strip().lower()
        if self.reasoning_effort not in _EFFORTS:
            raise AIConfigurationError("Esforço de raciocínio de IA inválido.")
        self.timeout_seconds = _timeout(os.getenv("AI_TIMEOUT_SECONDS", "90"))
        self._key = os.getenv("OPENAI_API_KEY", "").strip()
        if not self._key:
            raise AIConfigurationError("OPENAI_API_KEY não foi configurada.")
        self._client = None

    def _payload(self, request: AIRequest) -> dict:
        if request.operation not in _OPERATIONS:
            raise AIConfigurationError("Operação de IA inválida.")
        if request.response_format not in ("text", "json"):
            raise AIConfigurationError("Formato de resposta de IA inválido.")
        if not isinstance(request.max_output_tokens, int) or isinstance(request.max_output_tokens, bool) or request.max_output_tokens <= 0:
            raise AIConfigurationError("Limite de saída de IA inválido.")
        if not isinstance(request.temperature, (int, float)) or not math.isfinite(request.temperature) or not 0 <= request.temperature <= 2:
            raise AIConfigurationError("Temperatura de IA inválida.")
        prompt = request.prompt
        if isinstance(prompt, list) and all(isinstance(part, str) for part in prompt):
            prompt = "\n".join(prompt)
        if not isinstance(prompt, str) or not prompt.strip():
            raise AIConfigurationError("Prompt de IA ausente ou inválido.")
        payload = {
            "model": self.model, "input": [{"role": "user", "content": prompt}],
            "max_output_tokens": request.max_output_tokens,
            "timeout": self.timeout_seconds if request.timeout_seconds is None else _timeout(request.timeout_seconds),
            "store": False,
        }
        # Sampling controls are documented for GPT-6 Luna/Sol only with no reasoning.
        # Older nonreasoning GPT-4 models accept temperature but not reasoning.
        if self.model.startswith(("gpt-4o", "gpt-4.1")):
            payload["temperature"] = request.temperature
        else:
            payload["reasoning"] = {"effort": self.reasoning_effort}
            if self.model.startswith(("gpt-6-luna", "gpt-6-sol")) and self.reasoning_effort == "none":
                payload["temperature"] = request.temperature
        if request.response_format == "json":
            if not isinstance(request.schema, dict):
                raise AIConfigurationError("JSON Schema é obrigatório para saída estruturada.")
            _check_strict_schema(request.schema)
            payload["text"] = {"format": {
                "type": "json_schema", "name": f"flashify_{request.operation}",
                "strict": True, "schema": request.schema,
            }}
        return payload

    def generate(self, request: AIRequest) -> AIResponse:
        started = time.monotonic()
        usage = AIUsage()
        request_id = None
        error_name = None
        try:
            payload = self._payload(request)
            if self._client is None:
                try:
                    self._client = openai.OpenAI(api_key=self._key, timeout=self.timeout_seconds, max_retries=0)
                except (TypeError, ValueError):
                    raise AIConfigurationError("Configuração do cliente de IA inválida.") from None
            response = self._client.responses.create(**payload)
            request_id = getattr(response, "_request_id", None)
            tokens = getattr(response, "usage", None)
            usage = AIUsage(
                input_tokens=getattr(tokens, "input_tokens", None),
                output_tokens=getattr(tokens, "output_tokens", None),
                total_tokens=getattr(tokens, "total_tokens", None),
            )
            if response.status != "completed" or getattr(response, "error", None):
                raise AIInvalidResponseError("Resposta de IA incompleta ou inválida.")
            for item in response.output:
                for part in getattr(item, "content", None) or []:
                    if getattr(part, "type", None) == "refusal":
                        raise AIInvalidResponseError("Solicitação recusada pelo provedor de IA.")
            text = response.output_text
            if not isinstance(text, str) or not text.strip():
                raise AIInvalidResponseError("Resposta vazia retornada pela IA.")
            parsed = None
            if request.response_format == "json":
                try:
                    def reject_constant(value):
                        raise ValueError("Non-JSON numeric constant")
                    parsed = json.loads(text, parse_constant=reject_constant)
                    Draft202012Validator(request.schema).validate(parsed)
                except (ValueError, ValidationError):
                    raise AIInvalidResponseError("Resposta de IA incompatível com o JSON Schema.") from None
            return AIResponse(text=text, parsed=parsed, usage=usage, provider=self.name,
                              model=self.model, request_id=request_id)
        except Exception as exc:
            normalized = _error(exc)
            error_name = type(normalized).__name__
            request_id = request_id or getattr(exc, "request_id", None)
            raise normalized from None
        finally:
            logger.info(json.dumps({
                "event": "ai_call", "operation": request.operation if request.operation in _OPERATIONS else "invalid",
                "provider": self.name, "model": self.model,
                "duration_ms": round((time.monotonic() - started) * 1000, 2),
                "input_tokens": usage.input_tokens, "output_tokens": usage.output_tokens,
                "total_tokens": usage.total_tokens, "success": error_name is None,
                "error": error_name, "request_id": request_id,
            }))
