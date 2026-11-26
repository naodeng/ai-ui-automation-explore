# S1 Flash Sale UI Baseline

**Status:** The pre-open and lifecycle visual proposals are approved and implemented; current API/UI verification evidence is recorded in the P2 S1 review.

## Baseline

![S1 flash-sale pre-open concept](../../../evidence/s1/design/s1-flash-sale-state-before-open-v2.png)

The page is a localhost-only synthetic QA console. It opens before the campaign start, shows a disabled purchase action, exposes a server Fake Clock control, separates the five stock buckets, and displays a read-only `FlashSaleOracle` area. Values such as the product name and Run/Seed labels in this concept are illustrative placeholders; implementation evidence is in the [S1 implementation review](../../../docs/reviews/P2-S1-review.en.md) and `evidence/s1/`.

## Contract mapping

- **S1-R01: PASS.** The button is disabled before start, the server rejects a purchase without changing stock, and the Fake Clock can advance to the start boundary.
- **S1-R02: PASS (bounded local scope).** The regression makes 100 serial purchases and rejects the 101st; a separate run fans out 101 API reservation requests to the single-process demo, expects 100 reservations and one rejection, completes the 100 accepted reservations, then checks exact stock conservation and unique orders. This does not prove production database concurrency or load behavior.
- **S1-R03: PASS.** After one synthetic user's successful purchase, a second purchase with a new idempotency key is rejected by the user limit.
- **S1-R04: PASS.** Replaying the same idempotency key returns the original order without adding stock movements or changing bucket counts.
- **S1-R05: PASS.** A purchase request reserves stock for 30 Fake Clock seconds. Completion changes `reserved → sold`; cancellation or `now >= expires_at` releases stock exactly once using the atomic movements `reserved → released → available`. Afterward the `released` and `pending_release` current buckets are zero, and a canceled/expired user may reserve again.

The lifecycle result view uses the approved desktop two-column and mobile single-column layout. Its real screenshots and Run evidence are listed in the [P2 S1 review](../../../docs/reviews/P2-S1-review.en.md).

## Out of scope for this proposal

- Real queue semantics, ordering guarantees, or an eventual-consistency SLA.
- Production traffic, multi-process/database races, and load testing.
- Queue semantics, ordering guarantees, and an eventual-consistency SLA.
- Real product, account, purchase, or payment data.

Queue semantics, the eventual-consistency SLA, production concurrency, and load testing remain outside this implementation.

## Approval gate

The deterministic campaign start instant and 30-second reservation expiry live in the synthetic Seed/contract as test data; they are not presented as production policy. Queue behavior remains undefined. Development remains directly on `develop`.
