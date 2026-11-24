import { expect, test, type APIRequestContext } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const seedId = "s1-100-stock";

async function createRun(request: APIRequestContext) {
  const response = await request.post("/api/runs");
  expect(response.status()).toBe(201);
  return response.json();
}

async function readOracle(request: APIRequestContext, runId: string) {
  return request.get(
    "/__test/oracle/flash-sale?" +
      new URLSearchParams({
        run_id: runId,
        seed_id: seedId,
        campaign_id: "campaign_s1",
        sku_id: "s1-synthetic-item",
      }),
  );
}

test("S1-R01–R04: pre-open denial, one successful purchase, user cap, idempotency and stock Oracle", async ({ request }) => {
  const created = await createRun(request);
  const runId = created.state.run_id as string;
  expect(created.state).toMatchObject({
    case_id: "S1",
    seed_id: seedId,
    user_id: "user_s1_001",
    campaign: { status: "not_started", sale_start_at: "2026-11-23T10:00:00.000Z" },
    stock_buckets: { available: 100, reserved: 0, sold: 0, pending_release: 0, released: 0 },
  });

  const earlyResponse = await request.post("/api/purchase", {
    data: { run_id: runId, user_id: "user_s1_001", idempotency_key: "s1-early-attempt" },
  });
  expect(earlyResponse.status()).toBe(409);
  const earlyAttempt = await earlyResponse.json();
  expect(earlyAttempt).toMatchObject({ error: "campaign_not_started" });
  expect(earlyAttempt.request_id).toMatch(/^s1-request-/);

  const clockResponse = await request.post("/api/clock/advance", {
    data: { run_id: runId, seconds: 10 },
  });
  expect(clockResponse.status()).toBe(200);
  expect((await clockResponse.json()).state.fake_clock.now).toBe("2026-11-23T10:00:00.000Z");

  const purchaseResponse = await request.post("/api/purchase", {
    data: { run_id: runId, user_id: "user_s1_001", idempotency_key: "s1-approved-purchase-1" },
  });
  expect(purchaseResponse.status()).toBe(201);
  const purchase = await purchaseResponse.json();
  expect(purchase).toMatchObject({
    request_id: expect.stringMatching(/^s1-request-/),
    order: { user_id: "user_s1_001", quantity: 1, status: "success" },
    state: { stock_buckets: { available: 99, reserved: 0, sold: 1, pending_release: 0, released: 0 } },
  });

  const replayResponse = await request.post("/api/purchase", {
    data: { run_id: runId, user_id: "user_s1_001", idempotency_key: "s1-approved-purchase-1" },
  });
  expect(replayResponse.status()).toBe(200);
  const replay = await replayResponse.json();
  expect(replay.result).toBe("replayed");
  expect(replay.order.order_id).toBe(purchase.order.order_id);
  expect(replay.request_id).not.toBe(purchase.request_id);
  expect(replay.state.stock_buckets).toEqual(purchase.state.stock_buckets);

  const secondKeyResponse = await request.post("/api/purchase", {
    data: { run_id: runId, user_id: "user_s1_001", idempotency_key: "s1-second-key" },
  });
  expect(secondKeyResponse.status()).toBe(409);
  const secondKey = await secondKeyResponse.json();
  expect(secondKey.error).toBe("user_purchase_limit_reached");

  const oracleResponse = await readOracle(request, runId);
  expect(oracleResponse.status()).toBe(200);
  const oracle = await oracleResponse.json();
  expect(oracle).toMatchObject({
    case_id: "S1",
    run_id: runId,
    seed_id: seedId,
    observed_at: "2026-11-23T10:00:00.000Z",
    stock_buckets: { available: 99, reserved: 0, sold: 1, pending_release: 0, released: 0 },
    orders: [{ order_id: purchase.order.order_id, status: "success", user_id: "user_s1_001", quantity: 1 }],
  });
  expect(oracle.stock_ledger_checksum).toMatch(/^[a-f0-9]{64}$/);
  expect(oracle).not.toHaveProperty("effective_sold_quantity");
  expect(oracle.stock_movements).toHaveLength(1);

  const evidence = {
    case_id: "S1",
    seed_id: seedId,
    run_id: runId,
    contract_version: "1.0-demo",
    fake_clock_epoch: "2026-11-23T09:59:50Z",
    sale_start: "2026-11-23T10:00:00Z",
    observed_at: oracle.observed_at,
    requests: {
      before_start: { request_id: earlyAttempt.request_id, result: earlyAttempt.error },
      purchase: { request_id: purchase.request_id, order_id: purchase.order.order_id, result: "success" },
      idempotent_replay: { request_id: replay.request_id, order_id: replay.order.order_id, result: replay.result },
      second_key: { request_id: secondKey.request_id, result: secondKey.error },
    },
    oracle,
  };
  await mkdir(resolve("evidence/s1/run-contexts"), { recursive: true });
  await writeFile(resolve("evidence/s1/run-contexts/s1-r01-r04-api.json"), JSON.stringify(evidence, null, 2) + "\n");
});

test("FlashSaleOracle fails closed for unknown runs and clock input is bounded", async ({ request }) => {
  const missingRun = await readOracle(request, "s1-run-not-found");
  expect(missingRun.status()).toBe(404);
  expect(await missingRun.json()).toMatchObject({ error: "run_not_found" });

  const created = await createRun(request);
  const invalidClock = await request.post("/api/clock/advance", {
    data: { run_id: created.state.run_id, seconds: 31 },
  });
  expect(invalidClock.status()).toBe(400);
  expect(await invalidClock.json()).toMatchObject({ error: "invalid_clock_advance" });
});
