import { randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { mkdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { test, type APIRequestContext } from "@playwright/test";

interface RunContext {
  case_id: "E1";
  clock_epoch: string;
  project: string;
  run_ids: string[];
  seed_id: string;
  test_title: string;
}

const runContexts = new Map<string, RunContext>();
const manifest = JSON.parse(readFileSync(resolve("fixtures/seed-manifest.json"), "utf8")) as {
  cases: Array<{ case_id: string; seed_id: string; clock_epoch: string }>;
};
const e1Seed = manifest.cases.find((seed) => seed.case_id === "E1");
if (!e1Seed) throw new Error("E1 seed manifest entry is missing");
const e1SeedId = e1Seed.seed_id;
const e1ClockEpoch = e1Seed.clock_epoch;

export function newRunId(): string {
  const runId = `e1-${randomUUID()}`;
  const info = test.info();
  const slug = `${info.project.name}-${info.title}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const outputDirectory = resolve("evidence/e1/run-contexts");
  mkdirSync(outputDirectory, { recursive: true });

  const context = runContexts.get(slug) ?? {
    case_id: "E1",
    clock_epoch: e1ClockEpoch,
    project: info.project.name,
    run_ids: [],
    seed_id: e1SeedId,
    test_title: info.title,
  };
  context.run_ids.push(runId);
  runContexts.set(slug, context);
  writeFileSync(resolve(outputDirectory, `${slug}.json`), `${JSON.stringify(context, null, 2)}\n`);
  return runId;
}

export async function ensureEvidenceDirectory(): Promise<void> {
  await mkdir(resolve("evidence/e1"), { recursive: true });
}

export async function resetRun(request: APIRequestContext, runId: string) {
  const token = (await readFile(resolve(".local/e1-control-token"), "utf8")).trim();
  const response = await request.post("/__test/reset", {
    data: { case_id: "E1", run_id: runId, seed_id: "e1-threshold" },
    headers: { "x-control-token": token },
  });
  if (!response.ok()) {
    throw new Error(`E1 reset failed: HTTP ${response.status()} ${await response.text()}`);
  }
  return response.json() as Promise<{ run_id: string; seed_id: string; state_sha256: string }>;
}
