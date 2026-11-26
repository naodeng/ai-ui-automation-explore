# P2 S1 实现评审

**状态：** S1 合成 Demo 已覆盖全部五条已批准规则；最新跨案例本地回归与生命周期视口检查均通过。

## 实现范围

- 本地服务只监听 `127.0.0.1:4181`；每个 Run 都在内存中隔离创建，并使用固定合成 Seed。
- 购买请求创建 30 秒 Fake Clock 预约。模拟完成将 `reserved → sold`；取消和超时以只执行一次的原子动作记录 `reserved → released → available`。
- 仅 `success` 计入有效成功购买。取消或超时后的用户可以重新预约；成功购买用户不能超过一次。
- 只读 Oracle 暴露活动事实、五种库存桶、订单、不可变流水和校验和。不涉及队列、支付、履约或真实业务数据。
- R02 有界 API 检查向本机单进程服务并发发送 101 个预约请求，再完成接受的 100 个预约。这只是本地回归，不是生产数据库竞争证明或负载测试。

## Rule 状态

| Rule | 状态 | 证据与边界 |
|---|---|---|
| S1-R01 | PASS | API 在开售前拒绝请求且库存不变；Fake Clock 到开售时刻后允许预约。 |
| S1-R02 | PASS（本机有界范围） | 100 次串行购买后第 101 次被拒绝；另一次 101 请求本地 API 并发运行准确得到 100 个预约、1 个拒绝，完成 100 个唯一订单并检查最终库存守恒。未覆盖多进程/数据库行为或负载。 |
| S1-R03 | PASS | 同一用户购买成功后使用新幂等键会被限购拒绝；已有有效预约时也不能重复创建预约。 |
| S1-R04 | PASS | 重用幂等键返回同一订单，不新增预约或库存流水；重复完成/取消保持终态且不重复写入流水。 |
| S1-R05 | PASS | 取消立即释放；Fake Clock 在 `now >= expires_at` 时触发超时释放。两种路径均只释放一次，库存可再次预约；释放后完成购买会被拒绝。 |

## 验证记录

- `npm test`：PASS，退出码 0；TypeScript 与 24 项 Node 单元测试通过；E1 9 项 API/4 项 UI、M1 7 项 API/4 项 UI、S1 5 项 API/5 项 UI 均通过，共 34 项 Playwright 测试。
- S1 API 覆盖含 101 请求有界并发与 100 个预约完成后的库存守恒检查；S1 UI 5 项全部通过，含桌面和 390px 窄屏取消/超时生命周期。
- `.venv/bin/python -m unittest discover -s tests -q`：PASS，17 项；`.venv/bin/python scripts/validate_project.py`：PASS。
- `node --check demos/flash-sale/public/app.js && git diff --check`：PASS。
- Playwright API/UI 使用项目随附无头 Chromium。本机回环测试首次遇到沙箱 `EPERM`，随后按一次性沙箱外授权执行，没有在沙箱内重试。

## 证据

- 开售前视觉基线：[S1 秒杀界面稿](../../evidence/s1/design/s1-flash-sale-state-before-open-v2.png)
- 已批准的生命周期稿：[桌面](../../evidence/s1/design/s1-r05-lifecycle-desktop-proposal.png)、[窄屏](../../evidence/s1/design/s1-r05-lifecycle-mobile-proposal.png)、[决策记录](../../evidence/s1/design/s1-r05-lifecycle-prototype.zh-CN.md)
- API 与 Oracle 基线：[R01–R04 记录](../../evidence/s1/run-contexts/s1-r01-r04-api.json)
- 有界并发：[R02 并发记录](../../evidence/s1/run-contexts/s1-r02-concurrent-reservations.json)
- 串行售罄：[R02 串行记录](../../evidence/s1/run-contexts/s1-r02-serial-stockout.json)
- 生命周期截图：桌面 `evidence/s1/s1-r05-reserved-desktop.png`、`s1-r05-cancelled-desktop.png`、`s1-r05-expired-desktop.png`；窄屏 `s1-r05-reserved-mobile.png`、`s1-r05-cancelled-mobile.png`、`s1-r05-expired-mobile.png`；另有 `s1-desktop-purchase-result.png`。

## 限制

- 并发检查只覆盖单个内存 Node 进程，不证明跨进程或数据库原子性。
- 未运行负载测试、生产流量、队列语义、排序保证或一致性 SLA。
- `pending_release` 保持 0。`released` 桶只在一次同步释放动作的两条不可变流水之间暂时出现，最终快照为 0；库存方程仍守恒。
- 未使用真实商品、账号、购买、支付或履约。
- 历史 S1-R05 实现记录保留了最终通过结果，但没有保留开发时的 RED 命令和失败输出。因此该历史切片的 TDD 过程证据不完整；本报告不把现存 GREEN 回归结果追述为已观测的 RED→GREEN。该过程证据无法事后重建。
