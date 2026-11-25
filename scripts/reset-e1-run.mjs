import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

function readOption(name, fallback) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1];
}

const caseId = readOption("--case", "E1");
const seedId = readOption("--seed", "e1-threshold");
const runId = readOption("--run-id", `e1-manual-${randomUUID()}`);
const blindEval = process.argv.includes("--blind-eval");
if (caseId !== "E1") throw new Error("Only the E1 demo can be reset by this command");

const tokenFile = blindEval ? "e1-blind-control-token" : "e1-control-token";
const token = (await readFile(resolve(".local", tokenFile), "utf8")).trim();
const host = blindEval ? process.env.E1_EVALUATOR_HOST : "127.0.0.1";
const port = blindEval ? process.env.E1_EVALUATOR_PORT : process.env.PORT ?? "4179";
if (!host || !port) throw new Error("E1_EVALUATOR_HOST and E1_EVALUATOR_PORT are required with --blind-eval");
const response = await fetch(`http://${host}:${port}/__test/reset`, {
  method: "POST",
  headers: { "content-type": "application/json", "x-control-token": token },
  body: JSON.stringify({ case_id: caseId, run_id: runId, seed_id: seedId }),
});
const result = await response.json();
if (!response.ok) throw new Error(`Reset failed: HTTP ${response.status} ${JSON.stringify(result)}`);
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
