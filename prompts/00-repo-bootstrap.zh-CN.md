# Codex P0 总控：启动 ai-ui-automation-explore

请把当前目录当作全新项目 `ai-ui-automation-explore`，**第一轮只做 P0 体检，不安装浏览器工具、不创建远程 GitHub 仓库、不启动真实业务服务、不进入后续 Epic**。

1. 阅读 `AGENTS.md`、`00_START_HERE.md`、`docs/project/ROADMAP.zh-CN.md`、`docs/quality/QUALITY_GATES.zh-CN.md`。
2. 执行 `python3 scripts/validate_project.py` 与 `python3 -m unittest discover -s tests -v`，记录命令、退出码和实际检查范围；不能称作 E2E 测试通过。
3. 核对 E1/M1/S1 YAML 的教学规则和未知项，形成待人工确认的业务契约清单；不得擅改真相源。
4. 核对 24 工具索引、24 篇骨架与四篇长文草稿，抽样查官网当前安装文档、许可证、遥测和平台限制；未经实测的不声称可运行。
5. 输出 `docs/reviews/P0-readiness-report.md`，分 FACT、VERIFIED、PROPOSED、NOT RUN，附风险与阻断项。
6. 给出下一阶段 P1 的 TDD 任务列表与批准点。等待我批准后再进入 P1。
