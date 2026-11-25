# 只读业务 Oracle 接口

[English](README.md) · **简体中文**

**状态：** E1 `CheckoutOracle`、M1 `MembershipOracle` 和 S1 首个切片的 `FlashSaleOracle` 已实现为只读观察。S1 不模拟排队、取消或超时释放行为。

每个 Oracle 只读取一个合成 `run_id` 和 `seed_id` 的观察结果。Oracle 不得重置数据、推进时钟、提交订单、修改会员或注入故障。调用方传入未知 Run 时必须得到 not-found 结果，不得回退到其他 Run 或全局状态。

响应应包含 `case_id`、`run_id`、`seed_id` 和 `observed_at`。`observed_at` 来自当前 Run 的 Fake Clock，以便与被测状态配对。确定性测试执行器可获只读 Oracle 权限。盲评 Explorer 不得获得 Oracle 路由或凭据；Explorer 结果封存后才由评估方读取 Oracle。此边界由独立监听器和宿主/网络策略强制，不靠 CORS 或 Prompt。

## CheckoutOracle（E1 已实现）

`GET /__test/oracle/checkout?run_id=...&seed_id=...&user_id=...&quote_id=...&order_id=...`

普通本地 Demo 模式下，该接口仅通过 E1 回环服务开放。盲评模式下，它只通过评估监听器开放并要求评估控制令牌；公开监听器对该路径返回 not-found。部署时必须将评估监听器绑定到仅评估方可达的接口。接口要求匹配的 `run_id`、`seed_id` 和合成 `user_id`；可选的报价与订单 ID 用于筛选返回记录。未知或不匹配的 Run 身份会返回 not-found，不会回退到其他 Run。

接口返回该合成用户的权威报价和订单事实：

- 报价小计、优惠券代码、折扣、运费、税费和应付金额；
- 对应报价或订单的优惠券观察记录。E1 记录 `discount_applied_to_quote`，不模拟锁定、核销、支付或取消；
- 提供 `order_id` 时，返回对应订单的状态和应付金额。

响应分别报告运费和税费。已批准的 E1 夹具将二者设为零；不推断其中任何一项是否应计入非零优惠门槛。

## MembershipOracle（M1 已实现）

M1 通过本地会员 Demo 的测试观察 API 返回会员事实，包括 `run_id`、`seed_id`、Fake Clock 观察时间、当前有效等级、最新事件版本、指定资源/会话的授权结果和会员权益事实。它不会推断未领取优惠券或未明确权益的策略。

## FlashSaleOracle（S1 首个切片已实现）

`GET /__test/oracle/flash-sale?run_id=...&seed_id=...&campaign_id=...&sku_id=...&user_id=...`

仅限本机回环访问的 S1 服务返回匹配活动的状态和开售时刻、五种库存桶、相关订单、不可变库存流水及账本校验和。未知或不匹配的 Run、Seed、活动或 SKU 身份会 fail closed。

Oracle 只报告事实，不决定哪些订单状态应计为有效售出量。该定义和队列一致性 SLA 在 S1 中仍未决。当前切片在本地购买成功时执行一次直接的 `available → sold` 库存变化；尚未实现预留、取消或超时释放路径。一次成功购买不能证明库存耗尽安全或服务端并发行为。

## 证据要求

保存与 UI/API 测试使用相同 `run_id`、`seed_id` 和 `observed_at` 的脱敏响应，并在证据索引中关联适用的 `rule_id`。Oracle 响应是后端事实观察；要将其映射为已确认缺陷，仍须有已批准规则、可复现证据和人工复核。
