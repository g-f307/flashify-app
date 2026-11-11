"""The only module allowed to depend on the Gemini SDK."""
import json
import logging
import math
import os
import time

from ..contracts import AIRequest, AIResponse, AIUsage
from ..errors import (
    AIError, AIAuthenticationError, AIConfigurationError, AIInvalidResponseError,
    AIRateLimitError, AITimeoutError, AIProviderUnavailableError,
)


DEFAULT_SAFETY_SETTINGS = [
    {"category": category, "threshold": "BLOCK_MEDIUM_AND_ABOVE"}
    for category in (
        "HARM_CATEGORY_HARASSMENT", "HARM_CATEGORY_HATE_SPEECH",
        "HARM_CATEGORY_SEXUALLY_EXPLICIT", "HARM_CATEGORY_DANGEROUS_CONTENT",
    )
]
logger = logging.getLogger(__name__)


def _positive_timeout(value: object) -> float:
    try:
        timeout = float(value)
        if timeout <= 0 or not math.isfinite(timeout):
            raise ValueError
        return timeout
    except (ValueError, TypeError):
        raise AIConfigurationError("Timeout de IA deve ser positivo e finito.") from None


def _normalize_error(exc: Exception) -> AIError:
    from google.api_core import exceptions as api_errors

    if isinstance(exc, (api_errors.Unauthorized, api_errors.Forbidden)):
        return AIAuthenticationError("Credencial de IA rejeitada.")
    if isinstance(exc, api_errors.TooManyRequests):
        return AIRateLimitError("Limite do provedor de IA atingido.")
    if isinstance(exc, (api_errors.DeadlineExceeded, TimeoutError)):
        return AITimeoutError("Tempo limite do provedor de IA excedido.")
    if isinstance(exc, (api_errors.ServerError, api_errors.RetryError, ConnectionError)):
        return AIProviderUnavailableError("Provedor de IA temporariamente indisponível.")
    if isinstance(exc, (api_errors.BadRequest, api_errors.FailedPrecondition, api_errors.NotFound)):
        return AIConfigurationError("Configuração de IA rejeitada pelo provedor.")
    return AIInvalidResponseError("Não foi possível obter uma resposta válida da IA.")


def _extract_response_text(response: object) -> str:
    # The SDK text accessor can raise ValueError for blocked/multipart responses.
    try:
        direct_text = getattr(response, "text", None)
    except ValueError:
        direct_text = None
    if isinstance(direct_text, str) and direct_text.strip():
        return direct_text
    parts = []
    for candidate in getattr(response, "candidates", None) or []:
        for part in getattr(getattr(candidate, "content", None), "parts", None) or []:
            text = getattr(part, "text", None)
            if isinstance(text, str) and text.strip():
                parts.append(text)
    return "\n".join(parts).strip()


class GeminiProvider:
    name = "gemini"

    def __init__(self) -> None:
        self.model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash").strip() or "gemini-2.5-flash"
        self.timeout_seconds = _positive_timeout(os.getenv("AI_TIMEOUT_SECONDS", "90"))
        key = os.getenv("GOOGLE_API_KEY", "").strip()
        if not key:
            raise AIConfigurationError("GOOGLE_API_KEY não foi configurada.")
        try:
            import google.generativeai as genai

            genai.configure(api_key=key)
            self._sdk = genai
        except ImportError:
            raise AIConfigurationError("SDK do provedor de IA não instalado.") from None
        except Exception as exc:
            raise _normalize_error(exc) from None
        self._models: dict[tuple, object] = {}

    def generate(self, request: AIRequest) -> AIResponse:
        started = time.monotonic()
        usage_value = AIUsage()
        request_id = None
        error_name = None
        try:
            timeout = self.timeout_seconds if request.timeout_seconds is None else _positive_timeout(request.timeout_seconds)
            if request.response_format not in ("text", "json"):
                raise AIConfigurationError("Formato de resposta de IA inválido.")
            cache_key = (request.temperature, request.max_output_tokens, request.response_format,
                         json.dumps(request.schema, sort_keys=True) if request.schema else None)
            model = self._models.get(cache_key)
            if model is None:
                config = {
                    "temperature": request.temperature, "top_p": 1, "top_k": 1,
                    "max_output_tokens": request.max_output_tokens,
                }
                if request.response_format == "json":
                    config["response_mime_type"] = "application/json"
                # The pinned legacy SDK cannot accept full JSON Schema ($defs,
                # anyOf, additionalProperties). Domain Pydantic validation is
                # authoritative; Gemini uses JSON MIME without a divergent schema.
                model = self._sdk.GenerativeModel(
                    model_name=self.model, generation_config=config,
                    safety_settings=DEFAULT_SAFETY_SETTINGS,
                )
                self._models[cache_key] = model
            response = model.generate_content(request.prompt, request_options={"timeout": timeout})
            text = _extract_response_text(response)
            if not text.strip():
                raise AIInvalidResponseError("Resposta vazia retornada pela IA.")
            parsed = None
            if request.response_format == "json":
                try:
                    parsed = json.loads(text)
                except (ValueError, TypeError):
                    # Legacy domain parsers/repair retain responsibility for JSONish output.
                    pass
            usage = getattr(response, "usage_metadata", None)
            usage_value = AIUsage(
                input_tokens=getattr(usage, "prompt_token_count", None),
                output_tokens=getattr(usage, "candidates_token_count", None),
                total_tokens=getattr(usage, "total_token_count", None),
            )
            request_id = getattr(response, "response_id", None)
            return AIResponse(
                text=text, parsed=parsed, provider=self.name, model=self.model,
                usage=usage_value, request_id=request_id,
            )
        except AIError as exc:
            error_name = type(exc).__name__
            raise
        except Exception as exc:
            normalized = _normalize_error(exc)
            error_name = type(normalized).__name__
            raise normalized from None
        finally:
            logger.info(json.dumps({
                "event": "ai_call", "operation": request.operation,
                "provider": self.name, "model": self.model,
                "duration_ms": round((time.monotonic() - started) * 1000, 2),
                "input_tokens": usage_value.input_tokens,
                "output_tokens": usage_value.output_tokens,
                "total_tokens": usage_value.total_tokens,
                "success": error_name is None, "error": error_name,
                "request_id": request_id,
            }))
