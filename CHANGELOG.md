# Changelog

> English (canonical) · [简体中文](CHANGELOG.zh-CN.md)

## Unreleased

- Implement the first S1 local synthetic flash-sale slice with a server Fake Clock, per-user limit, idempotent replay, five stock buckets, a read-only Oracle, and a serial stock-exhaustion regression.
- Add S1 API/UI regressions, responsive screenshots, Run evidence, bilingual implementation notes, and rule-level scope reporting.
- Strengthen the E1 99-boundary UI regression with a same-Run Oracle comparison; prove fault sensitivity with two independent local seeded-fault RED runs and hash-indexed evidence. The temporary fault was removed and is not a product defect.
- Add GitHub Actions quality gates for Python and E1/M1/S1 Playwright suites; retain per-case reports, failure traces, and synthetic evidence as workflow artifacts.
- Emit per-test Run Manifests and SHA-256 Evidence Indexes with local request correlations, business Run IDs, Oracle snapshots, test results, and available failure attachments.
- Verify E1/M1/S1 with `npm test`; verify repository structure and schemas with 16 Python unit tests and `scripts/validate_project.py`.

## v1.0 — 2026-11-24

- Adopt canonical project name `ai-ui-automation-explore`.
- Integrate previous Codex planning kit (84 files) and tool blog series (74 files), preserving their original state under `archive/`.
- Make 24 tool article outlines and 4 long-form unverified articles the canonical editable drafts under `content/blog/drafts/`.
- Add project charter, MVP roadmap, boundaries, TDD gates, licensing review, Codex prompts and static validation.
- No GitHub remote repository creation, Demo implementation, browser execution or benchmark result is claimed.
