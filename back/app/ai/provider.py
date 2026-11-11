from typing import Protocol

from .contracts import AIRequest, AIResponse


class AIProvider(Protocol):
    name: str
    model: str

    def generate(self, request: AIRequest) -> AIResponse: ...
