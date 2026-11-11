import copy
import inspect
import json
import unittest
from unittest.mock import patch

from jsonschema import Draft202012Validator
from pydantic import ValidationError

from app import ai_generator as domain, schemas
from app.ai.contracts import AIResponse
from app.ai.errors import AIAuthenticationError, AIInvalidResponseError, AITimeoutError
from app.ai.output_schemas import FlashcardsOutput, QuizOutput, GuidedStudyOutput, strict_json_schema
from ai.fixtures import FakeProvider, card, question, guided_payload


class StructuredOperationsTests(unittest.TestCase):
    def test_flashcards_difficulties_languages_and_both_providers(self):
        for provider_name in ("openai", "gemini"):
            for difficulty in ("Fácil", "Médio", "Difícil"):
                for language in ("pt-BR", "en", "auto"):
                    with self.subTest(provider=provider_name, difficulty=difficulty, language=language):
                        payload = card()
                        payload["back"] = r"<strong>Energia</strong>: \(E=mc^2\)."
                        provider = FakeProvider(provider_name, {"flashcards": [payload]})
                        with patch.object(domain, "get_ai_provider", return_value=provider):
                            result = domain.generate_flashcards_from_text("Energia e fotossíntese", 1, difficulty, language)
                        self.assertEqual(result, [payload])
                        request = provider.requests[0]
                        self.assertEqual(request.response_format, "json")
                        self.assertEqual(request.schema, strict_json_schema(FlashcardsOutput))
                        prompt = "\n".join(request.prompt)
                        self.assertIn(difficulty.upper(), prompt)
                        self.assertIn("LaTeX", prompt)
                        self.assertIn("<strong>", prompt)
                        self.assertIn("Ignore sumários", prompt)
                        self.assertNotIn("OpenAI", prompt)
                        self.assertNotIn("Gemini", prompt)
                        if language == "en":
                            self.assertIn("ingles", prompt)
                        if language == "pt-BR":
                            self.assertIn("portugues brasileiro", prompt)

    def test_quiz_difficulties_languages_and_both_providers(self):
        for name in ("openai", "gemini"):
            for difficulty in ("Fácil", "Médio", "Difícil"):
                for language in ("pt-BR", "en", "auto"):
                    with self.subTest(name=name, difficulty=difficulty, language=language):
                        payload = {"title": "Energia", "questions": [question()]}
                        provider = FakeProvider(name, payload)
                        with patch.object(domain, "get_ai_provider", return_value=provider):
                            result = domain.generate_quiz_from_text("Energia", 1, difficulty, language)
                        self.assertEqual(result, payload)
                        self.assertEqual(provider.requests[0].schema, strict_json_schema(QuizOutput))

    def test_deduplication_and_single_completion_include_existing_items(self):
        for name in ("openai", "gemini"):
            for operation in ("flashcards", "quiz"):
                with self.subTest(name=name, operation=operation):
                    if operation == "flashcards":
                        first = {"flashcards": [card(), card()]}
                        second = {"flashcards": [card("Qual produto é formado?")]}
                        generate = domain.generate_flashcards_from_text
                    else:
                        first = {"title": "Energia", "questions": [question(), question()]}
                        second = {"title": "Energia", "questions": [question("Qual produto é formado?")]}
                        generate = domain.generate_quiz_from_text
                    provider = FakeProvider(name, first, second)
                    with patch.object(domain, "get_ai_provider", return_value=provider):
                        result = generate("Energia", 2)
                    self.assertEqual(len(result if isinstance(result, list) else result["questions"]), 2)
                    self.assertEqual([r.operation for r in provider.requests], [operation, "completion"])
                    existing = card()["front"] if operation == "flashcards" else question()["text"]
                    self.assertIn(existing, "\n".join(provider.requests[1].prompt))

    def test_insufficient_or_repeated_completion_fails_at_two_calls(self):
        for name in ("openai", "gemini"):
            for generate, payload in ((domain.generate_flashcards_from_text, {"flashcards": [card()]}),
                                      (domain.generate_quiz_from_text, {"title": "Energia", "questions": [question()]})):
                with self.subTest(name=name, generate=generate.__name__):
                    provider = FakeProvider(name, payload, payload)
                    with patch.object(domain, "get_ai_provider", return_value=provider), self.assertRaises(AIInvalidResponseError):
                        generate("Energia", 2)
                    self.assertEqual(len(provider.requests), 2)

    def test_invalid_quiz_semantics_are_rejected_before_supplementation(self):
        cases = []
        q = question(); q["answers"][1]["is_correct"] = True; cases.append(q)
        q = question(); q["answers"][0]["is_correct"] = False; cases.append(q)
        q = question(); q["answers"].pop(); cases.append(q)
        q = question(); q["answers"][0]["is_correct"] = "true"; cases.append(q)
        q = question(); q["answers"][0]["text"] = "  "; cases.append(q)
        for name in ("openai", "gemini"):
            for q in cases:
                with self.subTest(name=name, question=q):
                    provider = FakeProvider(name, {"title": "Energia", "questions": [q]})
                    with patch.object(domain, "get_ai_provider", return_value=provider), self.assertRaises(AIInvalidResponseError):
                        domain.generate_quiz_from_text("Energia", 1)
                    self.assertEqual(len(provider.requests), 1)

    def test_parsed_data_is_revalidated_even_if_text_looks_valid(self):
        provider = FakeProvider("openai")
        provider.generate = lambda request: AIResponse(text=json.dumps({"flashcards": [card()]}), parsed={"flashcards": [{"front": "", "back": "B"}]})
        with patch.object(domain, "get_ai_provider", return_value=provider), self.assertRaises(AIInvalidResponseError):
            domain.generate_flashcards_from_text("Energia", 1)

    def test_openai_never_parses_or_repairs_raw_json(self):
        for generate in (domain.generate_flashcards_from_text, domain.generate_quiz_from_text):
            provider = FakeProvider("openai", '{"flashcards": []}')
            with patch.object(domain, "get_ai_provider", return_value=provider), patch.object(domain, "_repair_quiz_response") as repair:
                with self.assertRaises(AIInvalidResponseError):
                    generate("Energia", 1)
                repair.assert_not_called()
                self.assertEqual(len(provider.requests), 1)

    def test_gemini_can_repair_json_once_via_the_same_provider(self):
        provider = FakeProvider("gemini", "broken", {"title": "Energia", "questions": [question()]})
        with patch.object(domain, "get_ai_provider", return_value=provider):
            result = domain.generate_quiz_from_text("Energia", 1)
        self.assertEqual(len(result["questions"]), 1)
        self.assertEqual([r.operation for r in provider.requests], ["quiz", "repair"])
        provider = FakeProvider("gemini", "broken", "still broken")
        with patch.object(domain, "get_ai_provider", return_value=provider), self.assertRaises(AIInvalidResponseError):
            domain.generate_quiz_from_text("Energia", 1)
        self.assertEqual(len(provider.requests), 2)

    def test_nonempty_failures_propagate_instead_of_becoming_none(self):
        for name in ("openai", "gemini"):
            for generate in (domain.generate_flashcards_from_text, domain.generate_quiz_from_text):
                for error in (AIAuthenticationError, AITimeoutError):
                    provider = FakeProvider(name, error("sanitized"))
                    with self.subTest(name=name, function=generate.__name__, error=error.__name__), patch.object(domain, "get_ai_provider", return_value=provider):
                        with self.assertRaises(error):
                            generate("Energia", 1)

    def test_chat_keeps_markdown_and_sanitizes_all_errors(self):
        for name in ("openai", "gemini"):
            provider = FakeProvider(name, "**Explicação**\n\n```python\nprint(42)\n```", RuntimeError("sensitive-secret-prompt"), " ")
            with patch.object(domain, "get_ai_provider", return_value=provider):
                result = domain.chat_about_flashcard("Explique", "F", "B", "Contexto", [{"user": str(i), "assistant": "Resposta"} for i in range(5)])
                self.assertIn("```python", result)
                for _ in range(2):
                    with self.assertLogs("app.ai_generator", level="WARNING") as logs:
                        result = domain.chat_about_flashcard("Explique", "F", "B", "Contexto")
                    self.assertNotIn("sensitive-secret-prompt", result + str(logs.output))
                    self.assertIn("Tente novamente", result)
            prompt = provider.requests[0].prompt
            self.assertNotIn("Usuário: 1\n", prompt)
            self.assertIn("Usuário: 2\n", prompt)

    def test_guided_schema_reuses_every_http_field_and_nested_definition(self):
        ai = GuidedStudyOutput.model_json_schema()
        http = schemas.GuidedStudyResponse.model_json_schema()
        self.assertEqual(ai["properties"], http["properties"])
        self.assertEqual(ai["$defs"], http["$defs"])
        Draft202012Validator.check_schema(strict_json_schema(GuidedStudyOutput))
        for name in ("openai", "gemini"):
            provider = FakeProvider(name, guided_payload())
            with patch.object(domain, "get_ai_provider", return_value=provider):
                result = domain.generate_guided_study_topics("Contexto", [dict(card(), id=1)], [dict(question(), id=2)])
            self.assertEqual(result, {"topics": [{"title": "Energia", "flashcard_ids": [1], "question_ids": [2]}]})
            from app.ai.providers.openai import _check_strict_schema
            _check_strict_schema(provider.requests[0].schema)

    def test_guided_unknown_duplicate_missing_and_wrong_kind_references_fail(self):
        cases = []
        p = guided_payload(); p["topics"][0]["steps"][0]["flashcard_id"] = 999; cases.append(p)
        p = guided_payload(); p["topics"][0]["steps"].append(copy.deepcopy(p["topics"][0]["steps"][0])); cases.append(p)
        p = guided_payload(); p["topics"][0]["steps"].pop(); cases.append(p)
        p = guided_payload(); p["topics"][0]["steps"][0]["type"] = "invented"; cases.append(p)
        p = guided_payload(); del p["summary"]; cases.append(p)
        for p in cases:
            provider = FakeProvider("openai", p)
            with patch.object(domain, "get_ai_provider", return_value=provider), self.assertRaises(AIInvalidResponseError):
                domain.generate_guided_study_topics("Contexto", [dict(card(), id=1)], [dict(question(), id=2)])

    def test_prompt_builders_are_pure_preserve_long_context_and_inference(self):
        text = "Conteúdo substantivo de programação. " * 600
        with patch.object(domain, "get_ai_provider", side_effect=AssertionError("not pure")):
            for builder in (domain._build_flashcards_prompt, domain._build_quiz_prompt):
                first = builder(text, 3, "Médio", "en")
                second = builder(text, 3, "Médio", "en")
                self.assertEqual(first, second)
                self.assertIn(domain._prepare_generation_source_text(text)[:15000], first)
            inferred = "\n".join(domain._build_flashcards_prompt("Estudar em inglês", 1))
            self.assertIn("ingles", inferred)

    def test_all_structured_schemas_are_strict_and_nullable_fields_are_required(self):
        from app.ai.providers.openai import _check_strict_schema
        for model in (FlashcardsOutput, QuizOutput, GuidedStudyOutput):
            _check_strict_schema(strict_json_schema(model))
        answer = strict_json_schema(QuizOutput)["$defs"]["QuizAnswerOutput"]
        self.assertIn("explanation", answer["required"])
        self.assertIn({"type": "null"}, answer["properties"]["explanation"]["anyOf"])
