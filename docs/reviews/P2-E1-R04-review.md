# P2 E1-R04 Lifecycle Implementation Review

**Updated:** 2026-11-26

**Status:** Implemented and pushed on `develop`; the full local regression and corresponding GitHub Actions run passed.

## Approved scope

The user approved the E1-R04 synthetic lifecycle and the desktop/mobile prototype:

- A discounted sandbox order reserves C20.
- Simulated payment changes the order to `sandbox_paid` and the coupon to `sandbox_redeemed` in the local ledger.
- Cancellation before simulated payment changes the order to `cancelled`, releases the coupon, and allows a later quote in the same Run to use C20 again.
- Repeated payment, cancellation, and order creation with the same idempotency key do not duplicate orders or lifecycle events. Payment after cancellation, cancellation after payment, and reuse of a stale discounted quote after reservation are rejected.

These are synthetic in-memory states. No real payment, refund, fulfillment, coupon redemption, or persistence is involved. The threshold rule for non-zero shipping and tax remains unresolved and outside this implementation.

## Implementation

- The E1 server tracks the current coupon status and reservation owner per Run. The read-only Checkout Oracle exposes that status and the quote, reservation, simulated-use, and release ledger events.
- A bare checkout page creates a unique Run ID and writes it to the URL. The server rejects cart API requests without a Run ID instead of sending new visitors into the shared `e1-local` state.
- The public listener in blind-evaluation mode rejects order creation, simulated payment, and cancellation. Reset and Oracle remain on the authenticated evaluator listener.
- The checkout UI now shows pending, simulated-paid, and cancelled states, with a mobile single-column layout. The approved prototype note and actual captures are in [`evidence/e1/design/e1-r04-lifecycle-prototype.zh-CN.md`](../../evidence/e1/design/e1-r04-lifecycle-prototype.zh-CN.md).
- The static project validator was also corrected to resolve catalog article and prompt paths as repository-relative paths. Its prior `relative_to('codex-prompts')` assumption raised `ValueError` after the catalog adopted `prompts/blog/...` paths.

## Verification

| Command | Result |
|---|---|
| `npm run typecheck` | PASS, exit 0 |
| `node --test tests/unit/e1-checkout.test.ts tests/unit/e1-blind-eval-boundary.test.ts` | PASS, 6 tests, exit 0 |
| `.venv/bin/python -m unittest discover -s tests -q` | PASS, 17 tests, exit 0 |
| `npx playwright test --project=api tests/e1/checkout.api.spec.ts` | PASS, 9 tests, exit 0 |
| `npx playwright test --project=ui tests/e1/checkout.ui.spec.ts` | PASS, 4 tests, exit 0 |
| `.venv/bin/python scripts/validate_project.py` | PASS, exit 0, including YAML and JSON Schema examples |
| `node --check demos/ecommerce-checkout/public/app.js && git diff --check` | PASS, exit 0 |
| `npm test` (latest cross-case regression) | PASS, exit 0; 24 Node unit tests and 34 E1/M1/S1 Playwright API/UI tests |

The latest `npm test` run passed 9 E1 API and 4 E1 UI tests, 7 M1 API and 4 M1 UI tests, and 5 S1 API and 5 S1 UI tests. The full run also passed TypeScript. The E1-focused runs and IDs below remain available as separately reproducible lifecycle evidence; the current complete test results are under `test-results/p3-evidence/`.

The tests used Seed `e1-threshold`, Fake Clock `2026-11-23T10:00:00Z`, Node `26.13.1`, Playwright Test `1.65.1`, and bundled Chromium `159.0.8154.6` for UI runs. Running the system Python initially failed because it did not have the required `jsonschema` dependency; the project virtual environment passed, and the startup guide now specifies `.venv/bin/python`. Relevant passing manifests, test results, Oracle responses, and SHA-256 Evidence Index files are under `test-results/p3-evidence/E1/`:

- Payment lifecycle: `E1-pw-4e344fcc-f0fa-4468-ae48-c571a989d138` (business Run `e1-5345d2ff-cb8a-4043-8c72-745ed012e452`).
- Cancel, release, and coupon reuse: `E1-pw-da512775-51e9-47a0-8940-3961e73252dc` (business Run `e1-91a016fa-9d99-4ef8-a078-1139e96557d6`).
- Stale discounted quote protection: `E1-pw-b7edb6ab-86df-473e-ad4e-b868fce8d856` (business Run `e1-7207af90-5c2d-43d8-a1d2-dbf7c6527095`).
- Desktop pending/paid UI and Oracle comparison: `E1-pw-e0cb99f4-17c7-4a95-aeda-e2f9b1d67ab3` (business Run `e1-86c315b9-774e-4fea-b0b8-6b891bd2e770`).
- Narrow-screen cancellation and reuse UI: `E1-pw-72140926-d72b-43dc-b925-3c16021a257c` (business Run `e1-e264887a-e10e-4392-8c06-d1447d87ff9d`).

The directly reviewable captures are [`pending desktop`](../../evidence/e1/e1-r04-pending-desktop.png), [`simulated payment desktop`](../../evidence/e1/e1-r04-paid-desktop.png), and [`cancellation mobile`](../../evidence/e1/e1-r04-cancelled-mobile.png). The API/UI runners initially hit the sandbox's `EPERM` on loopback binding; focused test commands were then run with sandbox escalation. A first UI check also exposed hidden checkout panels overriding the browser's default `[hidden]` styling; the layout rule was fixed and the final UI run passed.

## Limits and next step

- This verifies a single-process, in-memory synthetic state machine. It does not establish persistence, multi-process transaction guarantees, production coupon semantics, or load behavior.
- Commit `1a6c6fefc2600fe4869476bde420e7a3b72d0357` passed [GitHub Actions Run 45749348367](https://github.com/naodeng/ai-ui-automation-explore/actions/runs/45749348367): both `validate` and `playwright` jobs, including evidence artifact upload, succeeded.
- No further approval is needed for the approved E1-R04 flow. Shipping/tax threshold policy remains open; comparative visual tools and Agent exploration remain outside this demo implementation.
- The final local Playwright regression regenerated screenshots and Run contexts in the worktree; they can be compared with the CI artifact for the same implementation commit.

## 2026-11-26 review-fix follow-up

The E1 default Run collision was reproduced test-first by `npx playwright test --config=playwright.config.ts --grep 'E1 default run isolation'` (RED, exit 1): `/api/cart` without `run_id` returned 200 rather than 400, and bare pages had no independent Run IDs. After removing the server's shared default and assigning a unique ID to each bare page, the same command passed both API/UI tests (GREEN, exit 0). The full cross-case suite also passed. The M1 contract-example mismatch and historical S1 TDD evidence gap are recorded in the [demo review remediation note](P2-demo-review-fixes.zh-CN.md).
