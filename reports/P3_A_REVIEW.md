# P3-A｜确定性 Playwright 自动化基线评审

**状态：PARTIAL。** E1/M1/S1 确定性回归、本地 CI 配置和远端 GitHub Actions 验证均已完成。P3 的故障注入评估和受限 Agent 独立复现未完成。

## 工具与执行边界

- 唯一浏览器执行路径：Playwright Test 1.65.1；未混用 GUI Chrome、Browser MCP 或 Computer Use。
- 本地环境：Node v26.13.1、npm 11.20.0、Python 3.9.6；Playwright 使用项目随附的无头 Chromium。
- E1/M1/S1 均从独立内存 Run 执行。Trace 在测试失败时保留，失败截图按 Playwright 配置保存；契约状态与账本由各自 Oracle 断言。
- S1 售罄路径按 `permitted_client_concurrency: 1` 顺序提交 100 笔购买，不是并发或负载测试。

## 自动化覆盖与结果

| Case | API | UI | 本轮范围 |
|---|---:|---:|---|
| E1 | 5 PASS | 2 PASS | 99/100 C20 边界、报价/订单一致性、幂等、隔离重置、未知 Run 拒绝 |
| M1 | 6 PASS | 3 PASS | Silver→Gold、Gold→Silver、旧会话授权、事件重放、Fake Clock、视口溢出 |
| S1 | 2 PASS | 4 PASS | 开售前拒绝、开售、限购、幂等；100 次串行购买后售罄并拒绝第 101 次尝试 |

完整命令 `npm test`：PASS，退出码 0；9 项 Node 单元测试和 22 项 Playwright API/UI 测试全部通过。另有 `.venv/bin/python -m unittest discover -s tests -v`（16 项 PASS）和 `.venv/bin/python scripts/validate_project.py`（PASS）。

售罄回归按 RED→GREEN 排查了三个实际边界：Seed 最初仅有一个用户，第二笔串行购买被正确拒绝；活动 Oracle UI 原先按当前用户过滤，无法展示活动总订单；默认展示用户也参与了售罄购买，优先呈现“本账号已完成”。最终使用 `user_s1_002`–`user_s1_101` 完成 100 笔测试购买，保留 `user_s1_001` 作为未购买的页面观察用户，第 101 次尝试由 `user_s1_102` 发起并收到 `sold_out`。业务契约规则未改变。

## CI 配置

`.github/workflows/static-checks.yml` 现在有两个只读权限 Job：Python Schema/结构校验，以及 Node 26 的 E1/M1/S1 完整 Playwright 回归。工作流安装 Chromium 依赖；各案例分别写入 `playwright-report/{e1,m1,s1}/` 与 `test-results/{e1,m1,s1}/`，并上传测试报告、失败 Trace 和合成证据，保留 14 天。

本地已解析 Workflow YAML，并确认三个案例各自的 HTML 报告与结果目录存在。远端 [GitHub Actions Run 45526784670](https://github.com/naodeng/ai-ui-automation-explore/actions/runs/45526784670) 对提交 `82dcd92a33973bbe999baad669b6ab774f2161be` 执行成功：`validate` 与 `playwright` 两个 Job 均为 PASS，报告与合成证据 Artifact 上传成功。

## Run 与证据

- E1 Run：`e1-33365b27-0104-4e14-b876-7e6dc276e79e`，Seed `e1-threshold`；API/UI Context 见 `evidence/e1/run-contexts/`。
- M1 Run：`m1-011fdebb-23f5-4719-88dd-c495ad3d9709`，Seed `m1-gold-to-silver`；汇总见 `evidence/m1/m1-run-record.json`。
- S1 单笔 Run：`s1-3c40f285-b5cc-46bf-b57d-535f7a27717d`，Seed `s1-100-stock`；API 账本见 `evidence/s1/run-contexts/s1-r01-r04-api.json`。
- S1 售罄 Run：`s1-38f5631f-93d8-4aad-83d8-87e76edc1f78`，Seed `s1-100-stock`；Oracle 快照见 `evidence/s1/run-contexts/s1-r02-serial-stockout.json`，UI 截图见 `evidence/s1/s1-desktop-sold-out.png`。
- CI Artifact：`playwright-evidence-45526784670`（GitHub Artifact ID `14982802216`），包含报告、结果及合成证据；按工作流设置保留 14 天。
- 失败 Trace 的默认策略为 `retain-on-failure`；失败时 Artifact 会包含 Trace 与截图。

## 尚未完成

- 受限 Browser Agent/视觉工具故障注入评估、Agent 看不到 Oracle 真值的 RED/GREEN 对照、`suspected_issue` 独立复现。
- S1 并发、负载、队列 SLA、取消/超时释放；R02 仍是 PARTIAL，R05 为 NOT RUN。
- M1 优惠券实际到期行为；因契约没有准确到期时间而 NOT RUN。
