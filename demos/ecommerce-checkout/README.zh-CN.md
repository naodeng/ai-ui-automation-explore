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

## 盲评隔离基础层

普通 `npm run dev` 保持原有单监听器与确定性测试行为。隔离边界的本地代码检查模式要求显式配置两个监听器：

```bash
E1_PUBLIC_HOST=127.0.0.1 PORT=4179 E1_EVALUATOR_HOST=127.0.0.1 E1_EVALUATOR_PORT=4180 npm run dev:blind-eval
```

公开监听器提供页面与 E1 业务 API；`/__test/reset` 和 `__test/oracle/checkout` 在公开监听器上返回 404，且盲评模式会拒绝 `/api/orders`。评估监听器只提供 Reset/Oracle 路由，二者都要求控制令牌。`E1_EVALUATOR_HOST` 必须指定具体网卡地址，通配地址会在启动时被拒绝。盲评只读 Charter 不授予 Oracle 权限或沙盒订单写入；购物车选择和报价仅影响可重置的内存 Run。

盲评模式使用独立令牌文件 `.local/e1-blind-control-token`，不会覆盖普通 Demo 的 `.local/e1-control-token`。评估方可用 `E1_EVALUATOR_HOST` 与 `E1_EVALUATOR_PORT` 指向私有监听器运行 `npm run demo:reset -- --blind-eval --case E1 --seed e1-threshold`。两个监听器若都绑定回环地址，这只验证应用路由边界，**不构成 Agent 主机/网络隔离证明**。正式盲测仍需由运行环境把 Explorer 与评估监听器隔开，并禁止 Explorer 访问仓库、源码检查接口、Shell、文件系统和任意网络。

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
