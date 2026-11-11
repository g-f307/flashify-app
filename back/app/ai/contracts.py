"""Values exchanged between application logic and AI providers."""
from dataclasses import dataclass, field
from typing import Any, Literal, Optional


@dataclass(frozen=True)
class AIRequest:
    prompt: str | list[str]
    temperature: float = 0.7
    max_output_tokens: int = 8192
    timeout_seconds: Optional[float] = None
    response_format: Literal["text", "json"] = "text"
    schema: Optional[dict[str, Any]] = None
    operation: Literal["flashcards", "quiz", "guided_study", "chat", "repair", "completion"] = "flashcards"


@dataclass(frozen=True)
class AIUsage:
    input_tokens: Optional[int] = None
    output_tokens: Optional[int] = None
    total_tokens: Optional[int] = None


@dataclass(frozen=True)
class AIResponse:
    text: str
    parsed: Any = None
    usage: AIUsage = field(default_factory=AIUsage)
    provider: str = ""
    model: str = ""
    request_id: Optional[str] = None
