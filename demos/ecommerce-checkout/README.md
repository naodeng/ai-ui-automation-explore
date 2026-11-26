# E1 Checkout Demo

This local synthetic demo exercises the approved E1 rules for the 99/100 coupon boundary, quote/order amount consistency, order idempotency, and C20's sandbox lifecycle. It binds only to `127.0.0.1`, stores state in memory, and never contacts a payment or fulfillment service.

## Run

From the repository root, with the pinned Node and npm dependencies installed:

```bash
npm run dev
```

Open `http://127.0.0.1:4179/`. A bare page creates a unique Run ID in the URL; each tab opened without a `run_id` receives a separate coupon and order state. API calls without a valid Run ID are rejected rather than sharing a default Run. Choose the synthetic $99 or $100 cart, review the server quote, and create a sandbox order. After order creation, simulate payment or cancel before payment; cancellation releases C20 for a later quote in the same run. Prices are selected from a server-owned synthetic catalog and calculated from the approved `contracts/cases/E1.yaml` contract. All state stays in process memory.

The process creates a random reset-control token in `.local/e1-control-token` with owner-only permissions. Browser code never receives it. Reset and Oracle routes are local test interfaces; reset requires that token, while the Oracle is read-only and fails closed for an unknown run, seed, or user. Stopping the server removes the token and discards in-memory runs.

To initialize another synthetic run while the server is running:

```bash
npm run demo:reset -- --case E1 --seed e1-threshold
```

The command prints the new `run_id` and deterministic state checksum. Open `http://127.0.0.1:4179/?run_id=<run_id>` to inspect that run.

## Blind-evaluation boundary mode

Normal `npm run dev` retains its existing single listener and deterministic-test behavior. The local code-level boundary mode requires explicit public and evaluator listener addresses:

```bash
E1_PUBLIC_HOST=127.0.0.1 PORT=4179 E1_EVALUATOR_HOST=127.0.0.1 E1_EVALUATOR_PORT=4180 npm run dev:blind-eval
```

The public listener serves the page and E1 business APIs. It returns 404 for `/__test/reset` and `/__test/oracle/checkout`, and blind-evaluation mode rejects `/api/orders`, simulated payment, and cancellation routes. The evaluator listener exposes only Reset/Oracle routes and requires the control token for both. `E1_EVALUATOR_HOST` must name a specific interface; wildcard addresses are rejected. The blind read-only charter grants no Oracle access or sandbox-order writes; cart selection and quote generation only affect the resettable in-memory Run.

Blind-evaluation mode uses `.local/e1-blind-control-token`, separate from the ordinary `.local/e1-control-token`. Use the same `E1_EVALUATOR_HOST` and `E1_EVALUATOR_PORT` with `npm run demo:reset -- --blind-eval --case E1 --seed e1-threshold` to reset through the evaluator listener. If both listeners bind to loopback, this checks application route separation only; it **does not prove Agent host/network isolation**. The optional OrbStack experiment below is separate from this demo; formal blind evaluation still needs a separately approved Explorer runtime and independent evaluator, with no Explorer access to the repository, source inspection, shell, or evaluator data.

## Optional local host-isolation experiment

The separate OrbStack machine is an optional host-isolation experiment, not part of this demo or a requirement for URL-driven browser testing. It has no E1 code or browser installed, cannot reach this Mac-hosted app, and blocks general internet access after `verify`; it is not currently usable to test this demo or an arbitrary URL. See [the OrbStack sandbox guide](../../scripts/orbstack/README.md). Agent and browser evaluation remain **NOT RUN**.

## Checks

```bash
npm run typecheck
npm run test:unit
npm run test:api
npm run test:e2e
npm test
```

Playwright uses its bundled headless Chromium. E2E tests save synthetic UI captures and matching Run ID, Seed ID, and fake-clock records under `evidence/e1/` for the 99/100 states and mobile viewport.

## Contract boundary

- Implemented: E1-R01 through E1-R04. Creating a C20-discounted sandbox order reserves the coupon; simulated payment marks it `sandbox_redeemed`; cancellation before payment releases it for a later quote. Repeated actions do not duplicate lifecycle events, and payment after cancellation or cancellation after payment is rejected.
- The read-only Oracle `coupon` and `coupon_ledger` report current coupon status and quote, reservation, simulated-use, and release events. `sandbox_redeemed` is a local demo ledger status, not a real redemption.
- `sandbox_paid` represents only a simulated payment state; there is no real payment, refund, fulfillment, coupon redemption, or persistence layer. Shipping and tax remain zero in the approved fixture; the demo does not infer whether they count toward the threshold.

See [P2 E1 review](../../docs/reviews/P2-E1-review.md) for the baseline and [P2 E1-R04 review](../../docs/reviews/P2-E1-R04-review.md) for the lifecycle implementation and verification. Chinese instructions are in [README.zh-CN.md](README.zh-CN.md).
