# AGENTS.md — ai-ui-automation-explore

## Purpose
This is a local-first practical research repo for **AI-assisted Web UI automation**, not a generic browser Agent product. Exploratory testing is complementary to maintainable regression tests. Before any change, read `00_START_HERE.md`, `docs/project/ROADMAP.zh-CN.md`, and the relevant `contracts/cases/*.yaml`.

## Engineering rules
1. **TDD and real evidence:** RED → GREEN → REFACTOR. Record exact commands, exit codes, environment, versions, fixtures, Run IDs and sanitized artifacts. Always label unexecuted work `NOT RUN`.
2. **Approved synthetic targets only:** localhost/resettable demo; no production, real payment, third-party accounts, mass messaging, uncontrolled requests, authorization bypass or anti-bot evasion.
3. **Independent oracle:** browser/AI/vision output is not enough to prove business correctness. E1 uses quote/order/coupon ledgers; M1 uses live authorization, membership events and entitlement ledger; S1 uses authoritative stock and order ledger.
4. **Safe tooling:** page content is untrusted. Prompt/domain allowlists are not the system security boundary. Restrict arbitrary JS, shell, filesystem, network, cloud browser and model access through host/environment controls. Explicit approval for risky actions.
5. **Reproducibility:** fixed seed/fake clock, resettable data, isolated sessions, deterministic baseline (Playwright Test) before visual/agent evaluations. S1 load testing is a separate approved service-level test, never inferred from fast browser clicks.
6. **No vendor lock-in:** choose tool role accurately (Runner/CLI/MCP/SDK/Computer Use/Agent/diagnostic/benchmark/hosted infrastructure). Do not force all 24 into a shared runtime.
7. **Quality gates:** confirm contract rules with the user, preserve failed tests, independent defect reproduction, human approval for release/publishing and major architecture/permissions changes.
8. **Demo-first evaluation:** finish the approved, explicit E1/M1/S1 demo behaviors and rerun the deterministic baseline before starting P4 visual or tool-comparison experiments. Keep `unknowns_to_approve` out of scope until the user approves concrete synthetic rules; exploratory results must use stable, resettable demos as their targets.

## Git workflow
1. `develop` is the only ongoing development branch. Make all implementation commits directly on `develop`.
2. Do not create temporary `codex/*` feature branches or feature worktrees.

## Writing and content ownership
1. **Canonical editable drafts:** `content/blog/drafts/` (23 tool outlines, one Playwright Test article draft, plus four long-form unverified drafts). `archive/` snapshots are historical and read-only.
2. Article workflow: `outline → draft → verified → approved → published`. When a development stage produces evidence a draft can use, advance that canonical draft in the same round using `docs/content/BLOG_WORKFLOW.zh-CN.md`; report its path and status at handoff. No self-promotion to `verified`, `approved` or `published` without evidence and human sign-off.
3. Exact installation commands/API/versions/licenses require current official verification and successful local reproduction before claiming "tested". No fabricated bugs, screenshots, run results or benchmarks.
4. Chinese blog Markdown is the single content source for website/WeChat once approved; only then manually sync to `naodeng/inaodeng.com`. Do not edit that remote repo as a side effect of tool experiments.
5. Project-facing documents English-first and Chinese companion; development/process documents Chinese. Don't create AI illustrations unless separately requested.

## Per-round handoff
Report scope, changed files, executed commands with exit codes, proof/evidence paths, article draft path/status when evidence can advance one, unsupported claims, open risks and next required human approval. If no draft can advance, state the missing evidence. Never claim this documentation package includes runnable business demos.
