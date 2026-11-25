import { randomUUID } from "node:crypto";
import { mkdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { APIRequestContext } from "@playwright/test";

export function newRunId(): string {
  return `e1-${randomUUID()}`;
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
