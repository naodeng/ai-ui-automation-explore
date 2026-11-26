# P2 M1 实现评审

**状态：** M1 已批准范围内的合成 Demo 已实现；最新跨案例本地回归通过。M1-R03 的到期值只属于固定合成夹具。

## 范围

- 使用用户选择的 A「状态总览」图像稿实现 M1 页面，并将确认稿保存到 evidence/m1/design/m1-state-overview-comp.png。
- 新增独立 M1 本地服务，监听 127.0.0.1:4180；每次运行使用内存 Run 和固定 Seed。
- 覆盖已批准的 Silver→Gold、Gold→Silver、M1.yaml 中 Platinum→Gold 迁移示例、旧会话授权、当前/旧事件重放、历史已领优惠券夹具状态和 Fake Clock。Platinum→Gold 只检查等级/事件迁移，不映射到未定义的授权规则。
- 未实现账期、真实等级计算、未领取优惠券、额外权益、生产会员资料、真实购买或支付。

## Rule 状态

| Rule | 状态 | 证据与限制 |
|---|---|---|
| M1-R01 | PASS | API 与 UI 回归检查 Silver→Gold v6 后 Gold-only 授权为允许。升级场景在独立 Run 中先准备 Silver 夹具，再应用阈值事件。 |
| M1-R02 | PASS | API 与 UI 回归检查 Gold→Silver v6 后，仍可用的旧会话不能发起新的 Gold-only 购买。 |
| M1-R03 | PASS | 合成夹具到期时点为 `2026-11-23T10:00:30Z`；API 回归检查到期前仍有效、恰好到期为过期，状态进入 Oracle。该时间仅用于本地教学夹具。 |
| M1-R04 | PASS | API 回归分别重放当前版本 v5 与较旧版本 v4；会员等级和事件版本保持不变。UI 场景也检查重放后的观察状态。 |
| M1-R05 | PASS（本地即时路径） | UI 回归在同一固定模拟时刻检查场景响应后页面等级、只读 Oracle 等级和事件版本一致；本 Demo 的合成接口路径为 0 个模拟秒。没有把该结果外推为真实网络延迟基准。 |

## 验证

命令：`npm test`，最终退出码 0。根级测试包含 E1、M1 与 S1。

- TypeScript：PASS。
- Node 单元测试：24 项 PASS。
- E1：9 项 API、4 项 UI PASS；M1：7 项 API、4 项 UI PASS；S1：5 项 API、5 项 UI PASS，共 34 项 Playwright 测试 PASS。
- M1 覆盖银升金、金降银、铂金降金示例、旧会话拒绝、事件重放、优惠券到期 Fake Clock 边界，以及 1440/1024/768/390px 视口。
- Python Schema/结构单元测试：17 项 PASS，命令为 `.venv/bin/python -m unittest discover -s tests -q`。
- 静态包检查：PASS，命令为 .venv/bin/python scripts/validate_project.py；git diff --check：PASS。
- M1 Seed 截图覆盖 1440×900、1024×900、768×900、390×844；Platinum→Gold 新场景的桌面和 390px 窄屏截图，以及 S1 桌面/窄屏生命周期截图已检查。
- `node --check demos/flash-sale/public/app.js`：PASS。
- 首次运行在 Codex 沙箱内因本机监听返回 EPERM，未在沙箱中重试；同一命令获一次性沙箱外执行后通过。
- Node v26.13.1、npm 11.20.0、项目锁定的 Playwright 1.65.1、Playwright 随附无头 Chromium。

合成 Seed 明确记录历史优惠券到期点后，Fake Clock 可以在到期边界更新 UI 与只读 Oracle。此前的视觉检查还修复了提示条遮挡检查行的问题，并调整状态标签对比度和最小字号。

## 截图与 Run 记录

- 设计基线：[M1 状态总览稿](../../evidence/m1/design/m1-state-overview-comp.png)
- Seed 与场景：../../evidence/m1/m1-implementation-desktop-seed.png、../../evidence/m1/m1-implementation-desktop-upgrade.png、../../evidence/m1/m1-implementation-desktop-downgrade.png
- 其他视口：../../evidence/m1/m1-implementation-1024-seed.png、../../evidence/m1/m1-implementation-768-seed.png、../../evidence/m1/m1-implementation-mobile-seed.png
- 到期 UI 状态见[30 秒边界截图](../../evidence/m1/m1-implementation-desktop-downgrade.png)：界面显示合成优惠券已过期，模拟时间为 `2026-11-23T10:00:30.000Z`；Run 与 Oracle 记录见 [M1 Run 记录](../../evidence/m1/m1-run-record.json)。
- 每次运行对应的 Run ID、Seed、状态、事件版本、授权结果和模拟时钟见 [M1 Run 记录](../../evidence/m1/m1-run-record.json)。

## 未验证范围

- M1-R03：时间边界只对固定合成夹具有效，不代表真实业务策略。
- UI 的 30 秒规则已在本地同步路径测得 0 模拟秒，但没有模拟延迟服务端或网络传播。
- Run 和观察日志只在当前 Node 进程内存中；重启后清空。
- 没有连接真实会员服务、真实支付或生产浏览器，也没有运行 AI 浏览器工具对比。

## 2026-11-26 审查修复补充

- 修复了 `contracts/cases/M1.yaml` 明列的 Platinum 续期失败降为 Gold 示例在 API 被错误拒绝的问题；UI 现可运行该合成迁移，并明确显示没有采集 Gold-only 授权结果。截图见 [Platinum → Gold](../../evidence/m1/m1-implementation-platinum-to-gold.png)。
- 先加 API/UI 回归用例，再运行 `npx playwright test --config=playwright.m1.config.ts --grep 'Platinum renewal failure'`：RED，退出码 1；API 因预期 201 实际 400 失败，UI 因场景按钮不存在超时。实现后同一命令 GREEN，API 与 UI 两项均通过，退出码 0。
- 历史 M1-R03 至 R05 的实现记录保留了最终通过结果，但没有保留各规则开发时的 RED 命令和失败输出。因此本报告不把这些历史结果称为完整的 RED→GREEN 过程；该历史证据无法事后重建。新增 Platinum 示例与 E1 隔离修复的 RED/GREEN 则有本轮真实命令记录。
