# AI UI Automation Explore

> English (canonical) · [简体中文](README.zh-CN.md)

**Project:** `ai-ui-automation-explore` · **Proposed owner:** `AI-Native-QA-Lab`

**Status:** E1 verified; M1 R01–R05 covered locally (R03 expiry is fixture-only); S1 R01–R05 covered, including a bounded 101-request single-process concurrency regression; comparative tool experiments **NOT RUN**
**Approach:** Local-first · TDD · Evidence-driven QA · Bilingual engineering documents

This repository explores and evaluates AI-powered browser tools for **maintainable Web UI automation testing**. Exploratory testing is important, but not the sole goal. The project includes reproducible synthetic business scenarios, tool experiments, automation baselines, evidence contracts, Codex prompts, and **co-located blog drafts**.

## Main scenarios

| ID | Business case | Primary QA concerns |
|---|---|---|
| E1 | Ecommerce coupon and checkout | 99/100 coupon boundary, idempotent orders, sandbox coupon reservation/payment/cancellation lifecycle |
| M1 | Membership upgrades and downgrades | tier transitions, old-session authorization, historical coupon expiry boundary |
| S1 | Flash sale | server start boundary, one effective success per synthetic user, idempotent reservation lifecycle and stock ledger |

All case rules in [`contracts/cases/`](contracts/cases/) are synthetic. The explicitly stated E1/M1/S1 demo rules are approved; queue semantics, production concurrency, and load remain outside scope. E1, M1, and S1 are runnable.

## What's included

- [Repository onboarding](00_START_HERE.md), [roadmap](docs/project/ROADMAP.zh-CN.md), [repository boundaries](docs/architecture/REPOSITORY_BOUNDARIES.zh-CN.md)
- [24 tools](data/tool-catalog.json) with individual research entries in [`tools/`](tools/)
- **23 tool-article outlines, one Playwright Test article draft, and four longer unverified drafts** in [`content/blog/drafts/`](content/blog/drafts/README.md)
- [Article index and editorial gates](content/blog/editorial/02-全工具目录.md)
- [Lab TDD / exploration plans](docs/lab/) and [Codex prompts](prompts/)
- [P0 readiness report](docs/reviews/P0-readiness-report.md)
- [P1 contract review](docs/reviews/P1-contract-review.md) (synthetic demo rules approved; unresolved behavior remains out of scope)
- [Read-only Oracle interfaces](contracts/oracles/README.md)
- [P2 E1 implementation review](docs/reviews/P2-E1-review.md)
- [P2 E1-R04 lifecycle review](docs/reviews/P2-E1-R04-review.md)
- [E1 checkout demo](demos/ecommerce-checkout/README.md)
- [M1 membership lifecycle demo](demos/membership-lifecycle/README.md)
- [P2 M1 implementation review](docs/reviews/P2-M1-review.md)
- [S1 flash-sale demo](demos/flash-sale/README.md)
- [P2 S1 implementation review](docs/reviews/P2-S1-review.md)
- [GitHub Actions quality gates](.github/workflows/static-checks.yml): Python checks and the complete E1/M1/S1 Playwright suite; per-case reports, failure traces, and synthetic Run evidence are uploaded for 14 days.
- Every E1/M1/S1 Playwright test emits its own schema-shaped Run Manifest and SHA-256 Evidence Index under `test-results/p3-evidence/`, with captured local request IDs, business Run IDs, Oracle responses, test output, and available failure attachments.
- [P3-A deterministic Playwright review](reports/P3_A_REVIEW.md): current case coverage, Run IDs, evidence, and remaining gaps.
- [P4-B visual dry-run review](reports/P4_B_REVIEW.md): local mock of the Oracle review gate; no model or screenshot upload was used.
- [Optional OrbStack host-isolation experiment](scripts/orbstack/README.md): not required for URL-driven browser testing; Agent **NOT RUN**.
- [Static package check](scripts/validate_project.py) and [baseline tests](tests/)
- [Two preserved earlier source packages](archive/) — historical, read-only

## Blog publishing boundary

**This repository owns the canonical drafts.** Once an article passes source review, actual reproduction, QA review and human approval, manually publish the same Markdown to `naodeng/inaodeng.com`. The website and WeChat should use one final article, not competing draft copies.

## Related projects

- [`AI-Native-QA-Lab/ai-automation-test-starter`](https://github.com/AI-Native-QA-Lab/ai-automation-test-starter): transferable beginner-first test starter patterns
- [`AI-Native-QA-Lab/bugmaster`](https://github.com/AI-Native-QA-Lab/bugmaster): potential downstream consumer of verified exploration techniques
- [`naodeng/inaodeng.com`](https://github.com/naodeng/inaodeng.com): publishing destination, **not** the draft workspace

## Current limitations

This workspace has a configured `origin` and a local `develop` branch; the imported v1.0 package itself did not create or verify that remote. The original v1.0 package contained project documentation and plans, not runnable business demos; the E1, M1, and S1 implementations described here are subsequent workspace work. They use synthetic in-memory data and local Playwright tests. M1's coupon expiry is a fixed synthetic fixture value, not a real membership policy. S1's 101-request regression covers one local Node process only; it does not prove cross-process/database concurrency or load behavior. Queue semantics and consistency SLA remain undefined. No production service or AI browser-tool comparison has been run. Do not report benchmark results or real defect discovery based on these demos. Licensing must be decided before adding a public license or copying third-party code.
