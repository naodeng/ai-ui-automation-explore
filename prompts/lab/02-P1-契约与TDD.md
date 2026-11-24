> **仓库路径迁移提示：** 当前项目名 `ai-ui-automation-explore`；以前 `docs/NN-*.md` 现位于 `docs/lab/`，`templates/` 现为 `templates/qa/`；三案例 `contracts/` 与 `fixtures/` 仍在项目根目录。此 Prompt 为历史实施方案的后续可编辑副本，执行前核实路径。

# P1｜业务与数据 Contract、Schema、TDD

前置：P0 已人工批准；先读取 `reports/P0_READINESS.md`、`AGENTS.md`、`docs/03-业务规则与真相源.md`、`contracts/cases/*.yaml`、`contracts/*.schema.json`、`fixtures/`。

本轮完成：
1. 将三个业务规则写成版本化 Domain Contract（明确演示规则及 Unknown），定义 rule_id 与状态机转换。
2. 设计 `RunManifest`、`Charter`、`Finding`、`Evidence` 的 JSON Schema；用正反例写 Contract Tests：缺授权 URL、负预算、错误 case_id、缺 Oracle、假 Confirmed 必须拒绝。
3. 设计三个独立、最小 Oracle 的只读接口及输入输出类型：Checkout、Membership、FlashSale。只制定协议，不实现完整 Demo。
4. 设计 Fixture/Reset、Fake Clock 和数据隔离，`fault injection` 与主探索权限严格分离。
5. TDD：RED/ GREEN/ REFACTOR，保留真实结果；**不允许因样例格式错误而静默删除校验规则**。
6. 输出规则追踪关系 Rule→Risk→Test Obligation→Oracle→Evidence；补充代码与数据契约的文档测试。

交付：`reports/P1_CONTRACT_REVIEW.md`、必要的 Schema/tests 与 ADR 更新；列阻断规则和人类需确认决策。只做 P1，不去写页面、支付集成、模型 Agent。
