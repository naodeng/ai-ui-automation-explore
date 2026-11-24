# ai-ui-automation-explore 项目 Roadmap 与 MVP

| 阶段 | 实施内容 | 验收条件 |
|---|---|---|
| P0 | 仓库体检、工具/许可证/遥测核验、Demo 业务假设审查 | 人工批准 readiness、风险登记和版本锁定计划 |
| P1 | Case Contract / JSON Schema / Seed / Fake Clock / 只读 Oracle 设计 | 正反例 TDD；无权更改核心业务规则 |
| P2 | 三个独立、可重置的 Demo（E1/M1/S1） | 每个 Demo 关键规则有真实红绿重构证据；重置前后一致 |
| P3 | 确定性 Playwright UI/API 基线 | 三案例 P0 路径自动化，Trace、实际业务断言和 CI 结果可复查 |
| P4 | Midscene / Computer Use 等视觉实验 | 复杂控件/视觉场景与 P3 同条件对比，呈现误报和成本 |
| P5 | 受限 Browser Agent 探索 PoC | Host 环境级权限、任务预算、独立复现与越权阻断 |
| P6 | 三条技术路线对照研究 | 统一 Seed、Fake Clock、评估指标，失败和不可比情形公开 |
| P7 | 逐工具博客与最终 Review | 官方资料核对、真实案例、FAQ、技术/QA/编辑三审、人工批准 |

## MVP 范围

- **v0.1（准备）**：本包的项目文档、三案例业务契约和 Schema；P0 及工具研究准备。
- **v0.2（基础）**：可运行三个 Demo、确定性测试基线；先完成 Playwright Test、Playwright CLI、Playwright MCP、agent-browser 的可复现使用。
- **v0.3（进阶）**：ego-lite、Midscene、Computer Use 与自主 Agent 的受限评估。
- **v1.0（稳定研究方法）**：24 工具目录持续维护、主力工具实际教程、可复现实验与证据规则稳定。**不要求 24 个工具全部成为运行时依赖，也不强制全部深度集成。**

每个阶段均要求 TDD（RED→GREEN→REFACTOR）、实际命令/退出码、可定位证据和人工审批。未执行的工作必须标注 `NOT RUN`。详细 Epic 与 Prompt 见 `docs/lab/13-路线图与Codex任务拆分.md`、`prompts/lab/`。
