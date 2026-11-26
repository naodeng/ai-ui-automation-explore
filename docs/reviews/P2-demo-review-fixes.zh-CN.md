# P2 Demo Review 修复记录

**日期：** 2026-11-26

**分支：** `develop`

**范围：** E1 默认 Run 隔离、M1 合约迁移示例、S1 状态记录和历史 TDD 证据标注。

## 修复项

### E1：新访客共享优惠券状态

之前，空白结算页使用固定 `e1-local`，服务端也把缺少 `run_id` 的 `/api/cart` 请求回退到该 Run。一个页面完成支付后，另一个新页面会看到优惠券已使用。

- 空白页面现在生成唯一 Run ID，并用 `history.replaceState` 写入 URL；有 `run_id` 的链接仍可复现对应 Run。
- `/api/cart` 缺少 `run_id` 时现在返回 `400 invalid_run_id`；服务端不再预置共享默认 Run。
- 回归测试覆盖两个空白页面的 Run ID 不同，以及第一页面模拟支付后第二页面仍可使用 C20。
- RED：`npx playwright test --config=playwright.config.ts --grep 'E1 default run isolation'`，退出码 1。API 断言实际收到 200（期望 400）；UI 断言两个页面没有自己的 Run ID。
- GREEN：同一命令，2 项通过，退出码 0。

### M1：遗漏契约内的 Platinum → Gold 示例

`contracts/cases/M1.yaml` 已列出 Platinum 在 `renewal_failed_at_period_end` 后降为 Gold，但服务端拒绝 `platinum_to_gold`，UI 也没有入口。

- 服务端现为该示例准备合成 Platinum 夹具并应用严格递增事件；API 与 UI 可运行该场景。
- 场景只记录等级迁移、事件版本和只读 Oracle 状态，不虚构 Gold-only 授权检查。该示例没有单独的编号规则，因此不归入 M1-R01–R05 通过证明。
- RED：`npx playwright test --config=playwright.m1.config.ts --grep 'Platinum renewal failure'`，退出码 1。API 返回 400 而非 201；UI 场景按钮不存在并超时。
- GREEN：同一命令，API 与 UI 两项通过，退出码 0。
- 界面证据：[桌面](../../evidence/m1/m1-implementation-platinum-to-gold.png)、[390px 窄屏](../../evidence/m1/m1-implementation-mobile-platinum-to-gold.png)。

### S1 与产品说明：状态描述过期

- Seed Manifest 现记录 E1/M1/S1 本地合成运行状态；S1-R02 限定为单 Node 进程内的有界检查，S1-R05 记录取消和 Fake Clock 超时释放。
- 英文与中文 `PRODUCT` 均同步为 S1 五条已批准规则在当前本地合成范围内通过，并保留跨进程、数据库并发、负载和生产语义限制。

## TDD 历史证据

现有 M1-R03 至 R05 与 S1-R05 实现记录保存了最终通过结果，但没有保留当时 RED 命令和失败输出。该历史事实不能事后重建。本次已将此限制明确写入 [M1 Review](P2-M1-review.md) 和[双语 S1 Review](P2-S1-review.md)，不把旧的 GREEN 回归结果改写成观察过的 RED→GREEN。新增 E1 与 M1 缺陷有本轮真实 RED/GREEN 记录。

## 本地验证

| 检查 | 结果 |
|---|---|
| `npm test` | PASS，退出码 0；TypeScript、24 项 Node 单测、34 项 E1/M1/S1 Playwright API/UI 用例 |
| `.venv/bin/python -m unittest discover -s tests -q` | PASS，17 项，退出码 0 |
| `.venv/bin/python scripts/validate_project.py` | PASS，静态包完整性 |
| `node --check`（E1/M1/S1 浏览器脚本）与 `git diff --check` | PASS，退出码 0 |
| 远端 CI | 本机回归完成后尚未对当前工作区版本运行；需提交并推送后核对对应 GitHub Actions Run |

M1 新场景沿用既有状态总览布局，桌面和 390px 窄屏截图均已检查，无横向溢出。Playwright 使用随附无头 Chromium；测试只访问本机合成 Demo，不涉及真实账号、订单、支付或外网业务流量。

## 设计工具限制

Impeccable Hook 提示 `.impeccable/design.json` 早于 `DESIGN.md`。本轮 `impeccable context` 退出码 127：本机没有 engine 0.1.27，初始化需要网络和 home 目录写权限；Skill 要求现有 `DESIGN.md` 不得静默覆盖。已把 DESIGN 中 M1 场景数量的过期描述改为不限定数量；自动 sidecar 重生成 **NOT RUN**，不手工伪造生成时间或元数据。
