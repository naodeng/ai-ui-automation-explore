# OrbStack E1 隔离沙箱

这是一个**可选的本机宿主隔离实验**，不是浏览器执行器，也不是方案 C 或“给 Agent 一个 URL”这种浏览器测试流程的必备组件。脚本只在专用机器上安装并验证隔离控制；**不会复制项目源码、安装浏览器或 AI Agent，也不会启动 Agent**。

## 准备与验证

准备命令会用 Alpine 3.23 创建 `e1-agent-sandbox`，限制为 2 个 CPU、2 GiB 内存和 8 GiB 磁盘。若同名机器已存在，脚本会拒绝复用。

```sh
ALLOW_ORBSTACK_BOOTSTRAP_NETWORK=1 sh scripts/orbstack/e1-sandbox.sh prepare
sh scripts/orbstack/e1-sandbox.sh verify
```

OrbStack 首次初始化机器时可能下载 Alpine 官方镜像和软件包。显式设置环境变量仅授权这段安装期网络访问。OrbStack 初始化返回后，脚本执行的第一条来宾命令会封锁 IPv4 与 IPv6 默认路由；初始化期间没有项目代码或 Agent 代码。

`prepare` 会执行一次停止/启动周期、验证隔离控制，并在成功后让机器保持停止。机器停止时，`verify` 会先启动它；随后检查 OrbStack 配置（`isolated=true`、`isolate_network=true`、`forward_ssh_agent=false`、无宿主挂载），重施来宾出口守卫并检查来宾状态。`verify` 成功后机器保持运行；任一检查失败都会停止这台专用机器：

- IPv4 与 IPv6 默认路由均不可达，策略规则会拒绝外部路由。IPv6 Router Advertisement 已持久禁用，但 OrbStack 启动时仍可能重新注入默认路由。
- `/mnt/mac` 不存在，未转发 SSH Agent。
- `e1-agent` 不属于 `wheel`，不能使用 `sudo` 或切换为 root，且没有 Linux capabilities。
- root 密码已锁定。OrbStack 的初始化用户 `e1setup` 仍有管理员权限，不能用它运行 Agent。

只有未来获批的本机 Agent 实验确实使用这台机器时，才需要在每次启动后、每次 Agent 运行前执行 `verify`。该检查会重施来宾出口守卫；任何检查失败都会停机。在这台机器里运行 Agent 前必须先验证通过。这不约束其他浏览器测试流程使用什么运行时。

`verify` 成功后，来宾出口守卫会阻断普通互联网访问；隔离机也不能访问运行在 Mac 上的 `localhost` 服务。这台机器目前没有 E1 Demo、浏览器或 Agent，因此不能测试任意 URL，也不能访问 Mac 上运行的 E1 应用。只有未来实验明确需要把本机 Agent 与宿主隔开时，这层才有用途；届时还需把应用和浏览器准备在来宾机内，或另行批准受限的网络方案。

## 限制

OrbStack 的 `--isolate-network` 会阻断宿主机和其他机器的 IP 访问，但仍保留互联网。额外的来宾路由、策略规则和 sysctl 守卫在应用后负责阻止出口；OrbStack 仍可能在机器启动时重新加入路由。因此，若未来本机 Agent 实验使用这台机器，必须先通过 `verify` 重施守卫，Agent 也必须以 `e1-agent` 用户运行。

OrbStack 隔离机器默认不挂载 Mac 文件，也不转发 SSH Agent；但所有 OrbStack 机器共享一个 Linux 内核。它不能防御主动利用内核漏洞逃逸的代码。详见 [OrbStack 隔离机器说明](https://docs.orbstack.dev/machines/isolated)和 [OrbStack 架构说明](https://docs.orbstack.dev/architecture)。

目前没有向机器复制 E1 项目文件、浏览器、模型或 Agent 运行时。Agent 启动和盲评证据仍为 **NOT RUN**。

停止已准备的机器：

```sh
orb stop e1-agent-sandbox
```

删除这台专用机器及其内容：

```sh
orb delete e1-agent-sandbox
```

English documentation: [README.md](README.md).
