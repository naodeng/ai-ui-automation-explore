# Codex 单工具写作任务：Playwright CLI + Skill

请以 `articles/02-playwright-cli.md` 作为**唯一目标文章**，按 `codex-prompts/01-官方资料与版本核查.md` 先核对本工具，再按 `codex-prompts/02-逐篇写作与实测.md` 工作。

本篇路线：`完整篇`；发布阶段：`P0`；主案例：`E1 - 电商优惠券与下单`。

需要重点研究：用短 CLI 命令观察、操作网页，再沉淀为可维护的 Playwright Test；进阶重点：会话隔离与状态重置；Trace；从探索日志转换为测试代码；重点说明：CLI 操作成功不等于建立了可重复执行的回归测试。

特别任务：
1. 不得臆测版本、安装命令、特性或工具输出；未实测的代码必须标记为示例。
2. 按此工具能力确定适度篇幅，`短篇` 不要强行写成完整 UI 自动化框架教程。
3. 不改变 E1/M1/S1 的已有 YAML 业务约束；如果需求缺口存在，列为待决策。
4. 第一轮先交付 `Research + Installation Verification` 与文章精确大纲，不自动发布。
5. 经人工批准再在**授权本地 Demo**运行 Quick Start、收集证据和完善全文。
6. 任何缺陷必须按 `Observed → Suspected → Reproduced → Confirmed` 管理。

参考：https://github.com/microsoft/playwright-cli
