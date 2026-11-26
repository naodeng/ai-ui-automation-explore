# P4-B｜视觉实验评审

**状态：仅完成干跑；视觉评估 NOT RUN。** 本报告记录本地 Mock 的候选到 Oracle 复核门禁；未调用视觉模型或 Computer Use 工具。

## 范围与证据

- 案例：合成 E1，规则 E1-R01，C20 的 99 元门槛边界。
- 输入：已有 P3-A 合成故障 `observation.json` 和同一运行的只读 `oracle.json`，位于 [P3 证据目录](../evidence/e1/run-contexts/p3-a/e1-6af9cb0d-4777-42ae-b538-acba74461fed/)。
- 固定观察记录显示应付 7,900 分、优惠 2,000 分；相同 Run 和 quote 的 Oracle 显示应付 9,900 分、优惠 0 分。
- 干跑输出 Oracle 金额不一致，并将候选交给人工复核；`defect_confirmed` 始终为 `false`。
- 输入来自确定性 P3 证据，不是视觉模型的解释；工具没有打开对应截图。

## 执行记录

| 项目 | 结果 |
|---|---|
| 命令 | `npm run --silent p4:dry-run > evidence/p4/e1-99-mock-dry-run.json` |
| 退出码 | 0（修正输出重定向后） |
| 运行环境 | Node.js 26.13.1；npm 11.20.0 |
| 模型 / 浏览器 / 外部请求 | NOT RUN / NOT RUN / 无 |
| 模型成本 | 0；未调用 Provider |
| 输出 | [干跑结果 JSON](../evidence/p4/e1-99-mock-dry-run.json) |

## 发现与限制

- 新视觉发现：无。与 P3 的重叠率：NOT MEASURED；唯一输入复用已有 P3 合成故障证据，不构成视觉工具输出样本。
- 误报率、重复运行成功率、延迟和实际工具费用：NOT MEASURED。
- 当前工作区未安装 Midscene。尚未核对版本/API 或安装依赖，因为模型 Provider 和截图数据流还未获批准。
- 没有上传页面或截图；本次干跑没有创建新的 E1 业务 Run。P5 和 Agent 执行继续延后，直到 MVP v0.1–v0.3 全部功能与验收完成。

## 下一道门禁

开始真实 P4 视觉试验前，需要批准具体工具/Provider，以及是否允许向该 Provider 发送本地合成 E1 截图（99 元边界的桌面和窄屏两张）。随后核对 Provider 当前官方 API 和数据处理方式、锁定工具版本，并以同一场景重复运行三次及用 P3 Oracle 复核。不得把本次干跑描述成视觉验证或完整 P4 评估。
