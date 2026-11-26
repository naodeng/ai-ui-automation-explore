import { type APIRequestContext } from "@playwright/test";
import { expect, test as evidenceTest } from "./playwright-test.ts";
import { trackedRequest as trackRequest } from "./run-evidence.ts";

type ApiEvidenceFixtures = {
  trackedRequest: APIRequestContext;
};

export const test = evidenceTest.extend<ApiEvidenceFixtures>({
  trackedRequest: async ({ request, runEvidence }, use, testInfo) => {
    const baseURL = testInfo.project.use.baseURL;
    if (typeof baseURL !== "string") throw new Error("Playwright project baseURL is required for evidence capture");
    await use(trackRequest(request, runEvidence, baseURL));
  },
});

export { expect };
