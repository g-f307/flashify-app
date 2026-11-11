#!/usr/bin/env python3
"""Run the sanitized migration dataset against the configured real provider.

Generated content is written only below validation-artifacts/ (gitignored). The
aggregated report contains no prompts or model output and is safe to copy into
the rollout record after human rubric scores are supplied.
"""
import argparse
import json
import logging
import os
from pathlib import Path

from app.ai.factory import clear_provider_cache, get_ai_provider
from app.ai.rollout_validation import Evaluation, OperationMetric, evaluate_gates, summarize_metrics
from app.ai_generator import (
    chat_about_flashcard, generate_flashcards_from_text,
    generate_guided_study_topics, generate_quiz_from_text,
)


class MetricCapture(logging.Handler):
    def __init__(self):
        super().__init__()
        self.events = []

    def emit(self, record):
        try:
            event = json.loads(record.getMessage())
        except (TypeError, ValueError):
            return
        if event.get("event") == "ai_call":
            self.events.append(event)


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--provider", choices=("openai", "gemini"), required=True)
    parser.add_argument("--dataset", type=Path, default=Path("tests/ai/migration_dataset.json"))
    parser.add_argument("--artifacts", type=Path, required=True)
    parser.add_argument("--evaluations", type=Path)
    parser.add_argument("--input-price", type=float, default=0.10,
                        help="USD per 1M input tokens; verify against official pricing before each run")
    parser.add_argument("--output-price", type=float, default=0.50,
                        help="USD per 1M output tokens; verify against official pricing before each run")
    parser.add_argument("--confirm-real-cost", action="store_true")
    return parser.parse_args()


def main():
    args = parse_args()
    if not args.confirm_real_cost:
        raise SystemExit("Refusing real API calls without --confirm-real-cost")
    os.environ["AI_PROVIDER"] = args.provider
    clear_provider_cache()
    provider = get_ai_provider()
    cases = json.loads(args.dataset.read_text(encoding="utf-8"))
    args.artifacts.mkdir(parents=True, exist_ok=True)

    capture = MetricCapture()
    provider_logger = logging.getLogger(f"app.ai.providers.{args.provider}")
    provider_logger.addHandler(capture)
    provider_logger.setLevel(logging.INFO)
    artifact_cases = []
    try:
        for case in cases:
            language = case["output_language"]
            flashcards = generate_flashcards_from_text(case["text"], 10, "Médio", language)
            quiz = generate_quiz_from_text(case["text"], 5, "Médio", language)
            indexed_flashcards = [dict(item, id=index) for index, item in enumerate(flashcards, 1)]
            indexed_questions = [dict(item, id=index) for index, item in enumerate(quiz["questions"], 1)]
            guided = generate_guided_study_topics(case["text"], indexed_flashcards, indexed_questions)
            history = []
            chat_outputs = []
            for message in case["chat"]:
                answer = chat_about_flashcard(
                    message, flashcards[0]["front"], flashcards[0]["back"], case["text"], history
                )
                history.append({"user": message, "assistant": answer})
                chat_outputs.append(answer)
            artifact_cases.append({
                "case_id": case["id"], "flashcards": flashcards, "quiz": quiz,
                "guided_study": guided, "chat": chat_outputs,
            })
    finally:
        provider_logger.removeHandler(capture)

    artifact_path = args.artifacts / f"{args.provider}-outputs.json"
    artifact_path.write_text(json.dumps(artifact_cases, ensure_ascii=False, indent=2), encoding="utf-8")
    metrics = []
    for event in capture.events:
        metrics.append(OperationMetric(
            operation=event["operation"], input_tokens=event.get("input_tokens") or 0,
            output_tokens=event.get("output_tokens") or 0, latency_ms=event["duration_ms"],
            first_call_success=bool(event["success"]), calls=1,
            supplements=int(event["operation"] == "completion"), retries=0,
        ))
    report = {
        "provider": args.provider,
        "model": provider.model,
        "dataset_cases": len(cases),
        "pricing_usd_per_million": {"input": args.input_price, "output": args.output_price},
        "metrics": summarize_metrics(metrics, input_usd_per_million=args.input_price,
                                     output_usd_per_million=args.output_price),
        "quality_gates": None,
    }
    if args.evaluations:
        raw = json.loads(args.evaluations.read_text(encoding="utf-8"))
        gate = evaluate_gates([Evaluation(**item) for item in raw])
        report["quality_gates"] = {
            "passed": gate.passed, "global_average": gate.global_average,
            "exact_delivery_rate": gate.exact_delivery_rate, "failures": gate.failures,
        }
    report_path = args.artifacts / f"{args.provider}-aggregate.json"
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(report_path)


if __name__ == "__main__":
    main()
