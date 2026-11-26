# Codex 单工具写作任务：Playwright Test Agents

请以 `content/blog/drafts/tools/08-playwright-test-agents.md` 作为**唯一目标文章**，按 `prompts/blog/01-官方资料与版本核查.md` 先核对本工具，再按 `prompts/blog/02-逐篇写作与实测.md` 工作。

本篇路线：`完整篇`；发布阶段：`P1`；主案例：`E1 - 电商优惠券与下单`。

需要重点研究：Planner → Generator → Healer，从探索计划生成、维护自动化测试；进阶重点：测试计划追踪；差异评审；Healer 限制；防止修改断言掩盖 Bug；重点说明：Healer 可能把真缺陷误判为测试失效，须有人审查。

特别任务：
1. 不得臆测版本、安装命令、特性或工具输出；未实测的代码必须标记为示例。
2. 按此工具能力确定适度篇幅，`短篇` 不要强行写成完整 UI 自动化框架教程。
3. 不改变 E1/M1/S1 的已有 YAML 业务约束；如果需求缺口存在，列为待决策。
4. 第一轮先交付 `Research + Installation Verification` 与文章精确大纲，不自动发布。
5. 经人工批准再在**授权本地 Demo**运行 Quick Start、收集证据和完善全文。
6. 任何缺陷必须按 `Observed → Suspected → Reproduced → Confirmed` 管理。

参考：https://playwright.dev/docs/test-agents
