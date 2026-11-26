# 开始使用｜AI 驱动的 UI 自动化测试：24 工具系列骨架

> 版本：v1.0 | 2026-11-24 | **当前是选题与文章骨架，不是已完成的安装/实测教程。**

## 你要做的 4 件事
1. 先看 `README.md` 和 `editorial/01-系列定位与章节约定.md`。
2. 用 `editorial/02-全工具目录.md` 选一篇工具文章（建议先 Playwright CLI / MCP / agent-browser）。
3. 在 Codex 中先读 `AGENTS.md`，然后复制 `codex-prompts/00-总控.md`。
4. 按工具对应 `codex-prompts/tools/XX-*.md` 做资料核查、隔离 Demo 实操、写作 Review 和发布。

## 与上一实施包的关系
先前 `ai-browser-exploratory-testing-codex-kit-v2.0.zip` 包含可重置的 E1/M1/S1 Demo 设计与证据契约。本包**不替换**该实施包；它是以工具为主角的博客内容生产系统。

## 目录
- `articles/`：24 篇工具文章骨架，一篇工具一文件。
- `cases/`：E1 电商、M1 会员升降级、S1 商品秒杀的共用叙事摘要。
- `editorial/`：定位、全工具目录、发布批次、对照评估、QA 审查和来源治理。
- `templates/`：长/中/短三种文章的编写结构和交付要求。
- `codex-prompts/`：全流程总控、研究、实测、评审、发布提示词 + 24 个工具专属提示词。
- `data/`：JSON/CSV 可追踪计划，便于规划后续发文和管理进度。
- `scripts/`：验证文章、工具目录和 Prompt 文件是否完整。

## Quick Check
```bash
python3 scripts/validate_series.py
```

> 静态校验只能验证文件组织和必备结构，不能证明安装、业务断言或文章真实性。
