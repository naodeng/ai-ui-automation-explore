import { randomBytes } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const localDir = resolve(projectRoot, ".local");
const blindEval = process.argv.includes("--blind-eval");
const tokenPath = resolve(localDir, blindEval ? "e1-blind-control-token" : "e1-control-token");
const token = randomBytes(32).toString("hex");

await mkdir(localDir, { recursive: true, mode: 0o700 });
try {
  await writeFile(tokenPath, `${token}\n`, { flag: "wx", mode: 0o600 });
} catch (error) {
  if (error?.code === "EEXIST") {
    process.stderr.write(`E1 demo token already exists at ${tokenPath}; another launcher may be running. Stop it before starting another instance. If no instance is running, remove this stale token and retry.\n`);
    process.exit(1);
  }
  throw error;
}

const child = spawn(process.execPath, [resolve(projectRoot, "demos/ecommerce-checkout/src/server.ts")], {
  cwd: projectRoot,
  env: {
    ...process.env,
    E1_CONTROL_TOKEN: token,
    E1_BLIND_EVAL_MODE: blindEval ? "1" : "0",
  },
  stdio: "inherit",
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => child.kill(signal));
}

child.once("error", async (error) => {
  await rm(tokenPath, { force: true });
  process.stderr.write(`Unable to start E1 demo: ${error.message}\n`);
  process.exitCode = 1;
});

child.once("exit", async (code, signal) => {
  await rm(tokenPath, { force: true });
  if (signal) process.exitCode = 1;
  else process.exitCode = code ?? 1;
});
