# P2 E1 实现与回归评审

**日期：** 2026-11-24

**状态：** E1 本地合成 Demo 已实现并通过本轮验证。开发直接在 `develop` 完成；未创建分支或 worktree，未提交。

**范围说明：** 本文保留 E1-R01–R03 首轮实现记录。E1-R04 后续生命周期实现与当前完整跨案例回归见 [P2 E1-R04 评审](P2-E1-R04-review.md)；M1/S1 最新状态分别见 [P2 M1](P2-M1-review.md)、[P2 S1](P2-S1-review.md) 和 [P3-A 基线评审](../../reports/P3_A_REVIEW.md)。

## 批准范围

用户批准使用 TypeScript/Node、Playwright Test 和轻量本地 UI/API，从 E1 开始；本轮仅实现 YAML 中明确并获批的 E1-R01、E1-R02、E1-R03。结算页面按已确认原型实现：桌面双栏、窄屏单栏，可切换 ¥99/¥100 并查看 C20 折扣和应付金额。数据均为合成数据，不触发真实支付。

E1-R04 的优惠券锁定、支付、取消与核销生命周期仍未实现；税费和运费保持 Fixture 中的零值，没有推断非零金额是否计入优惠门槛。M1/S1 Demo 和工具实测不属于本轮。

## 实现

- `demos/ecommerce-checkout/src/checkout.ts` 从已批准的 E1 YAML 读取门槛和折扣，使用整数分计算报价；商品价格来自服务端合成目录。
- `demos/ecommerce-checkout/src/server.ts` 仅监听 `127.0.0.1`，用内存 Run 隔离购物车、报价、订单和优惠券报价观察。订单只写为 `sandbox_created`，没有支付、退款、发货或持久化。
- 原型与运行界面的 C20 状态颜色保持一致：已应用为绿色、未达门槛为橙色；Playwright 覆盖默认状态与切换状态。
- `__test/reset` 需要仅供本机管理使用的随机控制令牌；页面代码不会收到该令牌。`CheckoutOracle` 只读，并对未知 Run/Seed/用户失败关闭。
- `fixtures/seed-manifest.json` 已标记 E1 运行时可播种，M1/S1 仍为规格样例。E2E 为每个测试保存随机 Run ID、Seed ID 和模拟时间，供复查。
- `demos/ecommerce-checkout/public/index.html` 的页面标题与描述标明本地合成沙盒 Demo 和无真实支付/发货；回归单测覆盖这项说明。
- 双语 Demo README 记录启动方式、安全边界与验证范围；`scripts/validate_project.py` 的状态提示已改为区分静态检查、E1 结果和未运行的 M1/S1/工具安装。

## 验证结果

最终 `npm test` **PASS，退出码 0**：

- `tsc --noEmit`：PASS。
- `node --test tests/unit/*.test.ts`：4 项 PASS，包含金额边界、负数拒绝和页面元数据。
- `playwright test --project=api`：5 项 PASS，覆盖 99/100 门槛、报价与订单一致、幂等、Run 隔离、重置令牌和未知 Run 失败关闭。
- `playwright test --project=ui`：2 项 PASS，覆盖 100 门槛沙盒下单/Oracle 结果与 99 门槛无折扣。

其他检查：

| 命令 | 结果 |
| --- | --- |
| `.venv/bin/python -m unittest discover -s tests -q` | PASS，16 项，退出码 0 |
| `.venv/bin/python scripts/validate_project.py` | PASS，静态包完整性，退出码 0 |
| `git diff --check` | PASS，退出码 0 |
| `node --check scripts/start-e1-demo.mjs && node --check scripts/reset-e1-run.mjs && node --check demos/ecommerce-checkout/public/app.js` | PASS，退出码 0 |
| DESIGN / sidecar 解析检查 | PASS，两个 Markdown frontmatter YAML、`.impeccable/design.json` JSON 均可解析 |

最终截图复核还发现一项视觉回归：应付金额的数字在实现页被 `.summary-total span` 选择器覆盖为 13px，而原型为桌面 30px、390px 窄屏 28px。Playwright 加入两种金额、两种视口的计算字号对照后，修复前 `npm test` 按预期失败（期望 30px，实际 13px）；将选择器收窄为 `.summary-total > span` 后，全量测试通过。

按 craft-floor 复查时又发现主标题字距为 `-0.055em`、应付总额为 `-0.06em`，都超过 `-0.04em` 下限。增加标题和总额的字距比例断言后，修复前 `npm test` 按预期分别报告 `-0.055em` 和 `-0.06em`；原型和实现都收敛到 `-0.04em` 后，最终全量 `npm test` **PASS，退出码 0**。最终截图已重新生成，人工复核金额字号、标题和两种视口的布局。

最后一轮 craft-floor 检查发现双层边框/阴影、17px 面板圆角和字符绘制的箭头/圆点。新增视觉质量断言后，红测复现 17px 圆角与面板阴影；原型及实现统一改为单边框层次、16px 桌面/14px 窄屏圆角、SVG 下拉箭头、CSS 安全点，并为金额启用等宽数字。补充主题化文本选区；最终 `npm test` **PASS，退出码 0**，桌面/窄屏及 99/100 截图再次重生成并人工检查。

TDD 记录：`node --test tests/unit/e1-page-metadata.test.ts` 先以退出码 1 复现页面仍标记“原型”的问题；修改标题/描述后同一命令 PASS，退出码 0。加入 Run 证据记录后，第一次 `npm test` 以退出码 2 停在 TypeScript 的 TS18048 可空值错误；修正已校验 seed 字段的类型收窄后，同一全量命令 PASS，退出码 0。总额字号及标题字距回归均先由 Playwright 复现，再由 CSS 修正；最终全量测试通过。

运行环境：macOS 27.2.1 arm64；Node 26.13.1；npm 11.20.0；TypeScript 6.0.3；`@playwright/test` 1.65.1；`yaml` 2.9.1；Playwright Chromium revision 1255。Playwright 使用本机安装的无头 Chromium。Node 内建 TypeScript 类型剥离说明见 [Node.js 官方文档](https://nodejs.org/download/release/v26.13.1/docs/api/typescript.html)，Playwright 支持说明见 [Playwright 官方文档](https://playwright.dev/docs/intro)。

固定 Seed 为 `e1-threshold`，模拟时钟为 `2026-11-23T10:00:00Z`。最终测试生成的 Run ID 保存在 [`evidence/e1/run-contexts/`](../../evidence/e1/run-contexts/)，并按 Playwright 项目和测试名分文件；截图来自对应 UI 测试。有效业务 Run 与探测 ID 可从对应 JSON 区分。截图为合成数据：桌面 1440×900，窄屏视口 390×844，完整截图高度随内容变化。

## 界面证据与复核

- ¥99 桌面原型：[截图](../../evidence/e1/e1-prototype-desktop-99.png)；实现：[截图](../../evidence/e1/e1-implementation-desktop-99.png)。
- ¥100 桌面原型：[截图](../../evidence/e1/e1-prototype-desktop-100.png)；实现：[截图](../../evidence/e1/e1-implementation-desktop-100.png)。
- ¥99 窄屏原型：[截图](../../evidence/e1/e1-prototype-mobile-99.png)；实现：[截图](../../evidence/e1/e1-implementation-mobile-99.png)。
- ¥100 窄屏原型：[截图](../../evidence/e1/e1-prototype-mobile-100.png)；实现：[截图](../../evidence/e1/e1-implementation-mobile-100.png)。Playwright 对两种金额状态都断言页面宽度没有横向溢出。

截图对照确认 99/100 金额、优惠状态、应付总额层级和布局符合已批准原型；原型专属评审提示未出现在运行界面。复核发现原型默认 100 状态颜色错误，已修正并加入测试；后续两轮视觉复核分别修正实现页总额字号，并为窄屏 99/100 两种状态补齐截图。首轮终审发现的产品与设计记录缺口已在后续修复：产品事实见根目录 `PRODUCT.md`，E1 方向和质量基线见 [surface brief](../design/surfaces/e1-checkout.md) 与 [QUALITY BAR 卡](../design/quality-bars/e1-checkout.md)。E1 按用户批准的代码原型路径完成，没有图像 comp；因此 comp-diff 工件不适用于本轮。

截图与运行上下文一一对应：100 状态四张桌面/窄屏原型与实现截图来自 [`ui-e1-r01-checkout-ui-shows-the-100-threshold-quote.json`](../../evidence/e1/run-contexts/ui-e1-r01-checkout-ui-shows-the-100-threshold-quote.json)，Run `e1-a5cf534c-ce24-49c9-9f46-5980daf5dbec`；99 状态四张截图来自 [`ui-e1-r01-selecting-the-99-boundary-removes-the-discount.json`](../../evidence/e1/run-contexts/ui-e1-r01-selecting-the-99-boundary-removes-the-discount.json)，Run `e1-56bf8bed-421d-4a20-8275-96feed56cd20`。两组均使用 Seed `e1-threshold`、模拟时间 `2026-11-23T10:00:00Z`；上下文记录同时标明测试名，截图文件名标明金额、视口和 prototype/implementation。

Impeccable Hook 对原型与实现都报告了 `overused-font=Inter`，且标记 attribution unknown。由于用户已批准的原型明确使用 Inter，本轮将它视为已确认的视觉例外，并通过 `impeccable hooks ignore-value overused-font Inter --shared --reason "User confirmed: Inter is part of the approved E1 prototype and retained in the implementation."` 写入 `.impeccable/config.json`。忽略项只针对该规则和字体值。Hook 达到六次文件编辑后停止提供设计提示；最终改动通过质量断言、截图复核和终审确认。

最终 Impeccable finish review 于 2026-11-24 返回 **`disposition: ship`**、无 material fixes，复核了当前两种阈值状态、总额层级、圆角/层次、SVG 箭头及本地沙盒边界。之后按已完成的界面记录根目录 [DESIGN.md](../../DESIGN.md)、中文 companion 和 [.impeccable/design.json](../../.impeccable/design.json) schema v2 sidecar。

工具限制：Impeccable engine 0.1.27 未安装；`impeccable context` 报告初始化需要网络访问和对用户 home 下缓存目录的写入。按 Skill 指引未重试 engine，直接读取现有 PRODUCT、surface brief 和 craft-floor 文档；自动 `impeccable audit` 为 **NOT RUN**。终审使用最终测试截图和只读评审完成。

## 尚未覆盖

- E1-R04 及 `unknowns_to_approve` 中未定的运费/税费门槛口径。
- M1/S1 可运行 Demo、24 个工具安装/实测、第三方工具比较、真实业务浏览器验证和性能基准。
- 无真实支付、订单持久化或远程部署；服务关闭后运行数据丢弃。
