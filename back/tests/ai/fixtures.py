"""Small invented fixtures, shared by provider/domain/integration tests."""
from copy import deepcopy
import json

from app.ai.contracts import AIResponse


def card(front="O que é fotossíntese?"):
    return {"front": front, "back": "Conversão de luz em energia química.", "type": "concept"}


def question(text="Qual processo converte luz em energia?"):
    return {"text": text, "answers": [{"text": f"Alternativa {i}", "is_correct": i == 0, "explanation": None} for i in range(5)]}


def guided_payload(fc_id=1, q_id=2):
    return {"document_id": 0, "title": "Estudo guiado", "mode": "guided", "topics": [{
        "id": "topic-1", "title": "Energia", "order": 1, "steps": [
            {"id": f"step-fc-{fc_id}", "type": "flashcard", "order": 1, "flashcard_id": fc_id, "question_id": None,
             "front": None, "back": None, "prompt": None, "answers": []},
            {"id": f"step-q-{q_id}", "type": "question", "order": 2, "flashcard_id": None, "question_id": q_id,
             "front": None, "back": None, "prompt": None, "answers": []},
        ]}], "summary": {"topics_count": 1, "steps_count": 2, "flashcards_count": 1, "questions_count": 1, "is_fallback": False}}


class FakeProvider:
    """Returns independently controllable parsed data; never touches a vendor SDK."""
    model = "test-model"

    def __init__(self, name, *outputs):
        self.name = name
        self.outputs = iter(outputs)
        self.requests = []

    def generate(self, request):
        self.requests.append(request)
        value = next(self.outputs)
        if callable(value):
            value = value(request)
        if isinstance(value, Exception):
            raise value
        if isinstance(value, str):
            return AIResponse(text=value, parsed=None, provider=self.name, model=self.model)
        return AIResponse(text=json.dumps(value, ensure_ascii=False), parsed=deepcopy(value), provider=self.name, model=self.model)


def guided_for_request(request):
    flashcards = json.loads(request.prompt[request.prompt.index("FLASHCARDS:") + 1])
    questions = json.loads(request.prompt[request.prompt.index("PERGUNTAS:") + 1])
    return guided_payload(flashcards[0]["id"], questions[0]["id"])
