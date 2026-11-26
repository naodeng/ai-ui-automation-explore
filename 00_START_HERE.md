# ai-ui-automation-explore｜启动指南

**本目录是 v1.0 初始化内容包导入后的工作仓库。当前工作区在 `develop` 开发；E1/M1/S1 本地合成 Demo 已实现，AI 工具对比仍未运行。**

## 首次与 Codex 协作

1. 解压 ZIP 后，直接在 Codex Desktop 中打开 `ai-ui-automation-explore/`。
2. 读取 `AGENTS.md`、`README.zh-CN.md`、`docs/project/ROADMAP.zh-CN.md`、`docs/architecture/REPOSITORY_BOUNDARIES.zh-CN.md`。
3. 先按 `requirements-dev.txt` 准备仓库 Python 依赖，再执行 `.venv/bin/python scripts/validate_project.py` 与 `.venv/bin/python -m unittest discover -s tests -v`；这样 JSON Schema 单测能加载 `jsonschema`。安装锁定 Node 依赖后运行 `npm test` 回归 E1/M1/S1，单独验证各 Demo 可运行 `npm run test:e2e`、`npm run test:m1` 或 `npm run test:s1`。
4. 查看 [P0 就绪检查报告](docs/reviews/P0-readiness-report.md)、[P1 契约评审](docs/reviews/P1-contract-review.md)、[P2 E1 评审](docs/reviews/P2-E1-review.md)、[P2 M1 评审](docs/reviews/P2-M1-review.md)、[P2 S1 评审](docs/reviews/P2-S1-review.md) 与 [P3-A Playwright 基线评审](reports/P3_A_REVIEW.md)。明确批准的规则可实现；未决项保留并排除在范围外。首轮体检 Prompt 见 `prompts/00-repo-bootstrap.zh-CN.md`。
5. 后续沿用 `prompts/lab/` 的 P1–P7 阶段 Prompt；对每篇文章使用 `prompts/blog/tools/` 对应单工具 Prompt。

## 当前可运行切片

- [E1 电商结算 Demo](demos/ecommerce-checkout/README.zh-CN.md)：本地合成购物车、C20 报价、沙盒订单幂等，以及支付前取消释放优惠券的模拟生命周期；所有状态写入内存 Run。
- [M1 会员生命周期 Demo](demos/membership-lifecycle/README.zh-CN.md)：银升金、金降银、旧会话授权、事件重放、只读会员 Oracle 与 Fake Clock。
- [S1 商品秒杀 Demo](demos/flash-sale/README.zh-CN.md)：服务端 Fake Clock、30 秒预约/取消/超时释放、幂等重放、五种库存桶和只读 Oracle；R02 有界并发证据仅代表本机单进程回归。
- [P2 E1 评审](docs/reviews/P2-E1-review.md)：实现范围、真实测试结果与尚未覆盖规则。
- [P2 E1-R04 评审](docs/reviews/P2-E1-R04-review.zh-CN.md)：优惠券锁定、沙盒模拟支付、取消释放及回归证据。
- [P2 M1 评审](docs/reviews/P2-M1-review.md)：Rule 状态、真实测试结果和未验证边界。
- P5 受限 Agent 探索延后到 MVP v0.1–v0.3 的全部功能与验收完成后；可选 OrbStack 实验不计入 P5，也不是 URL 浏览器测试的前置条件。

## 内容结构

- `contracts/`：已批准的明确合成规则；未决事项保留并标记在范围外
- `docs/lab/`：前一版 21 篇实施细化方案，仍可作为参考
- `demos/`：E1、M1、S1 合成 Demo 可运行；S1 队列语义、生产级并发和负载行为不在范围内
- `tools/`：24 个工具独立研究目录，目前为研究计划
- `content/blog/drafts/tools/`：24 篇工具文章，其中 23 篇为详细骨架，Playwright Test 已基于 P3 证据推进为 **draft / unverified**
- `content/blog/drafts/series/`：原有三案例长文草稿（unverified）
- `content/blog/drafts/practices/`：方案 A/B/C 三篇长文草稿（unverified）
- `content/blog/editorial/`：选题、深度、顺序与文章门禁
- `prompts/`：Codex 总控、阶段任务、单篇写作及评审
- `archive/`：前两个已交付包的完整历史快照，只读

## 手工发布约定

先在本仓库完成草稿 → 实测 → Review → 人工批准，再把同一份 Markdown 手工同步到 `naodeng/inaodeng.com`，网站/公众号同稿。不要同时编辑两个版本。
