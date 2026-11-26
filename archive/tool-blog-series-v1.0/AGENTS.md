# AGENTS.md — AI UI Test Tool Blog Series

## Goal / 目标
Produce evidence-based Chinese Markdown educational articles **one tool per article**, focused on sustainable UI automation testing and supported by exploratory testing where useful.

## Non-negotiables / 不可变约束
1. Read `00_START_HERE.md`, `editorial/01-系列定位与章节约定.md` and the selected article file before editing.
2. The article metadata `status` starts as `outline`; never mark `tested`, `verified`, or `published` without artifacts and human review.
3. Separate *officially documented*, *locally tested*, *proposed experiment*, and *unsupported* capabilities.
4. Verify official installation instructions and exact pinned versions at writing time. Do not invent shell commands, APIs, flags, screenshots, benchmarks, dates or bugs.
5. Use a reproducible local demo; prohibit real payments, purchases, production load, deleting non-test records, real-account side effects and unauthorized navigation.
6. Do not ask to bypass anti-bot, security controls or rate limits. Network restrictions and permissions are enforced by environment, not prompt alone.
7. All finding states: Observed -> Suspected -> Reproduced -> Confirmed; Confirmed requires authoritative business oracle + independent reproduction.
8. E1/M1/S1 rules live in the previous v2.0 `contracts/cases/*.yaml`; `cases/` here summarizes those exact demo contracts.
9. Three levels of depth: 完整篇 / 专题篇 / 短篇. Match the tool to its actual role. Do not claim BrowserGym, Browserbase or Computer Use are the same as a Playwright Test runner.
10. Require explicit approval between research, running browser actions, modifying business rules and publication. Maintain a human-reviewed canonical Markdown artifact.
11. Each article must have installation, basic use, UI regression relevance, exploratory use, 3 cases (one main, two exercises), FAQ, advanced usage, security and limitations; for short articles these can be concise.
12. Development and authoring process Chinese; use English-first docs only for potential future engineering repo conventions, not the blog source.

## Standard delivery after each Codex round
- Scope completed and not completed
- Official sources and fixed tool version
- Commands executed (not just suggested), exit codes and evidence paths
- Example E1/M1/S1 case and oracle results
- Known gaps and unverified assertions
- Proposed modifications and requested approvals

Do not silently edit other articles or prior v2.0 archive.
