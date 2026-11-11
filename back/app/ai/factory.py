"""Lazy provider selection; importing the domain never requires credentials."""
import os
from functools import lru_cache

from .errors import AIConfigurationError
from .provider import AIProvider


@lru_cache(maxsize=1)
def _create_provider(name: str) -> AIProvider:
    if name == "gemini":
        from .providers.gemini import GeminiProvider

        return GeminiProvider()
    if name == "openai":
        from .providers.openai import OpenAIProvider

        return OpenAIProvider()
    raise AIConfigurationError("Provedor de IA não suportado.")


def get_ai_provider() -> AIProvider:
    name = os.getenv("AI_PROVIDER", "gemini").strip().lower()
    return _create_provider(name)


def clear_provider_cache() -> None:
    """Explicitly reload configuration (for tests or application lifecycle)."""
    _create_provider.cache_clear()
