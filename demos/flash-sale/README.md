# S1 Flash Sale Demo

The first local synthetic runtime slice for the S1 case. It implements the approved pre-open boundary, one purchase per synthetic user, idempotent replay, a server Fake Clock, five separate stock buckets, and a read-only `FlashSaleOracle`.

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

- The pre-open request is rejected without changing stock. Advancing the Fake Clock to the start boundary enables one synthetic purchase.
- A successful purchase moves one unit directly from `available` to `sold`. Replaying the same key returns the original order without another movement; a second key for the same user is rejected.
- The Oracle reports the five buckets, relevant orders, immutable movements, campaign facts, and checksum. It does not calculate an `effective_sold_quantity`.
- R01, R03, and R04 are covered by targeted regressions. R02 is partial: one purchase preserves the bucket total, but inventory exhaustion, concurrent writes, and load were not tested. R05 cancellation/timeout release behavior was not run.
- Queue semantics, ordering guarantees, the consistency SLA, and undefined cancellation/timeout timing remain out of scope. `/queue` explains the boundary without simulating queue behavior.
- No real products, accounts, purchases, or payments are used.

See the [S1 contract](../../contracts/cases/S1.yaml), [Oracle interface](../../contracts/oracles/README.md), [design baseline](../../docs/design/surfaces/s1-flash-sale.md), and [P2 S1 implementation review](../../docs/reviews/P2-S1-review.en.md).
