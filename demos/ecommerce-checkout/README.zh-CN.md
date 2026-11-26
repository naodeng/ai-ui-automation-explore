# E1 电商结算 Demo

这是一个仅限本机的合成 Demo，用于验证已批准的 E1 规则：99/100 优惠门槛、报价与订单金额一致、订单幂等。服务只监听 `127.0.0.1`，数据保存在内存中，不连接支付或发货服务。

## 启动

在仓库根目录安装锁定依赖后运行：

```bash
npm run dev
```

打开 `http://127.0.0.1:4179/`。不带参数打开页面时会生成唯一 Run ID 并写入 URL；每个无 `run_id` 的新页面使用独立优惠券和订单状态。API 请求若缺少有效 Run ID 会被拒绝，不再回退到共享默认 Run。选择合成的 ¥99 或 ¥100 购物车，检查服务端报价并创建沙盒订单。创建订单后可模拟支付，或在支付前取消；取消会释放 C20，供同一 Run 后续新订单使用。价格来自服务端合成商品目录，金额规则读取已批准的 `contracts/cases/E1.yaml`。全部状态仅存于进程内存。

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

公开监听器提供页面与 E1 业务 API；`/__test/reset` 和 `__test/oracle/checkout` 在公开监听器上返回 404，且盲评模式会拒绝 `/api/orders`、订单模拟支付和取消路由。评估监听器只提供 Reset/Oracle 路由，二者都要求控制令牌。`E1_EVALUATOR_HOST` 必须指定具体网卡地址，通配地址会在启动时被拒绝。盲评只读 Charter 不授予 Oracle 权限或沙盒订单写入；购物车选择和报价仅影响可重置的内存 Run。

盲评模式使用独立令牌文件 `.local/e1-blind-control-token`，不会覆盖普通 Demo 的 `.local/e1-control-token`。评估方可用 `E1_EVALUATOR_HOST` 与 `E1_EVALUATOR_PORT` 指向私有监听器运行 `npm run demo:reset -- --blind-eval --case E1 --seed e1-threshold`。两个监听器若都绑定回环地址，这只验证应用路由边界，**不构成 Agent 主机/网络隔离证明**。下方 OrbStack 实验与本 Demo 分开；正式盲测仍需要单独获批的 Explorer 运行时和独立评估方，并禁止 Explorer 访问仓库、源码检查、Shell 或评估数据。

## 可选的本机宿主隔离实验

独立 OrbStack 机器是可选的宿主隔离实验，不属于本 Demo，也不是 URL 驱动的浏览器测试所必需。机器里没有 E1 代码或浏览器，无法访问运行在 Mac 上的应用；`verify` 后也会阻断普通互联网访问，因此目前不能用来测试本 Demo 或任意 URL。配置与限制见 [OrbStack 沙箱指南](../../scripts/orbstack/README.zh-CN.md)。Agent 与浏览器评估仍为 **NOT RUN**。

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

- 已实现：E1-R01 至 E1-R04。创建使用 C20 的沙盒订单会锁定优惠券；模拟支付将优惠券记为 `sandbox_redeemed`；支付前取消会释放优惠券，允许新报价再次使用。重复操作不会重复写入生命周期账本，取消后支付及支付后取消会被拒绝。
- Oracle 的只读 `coupon` 与 `coupon_ledger` 报告当前状态和报价、锁定、模拟使用、释放事件。`sandbox_redeemed` 只代表本地演示账本状态，不是实际核销。
- `sandbox_paid` 只代表模拟支付状态；没有真实支付、退款、发货、优惠券核销或持久化层。运费与税费保持已批准 Fixture 中的零值，不推断其是否计入门槛。

基线实现见 [P2 E1 评审](../../docs/reviews/P2-E1-review.md)；R04 生命周期实现与验证见 [P2 E1-R04 评审](../../docs/reviews/P2-E1-R04-review.zh-CN.md)。
