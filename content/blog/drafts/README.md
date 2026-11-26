# 博客草稿工作区

这是 **`ai-ui-automation-explore` 项目中唯一可编辑的博客草稿来源**，并非博客站点发布目录。所有文章先在这里与 Demo/实验代码共同 Review，审批后才同步网站与公众号。

| 子目录 | 文件数 | 当前状态 |
|---|---:|---|
| [`tools/`](tools/) | 24 | 23 篇 `outline`；Playwright Test 1 篇 `draft / unverified` |
| [`series/`](series/) | 1 | `draft`，历史三案例长文，未重新核验 |
| [`practices/`](practices/) | 3 | `draft`，A/B/C 三条技术路线长文，未实测 |

`outline → draft → verified → approved → published`；不得在没有真实实验或人工批准时更改为后几种状态。

方案 C 草稿先按 `draft / unverified` 保留。自主 Agent 实测延后到 MVP v0.1–v0.3 的全部功能和验收完成后，再单独审批启动；当前的可选 OrbStack 隔离实验不计作 P5 实测。

从 [24 篇工具文章索引](../editorial/02-全工具目录.md) 选择工具，从 `prompts/blog/tools/` 对应的 Prompt 开始逐篇写作。Playwright Test 草稿基于 P3 的本地 E1/M1/S1 回归与 Oracle 证据；仍未经过 QA/编辑 Review 或人工定稿。`archive/` 中相同的原始文章只是历史资料，不应继续编辑。
