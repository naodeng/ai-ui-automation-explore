# OrbStack E1 isolated sandbox

This is an **optional local host-isolation experiment**, not a browser runner and not a requirement for Scheme C or URL-driven browser testing. It installs isolation controls on a dedicated machine; it does **not** copy project code, install a browser or AI Agent, or launch an Agent.

## Prepare and verify

The setup command creates `e1-agent-sandbox` from Alpine 3.23 with 2 CPUs, 2 GiB memory, and an 8 GiB disk. It refuses to reuse an existing machine.

```sh
ALLOW_ORBSTACK_BOOTSTRAP_NETWORK=1 sh scripts/orbstack/e1-sandbox.sh prepare
sh scripts/orbstack/e1-sandbox.sh verify
```

OrbStack's initial machine bootstrap may download the official Alpine image and packages. The explicit environment variable approves that setup-time network use only. Immediately after bootstrap, the first guest command blocks IPv4 and IPv6 default routes. No project or Agent code is present during bootstrap.

`prepare` performs one stop/start cycle, verifies the controls, and leaves the machine stopped. `verify` starts it when needed, checks the OrbStack settings (`isolated=true`, `isolate_network=true`, `forward_ssh_agent=false`, and no mounts), reapplies the guest egress guard, then checks the guest state. A successful `verify` leaves the machine running; a failed check stops it:

- IPv4 and IPv6 default routes are unreachable and policy rules reject external routes. IPv6 Router Advertisements are disabled persistently, but OrbStack may still inject a default route during machine startup.
- `/mnt/mac` is absent and no SSH agent is forwarded.
- `e1-agent` is outside `wheel`, cannot use `sudo` or switch to root, and has no Linux capabilities.
- The root password is locked. OrbStack's setup user `e1setup` retains administrative access and must never be used to run an Agent.

Only if a future approved local Agent experiment uses this machine, run `verify` after every machine start and immediately before that run. The check reapplies the guest egress guard and stops the machine if any check fails. Do not start an Agent in this machine before that check succeeds. This does not prescribe the runtime for other browser-testing workflows.

After `verify` succeeds, the guest egress guard blocks general internet access, and the isolated machine cannot reach a Mac-hosted `localhost` service. This machine currently has no E1 demo, browser, or Agent installed, so it cannot test an arbitrary URL or the E1 app running on the Mac. It is only relevant if a future experiment specifically needs a local Agent runtime separated from the host; the app and browser would need to be prepared inside the guest or a separately approved network design would be required.

## Limits

OrbStack's `--isolate-network` blocks host and peer-machine IPs but preserves internet access. The guest route, policy-rule, and sysctl guard provides the additional egress block when installed. This is guest-level enforcement: a guest administrator can change it, and OrbStack may re-add a route on startup. If this optional machine is used for a future local Agent experiment, the guard must be re-applied by `verify`, and the Agent must run as `e1-agent` after verification.

OrbStack isolated machines do not mount Mac files or forward the SSH agent by default, but all OrbStack machines share one Linux kernel. This is not a full VM boundary against code actively trying to exploit the kernel. See [OrbStack isolated machines](https://docs.orbstack.dev/machines/isolated) and [OrbStack architecture](https://docs.orbstack.dev/architecture).

No E1 project files, browser, model, or Agent runtime have been copied into this machine. Agent launch and blind-evaluation evidence remain **NOT RUN**.

To stop the prepared machine:

```sh
orb stop e1-agent-sandbox
```

To remove this dedicated machine and its contents:

```sh
orb delete e1-agent-sandbox
```

简体中文说明见 [README.zh-CN.md](README.zh-CN.md).
