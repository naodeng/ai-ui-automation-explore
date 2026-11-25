# Read-only business Oracle interfaces

> English (canonical) · [简体中文](README.zh-CN.md)

**Status:** The E1 `CheckoutOracle`, M1 `MembershipOracle`, and first-slice S1 `FlashSaleOracle` are implemented as read-only observations. S1 does not model queue, cancellation, or timeout-release behavior.

Each Oracle exposes read-only observations for one synthetic `run_id` and `seed_id`. It must never reset data, advance the clock, submit an order, change membership, or inject a fault. A caller that supplies an unknown run must receive a not-found result; it must not fall back to another run or to global state.

Responses should include `case_id`, `run_id`, `seed_id`, and `observed_at`. `observed_at` comes from the run-scoped fake clock so the observation can be paired with the state under test. Deterministic test runners may receive read-only Oracle access. A blind Explorer receives no Oracle route or credential; only the evaluator reads the Oracle after the Explorer result is sealed. This is enforced by separate listeners and host/network controls, not CORS or prompt instructions.

## CheckoutOracle (E1 implemented)

`GET /__test/oracle/checkout?run_id=...&seed_id=...&user_id=...&quote_id=...&order_id=...`

In normal local-demo mode, this endpoint is exposed through the E1 loopback service. In blind-evaluation mode, it is exposed only through the evaluator listener and requires the evaluator control token; the public listener returns not-found. The deployment must bind the evaluator listener to an evaluator-only interface. It requires the matching `run_id`, `seed_id`, and synthetic `user_id`; optional quote and order IDs filter the returned records. Unknown or mismatched run identities return not found without falling back to another run.

Return the authoritative quote and order facts for the requested synthetic user:

- quote subtotal, coupon code, discount, shipping, tax, and payable amount;
- quote-only coupon observations for that quote or order; E1 records `discount_applied_to_quote` and does not model locking, redemption, payment, or cancellation;
- the requested order's status and payable amount, when an `order_id` is supplied.

The response reports shipping and tax separately. The approved E1 fixture sets both to zero. No conclusion is made about whether either amount should count toward a nonzero coupon threshold.

## MembershipOracle (M1 implemented)

M1 exposes its membership facts from the local membership demo's test observation API. It returns `run_id`, `seed_id`, the fake-clock observation time, the effective membership tier, latest event version, authorization for a requested resource/session, and the member's entitlement facts. It does not infer policies for unclaimed coupons or unspecified benefits.

## FlashSaleOracle (S1 first slice implemented)

`GET /__test/oracle/flash-sale?run_id=...&seed_id=...&campaign_id=...&sku_id=...&user_id=...`

The loopback-only S1 service returns the matching campaign state and start time, all five stock buckets, relevant orders, immutable stock movements, and a ledger checksum. Unknown or mismatched run, seed, campaign, or SKU identities fail closed.

The Oracle reports the facts without deciding which order states count as effective sold quantity. That definition and the queue consistency SLA remain open in S1. The current slice makes one direct `available → sold` movement for a successful local purchase; reservation, cancellation, and timeout-release paths are not implemented. One successful purchase does not prove exhaustion safety or server concurrency behavior.

## Evidence requirements

Persist a sanitized response with the same `run_id`, `seed_id`, and `observed_at` as the UI or API test. Link applicable `rule_id` values in the evidence index. An Oracle response is an observation of backend facts; mapping those facts to a confirmed defect still requires an approved rule, reproducible evidence, and human review.
