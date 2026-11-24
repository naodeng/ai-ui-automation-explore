# M1 Membership Lifecycle Demo

M1 is a local-only synthetic demo for the approved Silver/Gold lifecycle rules. It has an in-memory Node service, a responsive state-overview UI, fixture-only scenario operations, and a read-only membership Oracle.

## Run locally

Start from the repository root with npm run dev:m1. Open http://127.0.0.1:4180/. The server binds to loopback and uses the M1 entry in fixtures/seed-manifest.json. Each new page session receives a unique in-memory Run; resetting or running a transition creates a fresh Run. Restarting the server clears all Runs.

## Synthetic operations

- **Silver → Gold:** prepares a Silver fixture, applies a strictly newer threshold_reached event, then reads the Gold-only authorization result.
- **Gold → Silver:** applies a strictly newer renewal_failed_at_period_end event and probes the still-available old session for a new Gold-only purchase.
- **Event replay:** records a duplicate-current or older-version replay attempt without changing the effective tier or event version.
- **Fake Clock:** advances the selected Run by at most 30 simulated seconds per action. The seeded coupon is known valid at the seed instant; after time advances, expiry status becomes not_evaluated because the contract does not define an exact expiry.

No purchase is created. All state and replay records remain in process memory. The Oracle endpoints are read-only:

- GET /api/state?run_id=...
- GET /api/oracle?run_id=...
- GET /api/authorization?run_id=...&session_kind=current|old

The bounded fixture operations use POST /api/runs, POST /api/scenarios/run, POST /api/events/replay, and POST /api/clock/advance.

## Verification

Run npm run test:m1.

M1-R01, M1-R02, M1-R04, and immediate M1-R05 UI synchronization have direct API/UI regression coverage. The seed coupon state and fake clock are covered without inventing an expiry date; behavior beyond the seed instant remains unknown. See [the P2 M1 review](../../docs/reviews/P2-M1-review.md) for screenshots and limits.

## Contract boundaries

The demo does not implement real tier calculations, billing cycles, unclaimed coupons, additional benefits, or production member records. It does not create purchases or contact payment services. M1-R03 after the actual coupon expiry and the independent M1-R05 propagation SLA remain unverified because their required expiry/observation details are not available in the approved contract.
