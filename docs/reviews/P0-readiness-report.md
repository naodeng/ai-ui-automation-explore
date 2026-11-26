# P0 就绪检查报告

**日期：** 2026-11-24（Asia/Shanghai）

**范围：** 导入 v1.0 项目文档包、静态完整性检查、首批工具官方资料抽样。
**结论：** P0 文档检查完成；开始 P1 前需要用户确认三案例的合成演示契约。

## 已核实

- 项目包包含三案例契约、24 个工具目录与文章骨架、1 篇综合草稿、3 篇路线实践草稿，以及历史归档。24 篇均为 `outline`；草稿没有被标记为已核验或已发布。
- `python3 scripts/validate_project.py`：**PASS**，核对了 24 个工具、文章骨架、Prompt、三个案例说明及 JSON/YAML 项目资料。由于环境未安装可选的 `jsonschema`，Schema 示例验证被跳过。
- 当前开发分支为本地 `develop`；没有提交或推送。`develop` 从 `main` 建立，远端跟踪分支尚未设置。
- 项目没有已实现的业务 Demo；浏览器工具没有安装或实测。

## 官方资料抽样

| 工具 | 已核实内容 | 尚未核实 / 需要留意 |
|---|---|---|
| Playwright Test | 官方安装文档说明安装命令默认会安装浏览器；支持 Chromium、WebKit、Firefox，并覆盖 Windows、Linux、macOS。浏览器二进制版本与 Playwright 版本对应。npm 当前 `playwright` 包版本为 1.65.1，声明 Apache-2.0，要求 Node.js 20+。 | 工具安装与运行未做；部署时仍需对选定的 `@playwright/test` 版本、浏览器二进制及其许可逐项确认。抽样资料没有足够信息确认遥测行为。 |
| Playwright CLI | 官方文档给出 `@playwright/cli` 安装方式；README 展示页面 JavaScript、Playwright 代码、Cookie/Storage 与持久化会话等能力。 | 本轮 README 中没有找到明确的许可或遥测说明；不能据此推断无遥测。`eval`、`run-code` 和本地会话需要受宿主权限控制。 |
| Playwright MCP | 官方仓库声明 Apache-2.0。文档明确说明 MCP Server 不是安全边界；`browser_run_code_unsafe` 可在服务进程执行任意 JavaScript。默认持久化浏览器资料会保存登录状态，也提供隔离模式。 | 未在抽样 README 中找到遥测说明；不连接真实账号或现有浏览器配置。实际部署前需确认权限、外发数据和版本锁定。 |
| Vercel agent-browser | 官方仓库声明 Apache-2.0；截至 2026-11-24，官方 Releases 页面显示 v0.44.0。支持 macOS、Linux、Windows；首次安装会下载 Chrome for Testing。 | 未在抽样 README 中找到明确遥测说明；CLI 有会话、认证状态、Storage 与页面脚本能力，仍需用宿主级权限限制。工具未安装或运行。 |

资料链接： [Playwright 安装](https://playwright.dev/docs/intro)、[Playwright 浏览器版本](https://playwright.dev/docs/browsers)、[Playwright npm 元数据](https://registry.npmjs.org/playwright/latest)、[Playwright CLI](https://github.com/microsoft/playwright-cli)、[Playwright MCP](https://github.com/microsoft/playwright-mcp)、[MCP 安全说明](https://github.com/microsoft/playwright/blob/main/docs/src/getting-started-mcp.md)、[agent-browser 文档](https://github.com/vercel-labs/agent-browser/blob/main/docs/content/docs/index.mdx)、[agent-browser 许可](https://github.com/vercel-labs/agent-browser/blob/main/LICENSE)、[agent-browser Releases](https://github.com/vercel-labs/agent-browser/releases)。

## 等待用户确认的业务规则

当前 YAML 均为**合成教学假设**，不是任何真实产品的规则。

- **E1 电商结算：** `C20` 在小计达到 100 时减 20；结算金额由报价与订单账本核对；重复幂等键不能创建多个有效订单。待确认：运费和税是否计入门槛、优惠券锁定/取消/沙箱支付状态。
- **M1 会员生命周期：** 示例覆盖银升金、金/铂金续费失败后降级、已领取优惠券保留至自身过期、旧会员事件不能覆盖新状态、UI 在 30 个模拟秒内同步。待确认：实际等级与账期仅作演示参数；未领取优惠券及额外权益尚无规则。
- **S1 秒杀：** 示例库存为 100；开售由服务端时钟决定；每用户至多一个有效成功单；同一幂等键不能重复下单；客户端并发为 1，服务端并发测试单独审批。待确认：哪些状态计为已售或预留、排队语义及最终一致性时限。

## NOT RUN / BLOCKED

- `python3 -m unittest discover -s tests -v`：**NOT RUN**。本轮未运行单元测试。
- UI/E2E、三个 Demo、工具安装、工具实测、基准和真实服务测试：**NOT RUN**。
- `jsonschema` 示例校验：**SKIPPED**，当前环境缺少可选依赖。
- `ego-browser nodejs` 本地网页访问：**BLOCKED**，启动返回 `Failed to start ego lite`（沙箱环境）。官方资料通过只读网页搜索核对；没有登录、表单或站点交互。
- 遥测声明：**NOT VERIFIED**。抽样页面未找到说明；这不代表工具没有遥测。

## 建议的 P1 顺序

1. 用户批准当前明确写出的 E1/M1/S1 规则仅用于合成 Demo，并决定本轮是否将各 `unknowns_to_approve` 保留在实现范围外。
2. 先为已批准规则补充正反例与 Schema/契约检查，再用固定 Seed、Fake Clock 和只读 Oracle 建立可复现基线。
3. 从 E1 的 99/100 优惠门槛、报价/订单一致性与幂等场景进入首个实操切片；完成后再扩展到 M1、S1。

获得上述契约确认前，不进入 P1 的业务实现。
