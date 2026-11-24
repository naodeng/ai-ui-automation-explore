# P2 S1 实现评审

**状态：** 首个本地合成运行切片已实现；规则状态按实际验证范围标记。视觉稿已批准，桌面与窄屏版式已对照基线检查。

## 实现范围

- 在 `develop` 上实现 S1 本地服务和 UI，服务仅绑定 `127.0.0.1:4181`。
- 每个 Run 从固定合成 Seed 独立创建，数据保存在当前 Node 进程内存。
- 覆盖开售前拒绝、服务端 Fake Clock、一次成功购买、单用户限购、幂等重放、五种库存桶与只读 Oracle。
- 成功购买使用单步 `available → sold` 流水。没有队列模拟、预留/释放生命周期或真实业务数据。

## Rule 状态

| Rule | 状态 | 证据与边界 |
|---|---|---|
| S1-R01 | PASS | API 在开售前拒绝请求且状态不变；推进 Fake Clock 到开售边界后允许一次合成购买。UI 初始按钮禁用。 |
| S1-R02 | PARTIAL | Oracle 返回五个库存桶和不可变流水；单次成功购买后总量仍为初始库存。未运行售罄、并发或负载验证，不能据此证明库存上限或无超卖。 |
| S1-R03 | PASS | 同一用户成功购买后，使用新幂等键再次购买会被限购拒绝。 |
| S1-R04 | PASS | 重用幂等键返回原订单；库存状态和流水没有增加。 |
| S1-R05 | NOT RUN | 尚未定义的取消/超时释放时序未实现；Oracle 只暴露当前库存桶与流水事实。 |

## 验证记录

- `npm test`：PASS，退出码 0。TypeScript 检查通过；9 项 Node 单元测试通过；E1 5 项 API + 2 项 UI、M1 6 项 API + 3 项 UI、S1 2 项 API + 3 项 UI 全部通过。
- `.venv/bin/python -m unittest discover -s tests -v`：PASS，16 项通过。
- `.venv/bin/python scripts/validate_project.py`：PASS；`git diff --check`：PASS。
- 视觉截图由 Playwright 在 1487×1058、1440×900、1024×900、768×900 和 390×844 视口生成并检查；各视口无水平溢出。购买成功页面另有桌面截图。
- 环境：Node v26.13.1、npm 11.20.0、Playwright 1.65.1、Python 3.9.6。Playwright 使用项目随附的无头 Chromium 和本地回环服务。

## 证据

- 视觉基线：[`S1 秒杀界面稿`](../../evidence/s1/design/s1-flash-sale-state-before-open-v2.png)
- Run 与 Oracle 记录：[`S1 API 记录`](../../evidence/s1/run-contexts/s1-r01-r04-api.json)
- 视口截图：`evidence/s1/s1-design-baseline-pre-open.png`、`s1-desktop-pre-open.png`、`s1-tablet-landscape-pre-open.png`、`s1-tablet-portrait-pre-open.png`、`s1-mobile-pre-open.png`
- 购买成功截图：`evidence/s1/s1-desktop-purchase-result.png`

## 未验证范围

- R02 的库存耗尽与服务端并发安全，以及所有负载测试。
- R05 取消/超时后的释放时序和 exactly-once 行为。
- 排队语义、排序保证和最终一致性 SLA。
- 真实服务、生产数据、支付与 AI 浏览器工具比较。

S1 的队列、有效售出与预留的定义以及生命周期边界仍按契约列为未决项；本轮没有补造业务规则。
