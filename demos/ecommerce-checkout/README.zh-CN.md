# E1 电商结算 Demo

这是一个仅限本机的合成 Demo，用于验证已批准的 E1 规则：99/100 优惠门槛、报价与订单金额一致、订单幂等。服务只监听 `127.0.0.1`，数据保存在内存中，不连接支付或发货服务。

## 启动

在仓库根目录安装锁定依赖后运行：

```bash
npm run dev
```

打开 `http://127.0.0.1:4179/`。选择合成的 ¥99 或 ¥100 购物车，检查服务端报价并创建沙盒订单。UI 使用 Run ID；价格来自服务端合成商品目录，金额规则读取已批准的 `contracts/cases/E1.yaml`。

服务启动时会在 `.local/e1-control-token` 生成随机重置令牌，并限制为当前用户可读写。浏览器代码拿不到该令牌。Reset 和 Oracle 是本地测试接口：Reset 必须带令牌；Oracle 只读，并对未知 Run、Seed 或用户返回未找到。停止服务后令牌会删除，进程内运行数据也会清空。

服务运行时创建另一份合成 Run：

```bash
npm run demo:reset -- --case E1 --seed e1-threshold
```

命令会输出新的 `run_id` 和确定性状态摘要。打开 `http://127.0.0.1:4179/?run_id=<run_id>` 查看该 Run。

## 检查

```bash
npm run typecheck
npm run test:unit
npm run test:api
npm run test:e2e
npm test
```

Playwright 使用其随附的无头 Chromium。E2E 测试会在 `evidence/e1/` 保存合成数据的 99/100 界面、窄屏截图，以及对应 Run ID、Seed ID 和模拟时钟记录。

## 契约边界

- 已实现：E1-R01、E1-R02、E1-R03。
- 暂缓：E1-R04 优惠券锁定、支付、取消、核销状态；运费与税费保持已批准 Fixture 中的零值，不推断其是否计入门槛。
- Oracle 的 `coupon_ledger` 只记录优惠已计入报价，不表示优惠券已预占或核销。
- 订单状态为 `sandbox_created`；没有支付、退款、发货或持久化层。

实现范围与验证结果见 [P2 E1 评审](../../docs/reviews/P2-E1-review.md)。
