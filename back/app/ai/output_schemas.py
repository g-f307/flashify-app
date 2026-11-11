"""Pydantic output contracts, independent of any vendor SDK."""
from copy import deepcopy
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, StrictBool, StringConstraints, model_validator

from .. import schemas

NonEmptyText = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, strict=True)]


class OutputModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class FlashcardOutput(OutputModel):
    front: NonEmptyText
    back: NonEmptyText
    type: NonEmptyText = "concept"


class FlashcardsOutput(OutputModel):
    flashcards: list[FlashcardOutput]


class QuizAnswerOutput(OutputModel):
    text: NonEmptyText
    is_correct: StrictBool
    explanation: str | None = None


class QuizQuestionOutput(OutputModel):
    text: NonEmptyText
    answers: list[QuizAnswerOutput] = Field(min_length=5, max_length=5)

    @model_validator(mode="after")
    def one_correct_answer(self):
        if sum(answer.is_correct for answer in self.answers) != 1:
            raise ValueError("Quiz requires exactly one correct answer")
        return self


class QuizOutput(OutputModel):
    title: NonEmptyText
    questions: list[QuizQuestionOutput]


class GuidedStudyOutput(schemas.GuidedStudyResponse):
    """Reuse every field and nested HTTP model, including answers and summary."""
    model_config = ConfigDict(extra="forbid")


def strict_json_schema(model: type[BaseModel]) -> dict:
    """Make defaulted fields required on the wire, keeping nullable types intact."""
    schema = deepcopy(model.model_json_schema())

    def visit(node):
        if isinstance(node, dict):
            node.pop("default", None)
            if node.get("type") == "object":
                node["additionalProperties"] = False
                node["required"] = list(node.get("properties", {}))
            for value in node.values():
                visit(value)
        elif isinstance(node, list):
            for value in node:
                visit(value)

    visit(schema)
    return schema
