# 13｜实施 Roadmap、Epic 与 Codex 任务拆分

> 任务粒度以**每一轮能展示真实测试证据并由人评审**为原则；不要让 Codex 一轮实现所有 Epic。

| Epic | 任务 | 依赖 | 验收证据 |
|---|---|---|---|
| E00 | 新项目、工具版本与 Scope 审查 | 无 | readiness + risk register |
| E01 | Contract Schema + 校验器 + ADR | E00 | 负向/正向 Contract tests |
| E02 | Fixture、Fake Clock、Reset、安全测试专用 API | E01 | 两次 Reset checksum 一致 |
| E03 | E1 UI/API/订单/报价/券账 | E02 | 100/99/幂等 TDD |
| E04 | M1 状态机、事件版本、当前授权与权益账 | E02 | 旧会话撤权、事件幂等 |
| E05 | S1 时钟/资格/订单/库存账 | E02 | 守恒/限购/幂等/API 并发 |
| E06 | Playwright Executor + Trace + Oracle 绑定 | E03-E05 | 三案例 P0 回归 |
| E07 | Midscene Adapter 试点 | E06 | 视觉增量与误报比较 |
| E08 | Agent Mission + Policy/Budget + Verifier | E06 | 越权阻断、候选分级 |
| E09 | Benchmark 统一运行器与统计 | E06-E08 | 公平执行日志与 CSV |
| E10 | Final Review + 文档与发布 | E09 | 决策签署 + 文章 |

## 每个 Epic 的统一完成定义（DoD）

- 有需求/风险/测试义务和独立 Oracle（或者标记 blocked）。
- 先 RED 再 GREEN，再 REFACTOR；测试命令、版本和退出码可复查。
- 关键 P0 用例自动化并能单独运行；数据可重置，测试顺序不敏感。
- 证据与代码提交可按 Run ID、Commit、seed 找到。
- 包含安全/隐私/性能对比影响，未完成项清晰。
- 人工 Review 审批记录；不以 Agent 宣称完成替代证据。

## 发布里程碑

- **M0 (P0/P1)**：契约冻结，可开始开发 Demo。
- **M1 (P2/P3)**：三案例可运行，A 有确定性可信证据；可写第一篇实战文章。
- **M2 (P4)**：视觉增益已有同场结果，不以主观观感替代测试。
- **M3 (P5/P6)**：自主 Agent 有受控成功/失败记录和初步比较。
- **M4 (P7)**：质量证据与内容包归档，可对外发布研究结果。

## 推荐第一个 Codex 任务

直接读取 `prompts/01-P0-仓库体检.md` 执行。输出 readiness report；不要提前创建数据库、Kubernetes、云环境或多个 Agent。
