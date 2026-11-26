# P3-A｜确定性 Playwright 自动化基线评审

**状态：PARTIAL。** E1/M1/S1 确定性回归、E1 本地 Seeded Fault 灵敏度/独立复现，以及 P3 实现提交 `b09453e` 的远端 GitHub Actions 验证均已完成。没有运行受限 Browser Agent，也没有做盲化 Ground Truth 评估。

## 当前本地基线更新（2026-11-26）

本节记录 E1 Run 隔离、M1 Platinum→Gold 契约示例、M1 优惠券固定夹具到期边界及 S1 预约取消/超时生命周期补齐后的最新状态；下方原 P3 交付计数保留为历史快照。

- 最新 `npm test`：PASS，退出码 0。TypeScript 检查通过；24 项 Node 单元测试通过；E1 为 9 API/4 UI、M1 为 7 API/4 UI、S1 为 5 API/5 UI，共 34 项 Playwright 测试通过。
- `.venv/bin/python -m unittest discover -s tests -q`：17 项 PASS；`.venv/bin/python scripts/validate_project.py`、`node --check demos/flash-sale/public/app.js` 与 `git diff --check` 均 PASS。
- M1-R03 现已覆盖固定合成优惠券的到期前和到期边界；S1-R01–R05 均在批准的本地合成范围内通过，其中 R02 有界 101 请求检查仅验证单个内存 Node 进程。
- E1 空白页面自动生成唯一 Run ID；M1 另覆盖 YAML 中 Platinum 续期失败降为 Gold 的示例迁移，此示例不作为新增授权规则。
- S1 预约、取消和超时后的库存账本截图已生成，桌面与 390px 窄屏状态均检查通过。M1 到期时间不代表真实优惠券政策。
- 本轮验证为本机工作区结果；这些后续改动尚无对应的远端 CI 运行。没有启动 Browser Agent，也未进行生产级负载/分布式并发、队列 SLA 或盲化 Recall 评估。

## 配套文章草稿

Playwright Test 工具骨架已基于本报告支持的实测记录推进为[中文实战草稿](../content/blog/drafts/tools/01-playwright-test.md)，状态仍为 `draft / unverified`。草稿嵌入本地 E1 桌面/窄屏与受控故障截图，并加入 UI 到 Oracle 的 Mermaid 流程图和基于实际复现结果的 FAQ；未发布，也未自我提升到 `verified`。

## 工具与执行边界

- 唯一浏览器执行路径：Playwright Test 1.65.1；未混用 GUI Chrome、Browser MCP 或 Computer Use。
- 本地环境：Node v26.13.1、npm 11.20.0、Python 3.9.6；Playwright 使用项目随附的无头 Chromium。
- E1/M1/S1 均从独立内存 Run 执行。Trace 在测试失败时保留，失败截图按 Playwright 配置保存；契约状态与账本由各自 Oracle 断言。
- 每条 Playwright 用例结束时会生成独立 Manifest、测试结果、网络摘要和 Evidence Index；本地 JSON 请求只从项目配置的 localhost Origin 采集，Oracle 响应单独保存并计算 SHA-256。Manifest `run_id` 是测试执行 ID；业务 Run ID 与 request/quote/order 关联 ID 单列记录。API 项目不启动浏览器。
- UI 售罄场景按 `permitted_client_concurrency: 1` 顺序提交 100 笔购买；另有独立 S1 API 回归同时提交 101 个预约请求并完成接受的 100 个预约。后者是单进程有界回归，不是多进程并发证明或负载测试。

## P3 首次交付时的自动化覆盖与结果（历史快照）

以下表格、运行次数与证据文件计数反映原 P3 基线交付，不是 2026-11-26 的最新结果；当前计数见本报告开头。

| Case | API | UI | 本轮范围 |
|---|---:|---:|---|
| E1 | 5 PASS | 2 PASS | 99/100 C20 边界、报价/订单一致性、幂等、隔离重置、未知 Run 拒绝 |
| M1 | 6 PASS | 3 PASS | Silver→Gold、Gold→Silver、旧会话授权、事件重放、Fake Clock、视口溢出 |
| S1 | 2 PASS | 4 PASS | 开售前拒绝、开售、限购、幂等；100 次串行购买后售罄并拒绝第 101 次尝试 |

完整命令 `npm test`：PASS，退出码 0；11 项 Node 单元测试和 22 项 Playwright API/UI 测试全部通过。另有 `.venv/bin/python -m unittest discover -s tests -v`（16 项 PASS）和 `.venv/bin/python scripts/validate_project.py`（PASS）。

原 P3 交付本地保留了两次完整 `npm test` 和一次 E1 API 定向运行，共 45 组逐测试证据；当时最近一次完整运行贡献 22 组。45 份 Manifest 均通过 `contracts/run-manifest.schema.json` 校验；Evidence Index 的 157 个条目均通过 `contracts/evidence.schema.json` 校验，所有引用文件的 SHA-256 重算一致（45 个网络摘要、45 个测试结果、67 个 Oracle 响应）。本地 Manifest 标记 `app_commit` 为 `9de8967…+dirty`，表示验证对应当时尚未提交的工作树内容。全绿运行没有生成失败 Trace/截图；失败时的保留策略仍由 Playwright 配置启用。

售罄回归按 RED→GREEN 排查了三个实际边界：Seed 最初仅有一个用户，第二笔串行购买被正确拒绝；活动 Oracle UI 原先按当前用户过滤，无法展示活动总订单；默认展示用户也参与了售罄购买，优先呈现“本账号已完成”。最终使用 `user_s1_002`–`user_s1_101` 完成 100 笔测试购买，保留 `user_s1_001` 作为未购买的页面观察用户，第 101 次尝试由 `user_s1_102` 发起并收到 `sold_out`。业务契约规则未改变。

## Seeded Fault 灵敏度与独立复现

增强 E1 99 元 UI 回归：同一 Run 中，以 `run_id + quote_id` 对照页面金额、浏览器报价响应与只读 Oracle，并仅在不一致时写入 manifest、finding 和带 SHA-256 的 Evidence Index。Demo 没有独立 `request_id`，本例用业务 `quote_id` 关联。

先确认无故障回归通过；随后仅在本机工作副本临时将 `renderQuote` 改为错误显示 20 元折扣，服务器/API/Oracle 和契约保持不变。命令 `npm run test:e2e -- --grep "selecting the 99 boundary removes the discount"` 连续两次以退出码 1 失败，均明确报告 UI 79.00 与 Oracle 99.00 不一致。每次先 reset，同一 seed 使用不同 Run ID；测试各自落下 `suspected_issue`、Oracle、截图和哈希索引。恢复 UI 源码后，同一命令退出码 0，完整 `npm test` 也通过。临时故障没有保留在业务代码中。

- Run 1：`e1-68d152c3-a05a-4cc1-b3bb-290cd6ef9936`，[证据目录](../evidence/e1/run-contexts/p3-a/e1-68d152c3-a05a-4cc1-b3bb-290cd6ef9936/)。
- 独立 Run 2：`e1-6af9cb0d-4777-42ae-b538-acba74461fed`，[证据目录](../evidence/e1/run-contexts/p3-a/e1-6af9cb0d-4777-42ae-b538-acba74461fed/)。
- 聚合 Finding：[reproduced-finding.json](../evidence/e1/run-contexts/p3-a/reproduced-finding.json)；命令/退出码与注入边界：[reproduction-log.json](../evidence/e1/run-contexts/p3-a/reproduction-log.json)。Finding 保持待人工复核，明确这是**已移除的合成故障灵敏度证明**，不是 Demo 原有缺陷或线上缺陷。

本实验由确定性 Playwright 与 QA Oracle 执行，没有让 AI/Browser Agent 探索，也没有建立 Agent 无权访问 Ground Truth 的隔离环境；因此不代表 AI Agent 的盲测发现能力或 Recall。

## CI 配置

`.github/workflows/static-checks.yml` 现在有两个只读权限 Job：Python Schema/结构校验，以及 Node 26 的 E1/M1/S1 完整 Playwright 回归。工作流安装 Chromium 依赖；各案例分别写入 `playwright-report/{e1,m1,s1}/` 与 `test-results/{e1,m1,s1}/`，逐测试 Manifest/Index 位于 `test-results/p3-evidence/`；这些报告、失败 Trace 和合成证据会作为 Artifact 上传并保留 14 天。

本地已解析 Workflow YAML，并确认三个案例各自的 HTML 报告与结果目录存在。远端 [GitHub Actions Run 45534972281](https://github.com/naodeng/ai-ui-automation-explore/actions/runs/45534972281) 对提交 `b09453eeb17f75873f0332154c2314e49f41b246` 执行成功：`validate`、`playwright` Job 以及测试报告/证据 Artifact 上传步骤均为 PASS。Artifact `playwright-evidence-45534972281`（ID `14986652073`）已上传并包含本次 `test-results/` 路径；保留至 2026-12-09。

## Run 与证据

- E1 API Run：`e1-dc9e2ea0-5716-4b12-906e-c2b92995eabf`；E1 UI 99 边界 Run：`e1-6ee5d655-364a-4969-aab7-cecb53ffc16c`；Seed 均为 `e1-threshold`，Contexts 见 `evidence/e1/run-contexts/`。
- M1 三个独立 Run：seed `m1-1728e9d8-2933-4c3f-b1ab-8367044c0f1d`、upgrade `m1-7ee2929c-de3f-4e28-a0a5-c7c82dced175`、downgrade `m1-4c9cfeb5-e1b3-4a3c-ae95-d7f6d5e5294c`；汇总见 `evidence/m1/m1-run-record.json`。
- S1 单笔 Run：`s1-10aa93a1-8967-425d-9c82-e451cc093e4b`，Seed `s1-100-stock`；API 账本见 `evidence/s1/run-contexts/s1-r01-r04-api.json`。
- S1 售罄 Run：`s1-f0948735-261f-407b-beb0-b2898f282389`，Seed `s1-100-stock`；Oracle 快照见 `evidence/s1/run-contexts/s1-r02-serial-stockout.json`，UI 截图见 `evidence/s1/s1-desktop-sold-out.png`。
- CI Artifact：`playwright-evidence-45526784670`（GitHub Artifact ID `14982802216`），包含报告、结果及合成证据；按工作流设置保留 14 天。
- 失败 Trace 的默认策略为 `retain-on-failure`；失败时 Artifact 会包含 Trace 与截图。

## 盲化 Browser Agent 评估预检（2026-11-25）

本节只记录运行环境就绪检查，不是 Agent 评估结果，也没有启动浏览器或修改 Demo。

- `ego-browser skill`：PASS，指南版本 2.2.1（macOS）。该工具提供当前助手的浏览器控制 API，不是独立 Browser Agent 运行时；当前 Codex 可调用工具中也没有单独的 Browser Agent 运行时。
- 本机命令检查：`agent-browser`、`browser-use` 和全局 `playwright` 均不可用（各 `command -v` 返回 1）。项目本地 Playwright Test CLI 为 1.65.1（`node_modules/.bin/playwright --version` 返回 0），仅用于确定性测试。
- 当前工作区没有已配置的独立 Explorer 身份/运行环境，也没有评估负责人持有、Explorer 无权读取的私有 Ground Truth 与隔离日志证据。公开故障方案明确不能充当正式盲测的秘密答案。
- 本次执行上下文已读取公开故障方案，所以不能通过新 Run ID、重置 Demo 或改用 Ego Browser 把当前助手包装成盲测 Explorer。未创建私有 Ground Truth，未启动 Agent，Recall 评估为 **NOT RUN**。

继续正式盲测前，须由独立评估环境提供与当前助手上下文隔离的 Explorer 运行时；评估负责人在独立工作区/进程/账号保存随机映射 Ground Truth；并保留 Explorer 无权访问该工作区的权限与 Run 日志证据。若只能提供当前助手的 Ego Browser 控制能力，则最多开展明确标记的非盲试点，不报告盲测 Recall。引入新的 Agent 运行时或主机权限隔离属于架构/权限变更，实施前需单独确认。

## 盲评隔离基础层

**状态：E1 代码级边界 PASS；OrbStack 是已准备的可选本机宿主隔离实验，不是方案 C 或 URL 驱动浏览器测试的必要组件；正式 Agent 评估 NOT RUN。** 普通 `npm run dev` 保持单监听器。显式盲评模式下，E1 公开监听器拒绝 Reset/Oracle 路由并阻断沙盒订单；独立评估监听器仅接受 Reset/Oracle，并要求控制令牌。新增的盲评只读 Charter 不授予 Oracle、Reset 或订单写入权限。购物车选择和报价仍只写入可重置的内存 Run，不触发支付。

此前的代码级检查中，`npm run typecheck`、`npm run test:unit`（13 项）、`npm run test:api`（5 项）、`.venv/bin/python -m unittest discover -s tests -v`（17 项）和 `.venv/bin/python scripts/validate_project.py` 均 PASS，退出码 0。代码边界测试覆盖公开面 Oracle/Reset 404、订单写入 403、拒绝通配评估地址、评估面无令牌 401/持令牌可 Reset/读 Oracle、评估面不提供页面，以及 Reset CLI 使用独立盲评令牌。这些应用测试本身不证明宿主隔离。

### OrbStack 隔离基础层实测

该实验是针对本机宿主权限隔离的可选验证，不属于原先“向浏览器 Agent 提供目标页面 URL”这一使用流程，也没有把 Agent 接入 E1 Demo。

**环境：** OrbStack CLI 2.2.5（2020500），Alpine 3.23.8，`aarch64`；专用机器 `e1-agent-sandbox`，2 CPU / 2 GiB / 8 GiB。

- `ALLOW_ORBSTACK_BOOTSTRAP_NETWORK=1 sh scripts/orbstack/e1-sandbox.sh prepare`：实机初始化与隔离验证 PASS，退出码 0（当时的脚本版本尚未加入成功后停机步骤）。后续版本将“验证后停机”纳入流程，顺序由 6 项隔离单测覆盖；最终手动执行 `orb stop e1-agent-sandbox` PASS，退出码 0。
- `sh scripts/orbstack/e1-sandbox.sh verify`：PASS，退出码 0；该命令启动机器（若已停止）、重施双栈出口守卫后检查。机器配置 `isolated=true`、`isolate_network=true`、`forward_ssh_agent=false`，挂载列表为空。
- 准备脚本内的一次真实 `orb stop` / `orb start` 后，`verify` 重施守卫并通过。后续额外冷启动检查发现 OrbStack 会重新注入路由且启动后策略规则缺失：未经 `verify` 的原始启动状态**不能**视为已封锁出口。再次运行 `verify` 后，IPv4/IPv6 策略规则生效，路由查询返回 `Network unreachable`。`/etc/sysctl.d/99-e1-egress.conf` 持久禁用 `all`、`default` 和 `eth0` 的 IPv6 Router Advertisement，但这不足以单独阻止 OrbStack 注入路由。所有路由检查只查询路由表，没有发送外网探测包。
- 来宾检查确认 `/mnt/mac` 不存在、root 密码已锁定；`e1-agent` 不在 `wheel`、不能使用 `sudo` 或切换到 root，且没有 Linux capabilities / SSH Agent 环境。
- 最终本地检查：`node --test tests/unit/orbstack-isolation.test.ts`（6 项）、`npm run typecheck`、`.venv/bin/python scripts/validate_project.py`、`sh -n scripts/orbstack/e1-sandbox.sh scripts/orbstack/guest/e1-sandbox-guest.sh`、`git diff --check` 均 PASS，退出码 0。隔离单测覆盖双栈路由守卫、IPv6 守卫失败关闭、安装期网络显式授权、立即封路由、重启验证并停机、拒绝复用同名机器及配置漂移时停机。

排查发现并修正了两项真实问题：OrbStack 2.2.5 的 `orb run` 不接受 `--` 参数分隔符；冷启动后即使 Router Advertisement 持久禁用，OrbStack 仍可注入路由且策略规则可能缺失。最终脚本在每次 `verify` 时先重施双栈策略规则与路由，并在任一隔离检查失败时停机；`prepare` 验证通过后停机。**只有未来本机 Agent 实验使用这台机器时，才需要在启动后先运行 `verify`，通过前不得在该机运行 Agent。** 本轮最终将专用机器保持停止；未复制 E1 项目源码、浏览器、模型或 Agent 运行时。

OrbStack 的 `--isolate-network` 本身仍允许互联网；本项目额外的出口封锁由来宾策略规则、路由和 sysctl 守卫实现，所以 `verify` 后当前机器不能访问普通公网 URL。它也不能访问宿主机上运行的 E1 `localhost` 服务；当前机器没有安装 Demo、浏览器或 Agent，不能直接承担 URL 测试。该控制不是冷启动后的自动保证，来宾管理员仍可改写；只有未来本机 Agent 实验选择使用这台机器时，每次启动后的 `verify` 才是必需门禁。OrbStack 的隔离机器共享 Linux 内核，不能作为抵御主动内核逃逸的完整 VM 边界。细节见 [OrbStack 沙箱说明](../scripts/orbstack/README.zh-CN.md)。

本轮未创建 E1 业务 Run（Run ID：N/A），未启动 Agent、浏览器或模型；私有 Ground Truth、Recall 评估及 Agent 缺陷发现仍为 **NOT RUN**。

## 尚未完成

- 受限 Browser Agent 盲化 Ground Truth 隔离与 Recall 评估仍为 NOT RUN；Roadmap 已将 P5 延后到 MVP v0.1–v0.3 全部功能及验收完成后。可选 OrbStack 机器尚未接入 Demo、浏览器或 Agent，也不是原定 URL 探索流程的前置条件；独立评估数据亦未准备。本轮的 RED/GREEN 由确定性测试完成。
- S1 多进程/数据库级并发、负载测试和队列 SLA 仍为 NOT RUN 或未定义；单进程有界 R02 回归及本地取消/超时释放已 PASS。
- M1 固定合成优惠券到期边界已 PASS；真实业务优惠券到期政策仍未定义，未做生产验证。
