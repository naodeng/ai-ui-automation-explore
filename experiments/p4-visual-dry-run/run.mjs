import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { reviewMockCandidate } from "./index.mjs";

const experimentDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(experimentDir, "../..");
const evidenceDir = resolve(
  repoRoot,
  "evidence/e1/run-contexts/p3-a/e1-6af9cb0d-4777-42ae-b538-acba74461fed",
);
const [observationText, oracleText] = await Promise.all([
  readFile(resolve(evidenceDir, "observation.json"), "utf8"),
  readFile(resolve(evidenceDir, "oracle.json"), "utf8"),
]);

const result = reviewMockCandidate({
  observation: JSON.parse(observationText),
  oracle: JSON.parse(oracleText),
});
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
