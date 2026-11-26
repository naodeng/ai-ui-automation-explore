/**
 * Compare a canned UI candidate with its correlated, read-only business Oracle.
 * This module does not inspect screenshots or invoke a model.
 */
export function reviewMockCandidate({ observation, oracle }) {
  if (!observation || !oracle || !Array.isArray(oracle.quotes)) {
    throw new Error("Invalid observation or Oracle evidence");
  }
  if (observation.case_id !== oracle.case_id || observation.run_id !== oracle.run_id) {
    throw new Error("Case or Run ID mismatch");
  }

  const quote = oracle.quotes.find((item) => item.quote_id === observation.quote_id);
  if (!quote) throw new Error("Oracle quote not found");
  if (quote.case_id !== observation.case_id || quote.run_id !== observation.run_id) {
    throw new Error("Oracle quote identity mismatch");
  }

  const amounts = [
    observation.ui?.displayed_payable_cents,
    observation.ui?.displayed_discount_cents,
    quote.payable_cents,
    quote.discount_cents,
  ];
  if (!amounts.every(Number.isSafeInteger)) throw new Error("Invalid candidate or Oracle amounts");

  const payableDeltaCents = observation.ui.displayed_payable_cents - quote.payable_cents;
  const discountDeltaCents = observation.ui.displayed_discount_cents - quote.discount_cents;
  const mismatch = payableDeltaCents !== 0 || discountDeltaCents !== 0;

  return {
    schema_version: "p4-visual-dry-run/v1",
    case_id: observation.case_id,
    rule_id: observation.rule_id,
    run_id: observation.run_id,
    quote_id: observation.quote_id,
    candidate_source: "fixed P3 seeded-fault evidence replay; not visual output",
    visual_inference: "NOT_RUN",
    model_invoked: false,
    external_request: false,
    observed_ui_cents: {
      payable: observation.ui.displayed_payable_cents,
      discount: observation.ui.displayed_discount_cents,
    },
    oracle_cents: {
      payable: quote.payable_cents,
      discount: quote.discount_cents,
    },
    delta_cents: {
      payable: payableDeltaCents,
      discount: discountDeltaCents,
    },
    oracle_comparison: mismatch ? "mismatch" : "match",
    candidate_disposition: mismatch ? "oracle_supports_mismatch" : "oracle_does_not_support_mismatch",
    defect_confirmed: false,
    human_review_required: true,
  };
}
