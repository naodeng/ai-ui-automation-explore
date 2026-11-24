# E1 Checkout Demo

This local synthetic demo exercises the approved E1 rules for the 99/100 coupon boundary, quote/order amount consistency, and order idempotency. It binds only to `127.0.0.1`, stores state in memory, and never contacts a payment or fulfillment service.

## Run

From the repository root, with the pinned Node and npm dependencies installed:

```bash
npm run dev
```

Open `http://127.0.0.1:4179/`. Choose the synthetic $99 or $100 cart, review the server quote, and create a sandbox order. The UI passes a run ID; prices are selected from a server-owned synthetic catalog and calculated from the approved `contracts/cases/E1.yaml` contract.

The process creates a random reset-control token in `.local/e1-control-token` with owner-only permissions. Browser code never receives it. Reset and Oracle routes are local test interfaces; reset requires that token, while the Oracle is read-only and fails closed for an unknown run, seed, or user. Stopping the server removes the token and discards in-memory runs.

To initialize another synthetic run while the server is running:

```bash
npm run demo:reset -- --case E1 --seed e1-threshold
```

The command prints the new `run_id` and deterministic state checksum. Open `http://127.0.0.1:4179/?run_id=<run_id>` to inspect that run.

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

- Implemented: E1-R01, E1-R02, and E1-R03.
- Deferred: E1-R04 coupon locking, payment, cancellation, and redemption lifecycle; shipping and tax remain the zero values in the approved fixture. No lifecycle rule is inferred from the quote event.
- Oracle `coupon_ledger` records only a discount applied to a quote. It does not report a coupon as reserved or redeemed.
- Orders remain `sandbox_created`; no payment, refund, fulfillment, or persistence layer exists.

See [P2 E1 review](../../docs/reviews/P2-E1-review.md) for the implementation scope and verified results. 中文说明见 [README.zh-CN.md](README.zh-CN.md).
