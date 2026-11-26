# Codex 单工具写作任务：Vercel agent-browser

请以 `content/blog/drafts/tools/04-agent-browser.md` 作为**唯一目标文章**，按 `prompts/blog/01-官方资料与版本核查.md` 先核对本工具，再按 `prompts/blog/02-逐篇写作与实测.md` 工作。

本篇路线：`完整篇`；发布阶段：`P0`；主案例：`E1 - 电商优惠券与下单`。

需要重点研究：Snapshot → Ref → Action 的可追踪动作流，适合自然语言转 UI 流程；进阶重点：稳定引用策略；浏览器状态与重试；证据映射到回归脚本；重点说明：工具负责浏览器动作，不能替代业务断言或负载压测。

特别任务：
1. 不得臆测版本、安装命令、特性或工具输出；未实测的代码必须标记为示例。
2. 按此工具能力确定适度篇幅，`短篇` 不要强行写成完整 UI 自动化框架教程。
3. 不改变 E1/M1/S1 的已有 YAML 业务约束；如果需求缺口存在，列为待决策。
4. 第一轮先交付 `Research + Installation Verification` 与文章精确大纲，不自动发布。
5. 经人工批准再在**授权本地 Demo**运行 Quick Start、收集证据和完善全文。
6. 任何缺陷必须按 `Observed → Suspected → Reproduced → Confirmed` 管理。

参考：https://github.com/vercel-labs/agent-browser
