# E1-R04 优惠券生命周期界面原型

**状态：** 用户已确认桌面与窄屏原型；E1-R04 已实现，并通过本地 API/UI 回归。配套 PNG 是批准的视觉基线，实际运行截图见文末。

配套提案 PNG 依据项目设计 token 和状态文案生成，没有使用本地截图作为输入。

## 已批准的本地合成状态流程

| 操作 | 沙盒订单状态 | 优惠券状态 |
|---|---|---|
| 创建沙盒订单 | `sandbox_created` | `reserved` |
| 模拟支付 | `sandbox_paid` | `sandbox_redeemed` |
| 模拟支付前取消 | `cancelled` | `released` |

重复操作不得重复写入账本状态；取消后的支付和已支付订单的取消均拒绝。该流程只修改本地内存中的演示状态，不调用真实支付、退款、发货或优惠券核销服务。

## 原型图

- 桌面状态板：[`e1-r04-lifecycle-desktop-proposal.png`](e1-r04-lifecycle-desktop-proposal.png)
- 窄屏状态板：[`e1-r04-lifecycle-mobile-proposal.png`](e1-r04-lifecycle-mobile-proposal.png)

状态板展示待模拟支付、模拟支付完成和取消三种状态。金额示例固定为商品小计 ¥100、优惠 ¥20、应付 ¥80；它们是合成展示数据。

## 实现与验收

- 桌面与窄屏布局、状态名称、进度步骤、操作按钮和安全提示已按确认稿实现。
- E1 契约、API/UI 与只读优惠券账本已同步更新；Playwright 覆盖状态转换、重复操作、非法转换、优惠券释放复用和过期报价保护。
- 桌面待支付与模拟支付截图：[待支付](../e1-r04-pending-desktop.png)、[模拟支付完成](../e1-r04-paid-desktop.png)；窄屏取消截图：[订单已取消](../e1-r04-cancelled-mobile.png)。
- Run Manifest、测试结果和 SHA-256 Evidence Index 位于 `test-results/p3-evidence/E1/`；本轮固定 Seed 为 `e1-threshold`，Fake Clock 为 `2026-11-23T10:00:00Z`。
