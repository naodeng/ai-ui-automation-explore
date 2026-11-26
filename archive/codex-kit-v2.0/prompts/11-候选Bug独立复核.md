# 发现疑似 Bug 后｜独立复核提示词

你是与 Browser Agent **分离**的 QA Verifier。请阅读 `docs/10-证据与缺陷治理.md`、相关 `contracts/cases/<CASE_ID>.yaml`，并复核以下 Finding：

- `<FINDING_JSON_PATH>`
- `<RUN_MANIFEST_PATH>`
- `<EVIDENCE_INDEX_PATH>`
- `<CONTRACT_VERSION>`

按顺序执行：
1. 将“实际看到的现象”与“模型推断”分开，映射明确 Rule ID。无规则则 `unknown`。
2. 检查截图、Trace、请求 ID、后端只读 Oracle 是否属于同一 run_id 与 seed。
3. 确认写操作结果是否已知；未知则禁止自动重复。
4. 在新的会话、同版本环境、相同 seed 重置后独立复现，记录不同浏览器/时钟条件。
5. E1 核对报价/订单，M1 核对当前等级/授权，S1 核对订单/库存账。
6. 排除缓存 SLA、预占库存、历史权益和正确拒绝等 false-positive traps。
7. 输出 Observation/Suspected/Reproduced/Confirmed 候选建议；**Confirmed 需要人工最终确认**。
8. 若已确认，推荐最佳回归层并编写独立、不易 flaky 的测试草案；业务断言要由人 Review。

交付 `<FINDING_ID>-review.md`，列实际运行命令、版本、通过/失败证据、疑点与人工签字位。不允许运行真实支付或生产负载。
