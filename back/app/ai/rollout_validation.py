"""Pure aggregation and objective gates for AI migration validation runs."""
from dataclasses import dataclass
from math import ceil
from typing import Mapping, Sequence


RUBRIC_DIMENSIONS = (
    "fidelity", "factual_correctness", "difficulty", "clarity",
    "no_duplicates", "language", "formats", "structure",
)


@dataclass(frozen=True)
class Evaluation:
    case_id: str
    scores: Mapping[str, int]
    exact_delivery: bool
    quiz_valid: bool
    schema_valid: bool


@dataclass(frozen=True)
class GateResult:
    passed: bool
    global_average: float
    exact_delivery_rate: float
    failures: tuple[str, ...]


@dataclass(frozen=True)
class OperationMetric:
    operation: str
    input_tokens: int
    output_tokens: int
    latency_ms: float
    first_call_success: bool
    calls: int
    supplements: int
    retries: int


def evaluate_gates(evaluations: Sequence[Evaluation]) -> GateResult:
    if not evaluations:
        return GateResult(False, 0.0, 0.0, ("empty_evaluation",))
    failures: list[str] = []
    all_scores: list[int] = []
    for evaluation in evaluations:
        if set(evaluation.scores) != set(RUBRIC_DIMENSIONS):
            failures.append("incomplete_rubric")
            continue
        if any(not isinstance(score, int) or score < 0 or score > 2 for score in evaluation.scores.values()):
            failures.append("invalid_score")
            continue
        if evaluation.scores["factual_correctness"] == 0 or evaluation.scores["structure"] == 0:
            failures.append("zero_critical_score")
        if not evaluation.quiz_valid:
            failures.append("invalid_quiz")
        if not evaluation.schema_valid:
            failures.append("invalid_persisted_schema")
        all_scores.extend(evaluation.scores.values())
    average = sum(all_scores) / len(all_scores) if all_scores else 0.0
    exact_rate = sum(item.exact_delivery for item in evaluations) / len(evaluations)
    if average < 1.7:
        failures.append("global_average_below_1_7")
    if exact_rate < 0.95:
        failures.append("exact_delivery_below_95_percent")
    unique_failures = tuple(dict.fromkeys(failures))
    return GateResult(not unique_failures, round(average, 4), round(exact_rate, 4), unique_failures)


def _percentile(values: Sequence[float], percentile: float) -> float:
    ordered = sorted(values)
    return ordered[max(0, ceil(percentile * len(ordered)) - 1)]


def summarize_metrics(metrics: Sequence[OperationMetric], *, input_usd_per_million: float,
                      output_usd_per_million: float) -> dict[str, dict]:
    groups: dict[str, list[OperationMetric]] = {"total": list(metrics)}
    for metric in metrics:
        groups.setdefault(metric.operation, []).append(metric)
    report: dict[str, dict] = {}
    for name, items in groups.items():
        input_tokens = sum(item.input_tokens for item in items)
        output_tokens = sum(item.output_tokens for item in items)
        latencies = [item.latency_ms for item in items]
        report[name] = {
            "runs": len(items),
            "calls": sum(item.calls for item in items),
            "supplements": sum(item.supplements for item in items),
            "retries": sum(item.retries for item in items),
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "cost_usd": round(
                input_tokens * input_usd_per_million / 1_000_000
                + output_tokens * output_usd_per_million / 1_000_000,
                8,
            ),
            "first_call_success_rate": round(
                sum(item.first_call_success for item in items) / len(items), 4
            ),
            "latency_ms_p50": _percentile(latencies, 0.50),
            "latency_ms_p95": _percentile(latencies, 0.95),
            "latency_ms_max": max(latencies),
        }
    return report
