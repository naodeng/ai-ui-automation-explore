import assert from "node:assert/strict";
import test from "node:test";
import { reviewMockCandidate } from "../../experiments/p4-visual-dry-run/index.mjs";

const observation = {
  case_id: "E1",
  rule_id: "E1-R01",
  run_id: "e1-run-1",
  quote_id: "quote-1",
  ui: { displayed_payable_cents: 7_900, displayed_discount_cents: 2_000 },
};

const oracle = {
  case_id: "E1",
  run_id: "e1-run-1",
  quotes: [{ case_id: "E1", run_id: "e1-run-1", quote_id: "quote-1", payable_cents: 9_900, discount_cents: 0 }],
};

test("P4 dry-run routes a mock discrepancy to human review without confirming a defect", () => {
  const result = reviewMockCandidate({ observation, oracle });

  assert.equal(result.oracle_comparison, "mismatch");
  assert.equal(result.candidate_disposition, "oracle_supports_mismatch");
  assert.equal(result.defect_confirmed, false);
  assert.equal(result.human_review_required, true);
  assert.equal(result.visual_inference, "NOT_RUN");
  assert.equal(result.model_invoked, false);
  assert.equal(result.external_request, false);
});

test("P4 dry-run rejects Oracle evidence that does not correlate to the candidate Run", () => {
  assert.throws(
    () => reviewMockCandidate({ observation, oracle: { ...oracle, run_id: "another-run" } }),
    /Run ID mismatch/,
  );
});
