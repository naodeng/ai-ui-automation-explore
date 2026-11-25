# 变更记录

[English](CHANGELOG.md) · **简体中文**

## 未发布

- 实现 S1 首个本地合成秒杀切片，包含服务端 Fake Clock、单用户限购、幂等重放、五种库存桶、只读 Oracle 和串行售罄回归。
- 新增 S1 API/UI 回归、响应式截图、Run 证据、双语实现说明和逐规则范围记录。
- 增强 E1 99 元 UI 回归，使其与同一 Run 的 Oracle 对照；通过两次独立本地合成故障 RED 运行证明回归灵敏度，并保存带哈希索引的证据。临时故障已移除，不代表业务产品缺陷。
- 在 GitHub Actions 中加入 Python 与 E1/M1/S1 Playwright 质量门禁；按案例保留报告、失败 Trace 和合成证据。
- 使用 `npm test` 验证 E1/M1/S1；使用 16 项 Python 单元测试和 `scripts/validate_project.py` 检查仓库结构与契约。

## v1.0 — 2026-11-24

- 统一项目名称为 `ai-ui-automation-explore`。
- 整合此前的 Codex 规划包（84 个文件）与工具博客系列（74 个文件），并在 `archive/` 中保留原始快照。
- 将 24 篇工具文章骨架和 4 篇未经核验的长文草稿设为 `content/blog/drafts/` 下的规范编辑稿。
- 添加项目章程、MVP 路线图、职责边界、TDD 门禁、许可证审查、Codex Prompt 和静态校验。
- v1.0 文档包未声称已创建 GitHub 远程仓库、实现 Demo、执行浏览器或得到基准结果。
