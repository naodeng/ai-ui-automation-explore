# Codex：单篇工具文章从骨架到验证草稿

本轮仅处理我指定的 `content/blog/drafts/tools/<filename>.md`，不要一次生成 24 篇，也不要编辑 `archive/`。先读 `AGENTS.md`、工具索引、对应 Demo YAML、`content/blog/editorial/05-文章发布门禁.md` 与 `prompts/blog/tools/` 中的专属 Prompt。

- 查官方 README/Release/License，固定真实版本、macOS 安装和平台差异，避免过时命令。
- 判定它是 Runner、CLI、MCP、SDK、Computer Use、Agent、诊断还是 Benchmark；文章深度与角色匹配。
- 先提交隔离 Demo 的安装与冒烟计划；经授权才执行并保留命令、版本、退出码、失败记录、截图/Trace。
- 用 E1/M1/S1 的一项主案例解释 UI 自动化和独立 Oracle，另外两项做迁移练习；不能把页面动作成功当作业务正确。
- 写安装、使用、代码/配置、断言、维护、CI、探索性测试、FAQ、进阶、安全与限制。
- 对不能复现的内容明确标“待实测”；每个 Bug 依赖独立复现和人工确认。
- 先做技术和 QA Review，再由我批准 `verified/approved`；禁止直接更改博客网站仓库。
