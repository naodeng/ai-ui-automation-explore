# Playwright Test

**状态：P3 确定性回归已实测；文章仍为 `draft / unverified`**

- 核验日期：2026-11-25
- 官方最新稳定包：`@playwright/test` 1.65.1；许可证 Apache-2.0
- 本机：Node.js 26.13.1、npm 11.20.0、macOS 27.2.1；P3 UI Run 记录 Chromium 159.0.8154.6
- CI 安装步骤：`npm ci`、`npx playwright install --with-deps chromium`；GitHub Actions Run 45534972281 与完整 E1/M1/S1 Playwright 回归 PASS
- P3 主证据：E1 99/100 元边界；UI/报价/同 Run Oracle 对照；受控 UI 故障以两个独立 Run 复现，移除后回归通过
- 已验证范围仅限本仓库 Playwright Test 1.65.1 的 E1/M1/S1 基线；跨浏览器、POM 专项、Playwright CLI/MCP、AI/视觉操作和干净 macOS 安装均未由本文实验验证
- 遥测结论：`UNVERIFIED`
- 工具文档：[Playwright 安装](https://playwright.dev/docs/intro)｜[npm 包](https://www.npmjs.com/package/@playwright/test)｜[许可证](https://github.com/microsoft/playwright/blob/main/LICENSE)
- 编辑草稿：[`content/blog/drafts/tools/01-playwright-test.md`](../../content/blog/drafts/tools/01-playwright-test.md)
- P3 报告：[`reports/P3_A_REVIEW.md`](../../reports/P3_A_REVIEW.md)

## 待完成

1. 在干净 macOS 环境复核安装流程与浏览器安装命令。
2. 完成文章技术、QA、编辑 Review；核对官方遥测说明。
3. 跨浏览器与 POM 专项不在已完成证据范围内；如要研究，单独设计测试。
4. 人工定稿与发布审批前，不得将草稿标为 `verified`、`approved` 或 `published`。
