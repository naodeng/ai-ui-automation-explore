import { randomBytes } from "node:crypto";
import { chmod, mkdir, rm, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const localDir = resolve(projectRoot, ".local");
const tokenPath = resolve(localDir, "e1-control-token");
const token = randomBytes(32).toString("hex");

await mkdir(localDir, { recursive: true, mode: 0o700 });
await writeFile(tokenPath, `${token}\n`, { mode: 0o600 });
await chmod(tokenPath, 0o600);

const child = spawn(process.execPath, [resolve(projectRoot, "demos/ecommerce-checkout/src/server.ts")], {
  cwd: projectRoot,
  env: { ...process.env, E1_CONTROL_TOKEN: token },
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
