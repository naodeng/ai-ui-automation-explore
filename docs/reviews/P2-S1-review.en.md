# P2 S1 Implementation Review

**Status:** The first local synthetic runtime slice is implemented. Rule states reflect the tested scope. The visual proposal was approved, and desktop/narrow layouts were checked against it.

## Implemented scope

- Added the S1 local service and UI on `develop`; the service binds only to `127.0.0.1:4181`.
- Each Run is isolated in process memory and starts from the fixed synthetic Seed.
- Covers pre-open denial, server Fake Clock, one successful purchase, the per-user limit, idempotent replay, five stock buckets, and a read-only Oracle.
- A successful purchase creates one direct `available → sold` movement. Queue simulation, reservation/release lifecycle, and real business data are absent.

## Rule status

| Rule | Status | Evidence and limits |
|---|---|---|
| S1-R01 | PASS | The API rejects a pre-open purchase without changing state; advancing the Fake Clock to the start boundary enables one synthetic purchase. The initial UI button is disabled. |
| S1-R02 | PARTIAL | UI/API regressions make 100 serial purchases and reject the 101st attempt. The Oracle confirms `available=0`, `sold=100`, all other buckets at 0, and 100 orders/movements. Concurrency and load were not tested, so this does not prove no-oversell under concurrent writes. |
| S1-R03 | PASS | A second purchase by the same user with a new idempotency key is rejected after the first success. |
| S1-R04 | PASS | Reusing an idempotency key returns the original order without changing stock buckets or movements. |
| S1-R05 | NOT RUN | Cancellation/timeout release timing is undefined and was not implemented; the Oracle exposes current stock buckets and movements only. |

## Verification record

- `npm test`: PASS, exit code 0. TypeScript passed; all 9 Node unit tests passed; E1's 5 API + 2 UI, M1's 6 API + 3 UI, and S1's 2 API + 4 UI tests passed.
- `.venv/bin/python -m unittest discover -s tests -v`: PASS, 16 tests.
- `.venv/bin/python scripts/validate_project.py`: PASS; `git -c core.whitespace=cr-at-eol diff --check -- . ':!archive/**'`: PASS. The historical archive remains read-only, and CSV CRLF is handled as line endings.
- Playwright screenshots were generated and reviewed at 1487×1058, 1440×900, 1024×900, 768×900, and 390×844 viewports; no horizontal overflow was found. Separate desktop screenshots cover purchase success and sold-out state.
- Environment: Node v26.13.1, npm 11.20.0, Playwright 1.65.1, Python 3.9.6. Playwright used the bundled headless Chromium and local loopback servers.

## Evidence

- Visual baseline: [S1 flash-sale concept](../../evidence/s1/design/s1-flash-sale-state-before-open-v2.png)
- Run and Oracle record: [S1 API record](../../evidence/s1/run-contexts/s1-r01-r04-api.json)
- Viewport screenshots: `evidence/s1/s1-design-baseline-pre-open.png`, `s1-desktop-pre-open.png`, `s1-tablet-landscape-pre-open.png`, `s1-tablet-portrait-pre-open.png`, `s1-mobile-pre-open.png`
- Successful purchase screenshot: `evidence/s1/s1-desktop-purchase-result.png`
- Sold-out screenshot and Oracle record: `evidence/s1/s1-desktop-sold-out.png`, `evidence/s1/run-contexts/s1-r02-serial-stockout.json`

## Not verified

- R02 server concurrency safety and load behavior.
- R05 cancellation/timeout release timing and exactly-once behavior.
- Queue semantics, ordering guarantees, and the eventual-consistency SLA.
- Real services, production data, payment, and AI browser-tool comparisons.

Queue semantics, effective-sold versus reserved definitions, and lifecycle boundaries remain unresolved in the contract; this change did not invent business rules.
