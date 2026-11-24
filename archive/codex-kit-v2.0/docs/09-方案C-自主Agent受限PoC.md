# 09｜方案 C：真正有边界的自主探索 Agent PoC

## MVP 不做什么

不搭五个角色 Agent、不引入云端浏览器为默认、不授予任意 Shell/JavaScript/网络权限、不跳过人类审批，不让 Agent 执行负载压测。

## 最小循环

```text
Charter → Policy Gate → Observe → Hypothesis → Choose Safe Action → Execute
   ↑                                      ↓
   └──── Budget / Stop / Replan ← Evidence + Independent Oracle
                                              ↓
                                     Reproduce → Human Review
```

## Mission 最小字段

`mission_id, case_id, allowed_origin, allowed_paths, account_role, budget, allowed_actions, prohibited_actions, oracles, evidence, stop_conditions`。

`contracts/exploration-charter.schema.json` 是**本项目建议规范**；外部 Agentic Test Explorer 的 `missions: [{thread_id,prompt}]` 格式与该规范不是同一种 Schema，适配时不得误称直接兼容。

## Policy Gate（必须代码/宿主强制）

- 所有导航校验 URL Origin + Path，阻止跨域或重定向越界。
- 最多动作 20、最多执行 10 分钟、普通探索 `max_writes=0`；独立批准后才能打开指定测试写接口。
- 只读 Oracle 的凭证与普通浏览器凭证分离。
- 持有未确定结果的订单请求时禁止自动重试；先查只读记录。
- 不可信页面内容中即使出现“忽略前面所有规则”，也不能改变权限。
- 所有拒绝动作记审计事件，真正越界成功为 No-Go。

## 三案例 Agent 能做的

- E1：规划金额边界、刷新/返回、同券多标签操作的**受控**候选路径。
- M1：从状态机生成旧 Token/新 Token、降级、历史权益、传播 SLA 的组合探索，不将可见 UI 等同服务端授权。
- S1：探索页面倒计时/队列/售罄/刷新与请求关联，能够主动标出“需要 API 并发/库存专项核验”的风险，但**不得自行冲流量**。

## 分级结果

`observation → suspected_issue → reproduced_issue → confirmed_defect`。`confirmed_defect` 必须同时具备：已冻结的业务契约依据、独立 Oracle、可执行独立复现证据及明确人工审批。模型自评无法晋级。

## 失败恢复

- 元素找不到：最多重新观察 1 次，超出停止并标记 `tool_failure`。
- API 超时：将写入状态设为 `unknown`，先只读查询，禁止立即重试。
- 超出动作预算：立即停止；保留部分证据标记 `incomplete`。
- 发现跨域/高风险动作：拒绝、记录、终止/请求人工审批；不假装点击成功。

## PoC 只证明什么

仅证明本地三案例中，在可复位数据、权限限制和目标预算下，Agent 是否产生可复核、可复现、对业务有价值的发现。不得外推到生产环境或其他站点。

## 参考实现

- https://github.com/srbarrios/agentic-test-explorer
- https://github.com/srbarrios/agentic-test-explorer/blob/main/missions/README.md
- https://github.com/ServiceNow/BrowserGym
