import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmod, mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

const guestGuard = resolve("scripts/orbstack/guest/e1-sandbox-guest.sh");
const sandboxCommand = resolve("scripts/orbstack/e1-sandbox.sh");

async function withFakeIp<T>(run: (bin: string, log: string) => Promise<T>): Promise<T> {
  const root = await mkdtemp(join(tmpdir(), "e1-egress-guard-"));
  const bin = join(root, "bin");
  const log = join(root, "ip.log");
  await mkdir(bin);
  const ip = join(bin, "ip");
  await writeFile(ip, `#!/bin/sh
printf 'ip %s\\n' "$*" >> "$IP_LOG"
if [ "\${IP_FAIL_ON:-}" = "$*" ]; then exit 2; fi
case "$*" in
  *"route del default") exit 2 ;;
  *"rule del pref 1 type unreachable") exit 2 ;;
esac
`);
  await chmod(ip, 0o755);
  const sysctl = join(bin, "sysctl");
  await writeFile(sysctl, `#!/bin/sh
printf 'sysctl %s\\n' "$*" >> "$IP_LOG"
if [ "$1" = "-n" ]; then echo 0; fi
`);
  await chmod(sysctl, 0o755);
  try {
    return await run(bin, log);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test("egress guard replaces existing IPv4 and IPv6 defaults with unreachable routes", async () => {
  await withFakeIp(async (bin, log) => {
    const result = spawnSync("/bin/sh", [guestGuard], {
      encoding: "utf8",
      env: { ...process.env, PATH: `${bin}:/usr/bin:/bin`, IP_LOG: log },
    });
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual((await readFile(log, "utf8")).trim().split("\n"), [
      "sysctl -w net.ipv6.conf.all.accept_ra=0",
      "sysctl -w net.ipv6.conf.default.accept_ra=0",
      "sysctl -w net.ipv6.conf.eth0.accept_ra=0",
      "ip -4 rule del pref 1 type unreachable",
      "ip -4 rule add pref 1 type unreachable",
      "ip -6 rule del pref 1 type unreachable",
      "ip -6 rule add pref 1 type unreachable",
      "ip -4 route del default",
      "ip -4 route add unreachable default metric 1",
      "ip -6 route del default",
      "ip -6 route add unreachable default metric 1",
    ]);
  });
});

test("egress guard exits unsuccessfully if its IPv6 policy rule cannot be installed", async () => {
  await withFakeIp(async (bin, log) => {
    const result = spawnSync("/bin/sh", [guestGuard], {
      encoding: "utf8",
      env: {
        ...process.env,
        PATH: `${bin}:/usr/bin:/bin`,
        IP_LOG: log,
        IP_FAIL_ON: "-6 rule add pref 1 type unreachable",
      },
    });
    assert.notEqual(result.status, 0);
    assert.match(await readFile(log, "utf8"), /-6 rule add pref 1 type unreachable/);
  });
});

async function withFakeOrb<T>(run: (bin: string, log: string) => Promise<T>): Promise<T> {
  const root = await mkdtemp(join(tmpdir(), "e1-orb-"));
  const bin = join(root, "bin");
  const log = join(root, "orb.log");
  await mkdir(bin);
  const orb = join(bin, "orb");
  await writeFile(orb, `#!/bin/sh
printf '%s\\n' "$*" >> "$ORB_LOG"
if [ "$1" = "list" ]; then
  case "$*" in
    "list --running --quiet") printf '%s\\n' "\${ORB_RUNNING:-}" ;;
    "list --quiet") printf '%s\\n' "\${ORB_MACHINES:-}" ;;
  esac
  exit 0
fi
case "$*" in
  "config get machine.e1-agent-sandbox.isolated") printf '%s\\n' "\${ORB_ISOLATED:-true}" ;;
  "config get machine.e1-agent-sandbox.isolate_network") printf '%s\\n' "\${ORB_ISOLATE_NETWORK:-true}" ;;
  "config get machine.e1-agent-sandbox.forward_ssh_agent") printf '%s\\n' "\${ORB_FORWARD_SSH_AGENT:-false}" ;;
  "config get machine.e1-agent-sandbox.mounts") printf '%s\\n' "\${ORB_MOUNTS:-}" ;;
esac
case "$*" in
  *"e1-sandbox-guest verify"*) echo "E1_EGRESS_GUARD_OK" ;;
  *"e1-sandbox-guest agent-check"*) echo "E1_AGENT_PRIVILEGE_CHECK_OK" ;;
esac
exit 0
`);
  await chmod(orb, 0o755);
  try {
    return await run(bin, log);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test("sandbox prepare requires explicit approval for OrbStack bootstrap downloads", async () => {
  await withFakeOrb(async (bin, log) => {
    const env: NodeJS.ProcessEnv = { ...process.env, PATH: `${bin}:/usr/bin:/bin`, ORB_LOG: log };
    delete env.ALLOW_ORBSTACK_BOOTSTRAP_NETWORK;
    const result = spawnSync("/bin/sh", [sandboxCommand, "prepare"], { encoding: "utf8", env });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /ALLOW_ORBSTACK_BOOTSTRAP_NETWORK=1/);
    assert.doesNotMatch(await readFile(log, "utf8").catch(() => ""), /^create /m);
  });
});

test("sandbox prepare blocks egress immediately and verifies the restarted machine", async () => {
  await withFakeOrb(async (bin, log) => {
    const result = spawnSync("/bin/sh", [sandboxCommand, "prepare"], {
      encoding: "utf8",
      env: {
        ...process.env,
        PATH: `${bin}:/usr/bin:/bin`,
        ORB_LOG: log,
        ALLOW_ORBSTACK_BOOTSTRAP_NETWORK: "1",
        ORB_RUNNING: "e1-agent-sandbox",
      },
    });
    assert.equal(result.status, 0, `${result.stdout}\\n${result.stderr}`);

    const calls = (await readFile(log, "utf8")).trim().split("\n");
    const createAt = calls.findIndex((call) => call.startsWith("create "));
    const blockAt = calls.findIndex((call) => call.includes("route add unreachable default"));
    const pushAt = calls.findIndex((call) => call.startsWith("push "));
    const stopAt = calls.findIndex((call) => call === "stop e1-agent-sandbox");
    const startAt = calls.findIndex((call) => call === "start e1-agent-sandbox");
    const reapplyAt = calls.findIndex((call) => call.includes("e1-sandbox-guest start"));
    const verifyAt = calls.findIndex((call) => call.includes("e1-sandbox-guest verify"));
    const finalStopAt = calls.lastIndexOf("stop e1-agent-sandbox");

    assert.ok(createAt >= 0, calls.join("\n"));
    assert.ok(blockAt > createAt, calls.join("\n"));
    assert.ok(pushAt > blockAt, calls.join("\n"));
    assert.ok(stopAt > pushAt, calls.join("\n"));
    assert.ok(startAt > stopAt, calls.join("\n"));
    assert.ok(reapplyAt > startAt && reapplyAt < verifyAt, calls.join("\n"));
    assert.ok(verifyAt > startAt, calls.join("\n"));
    assert.ok(finalStopAt > verifyAt, calls.join("\n"));
    assert.match(calls[createAt], /--isolated .*--isolate-network/);
    assert.doesNotMatch(calls[createAt], /--mount|--forward-ssh-agent/);
    assert.doesNotMatch(calls[blockAt], /\s--\s/);
    assert.match(calls[blockAt], /ip -4 rule add pref 1 type unreachable/);
    assert.match(calls[blockAt], /ip -6 rule add pref 1 type unreachable/);
    assert.match(calls[verifyAt], /sudo -n/);
  });
});

test("sandbox prepare refuses to reuse an existing machine with the dedicated name", async () => {
  await withFakeOrb(async (bin, log) => {
    const result = spawnSync("/bin/sh", [sandboxCommand, "prepare"], {
      encoding: "utf8",
      env: {
        ...process.env,
        PATH: `${bin}:/usr/bin:/bin`,
        ORB_LOG: log,
        ORB_MACHINES: "e1-agent-sandbox",
        ALLOW_ORBSTACK_BOOTSTRAP_NETWORK: "1",
      },
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /already exists/);
    assert.doesNotMatch(await readFile(log, "utf8"), /^create /m);
  });
});

test("sandbox verify stops before the Agent check if OrbStack isolation settings changed", async () => {
  await withFakeOrb(async (bin, log) => {
    const result = spawnSync("/bin/sh", [sandboxCommand, "verify"], {
      encoding: "utf8",
      env: {
        ...process.env,
        PATH: `${bin}:/usr/bin:/bin`,
        ORB_LOG: log,
        ORB_MACHINES: "e1-agent-sandbox",
        ORB_RUNNING: "e1-agent-sandbox",
        ORB_ISOLATED: "false",
      },
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /machine\.e1-agent-sandbox\.isolated/);
    const calls = await readFile(log, "utf8");
    assert.match(calls, /^stop e1-agent-sandbox$/m);
    assert.doesNotMatch(calls, /e1-sandbox-guest agent-check/);
  });
});
