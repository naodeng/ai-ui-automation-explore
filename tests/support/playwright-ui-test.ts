import { type APIRequestContext } from "@playwright/test";
import { expect, test as evidenceTest } from "./playwright-test.ts";
import { trackedRequest as trackRequest } from "./run-evidence.ts";

type UiEvidenceFixtures = {
  trackedRequest: APIRequestContext;
  p3PageEvidence: void;
};

export const test = evidenceTest.extend<UiEvidenceFixtures>({
  trackedRequest: async ({ request, runEvidence }, use, testInfo) => {
    const baseURL = testInfo.project.use.baseURL;
    if (typeof baseURL !== "string") throw new Error("Playwright project baseURL is required for evidence capture");
    await use(trackRequest(request, runEvidence, baseURL));
  },
  p3PageEvidence: [async ({ context, runEvidence }, use, testInfo) => {
    const baseURL = testInfo.project.use.baseURL;
    if (typeof baseURL !== "string") throw new Error("Playwright project baseURL is required for evidence capture");
    runEvidence.setBrowserContext(context);
    const capturePage = (page: import("@playwright/test").Page) => {
      page.on("response", (response) => runEvidence.capturePageResponse(response, baseURL));
    };
    context.on("page", capturePage);
    for (const page of context.pages()) capturePage(page);
    await use();
    context.off("page", capturePage);
  }, { auto: true }],
});

export { expect };
