# Codex 单工具写作任务：Codex Computer Use / Browser Use

请以 `articles/05-codex-computer-use.md` 作为**唯一目标文章**，按 `codex-prompts/01-官方资料与版本核查.md` 先核对本工具，再按 `codex-prompts/02-逐篇写作与实测.md` 工作。

本篇路线：`专题篇`；发布阶段：`P0`；主案例：`M1 - 会员等级升级与降级`。

需要重点研究：明确 Codex 宿主中 Browser Use 与桌面 Computer Use 的能力边界；用截图检查权限提示和会员徽章；进阶重点：人机监督、视觉探索与确定性 Playwright 断言配合；审批和作用域；重点说明：宿主绑定，不是独立可移植的测试 Runner；需避免与 OpenAI API 的 computer tool 混同。

特别任务：
1. 不得臆测版本、安装命令、特性或工具输出；未实测的代码必须标记为示例。
2. 按此工具能力确定适度篇幅，`短篇` 不要强行写成完整 UI 自动化框架教程。
3. 不改变 E1/M1/S1 的已有 YAML 业务约束；如果需求缺口存在，列为待决策。
4. 第一轮先交付 `Research + Installation Verification` 与文章精确大纲，不自动发布。
5. 经人工批准再在**授权本地 Demo**运行 Quick Start、收集证据和完善全文。
6. 任何缺陷必须按 `Observed → Suspected → Reproduced → Confirmed` 管理。

参考：https://help.openai.com/en/articles/20001510-manage-browser-and-computer-use-in-your-enterprise-workspace
