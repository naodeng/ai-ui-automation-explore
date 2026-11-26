export interface TestEvidenceAttachment {
  name: string;
  contentType: string;
  body?: Uint8Array;
  path?: string;
  kind?: "screenshot" | "browser_trace" | "network_summary" | "oracle_response" | "action_log" | "test_result";
}

export interface TestEvidenceInput {
  rootDir: string;
  caseId: "E1" | "M1" | "S1";
  testRunId: string;
  title: string;
  project: string;
  status: "passed" | "failed" | "blocked" | "incomplete" | "not_run";
  startedAt: string;
  endedAt: string;
  seedId: string;
  contractVersion: string;
  appCommit: string;
  browser: string;
  executorVersion: string;
  businessRunIds: string[];
  requestIds: string[];
  networkSummary: unknown[];
  attachments: TestEvidenceAttachment[];
  errors: string[];
}

export interface TestEvidenceArtifacts {
  directory: string;
  manifestPath: string;
  evidenceIndexPath: string;
  testResultPath: string;
  networkSummaryPath: string;
  manifest: Record<string, unknown>;
  evidenceIndex: Record<string, unknown>[];
}

export function writeTestEvidence(input: TestEvidenceInput): Promise<TestEvidenceArtifacts>;
export function createTestRunId(caseId: TestEvidenceInput["caseId"]): string;
