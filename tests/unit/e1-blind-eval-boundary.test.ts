import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { once } from "node:events";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createServer } from "node:net";
import { setTimeout as delay } from "node:timers/promises";
import test from "node:test";

async function reservePort(): Promise<number> {
  const server = createServer();
  await new Promise<void>((resolveListen, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolveListen);
  });
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  await new Promise<void>((resolveClose, reject) => {
    server.close((error) => error ? reject(error) : resolveClose());
  });
  return address.port;
}

async function waitForPublicServer(url: string, child: ReturnType<typeof spawn>, output: () => string): Promise<void> {
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`E1 server exited early: ${output()}`);
    try {
      const response = await fetch(url);
      if (response.status === 200) return;
    } catch {
      // The child may still be opening its listeners.
    }
    await delay(25);
  }
  throw new Error(`E1 public listener did not start: ${output()}`);
}

test("blind evaluation separates public routes from authenticated evaluator routes", async (context) => {
  const publicPort = await reservePort();
  const evaluatorPort = await reservePort();
  const token = randomBytes(32).toString("hex");
  const outputChunks: string[] = [];
  const child = spawn(process.execPath, [resolve("demos/ecommerce-checkout/src/server.ts")], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: String(publicPort),
      E1_BLIND_EVAL_MODE: "1",
      E1_PUBLIC_HOST: "127.0.0.1",
      E1_EVALUATOR_HOST: "127.0.0.1",
      E1_EVALUATOR_PORT: String(evaluatorPort),
      E1_CONTROL_TOKEN: token,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout?.on("data", (chunk: Buffer) => outputChunks.push(chunk.toString()));
  child.stderr?.on("data", (chunk: Buffer) => outputChunks.push(chunk.toString()));
  const childExit = once(child, "exit");
  context.after(async () => {
    if (child.exitCode === null) {
      child.kill("SIGTERM");
      await Promise.race([childExit, delay(3_000)]);
    }
    if (child.exitCode === null) child.kill("SIGKILL");
  });

  const publicOrigin = `http://127.0.0.1:${publicPort}`;
  const evaluatorOrigin = `http://127.0.0.1:${evaluatorPort}`;
  await waitForPublicServer(publicOrigin, child, () => outputChunks.join(""));

  const cartSelection = await fetch(`${publicOrigin}/api/cart/select`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ run_id: "e1-blind-001", sku_id: "E1-99" }),
  });
  assert.equal(cartSelection.status, 200);

  const quote = await fetch(`${publicOrigin}/api/checkout/quote`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ run_id: "e1-blind-001", coupon_code: "C20" }),
  });
  assert.equal(quote.status, 201);
  assert.equal((await quote.json()).discount_cents, 0);

  const publicOracle = await fetch(`${publicOrigin}/__test/oracle/checkout?run_id=e1-local&seed_id=e1-threshold&user_id=user_e1`);
  assert.equal(publicOracle.status, 404);

  const publicReset = await fetch(`${publicOrigin}/__test/reset`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-control-token": token },
    body: JSON.stringify({ case_id: "E1", run_id: "e1-blind-001", seed_id: "e1-threshold" }),
  });
  assert.equal(publicReset.status, 404);

  const blockedOrder = await fetch(`${publicOrigin}/api/orders`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{}",
  });
  assert.equal(blockedOrder.status, 403);

  const blockedSandboxPayment = await fetch(`${publicOrigin}/api/orders/00000000-0000-4000-8000-000000000000/simulate-payment`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ run_id: "e1-blind-001" }),
  });
  assert.equal(blockedSandboxPayment.status, 403);

  const blockedCancellation = await fetch(`${publicOrigin}/api/orders/00000000-0000-4000-8000-000000000000/cancel`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ run_id: "e1-blind-001" }),
  });
  assert.equal(blockedCancellation.status, 403);

  const unauthenticatedOracle = await fetch(`${evaluatorOrigin}/__test/oracle/checkout?run_id=e1-local&seed_id=e1-threshold&user_id=user_e1`);
  assert.equal(unauthenticatedOracle.status, 401);

  const unauthenticatedReset = await fetch(`${evaluatorOrigin}/__test/reset`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ case_id: "E1", run_id: "e1-blind-001", seed_id: "e1-threshold" }),
  });
  assert.equal(unauthenticatedReset.status, 401);

  const evaluatorOracle = await fetch(`${evaluatorOrigin}/__test/oracle/checkout?run_id=e1-blind-001&seed_id=e1-threshold&user_id=user_e1`, {
    headers: { "x-control-token": token },
  });
  assert.equal(evaluatorOracle.status, 200);

  const evaluatorReset = await fetch(`${evaluatorOrigin}/__test/reset`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-control-token": token },
    body: JSON.stringify({ case_id: "E1", run_id: "e1-blind-001", seed_id: "e1-threshold" }),
  });
  assert.equal(evaluatorReset.status, 200);

  const cliRoot = await mkdtemp(join(tmpdir(), "e1-blind-reset-"));
  try {
    await mkdir(join(cliRoot, ".local"));
    await writeFile(join(cliRoot, ".local", "e1-blind-control-token"), `${token}\n`, { mode: 0o600 });
    const resetCli = spawnSync(process.execPath, [
      resolve("scripts/reset-e1-run.mjs"),
      "--blind-eval",
      "--case", "E1",
      "--seed", "e1-threshold",
      "--run-id", "e1-blind-cli",
    ], {
      cwd: cliRoot,
      env: { ...process.env, E1_EVALUATOR_HOST: "127.0.0.1", E1_EVALUATOR_PORT: String(evaluatorPort) },
      encoding: "utf8",
      timeout: 5_000,
    });
    assert.equal(resetCli.status, 0, resetCli.stderr);
    assert.match(resetCli.stdout, /"run_id": "e1-blind-cli"/);
  } finally {
    await rm(cliRoot, { recursive: true, force: true });
  }

  const evaluatorPage = await fetch(evaluatorOrigin);
  assert.equal(evaluatorPage.status, 404);
});

test("blind evaluation rejects wildcard evaluator listener addresses", () => {
  for (const host of ["0.0.0.0", "::", "0:0:0:0:0:0:0:0"]) {
    const startup = spawnSync(process.execPath, [resolve("demos/ecommerce-checkout/src/server.ts")], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        PORT: "4179",
        E1_BLIND_EVAL_MODE: "1",
        E1_PUBLIC_HOST: "127.0.0.1",
        E1_EVALUATOR_HOST: host,
        E1_EVALUATOR_PORT: "4180",
        E1_CONTROL_TOKEN: randomBytes(32).toString("hex"),
      },
      encoding: "utf8",
      timeout: 5_000,
    });

    assert.equal(startup.status, 1, `${host}: ${startup.stdout}\n${startup.stderr}`);
    assert.match(startup.stderr, /E1_EVALUATOR_HOST must be a specific non-wildcard interface/);
  }
});
