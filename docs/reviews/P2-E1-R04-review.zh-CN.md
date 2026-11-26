# P2 E1-R04 生命周期实现评审

**更新日期：** 2026-11-26

**状态：** 已在 `develop` 本机实现并验证；最新跨案例完整回归通过，改动仍未提交。

## 已批准范围

用户批准了 E1-R04 合成生命周期及桌面/窄屏原型：

- 创建使用折扣的沙盒订单后，C20 进入锁定状态。
- 模拟支付把订单改为 `sandbox_paid`，并在本地账本记录 `sandbox_redeemed`。
- 模拟支付前取消会把订单改为 `cancelled`、释放优惠券，允许同一 Run 后续新报价再次使用 C20。
- 重复支付、重复取消和使用同一幂等键创建订单不会重复创建订单或账本事件。取消后支付、已支付后取消，以及优惠券已锁定后用旧折扣报价下单都会被拒绝。

这些都是内存中的合成状态，不涉及真实支付、退款、发货、优惠券核销或持久化。非零运费/税费是否计入门槛仍未定，留在本轮范围外。

## 实现内容

- E1 服务按 Run 保存优惠券当前状态和占用订单。只读 Checkout Oracle 返回状态，以及报价、锁定、模拟使用和释放事件。
- 不带 `run_id` 打开结算页时，前端创建唯一 Run 并写入 URL；服务端拒绝无 Run ID 的购物车 API 请求，不再把新访客导入共享 `e1-local` 状态。
- 盲评公开监听器拒绝订单创建、模拟支付和取消；Reset 与 Oracle 仍仅通过需认证的评估监听器开放。
- 结算页面支持待模拟支付、模拟支付完成和已取消三种状态，并适配窄屏单栏。确认稿与实现截图见 [E1-R04 原型记录](../../evidence/e1/design/e1-r04-lifecycle-prototype.zh-CN.md)。
- 另外修复了项目静态检查脚本：工具目录已改用仓库相对的 `prompts/blog/...` 路径，但检查器仍按旧的 `codex-prompts` 前缀求相对路径，导致 `ValueError`。现按目录中声明的仓库相对路径解析文章和 Prompt。

## 验证结果

| 命令 | 结果 |
|---|---|
| `npm run typecheck` | PASS，退出码 0 |
| `node --test tests/unit/e1-checkout.test.ts tests/unit/e1-blind-eval-boundary.test.ts` | PASS，6 项，退出码 0 |
| `.venv/bin/python -m unittest discover -s tests -q` | PASS，17 项，退出码 0 |
| `npx playwright test --project=api tests/e1/checkout.api.spec.ts` | PASS，9 项，退出码 0 |
| `npx playwright test --project=ui tests/e1/checkout.ui.spec.ts` | PASS，4 项，退出码 0 |
| `.venv/bin/python scripts/validate_project.py` | PASS，退出码 0，包含 YAML 与 JSON Schema 示例 |
| `node --check demos/ecommerce-checkout/public/app.js && git diff --check` | PASS，退出码 0 |
| `npm test`（最新跨案例回归） | PASS，退出码 0；24 项 Node 单元测试及 E1/M1/S1 共 34 项 Playwright API/UI 测试 |

最新 `npm test` 中 E1 的 9 项 API、4 项 UI 测试通过；M1 为 7 项 API、4 项 UI，S1 为 5 项 API、5 项 UI，TypeScript 检查也通过。下列 E1 聚焦测试 Run ID 仍作为独立生命周期证据保留；当前完整回归结果位于 `test-results/p3-evidence/`。

测试使用 Seed `e1-threshold`、Fake Clock `2026-11-23T10:00:00Z`、Node `26.13.1`、Playwright Test `1.65.1`；UI 使用随附 Chromium `159.0.8154.6`。首次使用系统 Python 时，因缺少 `jsonschema`，Schema 单测未能加载；项目虚拟环境测试通过，且启动指南已改为指定 `.venv/bin/python`。对应的通过状态 Manifest、测试结果、Oracle 响应和 SHA-256 Evidence Index 位于 `test-results/p3-evidence/E1/`：

- 模拟支付生命周期：`E1-pw-4e344fcc-f0fa-4468-ae48-c571a989d138`（业务 Run `e1-5345d2ff-cb8a-4043-8c72-745ed012e452`）。
- 取消、释放与再次使用：`E1-pw-da512775-51e9-47a0-8940-3961e73252dc`（业务 Run `e1-91a016fa-9d99-4ef8-a078-1139e96557d6`）。
- 过期折扣报价保护：`E1-pw-b7edb6ab-86df-473e-ad4e-b868fce8d856`（业务 Run `e1-7207af90-5c2d-43d8-a1d2-dbf7c6527095`）。
- 桌面待支付/已支付 UI 与 Oracle 对照：`E1-pw-e0cb99f4-17c7-4a95-aeda-e2f9b1d67ab3`（业务 Run `e1-86c315b9-774e-4fea-b0b8-6b891bd2e770`）。
- 窄屏取消与复用 UI：`E1-pw-72140926-d72b-43dc-b925-3c16021a257c`（业务 Run `e1-e264887a-e10e-4392-8c06-d1447d87ff9d`）。

可直接查看的界面证据：[桌面待支付](../../evidence/e1/e1-r04-pending-desktop.png)、[桌面模拟支付完成](../../evidence/e1/e1-r04-paid-desktop.png)、[窄屏订单取消](../../evidence/e1/e1-r04-cancelled-mobile.png)。本机沙箱首次阻止 Playwright 监听回环地址并返回 `EPERM`；经沙箱授权后运行了聚焦验证。首轮 UI 复核还发现通用布局 CSS 覆盖 `[hidden]`，旧结算面板在生命周期页重复显示；修正规则后，最终 UI 回归通过。

## 边界与后续

- 这些证据验证的是单进程、内存中的合成状态机，不证明持久化、多进程事务保证、生产优惠券语义或负载行为。
- 最新完整回归是在未提交的 `develop` 工作区本地执行；没有远端 CI 对这批最新改动进行验证。
- 已批准的 E1-R04 无需新增人工批准。运费/税费门槛仍待定；视觉工具对比和 Agent 探索不属于本 Demo 实现。
- 改动仍在 `develop` 上未提交；工作区其他既有未提交修改均已保留。

## 2026-11-26 审查修复补充

E1 默认 Run 隔离缺陷由两条新回归先行复现：`npx playwright test --config=playwright.config.ts --grep 'E1 default run isolation'` 在修复前 RED（退出码 1）：无 `run_id` 的 `/api/cart` 返回 200 而非 400；两个空白页面都没有各自的 Run ID。移除服务端共享默认 Run、前端为无参数页面生成唯一 ID 后，同一命令 GREEN（2 项通过，退出码 0）。完整跨案例回归也通过。另有 M1 契约迁移示例差异与历史 S1 TDD 记录缺口，详见 [本轮 Demo Review 修复记录](P2-demo-review-fixes.zh-CN.md)。
