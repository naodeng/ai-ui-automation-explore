# S1 商品秒杀 Demo

S1 首个本地合成运行切片，覆盖已批准的开售前边界、单用户限购、幂等重放、服务端 Fake Clock、五种分开展示的库存桶和只读 `FlashSaleOracle`。

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

- 开售前的请求会被拒绝且库存不变；Fake Clock 推进至开售时刻后可提交一次合成购买。
- 成功购买会将 1 件库存直接从 `available` 转入 `sold`。同一幂等键重放会返回原订单且不新增流水；同一用户使用新键再次购买会被限购拒绝。
- Oracle 返回五种库存桶、相关订单、不可变流水、活动事实和校验和，不计算 `effective_sold_quantity`。
- 定向回归中 R01、R03、R04 为 PASS；R02 为 PARTIAL：100 次逐笔串行购买后库存耗尽，第 101 次购买被拒绝；未测试并发写入或负载。R05 取消/超时释放行为未运行。
- 队列语义、排序保证、一致性 SLA、未定义的取消/超时释放时序仍在范围外。`/queue` 仅说明边界，不模拟排队。
- 不使用真实商品、账号、购买或支付。

详见 [S1 契约](../../contracts/cases/S1.yaml)、[Oracle 接口说明](../../contracts/oracles/README.zh-CN.md)、[视觉基线](../../docs/design/surfaces/s1-flash-sale.zh-CN.md) 和 [P2 S1 实现评审](../../docs/reviews/P2-S1-review.md)。
