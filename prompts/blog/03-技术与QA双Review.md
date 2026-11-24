# Codex Prompt：技术 + QA 双重 Review

对单篇文章审查：
1. 是否将 CLI / MCP / SDK / Agent / Benchmark 能力混为一谈？
2. 安装命令、依赖版本、API、适用系统有没有证据？
3. 示例中的业务规则是否与 E1/M1/S1 的 YAML 契约一致？
4. “测试通过”有无真实执行日志、退出码、Trace 和后端只读 Oracle？
5. 是否区分发现异常、确认缺陷、生成脚本、稳定 CI 回归？
6. 是否存在危险动作、泄露 Cookie/Token、云传输或许可证漏审？
7. FAQ 是否回答真实痛点，是否有至少一个局限/失败案例？

输出 Critical/Major/Minor 问题，文件位置、依据、建议与复测动作。禁止自动把 `status` 改为 `published`。
