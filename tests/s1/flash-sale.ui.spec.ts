import { expect, test } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

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

test("S1-R02: serial purchases exhaust stock, reject the next request, and show sold out", async ({ page }) => {
  await page.goto("/flash-sale");
  const runId = await page.locator("#run-id").textContent();
  expect(runId).toMatch(/^s1-/);

  const clock = await page.request.post("/api/clock/advance", {
    data: { run_id: runId, seconds: 10 },
  });
  expect(clock.status()).toBe(200);

  const acceptedPurchases: Array<{ request_id: string; order_id: string; user_id: string }> = [];
  for (let index = 2; index <= 101; index += 1) {
    const userId = `user_s1_${String(index).padStart(3, "0")}`;
    const response = await page.request.post("/api/purchase", {
      data: { run_id: runId, user_id: userId, idempotency_key: `s1-serial-stock-${index}` },
    });
    expect(response.status(), `serial purchase ${index}`).toBe(201);
    const result = await response.json();
    acceptedPurchases.push({
      request_id: result.request_id,
      order_id: result.order.order_id,
      user_id: userId,
    });
  }

  const lastUserAttempt = await page.request.post("/api/purchase", {
    data: { run_id: runId, user_id: "user_s1_102", idempotency_key: "s1-serial-stock-102" },
  });
  expect(lastUserAttempt.status()).toBe(409);
  const rejection = await lastUserAttempt.json();
  expect(rejection).toMatchObject({ error: "sold_out" });

  const oracleResponse = await page.request.get(
    "/__test/oracle/flash-sale?" +
      new URLSearchParams({
        run_id: runId!,
        seed_id: "s1-100-stock",
        campaign_id: "campaign_s1",
        sku_id: "s1-synthetic-item",
      }),
  );
  expect(oracleResponse.status()).toBe(200);
  const oracle = await oracleResponse.json();
  expect(oracle).toMatchObject({
    campaign: { status: "sold_out" },
    stock_buckets: { available: 0, reserved: 0, sold: 100, pending_release: 0, released: 0 },
  });
  expect(oracle.orders).toHaveLength(100);
  expect(oracle.stock_movements).toHaveLength(100);
  expect(oracle.stock_ledger_checksum).toMatch(/^[a-f0-9]{64}$/);

  await page.goto(`/flash-sale?run_id=${encodeURIComponent(runId!)}`);
  await expect(page.locator("#campaign-status")).toHaveText("已售罄");
  await expect(page.locator("#stock-available")).toHaveText("0");
  await expect(page.locator("#stock-sold")).toHaveText("100");
  await expect(page.locator("#oracle-order-count")).toHaveText("100");
  await expect(page.locator("#oracle-movement-count")).toHaveText("100");
  await expect(page.getByRole("button", { name: "测试库存已售罄" })).toBeDisabled();
  await page.screenshot({ path: "evidence/s1/s1-desktop-sold-out.png", fullPage: true });

  const evidenceDirectory = resolve("evidence/s1/run-contexts");
  await mkdir(evidenceDirectory, { recursive: true });
  await writeFile(
    resolve(evidenceDirectory, "s1-r02-serial-stockout.json"),
    JSON.stringify(
      {
        case_id: "S1",
        rule_id: "S1-R02",
        test_mode: "serial_functional_no_concurrency",
        seed_id: "s1-100-stock",
        run_id: runId,
        initial_stock: 100,
        observed_at: oracle.observed_at,
        successful_purchases: acceptedPurchases,
        rejected_last_user_attempt: { request_id: rejection.request_id, error: rejection.error },
        oracle,
      },
      null,
      2,
    ) + "\n",
  );
});

test("queue route states its undefined behavior without simulating a queue", async ({ page }) => {
  await page.goto("/queue");
  await expect(page.getByRole("heading", { name: "排队规则尚未定义" })).toBeVisible();
  await expect(page.getByText(/本 Demo 不模拟队列行为/)).toBeVisible();
});
