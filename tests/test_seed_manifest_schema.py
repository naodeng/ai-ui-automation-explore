"""Fixture manifest validation; no fixture state is created by these tests."""
import json
import unittest
from pathlib import Path

from jsonschema import Draft202012Validator, FormatChecker


ROOT = Path(__file__).resolve().parents[1]
SCHEMA_PATH = ROOT / "contracts" / "seed-manifest.schema.json"
MANIFEST_PATH = ROOT / "fixtures" / "seed-manifest.json"


class TestSeedManifestSchema(unittest.TestCase):
    def load_validator(self):
        schema = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))
        return Draft202012Validator(schema, format_checker=FormatChecker())

    def load_manifest(self):
        return json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))

    def test_documented_seed_manifest_matches_schema(self):
        self.assertTrue(SCHEMA_PATH.is_file(), "seed manifest schema is missing")
        manifest = self.load_manifest()
        validator = self.load_validator()

        errors = list(validator.iter_errors(manifest))

        self.assertEqual(errors, [], f"seed manifest: {errors}")

    def test_seed_rejects_unknown_case_id(self):
        manifest = self.load_manifest()
        manifest["cases"][0]["case_id"] = "X1"

        errors = list(self.load_validator().iter_errors(manifest))

        self.assertTrue(
            any(
                list(error.absolute_path) == ["cases", 0, "case_id"]
                for error in errors
            ),
            errors,
        )

    def test_seed_requires_at_least_one_synthetic_user(self):
        manifest = self.load_manifest()
        manifest["cases"][0]["synthetic_users"] = []

        errors = list(self.load_validator().iter_errors(manifest))

        self.assertTrue(
            any(
                list(error.absolute_path) == ["cases", 0, "synthetic_users"]
                for error in errors
            ),
            errors,
        )

    def test_manifest_has_one_seed_for_each_case(self):
        manifest = self.load_manifest()
        manifest["cases"][1]["case_id"] = "E1"

        errors = list(self.load_validator().iter_errors(manifest))

        self.assertTrue(
            any(list(error.absolute_path) == ["cases"] for error in errors),
            errors,
        )


if __name__ == "__main__":
    unittest.main()
