> **仓库路径迁移提示：** 当前项目名 `ai-ui-automation-explore`；以前 `docs/NN-*.md` 现位于 `docs/lab/`，`templates/` 现为 `templates/qa/`；三案例 `contracts/` 与 `fixtures/` 仍在项目根目录。此 Prompt 为历史实施方案的后续可编辑副本，执行前核实路径。

# Codex 总控提示词｜首先粘贴此文件

你将协助我实施一个**新建独立仓库**：AI Browser Exploratory QA Lab。当前目录中的 v2.0 实施包是权威输入，`legacy-v1.0/` 的 9 份文件为已完成的历史资料，请原样保留。

请先逐个阅读并遵守：`AGENTS.md`、`README.md`、`00_START_HERE.md`、`docs/02-端到端执行流程.md`、`docs/03-业务规则与真相源.md`、`docs/06-架构与工具适配.md`、`docs/18-风险登记与阻断项.md`。不要仅看文件名或按印象补全。

## 目标

实现一个可重置、可审计、Local-first 的三案例探索性测试 Lab：
- E1：优惠券 100 减 20、99 边界、沙盒订单/幂等；
- M1：普通/银/金/铂等级、升级/降级、旧 Token 当前授权、事件顺序和历史权益；
- S1：秒杀时钟、排队、单用户限购、库存守恒、单次请求和独立 API 并发验证。

在相同数据/Oracle 上分阶段探索三条路线：A Playwright 确定性，B 视觉 Midscene（可选）；C 受限 Agent 是 MVP v0.1–v0.3 全部完成后的可选研究，须另行批准，不得提前启动。

## 不可违反的条件

1. TDD：先 RED，后 GREEN，最后 REFACTOR；显示真实命令输出，不编造通过记录。
2. 新项目，本地优先；不使用 PostgreSQL、云端 Browser、生产账号、真实支付、外部网络写操作、无授权压力测试。
3. 业务规则都是教学候选；先冻结契约再写代码，不许为了修测试直接改预期。
4. 独立 Oracle 是 Bug 判断依据；截图或模型结论不能单独确认业务缺陷。
5. 三阶段 Agent 外部工具必须由 Host/沙箱强制授权，Prompt 不代表安全边界。
6. `legacy-v1.0/` 不得修改；不能擅自启用数据上传或遥测。
7. 所有文档开发过程中文，公开项目文档英文默认并提供中文说明；文章 Markdown 单源。

## 你的工作顺序

**本次对话只执行 P0**：审查仓库、检查工具与依赖、对比当前目录和计划、提出简洁实施设计、列阻断与第一轮具体 TDD 任务。**不要执行 P1–P7，不安装所有工具，不创建真实订单、会员权益或秒杀请求。**

先运行 `python3 scripts/validate_kit.py`（如果本仓库提供 Python），再审查 P0 readiness 条件。输出 `reports/P0_READINESS.md`，并给出 `GO / CONDITIONAL GO / NO-GO` 建议；交给我确认后才进入下一阶段。

## 每轮输出格式

- Scope / Non-scope
- 所读文件和关键决定
- 命令与退出码、实际通过和失败
- 修改文件列表与 Diff 摘要
- 风险与阻断
- Evidence 路径或 NOT RUN
- 人工需批准的下一步

如果出现无法确认的事实，清楚标记 Unknown/Blocked，不要编造或猜测。
