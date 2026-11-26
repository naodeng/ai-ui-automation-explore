# S1 商品秒杀 Demo

S1 本地合成 Demo 覆盖已批准的开售前边界、单用户有效成功限购、幂等预约、30 秒 Fake Clock 预约生命周期、五种分开展示的库存桶和只读 `FlashSaleOracle`。

## 本地运行

在仓库根目录执行：

```bash
npm run dev:s1
```

打开 `http://127.0.0.1:4181/flash-sale`。服务只监听本机回环地址。每个 Run 都在内存中隔离创建，并读取 `fixtures/seed-manifest.json` 中固定的 S1 Seed。

## 验证

```bash
npm run test:s1
```

此命令运行 TypeScript 检查、S1 API 与 Playwright UI 回归。完整项目回归使用 `npm test`。

## 范围与限制

- 开售前请求会被拒绝且库存不变；到达开售时刻后，合成购买先预约 1 件，模拟完成后再转为 `sold`。
- 预约自创建起 30 个 Fake Clock 秒到期。到期前取消或在 `now >= expires_at` 超时会通过 `reserved → released → available` 流水将库存恰好释放一次。`released` 只在原子释放动作中作为中间桶，动作完成后为 0；`pending_release` 保持 0。
- 重放幂等键返回同一订单。同一用户已有预约时不能重复预约；取消或超时后可以重新预约，成功购买后执行每用户一次成功限购。
- Oracle 返回五种库存桶、订单、不可变流水、活动事实和校验和，不推导 `effective_sold_quantity` 字段。
- R01、R03、R04、R05 有定向 API/UI 回归。R02 覆盖 100 次串行购买以及对本机单进程服务的一次 101 请求有界并发回归；这不是生产数据库并发证明或负载测试。
- 队列语义、排序保证和一致性 SLA 仍在范围外。`/queue` 仅说明边界，不模拟排队。
- 不使用真实商品、账号、购买或支付。

详见 [S1 契约](../../contracts/cases/S1.yaml)、[Oracle 接口说明](../../contracts/oracles/README.zh-CN.md)、[视觉基线](../../docs/design/surfaces/s1-flash-sale.zh-CN.md) 和 [P2 S1 实现评审](../../docs/reviews/P2-S1-review.md)。
