"""Executable rollout gates for the final provider migration."""
import json
import unittest
from pathlib import Path

from app.ai.rollout_validation import Evaluation, OperationMetric, evaluate_gates, summarize_metrics
from app import tasks


class MigrationRolloutTests(unittest.TestCase):
    def test_dataset_covers_every_required_scenario_without_private_fields(self):
        dataset_path = Path(__file__).with_name("migration_dataset.json")
        cases = json.loads(dataset_path.read_text(encoding="utf-8"))

        self.assertGreaterEqual(len(cases), 12)
        categories = {case["category"] for case in cases}
        self.assertTrue({"humanities", "exact_sciences", "programming"}.issubset(categories))
        self.assertGreaterEqual(sum(case["size"] == "short" for case in cases), 3)
        self.assertGreaterEqual(sum(case["size"] == "long" for case in cases), 3)
        self.assertGreaterEqual(sum(case["source_language"] == "en" and case["output_language"] == "en" for case in cases), 2)
        self.assertGreaterEqual(sum(case["source_language"] == "en" and case["output_language"] == "pt-BR" for case in cases), 1)
        features = {feature for case in cases for feature in case["features"]}
        self.assertTrue({"latex", "code_html", "noisy_metadata"}.issubset(features))
        for case in cases:
            self.assertEqual(
                set(case),
                {"id", "category", "size", "source_language", "output_language", "features", "text", "chat"},
            )
            self.assertEqual(len(case["chat"]), 3)
            self.assertNotIn("email", json.dumps(case).lower())

    def test_absolute_quality_gates_reject_zero_and_low_exact_delivery(self):
        passing = [Evaluation(case_id=f"case-{index}", scores={
            "fidelity": 2, "factual_correctness": 2, "difficulty": 2, "clarity": 2,
            "no_duplicates": 2, "language": 2, "formats": 2, "structure": 2,
        }, exact_delivery=True, quiz_valid=True, schema_valid=True) for index in range(20)]
        result = evaluate_gates(passing)
        self.assertTrue(result.passed)
        self.assertEqual(result.global_average, 2.0)

        passing[0] = Evaluation(case_id="bad", scores={
            "fidelity": 2, "factual_correctness": 0, "difficulty": 2, "clarity": 2,
            "no_duplicates": 2, "language": 2, "formats": 2, "structure": 2,
        }, exact_delivery=False, quiz_valid=True, schema_valid=True)
        passing[1] = Evaluation(case_id="missing", scores=passing[1].scores,
                                exact_delivery=False, quiz_valid=True, schema_valid=True)
        result = evaluate_gates(passing)
        self.assertFalse(result.passed)
        self.assertIn("zero_critical_score", result.failures)
        self.assertIn("exact_delivery_below_95_percent", result.failures)

    def test_metrics_use_real_tokens_and_report_latency_and_cost(self):
        metrics = [
            OperationMetric("flashcards", 100, 20, 1_000, True, 1, 0, 0),
            OperationMetric("flashcards", 300, 40, 3_000, True, 2, 1, 0),
            OperationMetric("quiz", 200, 50, 2_000, False, 1, 0, 1),
        ]
        report = summarize_metrics(metrics, input_usd_per_million=1.0, output_usd_per_million=4.0)
        self.assertEqual(report["total"]["input_tokens"], 600)
        self.assertEqual(report["total"]["output_tokens"], 110)
        self.assertAlmostEqual(report["total"]["cost_usd"], 0.00104)
        self.assertEqual(report["total"]["calls"], 4)
        self.assertEqual(report["total"]["supplements"], 1)
        self.assertEqual(report["total"]["retries"], 1)
        self.assertEqual(report["flashcards"]["latency_ms_p50"], 1_000)
        self.assertEqual(report["flashcards"]["latency_ms_p95"], 3_000)
        self.assertEqual(report["flashcards"]["latency_ms_max"], 3_000)

    def test_celery_retry_policy_is_bounded_exponential_with_jitter(self):
        task = tasks.process_document
        self.assertEqual(task.max_retries, 3)
        self.assertEqual(task.retry_backoff, 60)
        self.assertEqual(task.retry_backoff_max, 600)
        self.assertTrue(task.retry_jitter)


if __name__ == "__main__":
    unittest.main()
