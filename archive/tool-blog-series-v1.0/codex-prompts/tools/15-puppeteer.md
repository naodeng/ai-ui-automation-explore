# Codex 单工具写作任务：Puppeteer

请以 `articles/15-puppeteer.md` 作为**唯一目标文章**，按 `codex-prompts/01-官方资料与版本核查.md` 先核对本工具，再按 `codex-prompts/02-逐篇写作与实测.md` 工作。

本篇路线：`完整篇`；发布阶段：`P2`；主案例：`E1 - 电商优惠券与下单`。

需要重点研究：Node 浏览器自动化及 CDP/BiDi，在已有 Node 技术栈中维护 UI 回归；进阶重点：浏览器协议选择、截图和 PDF 证据、项目分层、AI 代码审查；重点说明：没有原生测试策略/Runner 的完整替代方案；需自己组装断言和报告。

特别任务：
1. 不得臆测版本、安装命令、特性或工具输出；未实测的代码必须标记为示例。
2. 按此工具能力确定适度篇幅，`短篇` 不要强行写成完整 UI 自动化框架教程。
3. 不改变 E1/M1/S1 的已有 YAML 业务约束；如果需求缺口存在，列为待决策。
4. 第一轮先交付 `Research + Installation Verification` 与文章精确大纲，不自动发布。
5. 经人工批准再在**授权本地 Demo**运行 Quick Start、收集证据和完善全文。
6. 任何缺陷必须按 `Observed → Suspected → Reproduced → Confirmed` 管理。

参考：https://github.com/puppeteer/puppeteer
