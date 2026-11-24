"""Negative cases for the existing execution and evidence schemas."""
import copy
import json
import unittest
from pathlib import Path

from jsonschema import Draft202012Validator, FormatChecker


ROOT = Path(__file__).resolve().parents[1]


def load_json(relative_path):
    return json.loads((ROOT / relative_path).read_text(encoding="utf-8"))


def validator_for(schema_name):
    schema = load_json(f"contracts/{schema_name}.schema.json")
    return Draft202012Validator(schema, format_checker=FormatChecker())


class TestSafetySchemas(unittest.TestCase):
    def test_charter_rejects_external_origin(self):
        charter = load_json("contracts/examples/E1-charter.json")
        charter["allowed_origin"] = "https://store.example.com"

        errors = list(validator_for("exploration-charter").iter_errors(charter))

        self.assertTrue(
            any(list(error.absolute_path) == ["allowed_origin"] for error in errors),
            errors,
        )

    def test_charter_rejects_negative_action_budget(self):
        charter = load_json("contracts/examples/E1-charter.json")
        charter["budget"]["max_actions"] = -1

        errors = list(validator_for("exploration-charter").iter_errors(charter))

        self.assertTrue(
            any(
                list(error.absolute_path) == ["budget", "max_actions"]
                for error in errors
            ),
            errors,
        )

    def test_run_manifest_rejects_unknown_case_id(self):
        manifest = load_json("contracts/examples/sample-run-manifest.json")
        manifest["case_id"] = "X1"

        errors = list(validator_for("run-manifest").iter_errors(manifest))

        self.assertTrue(
            any(list(error.absolute_path) == ["case_id"] for error in errors),
            errors,
        )

    def test_finding_rejects_confirmation_without_oracle_and_human_approval(self):
        finding = copy.deepcopy(load_json("contracts/examples/sample-finding.json"))
        finding["status"] = "confirmed_defect"
        finding.pop("oracle_evidence_id")

        errors = list(validator_for("finding").iter_errors(finding))
        self.assertTrue(
            any(
                error.validator == "required"
                and "oracle_evidence_id" in error.message
                for error in errors
            ),
            errors,
        )
        self.assertTrue(
            any(
                list(error.absolute_path) == ["human_review", "status"]
                for error in errors
            ),
            errors,
        )

    def test_evidence_rejects_placeholder_hash_shape(self):
        evidence = load_json("contracts/examples/sample-evidence.json")
        evidence["sha256"] = "not-a-digest"

        errors = list(validator_for("evidence").iter_errors(evidence))

        self.assertTrue(
            any(list(error.absolute_path) == ["sha256"] for error in errors), errors
        )


if __name__ == "__main__":
    unittest.main()
