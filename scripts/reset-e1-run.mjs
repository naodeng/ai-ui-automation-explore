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
if (caseId !== "E1") throw new Error("Only the E1 demo can be reset by this command");

const token = (await readFile(resolve(".local/e1-control-token"), "utf8")).trim();
const response = await fetch(`http://127.0.0.1:${process.env.PORT ?? "4179"}/__test/reset`, {
  method: "POST",
  headers: { "content-type": "application/json", "x-control-token": token },
  body: JSON.stringify({ case_id: caseId, run_id: runId, seed_id: seedId }),
});
const result = await response.json();
if (!response.ok) throw new Error(`Reset failed: HTTP ${response.status} ${JSON.stringify(result)}`);
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
