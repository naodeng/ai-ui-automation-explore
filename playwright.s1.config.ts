import { defineConfig, devices } from "@playwright/test";

const baseURL = "http://127.0.0.1:4181";

export default defineConfig({
  testDir: "./tests/s1",
  outputDir: "test-results/s1",
  fullyParallel: true,
  retries: 0,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report/s1" }], ["./tests/support/playwright-evidence-reporter.mjs"]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "api", testMatch: "**/*.api.spec.ts" },
    {
      name: "ui",
      testMatch: "**/*.ui.spec.ts",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 1058 } },
    },
  ],
  webServer: {
    command: "npm run dev:s1",
    url: baseURL + "/health",
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
