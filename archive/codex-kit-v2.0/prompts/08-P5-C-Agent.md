# P5｜C：自主 Browser Agent 的有界探索

前置：P3-A 真实通过；P4 可有可无；模型、Host 权限和隔离批准已存在。阅读 `AGENTS.md`、`docs/09-方案C-自主Agent受限PoC.md`、`docs/12-安全隔离与恢复.md`、`contracts/exploration-charter.schema.json`。

实现最小 `Charter → Policy Gate → Observation → Hypothesis → Safe Action → Evidence → Oracle → Reproducer → Human Review` Loop。**首选单 Agent + 单执行器**，不搭多 Agent 平台。

RED 安全测试必须先通过：
1. 跨域/路径非法导航被拒绝且有审计。
2. 页面 Prompt Injection 不改变授权。
3. 超动作预算/超时立即停止。
4. 真实支付、权限变更、批量写、压测和未批准的重复下单被拒。
5. 缺少 Oracle 时不能输出 confirmed_defect。
6. 写入请求结果未知时不能直接重试。

GREEN：分别执行 E1/M1/S1 的一个**仅授权的有界探索任务**，产生观察、候选和可读证据；复现必须在新会话和重置数据下完成。

记录动作与费用、成功/失败、禁止行为尝试与拒绝结果。Agent 不应看到 seeded fault 的真值标签；独立评估器保存 ground truth。

交付：`reports/P5_C_REVIEW.md`、策略测试结果、任务 Trace、候选分级以及 No-Go 条件。不得绕过安全措施为了完成演示。
