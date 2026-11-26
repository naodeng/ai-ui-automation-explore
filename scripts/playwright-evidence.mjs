import { createHash, randomUUID } from "node:crypto";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { extname, join, relative, resolve, sep } from "node:path";

function toRelativePath(rootDir, filePath) {
  return relative(rootDir, filePath).split(sep).join("/");
}

function safeName(value) {
  return value.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "") || "attachment";
}

function evidenceKind(attachment) {
  if (attachment.kind) return attachment.kind;
  if (attachment.contentType.startsWith("image/")) return "screenshot";
  if (attachment.name.toLowerCase().includes("trace") || attachment.contentType === "application/zip") return "browser_trace";
  return "test_result";
}

function ruleIdsFrom(title) {
  let caseId;
  const ruleIds = [];
  for (const match of title.matchAll(/(?:(E1|M1|S1)-)?R(\d{2})/g)) {
    caseId = match[1] ?? caseId;
    if (caseId) ruleIds.push(`${caseId}-R${match[2]}`);
  }
  return [...new Set(ruleIds)];
}

export async function writeTestEvidence(input) {
  const rootDir = resolve(input.rootDir);
  const outputDirectory = join(rootDir, "test-results", "p3-evidence", input.caseId, input.testRunId);
  const attachmentDirectory = join(outputDirectory, "attachments");
  const oracleDirectory = join(outputDirectory, "oracles");
  await Promise.all([
    mkdir(attachmentDirectory, { recursive: true }),
    mkdir(oracleDirectory, { recursive: true }),
  ]);

  const capturedAt = input.endedAt;
  const ruleIds = ruleIdsFrom(input.title);
  const networkSummaryPath = join(outputDirectory, "network-summary.json");
  const testResultPath = join(outputDirectory, "test-result.json");
  const evidenceIndexPath = join(outputDirectory, "evidence-index.json");
  const manifestPath = join(outputDirectory, "manifest.json");

  await writeFile(networkSummaryPath, `${JSON.stringify(input.networkSummary, null, 2)}\n`);
  await writeFile(testResultPath, `${JSON.stringify({
    case_id: input.caseId,
    run_id: input.testRunId,
    title: input.title,
    project: input.project,
    status: input.status,
    started_at: input.startedAt,
    ended_at: input.endedAt,
    business_run_ids: [...new Set(input.businessRunIds)],
    request_ids: [...new Set(input.requestIds)],
    rule_ids: ruleIds,
    errors: input.errors,
  }, null, 2)}\n`);

  const entries = [];
  let evidenceNumber = 0;
  const addEvidence = async (filePath, kind, notes = null) => {
    const bytes = await readFile(filePath);
    evidenceNumber += 1;
    entries.push({
      evidence_id: `${input.testRunId}-e${String(evidenceNumber).padStart(3, "0")}`,
      run_id: input.testRunId,
      case_id: input.caseId,
      kind,
      producer: input.executorVersion,
      captured_at: capturedAt,
      path: toRelativePath(rootDir, filePath),
      sha256: createHash("sha256").update(bytes).digest("hex"),
      redaction_status: "synthetic_only",
      classification: "public_synthetic",
      rule_ids: ruleIds,
      notes,
    });
  };

  await addEvidence(networkSummaryPath, "network_summary", "Local synthetic HTTP requests and response correlation IDs observed during this Playwright test.");
  await addEvidence(testResultPath, "test_result", "Actual Playwright Test result, business run IDs, request IDs and assertion errors.");

  for (const [index, attachment] of input.attachments.entries()) {
    const kind = evidenceKind(attachment);
    let filePath;
    if (attachment.body) {
      const directory = kind === "oracle_response" ? oracleDirectory : attachmentDirectory;
      const extension = extname(attachment.name) || (attachment.contentType === "application/json" ? ".json" : ".bin");
      filePath = join(directory, `${String(index + 1).padStart(3, "0")}-${safeName(attachment.name)}${extension}`);
      await writeFile(filePath, attachment.body);
    } else if (attachment.path) {
      const sourcePath = resolve(rootDir, attachment.path);
      const relativePath = relative(rootDir, sourcePath);
      if (relativePath === ".." || relativePath.startsWith(`..${sep}`) || relativePath.startsWith(sep)) continue;
      const directory = kind === "oracle_response" ? oracleDirectory : attachmentDirectory;
      const extension = extname(attachment.name) || extname(sourcePath) || (attachment.contentType === "application/json" ? ".json" : ".bin");
      filePath = join(directory, `${String(index + 1).padStart(3, "0")}-${safeName(attachment.name)}${extension}`);
      await copyFile(sourcePath, filePath);
    } else {
      continue;
    }
    await addEvidence(filePath, kind, attachment.name);
  }

  const manifest = {
    run_id: input.testRunId,
    case_id: input.caseId,
    track: "A",
    seed_id: input.seedId,
    contract_version: input.contractVersion,
    app_commit: input.appCommit,
    browser: input.browser,
    executor_version: input.executorVersion,
    started_at: input.startedAt,
    ended_at: input.endedAt,
    environment: "isolated_local_demo",
    status: input.status,
    model_version: null,
    authorization_ref: null,
    budget: null,
    evidence_index: toRelativePath(rootDir, evidenceIndexPath),
  };
  await writeFile(evidenceIndexPath, `${JSON.stringify(entries, null, 2)}\n`);
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  return { directory: outputDirectory, manifestPath, evidenceIndexPath, testResultPath, networkSummaryPath, manifest, evidenceIndex: entries };
}

export function createTestRunId(caseId) {
  return `${caseId}-pw-${randomUUID()}`;
}
