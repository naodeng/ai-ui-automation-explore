import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { ensureEvidenceDirectory, newRunId, resetRun } from "./support.ts";

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
  const panelStyles = await page.locator(".panel").evaluateAll((elements) => elements.map((element) => {
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

test("E1-R01: checkout UI shows the 100 threshold quote", async ({ page, request }) => {
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
  await page.getByRole("button", { name: "创建沙盒订单" }).click();
  await expect(page.getByRole("status")).toContainText("沙盒订单已创建");

  const oracle = await request.get("/__test/oracle/checkout", {
    params: { run_id: runId, seed_id: "e1-threshold", user_id: "user_e1" },
  });
  expect((await oracle.json()).orders[0].payable_cents).toBe(8_000);
});

test("E1-R01: selecting the 99 boundary removes the discount", async ({ page, request }) => {
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
  await page.getByLabel("选择购物车金额").selectOption("E1-99");

  await expect(page.locator("#subtotal")).toHaveText("¥99.00");
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
