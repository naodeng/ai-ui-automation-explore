import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import test from "node:test";

test("P3-A writes a schema-shaped manifest and hashed Oracle evidence for each test", async () => {
  const { writeTestEvidence } = await import("../../scripts/playwright-evidence.mjs");
  const rootDir = await mkdtemp(join(tmpdir(), "p3-evidence-"));
  const screenshotPath = join(rootDir, "screenshot.png");
  const oracleBody = Buffer.from('{"run_id":"e1-run-1","quotes":[]}\n');
  await writeFile(screenshotPath, Buffer.from("synthetic screenshot"));

  try {
    const artifacts = await writeTestEvidence({
      rootDir,
      caseId: "E1",
      testRunId: "E1-pw-0001",
      title: "E1-R01/R02: authoritative quote boundary",
      project: "api",
      status: "failed",
      startedAt: "2026-11-25T01:00:00.000Z",
      endedAt: "2026-11-25T01:00:01.250Z",
      seedId: "e1-threshold",
      contractVersion: "1.0-demo",
      appCommit: "abc1234",
      browser: "API-only (no browser launched)",
      executorVersion: "Playwright Test 1.65.1",
      businessRunIds: ["e1-run-1"],
      requestIds: ["e1-request-1"],
      networkSummary: [{ method: "POST", path: "/api/checkout/quote", status: 201, request_ids: ["e1-request-1"] }],
      attachments: [
        { name: "p3-oracle-001", contentType: "application/json", body: oracleBody, kind: "oracle_response" },
        { name: "screenshot", contentType: "image/png", path: screenshotPath },
      ],
      errors: ["synthetic assertion mismatch"],
    });

    const manifest = JSON.parse(await readFile(artifacts.manifestPath, "utf8"));
    const index = JSON.parse(await readFile(artifacts.evidenceIndexPath, "utf8"));
    const result = JSON.parse(await readFile(artifacts.testResultPath, "utf8"));
    const oracleEntry = index.find((entry: { kind: string }) => entry.kind === "oracle_response");
    const screenshotEntry = index.find((entry: { kind: string }) => entry.kind === "screenshot");
    const oracleBytes = await readFile(resolve(rootDir, oracleEntry.path));

    assert.equal(manifest.run_id, "E1-pw-0001");
    assert.equal(manifest.case_id, "E1");
    assert.equal(manifest.status, "failed");
    assert.equal(manifest.evidence_index, relative(rootDir, artifacts.evidenceIndexPath).replaceAll("\\", "/"));
    assert.equal(result.business_run_ids[0], "e1-run-1");
    assert.deepEqual(result.request_ids, ["e1-request-1"]);
    assert.equal(oracleEntry.run_id, "E1-pw-0001");
    assert.equal(oracleEntry.sha256, createHash("sha256").update(oracleBytes).digest("hex"));
    assert.ok(screenshotEntry);
    const storedScreenshotPath = resolve(rootDir, screenshotEntry.path);
    assert.notEqual(storedScreenshotPath, screenshotPath);
    assert.match(screenshotEntry.path, /^test-results\/p3-evidence\/E1\/E1-pw-0001\/attachments\//);
    await writeFile(screenshotPath, Buffer.from("replacement screenshot"));
    const storedScreenshot = await readFile(storedScreenshotPath);
    assert.equal(storedScreenshot.toString(), "synthetic screenshot");
    assert.equal(screenshotEntry.sha256, createHash("sha256").update(storedScreenshot).digest("hex"));
    assert.deepEqual(index[0].rule_ids, ["E1-R01", "E1-R02"]);
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
});

test("P3-A reporter finds the repository root from a case test directory", async () => {
  const reporterPath = "../../tests/support/" + "playwright-evidence-reporter.mjs";
  const { findRepositoryRoot } = await import(reporterPath);
  assert.equal(findRepositoryRoot(resolve("tests/e1")), process.cwd());
});
