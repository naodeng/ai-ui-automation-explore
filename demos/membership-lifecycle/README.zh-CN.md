# M1 会员生命周期 Demo

M1 是仅限本机的合成 Demo，用于演练已批准的会员生命周期规则和等级迁移示例。它包括内存 Node 服务、响应式状态总览界面、仅操作夹具的场景按钮和只读会员 Oracle。

## 本机启动

在仓库根目录运行 npm run dev:m1，然后打开 http://127.0.0.1:4180/。服务仅监听回环地址，并读取 fixtures/seed-manifest.json 中的 M1 Seed。每个新页面会创建唯一的内存 Run；重置或运行等级场景会创建新的 Run。服务重启后所有 Run 清空。

## 合成操作

- **Silver → Gold：**准备 Silver 夹具，应用严格递增的 threshold_reached 事件，再读取 Gold-only 授权结果。
- **Gold → Silver：**应用严格递增的 renewal_failed_at_period_end 事件，并用仍可用的旧会话探测能否发起新的 Gold-only 购买。
- **Platinum → Gold：**按已批准的 renewal_failed_at_period_end 迁移示例准备合成 Platinum 夹具并应用事件；仅观察等级和事件版本，不声称本场景验证了 Gold-only 授权。
- **事件重放：**记录重复当前版本或较旧版本的重放尝试，不改变有效等级与事件版本。
- **Fake Clock：**每次最多推进当前 Run 的 30 个模拟秒。合成历史优惠券在 `2026-11-23T10:00:30Z` 到期；此时点之前有效，到期时及之后为已过期。

Demo 不会创建购买。所有状态和重放记录只保存在服务进程内。以下 Oracle 接口只读：

- GET /api/state?run_id=...
- GET /api/oracle?run_id=...
- GET /api/authorization?run_id=...&session_kind=current|old

受限的夹具操作接口为 POST /api/runs、POST /api/scenarios/run、POST /api/events/replay 与 POST /api/clock/advance。

## 验证

运行 npm run test:m1。

M1-R01–R05 均有 API/UI 回归覆盖。M1-R03 检查合成夹具在 `2026-11-23T10:00:30Z` 到期前有效、到期时过期；该时间不代表真实优惠券政策。跨案例 `npm test` 全量回归通过；完整命令和剩余边界见 [P2 M1 评审](../../docs/reviews/P2-M1-review.md)。

## 契约边界

本 Demo 不实现真实等级计算、账期、未领取优惠券、额外权益或生产会员资料；不会创建购买或联系支付服务。优惠券到期时点仅是本地教学夹具值，不代表真实会员或优惠券政策。M1-R05 覆盖本机即时更新路径，不测量延迟网络传播。
