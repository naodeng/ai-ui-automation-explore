# Codex 单工具写作任务：Browser Harness

请以 `content/blog/drafts/tools/12-browser-harness.md` 作为**唯一目标文章**，按 `prompts/blog/01-官方资料与版本核查.md` 先核对本工具，再按 `prompts/blog/02-逐篇写作与实测.md` 工作。

本篇路线：`专题篇`；发布阶段：`P1`；主案例：`M1 - 会员等级升级与降级`。

需要重点研究：Codex 等 Agent 接入现有 Chrome 环境，重点检查权限与会话隔离；进阶重点：CLI-MCP 桥接、Profile 策略、真实用户会话与测试会话隔离；重点说明：共享已登录浏览器可能引入真实业务副作用，不是 UI 测试断言框架。

特别任务：
1. 不得臆测版本、安装命令、特性或工具输出；未实测的代码必须标记为示例。
2. 按此工具能力确定适度篇幅，`短篇` 不要强行写成完整 UI 自动化框架教程。
3. 不改变 E1/M1/S1 的已有 YAML 业务约束；如果需求缺口存在，列为待决策。
4. 第一轮先交付 `Research + Installation Verification` 与文章精确大纲，不自动发布。
5. 经人工批准再在**授权本地 Demo**运行 Quick Start、收集证据和完善全文。
6. 任何缺陷必须按 `Observed → Suspected → Reproduced → Confirmed` 管理。

参考：https://github.com/browser-use/browser-harness
