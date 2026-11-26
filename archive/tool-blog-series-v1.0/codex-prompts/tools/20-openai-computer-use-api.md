# Codex 单工具写作任务：OpenAI Computer Use API

请以 `articles/20-openai-computer-use-api.md` 作为**唯一目标文章**，按 `codex-prompts/01-官方资料与版本核查.md` 先核对本工具，再按 `codex-prompts/02-逐篇写作与实测.md` 工作。

本篇路线：`专题篇`；发布阶段：`P2`；主案例：`M1 - 会员等级升级与降级`。

需要重点研究：说明 API 级 Computer Use 的 harness/driver、截图与动作循环；进阶重点：隔离执行服务、审批策略、浏览器驱动、成本、可重现记录；重点说明：API 模式不同于 Codex Host 内置能力，需要自建执行环境/审计。

特别任务：
1. 不得臆测版本、安装命令、特性或工具输出；未实测的代码必须标记为示例。
2. 按此工具能力确定适度篇幅，`短篇` 不要强行写成完整 UI 自动化框架教程。
3. 不改变 E1/M1/S1 的已有 YAML 业务约束；如果需求缺口存在，列为待决策。
4. 第一轮先交付 `Research + Installation Verification` 与文章精确大纲，不自动发布。
5. 经人工批准再在**授权本地 Demo**运行 Quick Start、收集证据和完善全文。
6. 任何缺陷必须按 `Observed → Suspected → Reproduced → Confirmed` 管理。

参考：https://developers.openai.com/api/docs/guides/tools-computer-use
