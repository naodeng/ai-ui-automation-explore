# P2 S1 Implementation Review

**Status:** The S1 synthetic demo implements all five approved rules. The latest cross-case local regression and lifecycle viewport checks passed.

## Implemented scope

- The local service binds only to `127.0.0.1:4181`; each Run is isolated in memory and starts from the fixed synthetic Seed.
- A purchase request creates a 30-second Fake Clock reservation. Simulated completion changes `reserved → sold`; cancellation and timeout return stock through `reserved → released → available` as an exactly-once atomic action.
- Only `success` counts as an effective purchase. A canceled or expired user can reserve again; a successful user cannot exceed the one-success limit.
- The read-only Oracle exposes campaign facts, five stock buckets, orders, immutable movements, and a checksum. No queue, payment, fulfillment, or real business data is involved.
- The bounded R02 API check sends 101 parallel reservation requests to the local single-process server, then completes the 100 accepted reservations. This is a local regression only, not a production database race or load benchmark.

## Rule status

| Rule | Status | Evidence and limits |
|---|---|---|
| S1-R01 | PASS | The API rejects a pre-open request without changing stock; advancing Fake Clock to campaign start enables reservation. |
| S1-R02 | PASS (bounded local scope) | 100 serial purchases still exhaust stock and reject the 101st. A separate 101-request local API run reserves exactly 100 units, rejects one request, completes 100 unique orders, and checks final bucket conservation. Cross-process/database behavior and load are not covered. |
| S1-R03 | PASS | After completion, a second purchase with a new idempotency key is rejected for the same user. Active reservations also prevent duplicate active reservations. |
| S1-R04 | PASS | Reusing an idempotency key returns the same order without adding a reservation or movement. Repeated completion/cancellation keeps the terminal state and does not duplicate movements. |
| S1-R05 | PASS | Cancellation releases immediately; Fake Clock expiry releases at `now >= expires_at`. Both return stock exactly once and allow a later reservation. Completion after release is rejected. |

## Verification record

- `npm test`: PASS, exit code 0. TypeScript and 24 Node unit tests passed; E1 passed 9 API/4 UI, M1 passed 7 API/4 UI, and S1 passed 5 API/5 UI tests, for 34 Playwright tests total.
- S1 API coverage includes the bounded 101-request concurrency check and stock conservation after completing the 100 accepted reservations. All five S1 UI tests passed, including desktop and 390px narrow-screen cancellation/timeout flows.
- `.venv/bin/python -m unittest discover -s tests -q`: PASS, 17 tests; `.venv/bin/python scripts/validate_project.py`: PASS.
- `node --check demos/flash-sale/public/app.js && git diff --check`: PASS.
- Playwright API/UI tests use the project-bundled headless Chromium. Local loopback tests required a one-time sandbox escalation after `EPERM`; they were not retried inside the sandbox.

## Evidence

- Pre-open visual baseline: [S1 flash-sale concept](../../evidence/s1/design/s1-flash-sale-state-before-open-v2.png)
- Approved lifecycle proposal: [desktop](../../evidence/s1/design/s1-r05-lifecycle-desktop-proposal.png), [narrow screen](../../evidence/s1/design/s1-r05-lifecycle-mobile-proposal.png), [decision record](../../evidence/s1/design/s1-r05-lifecycle-prototype.zh-CN.md)
- API and Oracle baseline: [R01–R04 record](../../evidence/s1/run-contexts/s1-r01-r04-api.json)
- Bounded concurrency: [R02 concurrent record](../../evidence/s1/run-contexts/s1-r02-concurrent-reservations.json)
- Serial stock exhaustion: [R02 serial record](../../evidence/s1/run-contexts/s1-r02-serial-stockout.json)
- Lifecycle screenshots: desktop `evidence/s1/s1-r05-reserved-desktop.png`, `s1-r05-cancelled-desktop.png`, `s1-r05-expired-desktop.png`; narrow screen `s1-r05-reserved-mobile.png`, `s1-r05-cancelled-mobile.png`, `s1-r05-expired-mobile.png`; plus `s1-desktop-purchase-result.png`.

## Limits

- The concurrency test covers one in-memory Node process and does not prove atomicity across processes or a database.
- No load testing, production traffic, queue semantics, ordering guarantees, or consistency SLA were run.
- `pending_release` stays zero. The `released` bucket is transient during the two immutable movements in one synchronous release action and is zero in the final snapshot; the inventory equation still conserves the initial stock.
- No real product, account, purchase, payment, or fulfillment is used.
- The historical S1-R05 implementation record retains the final passing result but not the original RED command and failure output. Its TDD process evidence is incomplete; this review does not retroactively describe the existing GREEN regression as an observed RED→GREEN cycle. The missing historical output cannot be reconstructed honestly.
