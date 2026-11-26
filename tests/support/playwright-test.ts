import { test as base, expect } from "@playwright/test";
import { RunEvidenceRecorder } from "./run-evidence.ts";

type EvidenceFixtures = {
  runEvidence: RunEvidenceRecorder;
};

export const test = base.extend<EvidenceFixtures>({
  runEvidence: [async ({}, use, testInfo) => {
    const evidence = new RunEvidenceRecorder();
    await use(evidence);
    await evidence.attach(testInfo);
  }, { auto: true }],
});

export { expect };
