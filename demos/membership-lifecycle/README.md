# M1 Membership Lifecycle Demo

M1 is a local-only synthetic demo for the approved membership lifecycle rules and transition examples. It has an in-memory Node service, a responsive state-overview UI, fixture-only scenario operations, and a read-only membership Oracle.

## Run locally

Start from the repository root with npm run dev:m1. Open http://127.0.0.1:4180/. The server binds to loopback and uses the M1 entry in fixtures/seed-manifest.json. Each new page session receives a unique in-memory Run; resetting or running a transition creates a fresh Run. Restarting the server clears all Runs.

## Synthetic operations

- **Silver → Gold:** prepares a Silver fixture, applies a strictly newer threshold_reached event, then reads the Gold-only authorization result.
- **Gold → Silver:** applies a strictly newer renewal_failed_at_period_end event and probes the still-available old session for a new Gold-only purchase.
- **Platinum → Gold:** applies the approved renewal_failed_at_period_end transition example after preparing a synthetic Platinum fixture. It observes tier and event version only; it does not claim a Gold-only authorization result for this scenario.
- **Event replay:** records a duplicate-current or older-version replay attempt without changing the effective tier or event version.
- **Fake Clock:** advances the selected Run by at most 30 simulated seconds per action. The synthetic historical coupon expires at `2026-11-23T10:00:30Z`; it remains valid before that instant and is expired at or after it.

No purchase is created. All state and replay records remain in process memory. The Oracle endpoints are read-only:

- GET /api/state?run_id=...
- GET /api/oracle?run_id=...
- GET /api/authorization?run_id=...&session_kind=current|old

The bounded fixture operations use POST /api/runs, POST /api/scenarios/run, POST /api/events/replay, and POST /api/clock/advance.

## Verification

Run npm run test:m1.

M1-R01–R05 have API/UI regression coverage. M1-R03 checks the synthetic fixture's valid-before/expired-at boundary at `2026-11-23T10:00:30Z`; that timestamp is not a real coupon policy. The full cross-case `npm test` regression passes; see [the P2 M1 review](../../docs/reviews/P2-M1-review.md) for the exact run and limits.

## Contract boundaries

The demo does not implement real tier calculations, billing cycles, unclaimed coupons, additional benefits, or production member records. It does not create purchases or contact payment services. The coupon expiry is a synthetic fixture value, not a real membership or coupon policy. M1-R05 covers the local immediate update path; delayed network propagation is not measured.
