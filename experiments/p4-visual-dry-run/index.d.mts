type Observation = {
  case_id: string;
  rule_id: string;
  run_id: string;
  quote_id: string;
  ui: {
    displayed_payable_cents: number;
    displayed_discount_cents: number;
  };
};

type Oracle = {
  case_id: string;
  run_id: string;
  quotes: Array<{
    case_id: string;
    run_id: string;
    quote_id: string;
    payable_cents: number;
    discount_cents: number;
  }>;
};

export function reviewMockCandidate(input: { observation: Observation; oracle: Oracle }): {
  schema_version: "p4-visual-dry-run/v1";
  case_id: string;
  rule_id: string;
  run_id: string;
  quote_id: string;
  candidate_source: string;
  visual_inference: "NOT_RUN";
  model_invoked: false;
  external_request: false;
  observed_ui_cents: { payable: number; discount: number };
  oracle_cents: { payable: number; discount: number };
  delta_cents: { payable: number; discount: number };
  oracle_comparison: "mismatch" | "match";
  candidate_disposition: "oracle_supports_mismatch" | "oracle_does_not_support_mismatch";
  defect_confirmed: false;
  human_review_required: true;
};
