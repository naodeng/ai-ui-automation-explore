# AI UI Automation Explore：AI 驱动的 Web UI 自动化测试工具探索

[English](README.md) · **项目名称：** `ai-ui-automation-explore` · **建议归属：** `AI-Native-QA-Lab`

这是一个**工具研究、业务 Demo、UI 自动化实验、质量证据与博客草稿**的独立 GitHub 项目，不是新的通用 Browser Agent 平台。

重点研究如何利用 AI 帮助 QA 建设**可运行、可断言、可维护、可接入 CI/CD** 的 UI 自动化测试，同时覆盖探索性测试、视觉验证、测试代码生成、自修复边界和缺陷发现。

## 三个贯穿全部研究的案例

- **E1 电商优惠券与下单**：满 100 减 20、99/100 金额边界、重复提交、订单状态与券账本一致性。
- **M1 会员升级与降级**：本轮实作银升金、金降银、旧会话授权、历史已领优惠券与事件重放；计费和其他权益不在范围内。
- **S1 商品秒杀**：服务端开售边界、单用户有效成功限购、幂等预约生命周期和库存账本；队列语义与生产级并发仍不在范围内。

## 仓库主要入口

- [项目启动](00_START_HERE.md)
- [MVP/迭代计划](docs/project/ROADMAP.zh-CN.md)
- [仓库与博客职责边界](docs/architecture/REPOSITORY_BOUNDARIES.zh-CN.md)
- [24 工具文章目录](content/blog/editorial/02-全工具目录.md)
- [23 篇工具骨架、1 篇 Playwright Test 实战草稿 + 4 篇长文草稿](content/blog/drafts/README.md)
- [Codex 阶段任务与逐工具 Prompt](prompts/)
- [三案例业务契约](contracts/cases/)
- [只读业务 Oracle 接口](contracts/oracles/README.zh-CN.md)
- [GitHub Actions 质量门禁](.github/workflows/static-checks.yml)：Python 检查和完整 E1/M1/S1 Playwright 回归；按案例保存报告、失败 Trace 与合成 Run 证据，保留 14 天。
- 每条 E1/M1/S1 Playwright 用例都会在 `test-results/p3-evidence/` 生成符合 Schema 的独立 Run Manifest 和 SHA-256 Evidence Index，记录本地请求 ID、业务 Run ID、Oracle 响应、断言结果及可用的失败附件。
- [P0 就绪检查报告](docs/reviews/P0-readiness-report.md)
- [P1 契约与证据追踪评审](docs/reviews/P1-contract-review.md)（合成 Demo 规则已批准；未决行为仍在本轮范围外）
- [P2 E1 实现评审](docs/reviews/P2-E1-review.md)
- [P2 E1-R04 生命周期实现评审](docs/reviews/P2-E1-R04-review.zh-CN.md)
- [P2 M1 实现评审](docs/reviews/P2-M1-review.md)
- [S1 秒杀 Demo](demos/flash-sale/README.zh-CN.md)
- [P2 S1 实现评审](docs/reviews/P2-S1-review.md)
- [P3-A Playwright 基线评审](reports/P3_A_REVIEW.md)：案例覆盖、Run ID、证据与未完成项。
- [P4-B 视觉干跑评审](reports/P4_B_REVIEW.md)：本地 Mock Oracle 复核门禁；未调用模型或上传截图。
- [可选 OrbStack 宿主隔离实验](scripts/orbstack/README.zh-CN.md)：不是 URL 驱动浏览器测试的必需组件；Agent **NOT RUN**。
- [E1 电商结算 Demo](demos/ecommerce-checkout/README.zh-CN.md)
- [M1 会员生命周期 Demo](demos/membership-lifecycle/README.zh-CN.md)

**博客编辑稿先保存在本项目 `content/blog/drafts/`。** 只有完成官方资料查证、真实工具运行、QA Review 和人工批准后，才手动同步到 `naodeng/inaodeng.com`；网站与公众号复用一份定稿。

最初的 v1.0 文档包只包含项目文档与计划，不含可运行的业务 Demo；当前 E1、M1 和 S1 均已在此工作区实现本地合成版本。M1 历史优惠券按固定合成夹具时点到期，不代表真实业务政策。S1 的 101 请求回归只覆盖单个本地 Node 进程，不证明跨进程/数据库并发或负载能力。队列语义和一致性 SLA 仍未定义。工具对比仍未运行。三个 Demo 使用内存合成数据和 Playwright 本地测试，不连接生产服务。
