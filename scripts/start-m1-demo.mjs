import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.env.M1_PORT ?? 4180);

if (!Number.isInteger(port) || port < 1024 || port > 65_535) {
  throw new Error("M1_PORT must be an integer between 1024 and 65535");
}

const child = spawn(process.execPath, [resolve(projectRoot, "demos/membership-lifecycle/src/server.ts")], {
  cwd: projectRoot,
  env: { ...process.env, M1_PORT: String(port) },
  stdio: "inherit",
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => child.kill(signal));
}

child.once("error", (error) => {
  process.stderr.write("Unable to start M1 demo: " + error.message + "\n");
  process.exitCode = 1;
});

child.once("exit", (code, signal) => {
  if (signal) process.exitCode = 1;
  else process.exitCode = code ?? 1;
});
