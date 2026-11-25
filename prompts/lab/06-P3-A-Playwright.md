> **仓库路径迁移提示：** 当前项目名 `ai-ui-automation-explore`；以前 `docs/NN-*.md` 现位于 `docs/lab/`，`templates/` 现为 `templates/qa/`；三案例 `contracts/` 与 `fixtures/` 仍在项目根目录。此 Prompt 为历史实施方案的后续可编辑副本，执行前核实路径。

# P3｜A：确定性浏览器探索与独立证据

阅读 `AGENTS.md`、`docs/07-方案A-确定性执行.md`、`docs/10-证据与缺陷治理.md` 和三个 P2 评审结果。前置：E1/M1/S1 Demo 都可以 reset 并有只读 Oracle。

实现统一 Playwright Test 基线，使用稳定 test ID 和独立 fixture。先选择并锁定一种 Codex 浏览器交互路径（Playwright CLI 或授权 Host 浏览器），不要同会话混用不兼容工具。

必须至少实现：
- E1 100/99 边界、沙盒订单幂等。
- M1 silver→gold、gold→silver、旧 token 的当前授权。
- S1 活动前/开售/售罄、单账号限购、请求唯一；库存并发留给独立服务层测试。

每个测试产生 Run Manifest、实际断言输出、Trace/截图（按失败策略）、请求关联 ID 与只读 Oracle 证据。对 UI 所见和后台不一致的异常输出 `suspected_issue`，重新 reset + 新 run_id 独立复现，不能直接 Confirmed。

TDD：先制造/启用演示 Fault（Agent 看不到真值），证明能 RED；在无 Fault 模式正确通过。不要为了让脚本通过改动冻结业务规则。

区分可信的确定性 Playwright 执行器与盲评 Explorer：前者可读取 Oracle；后者使用 `contracts/examples/E1-blind-readonly-charter.json`，不得获得 Oracle/Reset 路由或凭据，也不得读取本仓库公开故障方案。只有宿主/网络隔离证据通过后才能启动新 Explorer 上下文；同机双监听器的路由测试不构成隔离证明。盲评结果封存后再由评估方读取 Oracle。

交付：`reports/P3_A_REVIEW.md`，明确：工具/浏览器版本、具体运行命令、真实测试数与结果、失败用例、复现链接、没有覆盖的 Oracle。完成之前不做 B/C。
