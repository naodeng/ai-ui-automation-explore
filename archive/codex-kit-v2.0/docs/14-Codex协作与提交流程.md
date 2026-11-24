# 14｜如何与 Codex 逐轮协作，而不是一次性下巨型指令

## 会话组织建议

- 新建单独 Codex 线程：`Browser QA Lab · P0`；P0 审批后开启 `P1` 线程，必要时复用检查点文档而不依赖聊天上下文。
- 按 `prompts/` 中顺序逐个提交，**每次只一个 Epic**。
- 每轮要求 Codex 打开 `AGENTS.md`、当前业务契约、上个阶段 checkpoint，不得只依赖模型记忆。
- 重大决策都记录到 `docs/19-ADR-0001-测试执行架构.md` 等 ADR，业务变化记录 rule ID。

## 消息中必须提供的变量

```text
<PROJECT_ROOT>                 新建隔离仓库绝对路径
<APP_BASE_URL>                 默认仅 http://127.0.0.1:<port>
<APP_COMMIT>                   本轮测试源码 Commit
<CASE_ID>                      E1 / M1 / S1
<RUN_ID>                       唯一运行 ID
<SEED_ID>                      版本化数据种子
<ALLOW_WRITES>                 默认 false
<APPROVED_ORACLES>             授权的只读 API/账本
<MAX_ACTIONS>                  默认 20
<MAX_DURATION_SECONDS>         默认 600
<ALLOWED_PROVIDER_DATA_FLOW>    默认 none
```

缺失变量时请 Codex 使用默认拒绝/Not Configured，而不是猜一个生产域名或测试账号。

## 每轮工作机制

1. Codex 先提出实施范围与不改的东西；仅对有危险副作用/架构变更请求批准。
2. 先写测试，让 RED 结果可证实。
3. 完成最小实现并执行，收集日志、Trace、API 证据。
4. 输出可审查的 diff、风险登记和下一轮推荐。
5. 用户 Review 后把结论写成 checkpoint，再进入下一轮。

## 处理 Codex 常见偏差

| 偏差 | 纠正 Prompt |
|---|---|
| 一轮改动太大 | `本轮仅修复一个失败测试，不添加新依赖；列出具体 diff 与证据。` |
| 想用模型自评确定 Bug | `用只读 Oracle 和独立复现验证；否则降为 suspected。` |
| 修改断言使测试通过 | `恢复原始业务契约，先分析产品变更是否有批准记录。` |
| 使用未知 CLI 命令 | `先读取当前安装版本 --help 与官方文档，再写兼容命令。` |
| 想连接第三方服务 | `默认本地；列出数据流、许可、收费和安全影响，等待显式批准。` |
| 使用真实账号做测试 | `立即停止，撤销凭据并替换成隔离测试账号，记录审计。` |

## 不要让 Codex 承诺异步完成

一轮任务只能报告当前工作区实际已经执行的工作；尚未运行的实验、压测与真实 Bug 必须写 `NOT RUN`，不得把“将来会执行”表述为完成。
