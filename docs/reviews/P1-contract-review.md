# P1 契约与证据追踪评审

**状态：** 合成 Demo Contract Freeze 已批准；仅批准现有 YAML 中明确的合成规则；所有 `unknowns_to_approve` 保留并排除在本轮实现范围外。
**范围：** E1/M1/S1 合成案例、JSON Schema、Seed Manifest、只读 Oracle 协议、规则追踪设计。
**不在本轮范围：** Demo 页面/API、Reset/Fake Clock 实现、浏览器 E2E、真实运行证据。

本报告记录 P1 handoff 的设计与门禁；后续 E1 实现及运行证据见 [P2 E1 评审](P2-E1-review.md)。

## 评审结论

P1 的契约结构和校验门槛已经成形。用户已批准把 E1/M1/S1 现有明确规则作为合成 Demo 契约；`contracts/cases/*.yaml` 状态已更新为 `approved_for_demo`。`unknowns_to_approve` 仍保留，并排除在本轮实现范围外。下表中的 Evidence 是未来应采集的证据类型，当前均为 **NOT RUN**，不是测试结果。

Schema 与契约测试验证文档结构及安全边界；它们不证明业务 Demo 已实现，也不构成 E1/M1/S1 业务规则批准。

## Rule → Risk → Test Obligation → Oracle → Evidence

| Rule | 主要风险 | 测试义务 | 只读 Oracle | 预期证据 / 当前状态 |
|---|---|---|---|---|
| E1-R01 | 错误金额、优惠过期 | 对小计 99 与 100 验证报价折扣边界；测试前须批准运费/税是否参与门槛 | `CheckoutOracle`：报价与优惠券账本 | 带 `run_id`、`seed_id`、模拟时间的报价快照及 UI 断言；NOT RUN，门槛口径待批 |
| E1-R02 | 错误总价、报价陈旧 | 创建沙箱订单后比较订单应付金额与其权威报价 | `CheckoutOracle`：指定 quote/order | 同次 Run 的报价与订单观察及断言；NOT RUN |
| E1-R03 | 重复订单 | 用相同幂等键重复提交，检查仅有一个有效订单 | `CheckoutOracle`：订单账本 | 请求/响应关联及有效订单计数；NOT RUN |
| E1-R04 | 优惠券状态漂移 | 覆盖配置的支付、取消、锁定状态及重放行为 | `CheckoutOracle`：优惠券账本事件 | 状态转换事件序列；NOT RUN，状态机细节待批 |
| M1-R01 | 权限未及时生效 | 银升金后访问金级受限资源，核对有效等级与授权 | `MembershipOracle`：等级与资源授权 | UI/API 结果和同一 Run 的等级、授权观察；NOT RUN |
| M1-R02 | 降级后旧会话越权 | 金降银后，用升级前的会话再次请求金级资源并确认拒绝 | `MembershipOracle`：指定 `session_id` 的资源授权 | 旧会话 ID、拒绝结果、有效等级和事件版本；NOT RUN，旧会话撤权语义待批 |
| M1-R03 | 历史权益丢失或提前失效 | 在优惠券自身过期前后检查已领取权益是否仍有效 | `MembershipOracle`：权益账本与模拟时间 | 领取/到期记录、模拟时间和访问结果；NOT RUN，当前保留规则待批 |
| M1-R04 | 事件重放导致状态回退 | 重复投递同版本及较旧事件，检查有效状态和版本不回退 | `MembershipOracle`：会员事件 | 输入事件版本与 Oracle 最终状态/版本；NOT RUN |
| M1-R05 | UI 等级陈旧 | 推进专用模拟时钟，检查 UI 在 30 模拟秒内跟上有效服务端等级 | `MembershipOracle`：等级、事件版本与观察时间 | 带时间戳的 UI 观察序列与 Oracle 状态；NOT RUN，30 秒为待批演示参数 |
| S1-R01 | 提前成交 | 开售前用服务端模拟时钟尝试下单，确认不能成功 | `FlashSaleOracle`：活动时间与订单账本 | 开售时间、模拟时间、订单状态；NOT RUN |
| S1-R02 | 超卖 | 按获批的“有效售出”定义检查售出量不超过可分配库存 | `FlashSaleOracle`：库存桶与不可变库存流水 | 完整库存快照、流水及守恒核对；NOT RUN，售出/预留口径待批 |
| S1-R03 | 单用户重复购买 | 同一用户用不同幂等键尝试再次成功购买，检查最多一个有效成功单 | `FlashSaleOracle`：用户订单账本 | 该用户所有订单及有效成功数；NOT RUN |
| S1-R04 | 幂等失效 | 对同一幂等键重复请求并检查不会产生多个有效订单 | `FlashSaleOracle`：订单账本 | 请求关联与订单唯一性观察；NOT RUN |
| S1-R05 | 取消/超时后库存错账 | 覆盖取消与超时释放，并检查同一库存仅释放一次 | `FlashSaleOracle`：库存桶与库存流水 | 释放事件序列与库存守恒核对；NOT RUN，库存生命周期待批 |

每份证据应脱敏并绑定同一 `run_id`、`seed_id`、`observed_at`，在证据索引中关联 `rule_id`。Oracle 只报告后端事实；将异常判为已确认缺陷仍须基于批准的规则、可复现证据和人工 Review。

## P1 工件与验证状态

- `contracts/case-contract.schema.json`：约束共享案例结构、规则 ID 前缀、只读 Oracle 名称和未决问题非空。
- `contracts/seed-manifest.schema.json`：约束仅含 E1/M1/S1 各一份的合成 Seed 清单；现有 Fixture 明确为规格样例，不代表已播种。
- `contracts/oracles/README.md`：定义三个只读观察协议；不创建服务端点。
- `fixtures/重置与时钟规范.md`：仅记录隔离 Reset 与 Fake Clock 的预期语义，不实现命令或管理路由。
- P1 handoff 时 Demo、UI/E2E 与浏览器证据：**NOT RUN**；后续 E1 结果见 [P2 E1 评审](P2-E1-review.md)。
- Demo、UI/E2E 与浏览器证据：**NOT RUN**。

## 保留在本轮范围外的未决事项

1. **E1：** 运费和税是否计入优惠门槛；优惠券在锁定、取消及沙箱支付过程中的状态转换。
2. **M1：** 四级与账期仅为演示参数是否可接受；未领取优惠券与其他权益策略；旧会话撤权的具体生效点。
3. **S1：** 哪些状态计为有效售出或预留；队列语义与最终一致性时限；取消/超时的库存释放时序。
4. **实现栈：** 已批准 TypeScript/Node LTS、Playwright Test 和轻量 Web UI/API；本轮只从 E1 开始。

E1 P2 从 99/100 边界、报价/订单一致性和幂等开始。被排除的未决行为继续保持明确的“不在本轮范围内”，不得静默补默认值。
