# 项目章程：AI UI Automation Explore

## 目标与定位

以 **AI 辅助构建、执行和维护 UI 自动化测试** 为主线，逐个研究 Playwright、agent-browser、ego-lite、Midscene、Codex Computer Use 等 24 个浏览器工具。探索性测试用于发现潜在场景，稳定回归测试用于长期质量保障。此项目是实验室及配套文章仓库，**不是再建通用 Agent 框架**。

## 与现有项目的职责关系

| 仓库 | 职责 |
|---|---|
| `AI-Native-QA-Lab/ai-ui-automation-explore` | 工具比较、三个 Demo、实验与测试代码、质量证据、博客草稿 |
| `AI-Native-QA-Lab/ai-automation-test-starter` | 经验证的可复用自动化启动项目与学习体验 |
| `AI-Native-QA-Lab/bugmaster` | 未来可引用经过验证的浏览器探索/缺陷发现机制 |
| `naodeng/inaodeng.com` | 人工审定之后的正式博客发布，公众号与网站同稿 |

## 三个统一教学案例

- **E1** 电商优惠券与下单：满 100 减 20、99/100 金额边界、重复提交、优惠券与订单账本一致。
- **M1** 会员等级升级与降级：普通/银/金/钻石、权益生效与撤销、旧会话权限和历史权益。
- **S1** 商品秒杀：倒计时、资格、限购、排队、库存守恒、订单超时释放。浏览器 UI 验证不能取代独立服务端并发验证。

`contracts/cases/*.yaml` 中明确列出的合成规则已批准用于 Demo，状态为 `approved_for_demo`。`unknowns_to_approve` 中的事项仍未批准，实施时不得推断或补默认值。

## 交付物

Three Demos + TDD 测试 + 独立 Oracle + Tool Eval + 脱敏 Evidence + 24 篇工具教程骨架/逐步完成的文章 + 实验复盘，成果可输入 Starter 或 BugMaster。

## 范围外

真实生产系统、实际购物支付、绕过风控与限流、无审批压测、正式开发新的统一浏览器引擎、为了资料存储过早引入云平台和数据库、没有证据的工具性能排名。
