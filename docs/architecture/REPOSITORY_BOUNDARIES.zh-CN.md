# 架构与仓库边界

## 基本原则

1. Local-first：Demo、Runner 与主要证据默认本地。第三方模型与 Cloud Browser 需要独立审批。
2. 工具职责清楚：Test Runner / CLI / MCP / SDK / Agent / Computer Use / 诊断 / 基准环境不等同。
3. Playwright Test 是**确定性基线**，后续工具按角色比较增益，不把所有工具强制编成一套新的执行框架。
4. 业务 Oracle 与模型/视觉判断独立：E1 报价/订单/券账；M1 授权/会员事件/权益；S1 库存/订单/时钟。
5. 原历史包保存在 `archive/`（只读）；现行内容在 `contracts/`、`docs/`、`prompts/`、`tools/` 与 `content/blog/drafts/`。

```text
ai-ui-automation-explore/
├── contracts/               # E1/M1/S1 + Finding/Evidence Schema
├── demos/                   # 三业务 Demo，P2 才实现
├── fixtures/                # Seed、Fake Clock 与重置约定
├── tools/                   # 24 个工具各有研究入口
├── tests/                   # 先静态契约测试，后按阶段增加 UI 测试
├── experiments/             # 对照测试计划与结果
├── evidence/                # 只允许经脱敏审查的可公开证据
├── docs/                    # 章程、Roadmap、架构、TDD、文章流程
├── prompts/lab/             # Codex P0–P7 实施任务
├── prompts/blog/            # 逐工具写作与审核任务
├── content/blog/drafts/     # 24 篇工具骨架 + 4 篇长文草稿
├── content/blog/editorial/  # 内容计划和发布门禁
└── archive/                 # 原始两个历史包完整快照
```

## 开发与发文工作流

`批准规则 → TDD Demo → 基线 E2E → 视觉/Agent 实验 → 独立评估 → 更新对应博客草稿 → 技术/QA Review → 人工定稿 → 手动同步博客网站`。

禁止开发脚本修改 `inaodeng.com`，也不允许为通过测试擅自改变规则或后端账本。不能用浏览器高频点击证明库存不会超卖。
