import { type Page, type Response } from "@playwright/test";
import { expect, test } from "../support/playwright-ui-test.ts";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { ensureEvidenceDirectory, newRunId, resetRun } from "./support.ts";

function sourceCommit(): string {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA;
  const sha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: process.cwd(), encoding: "utf8" }).trim();
  const changes = execFileSync("git", ["status", "--porcelain"], { cwd: process.cwd(), encoding: "utf8" }).trim();
  return changes ? `${sha}+dirty` : sha;
}

test("E1 default run isolation: separate bare pages retain separate C20 state", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "确认订单" })).toBeVisible();
  const firstRunId = new URL(page.url()).searchParams.get("run_id");

  const secondPage = await page.context().newPage();
  await secondPage.goto("/");
  await expect(secondPage.getByRole("heading", { name: "确认订单" })).toBeVisible();
  const secondRunId = new URL(secondPage.url()).searchParams.get("run_id");
  expect(firstRunId).toBeTruthy();
  expect(secondRunId).toBeTruthy();
  expect(secondRunId).not.toBe(firstRunId);

  await page.getByRole("button", { name: "创建沙盒订单" }).click();
  await expect(page.getByRole("heading", { name: "沙盒订单待支付" })).toBeVisible();
  await page.getByRole("button", { name: "模拟支付" }).click();
  await expect(page.getByRole("heading", { name: "沙盒模拟支付完成" })).toBeVisible();

  await expect(secondPage.locator("#coupon-state")).toHaveText("已应用");
  await expect(secondPage.locator("#payable-value")).toHaveText("80.00");
});

async function expectTrackingFloor(page: Page, selector: string): Promise<void> {
  const trackingRatio = await page.locator(selector).evaluate((element) => {
    const style = getComputedStyle(element);
    return Number.parseFloat(style.letterSpacing) / Number.parseFloat(style.fontSize);
  });
  expect(trackingRatio).toBeGreaterThanOrEqual(-0.04);
}

async function expectE1VisualBar(page: Page, panelRadius: string): Promise<void> {
  await expectTrackingFloor(page, "h1");
  await expectTrackingFloor(page, "#payable");
  const panelStyles = await page.locator(".panel").evaluateAll((elements) => elements
    .filter((element) => element.getClientRects().length > 0)
    .map((element) => {
    const style = getComputedStyle(element);
    return { borderRadius: style.borderTopLeftRadius, boxShadow: style.boxShadow };
    }));
  expect(panelStyles).toEqual([
    { borderRadius: panelRadius, boxShadow: "none" },
    { borderRadius: panelRadius, boxShadow: "none" },
  ]);
  await expect(page.locator(".select-arrow svg")).toHaveCount(1);
  await expect(page.locator(".safe-mark")).toHaveText("");
  await expect(page.locator("#payable")).toHaveCSS("font-variant-numeric", "tabular-nums");
}

async function writeE1MismatchEvidence(input: {
  page: Page;
  runId: string;
  startedAt: Date;
  quoteResponse: Response;
  browserQuote: { quote_id: string };
  oracleSnapshot: { quotes: Array<{ quote_id: string; payable_cents: number; discount_cents: number }> };
  oracleQuote: { quote_id: string; payable_cents: number; discount_cents: number };
  uiPayableCents: number;
  uiDiscountCents: number;
}): Promise<void> {
  const { page, runId, startedAt, quoteResponse, browserQuote, oracleSnapshot, oracleQuote, uiPayableCents, uiDiscountCents } = input;
  const relativeDirectory = join("evidence/e1/run-contexts/p3-a", runId);
  const directory = resolve(relativeDirectory);
  await mkdir(directory, { recursive: true });
  await page.screenshot({ path: resolve(directory, "ui.png") });
  const capturedAt = new Date().toISOString();
  const files = [
    { evidence_id: `${runId}-screenshot`, kind: "screenshot", file: "ui.png", notes: "Synthetic localhost checkout UI after selecting the 99-unit basket." },
    { evidence_id: `${runId}-network`, kind: "network_summary", file: "network-summary.json", notes: "Browser quote response correlated by run_id and quote_id." },
    { evidence_id: `${runId}-oracle`, kind: "oracle_response", file: "oracle.json", notes: "Read-only synthetic checkout ledger response for the same run." },
    { evidence_id: `${runId}-observation`, kind: "test_result", file: "observation.json", notes: "UI and Oracle payable/discount comparison." },
  ] as const;
  const observation = {
    case_id: "E1",
    rule_id: "E1-R01",
    run_id: runId,
    quote_id: browserQuote.quote_id,
    observed_at: capturedAt,
    ui: { displayed_payable_cents: uiPayableCents, displayed_discount_cents: uiDiscountCents },
    oracle: { payable_cents: oracleQuote.payable_cents, discount_cents: oracleQuote.discount_cents },
    note: "Run and quote IDs correlate the browser-visible quote with the read-only server Oracle; the demo does not issue a separate request ID.",
  };
  await writeFile(resolve(directory, "network-summary.json"), `${JSON.stringify({
    case_id: "E1",
    run_id: runId,
    quote_id: browserQuote.quote_id,
    http_status: quoteResponse.status(),
    response: browserQuote,
  }, null, 2)}\n`);
  await writeFile(resolve(directory, "oracle.json"), `${JSON.stringify(oracleSnapshot, null, 2)}\n`);
  await writeFile(resolve(directory, "observation.json"), `${JSON.stringify(observation, null, 2)}\n`);
  const evidenceIndex = await Promise.all(files.map(async (file) => {
    const bytes = await readFile(resolve(directory, file.file));
    return {
      evidence_id: file.evidence_id,
      run_id: runId,
      case_id: "E1",
      kind: file.kind,
      producer: "Playwright Test 1.65.1",
      captured_at: capturedAt,
      path: join(relativeDirectory, file.file),
      sha256: createHash("sha256").update(bytes).digest("hex"),
      redaction_status: "synthetic_only",
      classification: "public_synthetic",
      rule_ids: ["E1-R01"],
      notes: file.notes,
    };
  }));
  await writeFile(resolve(directory, "evidence-index.json"), `${JSON.stringify(evidenceIndex, null, 2)}\n`);
  await writeFile(resolve(directory, "manifest.json"), `${JSON.stringify({
    run_id: runId,
    case_id: "E1",
    track: "A",
    seed_id: "e1-threshold",
    contract_version: "1.0-demo",
    app_commit: sourceCommit(),
    browser: `${page.context().browser()?.browserType().name() ?? "unknown"} ${page.context().browser()?.version() ?? "unknown"}`,
    executor_version: "Playwright Test 1.65.1",
    started_at: startedAt.toISOString(),
    ended_at: capturedAt,
    environment: "isolated_local_demo",
    status: "failed",
    model_version: null,
    authorization_ref: null,
    budget: null,
    evidence_index: join(relativeDirectory, "evidence-index.json"),
  }, null, 2)}\n`);
  await writeFile(resolve(directory, "finding.json"), `${JSON.stringify({
    finding_id: `E1-P3A-${runId}`,
    case_id: "E1",
    run_id: runId,
    status: "suspected_issue",
    rule_id: "E1-R01",
    observed_behavior: `The UI displayed ${uiPayableCents} payable cents and ${uiDiscountCents} discount cents while the Oracle recorded ${oracleQuote.payable_cents} payable cents and ${oracleQuote.discount_cents} discount cents.`,
    hypothesis: "The checkout UI may render an amount that differs from its authoritative quote.",
    evidence_ids: files.map((file) => file.evidence_id),
    oracle_evidence_id: `${runId}-oracle`,
    reproduction: {
      independent_runs: 0,
      successful_reproductions: 0,
      steps: [
        "Reset a fresh E1 run using the approved e1-threshold seed.",
        "Open the checkout UI and select synthetic SKU E1-99.",
        "Compare the displayed payable and discount with the read-only quote ledger using the same run_id and quote_id.",
      ],
    },
    human_review: {
      status: "pending",
      reviewer: null,
      approved_at: null,
      notes: "This is a controlled synthetic sensitivity run; do not treat it as a production defect.",
    },
  }, null, 2)}\n`);
}

test("E1-R01/R04: checkout shows the 100 threshold and simulates payment", async ({ page, trackedRequest: request }, testInfo) => {
  const runId = newRunId();
  await resetRun(request, runId);
  await ensureEvidenceDirectory();
  const prototype = await readFile(resolve("demos/ecommerce-checkout/prototype/index.html"), "utf8");
  await page.setContent(prototype);
  await expectE1VisualBar(page, "16px");
  await expect(page.locator("#payable")).toContainText("80.00");
  await expect(page.locator("#coupon-state")).toHaveCSS("color", "rgb(23, 102, 79)");
  const prototypeDesktopTotalFontSize = await page.locator("#payable").evaluate((element) => getComputedStyle(element).fontSize);
  expect(prototypeDesktopTotalFontSize).toBe("30px");
  await page.screenshot({ path: "evidence/e1/e1-prototype-desktop-100.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await expectE1VisualBar(page, "14px");
  const prototypeMobileTotalFontSize = await page.locator("#payable").evaluate((element) => getComputedStyle(element).fontSize);
  expect(prototypeMobileTotalFontSize).toBe("28px");
  await page.screenshot({ path: "evidence/e1/e1-prototype-mobile-100.png", fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`/?run_id=${encodeURIComponent(runId)}`);

  await expectE1VisualBar(page, "16px");
  await expect(page.getByRole("heading", { name: "确认订单" })).toBeVisible();
  await expect(page.getByRole("button", { name: "创建沙盒订单" })).toBeEnabled();
  await expect(page.locator("#payable")).toContainText("80.00");
  await expect(page.locator("#coupon-state")).toHaveCSS("color", "rgb(23, 102, 79)");
  await expect(page.locator("#payable-value")).toHaveCSS("font-size", prototypeDesktopTotalFontSize);
  await page.screenshot({ path: "evidence/e1/e1-implementation-desktop-100.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await expectE1VisualBar(page, "14px");
  await expect(page.locator("#payable-value")).toHaveCSS("font-size", prototypeMobileTotalFontSize);
  await page.screenshot({ path: "evidence/e1/e1-implementation-mobile-100.png", fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByRole("button", { name: "创建沙盒订单" }).click();
  await expect(page.getByRole("heading", { name: "沙盒订单待支付" })).toBeVisible();
  await expect(page.locator("#lifecycle-coupon-status")).toHaveText("已锁定");
  await expect(page.getByRole("button", { name: "模拟支付" })).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: "evidence/e1/e1-r04-pending-desktop.png" });
  await testInfo.attach("e1-r04-pending-desktop.png", { path: "evidence/e1/e1-r04-pending-desktop.png" });
  await page.getByRole("button", { name: "模拟支付" }).click();
  await expect(page.getByRole("heading", { name: "沙盒模拟支付完成" })).toBeVisible();
  await expect(page.locator("#lifecycle-coupon-status")).toHaveText("模拟已使用");
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: "evidence/e1/e1-r04-paid-desktop.png" });
  await testInfo.attach("e1-r04-paid-desktop.png", { path: "evidence/e1/e1-r04-paid-desktop.png" });

  const oracle = await request.get("/__test/oracle/checkout", {
    params: { run_id: runId, seed_id: "e1-threshold", user_id: "user_e1" },
  });
  const oracleBody = await oracle.json();
  expect(oracleBody.orders[0]).toMatchObject({ status: "sandbox_paid", payable_cents: 8_000 });
  expect(oracleBody.coupon).toMatchObject({ status: "sandbox_redeemed" });
});

test("E1-R04: cancellation releases C20 and returns to a fresh quote", async ({ page, trackedRequest: request }, testInfo) => {
  const runId = newRunId();
  await resetRun(request, runId);
  await page.goto(`/?run_id=${encodeURIComponent(runId)}`);
  await expect(page.getByRole("button", { name: "创建沙盒订单" })).toBeEnabled();
  await page.getByRole("button", { name: "创建沙盒订单" }).click();
  await expect(page.getByRole("heading", { name: "沙盒订单待支付" })).toBeVisible();
  await page.getByRole("button", { name: "取消订单" }).click();
  await expect(page.getByRole("heading", { name: "沙盒订单已取消" })).toBeVisible();
  await expect(page.locator("#lifecycle-coupon-status")).toHaveText("已释放");
  await expect(page.locator("#lifecycle-coupon-note")).toContainText("可用于新的沙盒订单");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.scrollTo(0, 0));
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  await page.screenshot({ path: "evidence/e1/e1-r04-cancelled-mobile.png", fullPage: true });
  await testInfo.attach("e1-r04-cancelled-mobile.png", { path: "evidence/e1/e1-r04-cancelled-mobile.png" });

  await page.getByRole("button", { name: "返回结算，创建新的沙盒订单" }).click();
  await expect(page.getByRole("heading", { name: "确认订单" })).toBeVisible();
  await expect(page.locator("#coupon-state")).toHaveText("已应用");
  await expect(page.locator("#payable-value")).toHaveText("80.00");

  await page.getByRole("button", { name: "创建沙盒订单" }).click();
  await expect(page.getByRole("heading", { name: "沙盒订单待支付" })).toBeVisible();
  await expect(page.getByRole("button", { name: "模拟支付" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "取消订单" })).toBeEnabled();
  await page.getByRole("button", { name: "模拟支付" }).click();
  await expect(page.getByRole("heading", { name: "沙盒模拟支付完成" })).toBeVisible();

  const oracle = await request.get("/__test/oracle/checkout", {
    params: { run_id: runId, seed_id: "e1-threshold", user_id: "user_e1" },
  });
  expect(await oracle.json()).toMatchObject({
    coupon: { status: "sandbox_redeemed" },
    orders: [{ status: "cancelled" }, { status: "sandbox_paid", payable_cents: 8_000 }],
  });
});

test("E1-R01: selecting the 99 boundary removes the discount", async ({ page, trackedRequest: request }) => {
  const startedAt = new Date();
  const runId = newRunId();
  await resetRun(request, runId);
  await ensureEvidenceDirectory();
  const prototype = await readFile(resolve("demos/ecommerce-checkout/prototype/index.html"), "utf8");
  await page.setContent(prototype);
  await expectE1VisualBar(page, "16px");
  await page.getByLabel("选择购物车金额").selectOption("99");
  await expect(page.locator("#payable")).toContainText("99.00");
  await expect(page.locator("#coupon-state")).toHaveCSS("color", "rgb(166, 70, 36)");
  const prototypeDesktopTotalFontSize = await page.locator("#payable").evaluate((element) => getComputedStyle(element).fontSize);
  expect(prototypeDesktopTotalFontSize).toBe("30px");
  await page.screenshot({ path: "evidence/e1/e1-prototype-desktop-99.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await expectE1VisualBar(page, "14px");
  const prototypeMobileTotalFontSize = await page.locator("#payable").evaluate((element) => getComputedStyle(element).fontSize);
  expect(prototypeMobileTotalFontSize).toBe("28px");
  await page.screenshot({ path: "evidence/e1/e1-prototype-mobile-99.png", fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`/?run_id=${encodeURIComponent(runId)}`);
  await expectE1VisualBar(page, "16px");
  await expect(page.locator("#payable-value")).toHaveText("80.00");
  const quoteResponsePromise = page.waitForResponse((response) =>
    new URL(response.url()).pathname === "/api/checkout/quote" && response.request().method() === "POST",
  );
  await page.getByLabel("选择购物车金额").selectOption("E1-99");
  const quoteResponse = await quoteResponsePromise;
  expect(quoteResponse.ok()).toBeTruthy();

  await expect(page.locator("#subtotal")).toHaveText("¥99.00");
  await expect(page.locator("#payable-value")).not.toHaveText("80.00");
  const browserQuote = await quoteResponse.json();
  const oracleResponse = await request.get("/__test/oracle/checkout", {
    params: { run_id: runId, seed_id: "e1-threshold", user_id: "user_e1" },
  });
  expect(oracleResponse.ok()).toBeTruthy();
  const oracleSnapshot = await oracleResponse.json();
  const oracleQuote = oracleSnapshot.quotes.find((quote: { quote_id: string }) => quote.quote_id === browserQuote.quote_id);
  expect(oracleQuote).toBeDefined();
  expect(oracleQuote).toMatchObject({ subtotal_cents: 9_900, discount_cents: 0, payable_cents: 9_900 });
  const payableText = (await page.locator("#payable-value").textContent())?.trim() ?? "";
  const discountText = (await page.locator("#discount").textContent()) ?? "";
  const discountAmount = discountText.match(/([0-9]+\.[0-9]{2})/);
  const uiPayableCents = Math.round(Number(payableText) * 100);
  const uiDiscountCents = discountAmount ? Math.round(Number(discountAmount[1]) * 100) : Number.NaN;
  if (uiPayableCents !== oracleQuote.payable_cents || uiDiscountCents !== oracleQuote.discount_cents) {
    await writeE1MismatchEvidence({
      page,
      runId,
      startedAt,
      quoteResponse,
      browserQuote,
      oracleSnapshot,
      oracleQuote,
      uiPayableCents,
      uiDiscountCents,
    });
  }
  expect(uiPayableCents, "E1 UI payable must match the read-only authoritative quote").toBe(oracleQuote.payable_cents);
  expect(uiDiscountCents, "E1 UI discount must match the read-only authoritative quote").toBe(oracleQuote.discount_cents);
  await expect(page.locator("#discount")).toHaveText("− ¥0.00");
  await expect(page.locator("#coupon-state")).toHaveCSS("color", "rgb(166, 70, 36)");
  await expect(page.locator("#payable")).toContainText("99.00");
  await expect(page.locator("#payable-value")).toHaveCSS("font-size", prototypeDesktopTotalFontSize);
  await expect(page.getByText("还差 ¥1.00 可使用")).toBeVisible();
  await page.screenshot({ path: "evidence/e1/e1-implementation-desktop-99.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await expectE1VisualBar(page, "14px");
  await expect(page.locator("#payable-value")).toHaveCSS("font-size", prototypeMobileTotalFontSize);
  await page.screenshot({ path: "evidence/e1/e1-implementation-mobile-99.png", fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
});
