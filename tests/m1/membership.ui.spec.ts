import { expect, test } from "@playwright/test";
import { writeFile } from "node:fs/promises";

test("state overview runs both transitions, replay checks and simulated time", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "会员生命周期验证台" })).toBeVisible();
  await expect(page.locator("#member-id")).toHaveText("user_m1");
  await expect(page.locator("#member-tier")).toHaveText("Gold");
  await expect(page.locator("#event-version")).toHaveText("v5");
  await expect(page.locator("#coupon-status")).toHaveText("Seed 时点有效");
  await page.screenshot({ path: "evidence/m1/m1-implementation-desktop-seed.png", fullPage: true });
  const seedRunId = await page.locator("#footer-run-id").innerText();

  await page.locator('[data-scenario="silver_to_gold"]').click();
  await expect(page.locator("#member-tier")).toHaveText("Gold");
  await expect(page.locator("#event-version")).toHaveText("v6");
  await expect(page.locator("#oracle-tier")).toHaveText("Gold");
  await expect(page.locator("#footer-clock")).toContainText("10:00:00 UTC");
  await expect(page.locator("#oracle-observed-at")).toContainText("2026-11-23T10:00:00.000Z");
  await expect(page.locator("#oracle-authorization")).toHaveText("允许 · 合成观察");
  await expect(page.locator("#check-r01")).toContainText("允许");
  await expect(page.locator("#check-r05")).toHaveText("本地观察：0 个模拟秒（即时同步）");
  await page.screenshot({ path: "evidence/m1/m1-implementation-desktop-upgrade.png", fullPage: true });
  const upgradeRunId = await page.locator("#footer-run-id").innerText();

  await page.getByRole("button", { name: "重置合成夹具" }).click();
  await expect(page.locator("#event-version")).toHaveText("v5");
  await expect(page.locator("#check-r05")).toHaveText("待运行");
  await page.locator('[data-scenario="gold_to_silver"]').click();
  await expect(page.locator("#member-tier")).toHaveText("Silver");
  await expect(page.locator("#old-session")).toHaveText("可用");
  await expect(page.locator("#oracle-tier")).toHaveText("Silver");
  await expect(page.locator("#footer-clock")).toContainText("10:00:00 UTC");
  await expect(page.locator("#oracle-observed-at")).toContainText("2026-11-23T10:00:00.000Z");
  await expect(page.locator("#oracle-authorization")).toHaveText("拒绝 · 合成观察");
  await expect(page.locator("#check-r02")).toContainText("拒绝");
  await page.locator("#replay-duplicate").click();
  await expect(page.locator("#check-r04")).toContainText("状态未变");
  await page.locator("#replay-older").click();
  await expect(page.locator("#check-r04")).toContainText("状态未变");
  await page.locator("#advance-clock").click();
  await expect(page.locator("#footer-clock")).toContainText("10:00:30");
  await expect(page.locator("#check-r05")).toHaveText("本地观察：0 个模拟秒（即时同步）");
  await expect(page.locator("#coupon-status")).toHaveText("有效性待核实（过期时间未定义）");
  await expect(page.locator("#check-r03")).toHaveText("无法判定：过期时间未定义");
  await page.screenshot({ path: "evidence/m1/m1-implementation-desktop-downgrade.png", fullPage: true });
  const downgradeRunId = await page.locator("#footer-run-id").innerText();
  await writeFile(
    "evidence/m1/m1-run-record.json",
    JSON.stringify(
      {
        case_id: "M1",
        seed_id: "m1-gold-to-silver",
        fake_clock_epoch: "2026-11-23T10:00:00Z",
        captured_at: new Date().toISOString(),
        runs: [
          { scenario: "seed", run_id: seedRunId, tier: "gold", event_version: 5, coupon_status: "valid_at_seed" },
          { scenario: "silver_to_gold", run_id: upgradeRunId, tier: "gold", event_version: 6, authorization: "allowed" },
          {
            scenario: "gold_to_silver",
            run_id: downgradeRunId,
            tier: "silver",
            event_version: 6,
            old_session: "available",
            authorization: "denied",
            fake_clock_after_advance: "2026-11-23T10:00:30.000Z",
            coupon_status_after_advance: "not_evaluated",
          },
        ],
      },
      null,
      2,
    ) + "\n",
  );
});

test("state overview fits a 390px mobile viewport without horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "会员生命周期验证台" })).toBeVisible();
  await expect(page.locator("#member-tier")).toHaveText("Gold");
  const widths = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(widths.content).toBeLessThanOrEqual(widths.viewport);
  await page.screenshot({ path: "evidence/m1/m1-implementation-mobile-seed.png", fullPage: true });
});

test("state overview stays readable at 1024px and 768px", async ({ page }) => {
  await page.goto("/");
  for (const viewport of [{ width: 1024, height: 900 }, { width: 768, height: 900 }]) {
    await page.setViewportSize(viewport);
    await expect(page.locator("#member-tier")).toHaveText("Gold");
    const widths = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth,
    }));
    expect(widths.content).toBeLessThanOrEqual(widths.viewport);
    const filename = viewport.width === 1024
      ? "evidence/m1/m1-implementation-1024-seed.png"
      : "evidence/m1/m1-implementation-768-seed.png";
    await page.screenshot({ path: filename, fullPage: true });
  }
});
