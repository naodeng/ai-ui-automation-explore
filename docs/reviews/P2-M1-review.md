# P2 M1 实现评审

**状态：** M1 第一轮合成 Demo 已实现；定向类型检查、API 回归、UI 回归和视口检查通过。M1-R03 的实际优惠券到期行为仍未验证。

## 范围

- 使用用户选择的 A「状态总览」图像稿实现 M1 页面，并将确认稿保存到 evidence/m1/design/m1-state-overview-comp.png。
- 新增独立 M1 本地服务，监听 127.0.0.1:4180；每次运行使用内存 Run 和固定 Seed。
- 覆盖已批准的 Silver→Gold、Gold→Silver、旧会话授权、当前/旧事件重放、历史已领优惠券夹具状态和 Fake Clock。
- 未实现账期、真实等级计算、未领取优惠券、额外权益、生产会员资料、真实购买或支付。

## Rule 状态

| Rule | 状态 | 证据与限制 |
|---|---|---|
| M1-R01 | PASS | API 与 UI 回归检查 Silver→Gold v6 后 Gold-only 授权为允许。升级场景在独立 Run 中先准备 Silver 夹具，再应用阈值事件。 |
| M1-R02 | PASS | API 与 UI 回归检查 Gold→Silver v6 后，仍可用的旧会话不能发起新的 Gold-only 购买。 |
| M1-R03 | PARTIAL | Seed Manifest 明确已领取优惠券在 Seed 起始时点未过期；Oracle 与 UI 显示该起始状态。推进 30 个模拟秒后，界面将状态改为待核实，因为没有准确到期时间。实际到期前后行为未运行。 |
| M1-R04 | PASS | API 回归分别重放当前版本 v5 与较旧版本 v4；会员等级和事件版本保持不变。UI 场景也检查重放后的观察状态。 |
| M1-R05 | PASS（本地即时路径） | UI 回归在同一固定模拟时刻检查场景响应后页面等级、只读 Oracle 等级和事件版本一致；本 Demo 的合成接口路径为 0 个模拟秒。没有把该结果外推为真实网络延迟基准。 |

## 验证

命令：npm test，最终退出码 0。根级测试现在同时包含 E1 与 M1。

- TypeScript：PASS。
- Node 单元测试：4 项 PASS。
- E1：5 项 API、2 项 UI PASS。
- M1：6 项 API、3 项 UI PASS；覆盖银升金、金降银、旧会话拒绝、事件重放、Fake Clock 与 390px 无横向溢出。
- Python Schema/结构单元测试：16 项 PASS，命令为 .venv/bin/python -m unittest discover -s tests -v。
- 静态包检查：PASS，命令为 .venv/bin/python scripts/validate_project.py；git diff --check：PASS。
- 视觉视口：1440×900、1024×900、768×900、390×844 的 Seed 截图均已生成并检查。
- 首次运行在 Codex 沙箱内因本机监听返回 EPERM，未在沙箱中重试；同一命令获一次性沙箱外执行后通过。
- Node v26.13.1、npm 11.20.0、项目锁定的 Playwright 1.65.1、Playwright 随附无头 Chromium。

定向合约测试调整中发现并修复了一个真实范围问题：Fake Clock 推进后不能继续声称优惠券仍有效，因为 Seed 没有过期时间。当前 UI/Oracle 将该状态标记为 not_evaluated。视觉检查也发现固定提示条遮挡检查行，已移入文档流；状态标签对比度和最小字号随之调整。

## 截图与 Run 记录

- 设计基线：[M1 状态总览稿](../../evidence/m1/design/m1-state-overview-comp.png)
- Seed 与场景：../../evidence/m1/m1-implementation-desktop-seed.png、../../evidence/m1/m1-implementation-desktop-upgrade.png、../../evidence/m1/m1-implementation-desktop-downgrade.png
- 其他视口：../../evidence/m1/m1-implementation-1024-seed.png、../../evidence/m1/m1-implementation-768-seed.png、../../evidence/m1/m1-implementation-mobile-seed.png
- 每次运行对应的 Run ID、Seed、状态、事件版本、授权结果和模拟时钟见 [M1 Run 记录](../../evidence/m1/m1-run-record.json)。

## 未验证范围

- M1-R03：需要明确的优惠券过期时间，才能验证到期前后行为；当前不补造日期。
- UI 的 30 秒规则已在本地同步路径测得 0 模拟秒，但没有模拟延迟服务端或网络传播。
- Run 和观察日志只在当前 Node 进程内存中；重启后清空。
- 没有连接真实会员服务、真实支付或生产浏览器，也没有运行 AI 浏览器工具对比。
