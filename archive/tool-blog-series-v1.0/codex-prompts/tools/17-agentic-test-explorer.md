# Codex 单工具写作任务：Agentic Test Explorer

请以 `articles/17-agentic-test-explorer.md` 作为**唯一目标文章**，按 `codex-prompts/01-官方资料与版本核查.md` 先核对本工具，再按 `codex-prompts/02-逐篇写作与实测.md` 工作。

本篇路线：`专题篇`；发布阶段：`P2`；主案例：`S1 - 商品秒杀`。

需要重点研究：Mission 与测试角色驱动探索，以复现脚本而非语言描述为产出；进阶重点：任务配置、缺陷分级、独立复现、盲评和复现脚本；重点说明：项目定位为实验性/PoC；不能直接当成熟 CI 回归框架。

特别任务：
1. 不得臆测版本、安装命令、特性或工具输出；未实测的代码必须标记为示例。
2. 按此工具能力确定适度篇幅，`短篇` 不要强行写成完整 UI 自动化框架教程。
3. 不改变 E1/M1/S1 的已有 YAML 业务约束；如果需求缺口存在，列为待决策。
4. 第一轮先交付 `Research + Installation Verification` 与文章精确大纲，不自动发布。
5. 经人工批准再在**授权本地 Demo**运行 Quick Start、收集证据和完善全文。
6. 任何缺陷必须按 `Observed → Suspected → Reproduced → Confirmed` 管理。

参考：https://github.com/srbarrios/agentic-test-explorer
