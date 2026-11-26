"""Contract validation tests; these are not browser or UI tests."""
import json
import unittest
from pathlib import Path

import yaml
from jsonschema import Draft202012Validator, FormatChecker


ROOT = Path(__file__).resolve().parents[1]
SCHEMA_PATH = ROOT / "contracts" / "case-contract.schema.json"


class TestCaseContractSchema(unittest.TestCase):
    def load_validator(self):
        schema = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))
        return Draft202012Validator(schema, format_checker=FormatChecker())

    def load_case(self, case_id):
        return yaml.safe_load(
            (ROOT / "contracts" / "cases" / f"{case_id}.yaml").read_text(
                encoding="utf-8"
            )
        )

    def test_current_case_contracts_validate_against_common_schema(self):
        self.assertTrue(SCHEMA_PATH.is_file(), "case contract schema is missing")
        validator = self.load_validator()

        for case_id in ("E1", "M1", "S1"):
            with self.subTest(case_id=case_id):
                contract = self.load_case(case_id)
                errors = list(validator.iter_errors(contract))
                self.assertEqual(errors, [], f"{case_id}: {errors}")

    def test_rule_without_read_only_oracle_is_rejected(self):
        contract = self.load_case("E1")
        contract["rules"][0].pop("oracle")

        errors = list(self.load_validator().iter_errors(contract))

        self.assertTrue(
            any(
                list(error.absolute_path) == ["rules", 0]
                and "oracle" in error.message
                for error in errors
            ),
            errors,
        )

    def test_rule_id_prefix_must_match_case_id(self):
        contract = self.load_case("E1")
        contract["rules"][0]["id"] = "M1-R01"

        errors = list(self.load_validator().iter_errors(contract))

        self.assertTrue(
            any(list(error.absolute_path) == ["rules", 0, "id"] for error in errors),
            errors,
        )

    def test_unresolved_questions_cannot_be_removed_before_approval(self):
        contract = self.load_case("E1")
        contract["unknowns_to_approve"] = []

        errors = list(self.load_validator().iter_errors(contract))

        self.assertTrue(
            any(list(error.absolute_path) == ["unknowns_to_approve"] for error in errors),
            errors,
        )


if __name__ == "__main__":
    unittest.main()
