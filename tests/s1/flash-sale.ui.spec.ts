import { expect, test } from "@playwright/test";
import { mkdir } from "node:fs/promises";

test("state overview matches the pre-open design and fits the supported viewports", async ({ page }) => {
  await page.goto("/flash-sale");
  await expect(page.getByRole("heading", { name: "商品秒杀验证台" })).toBeVisible();
  await expect(page.locator("#campaign-status")).toHaveText("活动未开始");
  await expect(page.getByRole("button", { name: "开售后提交测试购买" })).toBeDisabled();
  await expect(page.locator("#stock-available")).toHaveText("100");
  await expect(page.locator("#stock-reserved")).toHaveText("0");
  await expect(page.locator("#stock-sold")).toHaveText("0");
  await expect(page.locator("#stock-pending-release")).toHaveText("0");
  await expect(page.locator("#stock-released")).toHaveText("0");
  await expect(page.locator("#oracle-observed-at")).toBeVisible();

  await mkdir("evidence/s1", { recursive: true });
  for (const viewport of [
    { width: 1487, height: 1058, name: "design-baseline" },
    { width: 1440, height: 900, name: "desktop" },
    { width: 1024, height: 900, name: "tablet-landscape" },
    { width: 768, height: 900, name: "tablet-portrait" },
    { width: 390, height: 844, name: "mobile" },
  ]) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    const widths = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth,
    }));
    expect(widths.content).toBeLessThanOrEqual(widths.viewport);
    await page.screenshot({ path: `evidence/s1/s1-${viewport.name}-pre-open.png`, fullPage: true });
  }
});

test("one local purchase follows the fake clock to the server start boundary", async ({ page }) => {
  await page.goto("/flash-sale");
  const runId = await page.locator("#run-id").textContent();
  expect(runId).toMatch(/^s1-/);

  await page.locator("#advance-clock").click();
  await expect(page.locator("#server-clock")).toContainText("09:59:51");
  await expect(page.getByRole("button", { name: "开售后提交测试购买" })).toBeDisabled();

  const clock = await page.request.post("/api/clock/advance", {
    data: { run_id: runId, seconds: 9 },
  });
  expect(clock.status()).toBe(200);
  await page.reload();
  await expect(page.locator("#campaign-status")).toHaveText("开售中");
  await expect(page.getByRole("button", { name: "提交一次测试购买" })).toBeEnabled();
  await page.getByRole("button", { name: "提交一次测试购买" }).click();
  await expect(page).toHaveURL(/\/flash-sale\/result\?/);
  await expect(page.getByRole("heading", { name: "测试购买成功" })).toBeVisible();
  await expect(page.locator("#result-order-id")).toContainText("s1-order-");
  await expect(page.locator("#result-stock-sold")).toHaveText("1");
  await page.screenshot({ path: "evidence/s1/s1-desktop-purchase-result.png", fullPage: true });
});

test("queue route states its undefined behavior without simulating a queue", async ({ page }) => {
  await page.goto("/queue");
  await expect(page.getByRole("heading", { name: "排队规则尚未定义" })).toBeVisible();
  await expect(page.getByText(/本 Demo 不模拟队列行为/)).toBeVisible();
});
