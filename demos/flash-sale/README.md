# S1 Flash Sale Demo

The local synthetic S1 demo implements the approved pre-open boundary, one effective successful purchase per synthetic user, idempotent reservations, a 30-second Fake Clock reservation lifecycle, five separate stock buckets, and a read-only `FlashSaleOracle`.

## Run locally

From the repository root:

```bash
npm run dev:s1
```

Open `http://127.0.0.1:4181/flash-sale`. The service binds only to loopback. All Runs are isolated in memory and use the fixed S1 Seed in `fixtures/seed-manifest.json`.

## Verify

```bash
npm run test:s1
```

This runs the TypeScript check plus the S1 API and Playwright UI suites. The complete project suite is `npm test`.

## Scope and limits

- A request before campaign start is rejected without changing stock. At the start boundary, one synthetic purchase first reserves one unit; simulated completion moves it to `sold`.
- A reservation expires 30 Fake Clock seconds after creation. Cancellation before expiry and timeout at `now >= expires_at` return the unit to `available` exactly once through `reserved → released → available` ledger movements. The `released` bucket is transient in the atomic release action; `pending_release` remains zero.
- Replaying an idempotency key returns the same order. An active reservation blocks another reservation for that user; after cancellation or timeout the user can retry, while a successful purchase enforces the one-success limit.
- The Oracle reports all five buckets, orders, immutable movements, campaign facts, and checksum. It reports facts without deriving an `effective_sold_quantity` field.
- R01, R03, R04, and R05 have targeted API/UI regressions. R02 includes 100 serial purchases and one bounded 101-request API concurrency run against the single-process local server. This is not production database concurrency evidence or load testing.
- Queue semantics, ordering guarantees, and consistency SLA remain out of scope. `/queue` explains the boundary without simulating queue behavior.
- No real products, accounts, purchases, or payments are used.

See the [S1 contract](../../contracts/cases/S1.yaml), [Oracle interface](../../contracts/oracles/README.md), [design baseline](../../docs/design/surfaces/s1-flash-sale.md), and [P2 S1 implementation review](../../docs/reviews/P2-S1-review.en.md).
