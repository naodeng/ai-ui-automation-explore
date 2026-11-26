# GitHub 新仓库初始化建议（当前未执行）

- **推荐仓库**：`AI-Native-QA-Lab/ai-ui-automation-explore`
- **Description**：Explore and evaluate AI-powered browser tools for maintainable UI automation with reproducible demos, trustworthy QA evidence, and practical tutorials.
- **Topics**：`ai-testing`, `ui-automation`, `browser-automation`, `playwright`, `ai-agents`, `quality-engineering`, `exploratory-testing`
- **分支**：`main`，PR Review；建议 CI 静态契约验证与分支保护。
- **公开范围与 LICENSE**：由仓库所有者确定，不能自动选择 MIT/Apache。
- **安全**：先查看 `.gitignore`，检查是否有 Cookie、Token、真实截图、原始 HAR 与第三方未授权素材。

候选命令，仅作人工确认后的操作示例，**此次并未执行**：

```bash
# git init -b main
# git add .
# git commit -m "docs: initialize ai-ui-automation-explore"
# gh repo create AI-Native-QA-Lab/ai-ui-automation-explore --source=. --remote=origin --public --push
```

`--public` 只代表示例中的公开仓库选择，必须人工批准之后才可执行。
