# Codex 单工具写作任务：AgentLab

请以 `content/blog/drafts/tools/23-agentlab.md` 作为**唯一目标文章**，按 `prompts/blog/01-官方资料与版本核查.md` 先核对本工具，再按 `prompts/blog/02-逐篇写作与实测.md` 工作。

本篇路线：`短篇`；发布阶段：`P3`；主案例：`S1 - 商品秒杀`。

需要重点研究：评估浏览 Agent 的任务、失败类型、重现性，配合 BrowserGym；进阶重点：重复实验、种子、报告、预算指标；重点说明：评价任务完成率不等于业务缺陷发现率。

特别任务：
1. 不得臆测版本、安装命令、特性或工具输出；未实测的代码必须标记为示例。
2. 按此工具能力确定适度篇幅，`短篇` 不要强行写成完整 UI 自动化框架教程。
3. 不改变 E1/M1/S1 的已有 YAML 业务约束；如果需求缺口存在，列为待决策。
4. 第一轮先交付 `Research + Installation Verification` 与文章精确大纲，不自动发布。
5. 经人工批准再在**授权本地 Demo**运行 Quick Start、收集证据和完善全文。
6. 任何缺陷必须按 `Observed → Suspected → Reproduced → Confirmed` 管理。

参考：https://github.com/ServiceNow/AgentLab
