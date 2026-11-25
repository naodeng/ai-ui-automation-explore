# ai-ui-automation-explore｜启动指南

**本目录是 v1.0 初始化内容包导入后的工作仓库。当前工作区已配置 `origin` 并在本地 `develop` 分支开发；E1、M1 与 S1 首个 Demo 切片已实现，AI 工具对比仍未运行。**

## 首次与 Codex 协作

1. 解压 ZIP 后，直接在 Codex Desktop 中打开 `ai-ui-automation-explore/`。
2. 读取 `AGENTS.md`、`README.zh-CN.md`、`docs/project/ROADMAP.zh-CN.md`、`docs/architecture/REPOSITORY_BOUNDARIES.zh-CN.md`。
3. 执行 `python3 scripts/validate_project.py` 与 `python3 -m unittest discover -s tests -v`；安装锁定依赖后运行 `npm test` 回归 E1/M1/S1，单独验证各 Demo 可运行 `npm run test:e2e`、`npm run test:m1` 或 `npm run test:s1`。
4. 查看 [P0 就绪检查报告](docs/reviews/P0-readiness-report.md)、[P1 契约评审](docs/reviews/P1-contract-review.md)、[P2 E1 评审](docs/reviews/P2-E1-review.md)、[P2 M1 评审](docs/reviews/P2-M1-review.md)、[P2 S1 评审](docs/reviews/P2-S1-review.md) 与 [P3-A Playwright 基线评审](reports/P3_A_REVIEW.md)。明确批准的规则可实现；未决项保留并排除在范围外。首轮体检 Prompt 见 `prompts/00-repo-bootstrap.zh-CN.md`。
5. 后续沿用 `prompts/lab/` 的 P1–P7 阶段 Prompt；对每篇文章使用 `prompts/blog/tools/` 对应单工具 Prompt。

## 当前可运行切片

- [E1 电商结算 Demo](demos/ecommerce-checkout/README.zh-CN.md)：本地合成购物车、C20 报价、沙盒订单、幂等、Reset 与只读 Oracle。
- [M1 会员生命周期 Demo](demos/membership-lifecycle/README.zh-CN.md)：银升金、金降银、旧会话授权、事件重放、只读会员 Oracle 与 Fake Clock。
- [S1 商品秒杀 Demo](demos/flash-sale/README.zh-CN.md)：服务端 Fake Clock、单用户一次购买、幂等重放、五种库存桶和只读 Oracle。R02 仅部分验证。
- [P2 E1 评审](docs/reviews/P2-E1-review.md)：实现范围、真实测试结果与尚未覆盖规则。
- [P2 M1 评审](docs/reviews/P2-M1-review.md)：Rule 状态、真实测试结果和未验证边界。

## 内容结构

- `contracts/`：已批准的明确合成规则；未决事项保留并标记在范围外
- `docs/lab/`：前一版 21 篇实施细化方案，仍可作为参考
- `demos/`：E1、M1 与 S1 首个切片可运行；S1 的队列、取消/超时释放和并发/负载行为未验证
- `tools/`：24 个工具独立研究目录，目前为研究计划
- `content/blog/drafts/tools/`：24 篇文章的**详细骨架**（outline）
- `content/blog/drafts/series/`：原有三案例长文草稿（unverified）
- `content/blog/drafts/practices/`：方案 A/B/C 三篇长文草稿（unverified）
- `content/blog/editorial/`：选题、深度、顺序与文章门禁
- `prompts/`：Codex 总控、阶段任务、单篇写作及评审
- `archive/`：前两个已交付包的完整历史快照，只读

## 手工发布约定

先在本仓库完成草稿 → 实测 → Review → 人工批准，再把同一份 Markdown 手工同步到 `naodeng/inaodeng.com`，网站/公众号同稿。不要同时编辑两个版本。
