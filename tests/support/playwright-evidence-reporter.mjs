import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, join, resolve, sep } from "node:path";
import { parse } from "yaml";
import { createTestRunId, writeTestEvidence } from "../../scripts/playwright-evidence.mjs";

function caseIdForFile(file) {
  const match = file.split(sep).join("/").match(/\/tests\/(e1|m1|s1)\//i);
  return match?.[1].toUpperCase() ?? null;
}

export function findRepositoryRoot(startDir) {
  let directory = resolve(startDir);
  while (true) {
    try {
      const packageJson = JSON.parse(readFileSync(join(directory, "package.json"), "utf8"));
      if (packageJson.name === "ai-ui-automation-explore") return directory;
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
    const parent = dirname(directory);
    if (parent === directory) throw new Error(`Could not find ai-ui-automation-explore package root from ${startDir}`);
    directory = parent;
  }
}

function resultStatus(status) {
  if (status === "passed") return "passed";
  if (status === "skipped") return "not_run";
  if (status === "interrupted") return "incomplete";
  return "failed";
}

async function attachmentBytes(attachment) {
  if (attachment.body) return attachment.body;
  if (attachment.path) return readFile(attachment.path);
  return null;
}

function sourceCommit(rootDir) {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA;
  const sha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: rootDir, encoding: "utf8" }).trim();
  const changes = execFileSync("git", ["status", "--porcelain"], { cwd: rootDir, encoding: "utf8" }).trim();
  return changes ? `${sha}+dirty` : sha;
}

export default class PlaywrightEvidenceReporter {
  rootDir = process.cwd();
  seedIds = new Map();
  contractVersions = new Map();
  executorVersion = "Playwright Test unknown";
  appCommit = "unknown";
  written = [];

  onBegin(config) {
    this.rootDir = findRepositoryRoot(config.rootDir);
    const seeds = JSON.parse(readFileSync(join(this.rootDir, "fixtures/seed-manifest.json"), "utf8"));
    for (const entry of seeds.cases) this.seedIds.set(entry.case_id, entry.seed_id);
    const packageJson = JSON.parse(readFileSync(join(this.rootDir, "package.json"), "utf8"));
    this.executorVersion = `Playwright Test ${packageJson.devDependencies["@playwright/test"]}`;
    this.appCommit = sourceCommit(this.rootDir);
    for (const caseId of ["E1", "M1", "S1"]) {
      const contract = parse(readFileSync(join(this.rootDir, `contracts/cases/${caseId}.yaml`), "utf8"));
      this.contractVersions.set(caseId, contract.contract_version);
    }
  }

  async onTestEnd(test, result) {
    const caseId = caseIdForFile(test.location.file);
    if (!caseId) return;
    const runContextAttachment = result.attachments.find((attachment) => attachment.name === "p3-run-context");
    const networkAttachment = result.attachments.find((attachment) => attachment.name === "p3-network-summary");
    const runContextBytes = runContextAttachment ? await attachmentBytes(runContextAttachment) : null;
    const networkBytes = networkAttachment ? await attachmentBytes(networkAttachment) : null;
    const runContext = runContextBytes ? JSON.parse(runContextBytes.toString()) : {};
    const networkSummary = networkBytes ? JSON.parse(networkBytes.toString()) : [];
    const attachments = [];

    for (const attachment of result.attachments) {
      if (attachment.name === "p3-run-context" || attachment.name === "p3-network-summary") continue;
      if (!attachment.path && !attachment.body) continue;
      attachments.push({
        name: attachment.name,
        contentType: attachment.contentType,
        body: attachment.body,
        path: attachment.path,
        ...(attachment.name.startsWith("p3-oracle-") ? { kind: "oracle_response" } : {}),
      });
    }

    const project = test.parent.project();
    const startedAt = result.startTime.toISOString();
    const endedAt = new Date(result.startTime.getTime() + result.duration).toISOString();
    const artifacts = await writeTestEvidence({
      rootDir: this.rootDir,
      caseId,
      testRunId: createTestRunId(caseId),
      title: test.title,
      project: project?.name ?? "unknown",
      status: resultStatus(result.status),
      startedAt,
      endedAt,
      seedId: this.seedIds.get(caseId) ?? `${caseId.toLowerCase()}-seed-unavailable`,
      contractVersion: this.contractVersions.get(caseId) ?? "unknown-contract",
      appCommit: this.appCommit,
      browser: runContext.browser ?? (project?.name === "api"
        ? "API-only (no browser launched)"
        : `${project?.use.browserName ?? "browser"} (version not observed)`),
      executorVersion: this.executorVersion,
      businessRunIds: Array.isArray(runContext.business_run_ids) ? runContext.business_run_ids : [],
      requestIds: Array.isArray(runContext.request_ids) ? runContext.request_ids : [],
      networkSummary: Array.isArray(networkSummary) ? networkSummary : [],
      attachments,
      errors: result.errors.map((error) => error.message ?? error.value ?? "Playwright test failed without an error message"),
    });
    this.written.push({ case_id: caseId, title: test.title, manifest: artifacts.manifestPath, evidence_index: artifacts.evidenceIndexPath });
  }

  onEnd() {
    if (this.written.length === 0) return;
    console.log(`[P3 evidence] Wrote ${this.written.length} per-test manifests and evidence indexes under test-results/p3-evidence/.`);
  }
}
