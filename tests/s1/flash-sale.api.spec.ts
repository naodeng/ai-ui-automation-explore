import { type APIRequestContext } from "@playwright/test";
import { expect, test } from "../support/playwright-api-test.ts";
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

test("S1-R01–R04: pre-open denial, one successful purchase, user cap, idempotency and stock Oracle", async ({ trackedRequest: request }) => {
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
    order: {
      user_id: "user_s1_001",
      quantity: 1,
      status: "reserved",
      reservation_expires_at: "2026-11-23T10:00:30.000Z",
    },
    state: { stock_buckets: { available: 99, reserved: 1, sold: 0, pending_release: 0, released: 0 } },
  });

  const completeResponse = await request.post(`/api/orders/${purchase.order.order_id}/simulate-complete`, {
    data: { run_id: runId },
  });
  expect(completeResponse.status()).toBe(200);
  const completed = await completeResponse.json();
  expect(completed.order.status).toBe("success");
  expect(completed.state.stock_buckets).toEqual({
    available: 99,
    reserved: 0,
    sold: 1,
    pending_release: 0,
    released: 0,
  });

  const replayResponse = await request.post("/api/purchase", {
    data: { run_id: runId, user_id: "user_s1_001", idempotency_key: "s1-approved-purchase-1" },
  });
  expect(replayResponse.status()).toBe(200);
  const replay = await replayResponse.json();
  expect(replay.result).toBe("replayed");
  expect(replay.order.order_id).toBe(purchase.order.order_id);
  expect(replay.order.status).toBe("success");
  expect(replay.request_id).not.toBe(purchase.request_id);
  expect(replay.state.stock_buckets).toEqual(completed.state.stock_buckets);

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
  expect(oracle.stock_movements).toHaveLength(2);

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
      reservation: { request_id: purchase.request_id, order_id: purchase.order.order_id, result: "reserved" },
      completion: { request_id: completed.request_id, order_id: completed.order.order_id, result: "success" },
      idempotent_replay: { request_id: replay.request_id, order_id: replay.order.order_id, result: replay.result },
      second_key: { request_id: secondKey.request_id, result: secondKey.error },
    },
    oracle,
  };
  await mkdir(resolve("evidence/s1/run-contexts"), { recursive: true });
  await writeFile(resolve("evidence/s1/run-contexts/s1-r01-r04-api.json"), JSON.stringify(evidence, null, 2) + "\n");
});

test("S1-R05: cancellation releases stock once and allows a new reservation", async ({ trackedRequest: request }) => {
  const created = await createRun(request);
  const runId = created.state.run_id as string;
  await request.post("/api/clock/advance", { data: { run_id: runId, seconds: 10 } });
  const reservationResponse = await request.post("/api/purchase", {
    data: { run_id: runId, user_id: "user_s1_001", idempotency_key: "s1-r05-cancel-1" },
  });
  expect(reservationResponse.status()).toBe(201);
  const reservation = await reservationResponse.json();

  const cancelPath = `/api/orders/${reservation.order.order_id}/cancel`;
  const cancelledResponse = await request.post(cancelPath, { data: { run_id: runId } });
  expect(cancelledResponse.status()).toBe(200);
  const cancelled = await cancelledResponse.json();
  expect(cancelled.order.status).toBe("cancelled");
  expect(cancelled.state.stock_buckets).toEqual({
    available: 100,
    reserved: 0,
    sold: 0,
    pending_release: 0,
    released: 0,
  });
  expect(cancelled.state.stock_movements).toHaveLength(3);
  expect(cancelled.state.stock_movements.slice(1).map((movement: { from_bucket: string; to_bucket: string }) => [
    movement.from_bucket,
    movement.to_bucket,
  ])).toEqual([["reserved", "released"], ["released", "available"]]);

  const repeatedCancel = await request.post(cancelPath, { data: { run_id: runId } });
  expect(repeatedCancel.status()).toBe(200);
  const repeatedCancelBody = await repeatedCancel.json();
  expect(repeatedCancelBody.order.status).toBe("cancelled");
  expect(repeatedCancelBody.state.stock_movements).toHaveLength(3);

  const completionAfterCancel = await request.post(`/api/orders/${reservation.order.order_id}/simulate-complete`, {
    data: { run_id: runId },
  });
  expect(completionAfterCancel.status()).toBe(409);
  expect(await completionAfterCancel.json()).toMatchObject({ error: "invalid_order_transition" });

  const nextReservation = await request.post("/api/purchase", {
    data: { run_id: runId, user_id: "user_s1_001", idempotency_key: "s1-r05-cancel-2" },
  });
  expect(nextReservation.status()).toBe(201);
  const nextOrder = (await nextReservation.json()).order;
  const completedResponse = await request.post(`/api/orders/${nextOrder.order_id}/simulate-complete`, {
    data: { run_id: runId },
  });
  expect(completedResponse.status()).toBe(200);
  expect((await completedResponse.json()).order.status).toBe("success");

  const duplicateCompletion = await request.post(`/api/orders/${nextOrder.order_id}/simulate-complete`, {
    data: { run_id: runId },
  });
  expect(duplicateCompletion.status()).toBe(200);
  expect((await duplicateCompletion.json()).result).toBe("replayed");
  expect((await duplicateCompletion.json()).state.stock_movements).toHaveLength(5);
});

test("S1-R05: timeout releases at the exact Fake Clock boundary and only once", async ({ trackedRequest: request }) => {
  const created = await createRun(request);
  const runId = created.state.run_id as string;
  await request.post("/api/clock/advance", { data: { run_id: runId, seconds: 10 } });
  const reservationResponse = await request.post("/api/purchase", {
    data: { run_id: runId, user_id: "user_s1_001", idempotency_key: "s1-r05-timeout-1" },
  });
  expect(reservationResponse.status()).toBe(201);
  const reservation = await reservationResponse.json();

  const beforeExpiry = await request.post("/api/clock/advance", { data: { run_id: runId, seconds: 29 } });
  const beforeExpiryBody = await beforeExpiry.json();
  expect(beforeExpiryBody.state.orders[0]).toMatchObject({ status: "reserved" });
  expect(beforeExpiryBody.state.stock_buckets).toMatchObject({ available: 99, reserved: 1, sold: 0 });

  const atExpiry = await request.post("/api/clock/advance", { data: { run_id: runId, seconds: 1 } });
  const expired = await atExpiry.json();
  expect(expired.state.fake_clock.now).toBe("2026-11-23T10:00:30.000Z");
  expect(expired.state.orders[0]).toMatchObject({ status: "expired" });
  expect(expired.state.stock_buckets).toEqual({ available: 100, reserved: 0, sold: 0, pending_release: 0, released: 0 });
  expect(expired.state.stock_movements).toHaveLength(3);

  const afterExpiry = await request.post("/api/clock/advance", { data: { run_id: runId, seconds: 1 } });
  expect((await afterExpiry.json()).state.stock_movements).toHaveLength(3);
  const completionAfterExpiry = await request.post(`/api/orders/${reservation.order.order_id}/simulate-complete`, {
    data: { run_id: runId },
  });
  expect(completionAfterExpiry.status()).toBe(409);
  expect(await completionAfterExpiry.json()).toMatchObject({ error: "invalid_order_transition" });
});

test("S1-R02: bounded concurrent reservations and completions conserve the local synthetic stock", async ({ trackedRequest: request }) => {
  const created = await createRun(request);
  const runId = created.state.run_id as string;
  await request.post("/api/clock/advance", { data: { run_id: runId, seconds: 10 } });

  const attempts = await Promise.all(
    Array.from({ length: 101 }, async (_, index) => {
      const userId = `user_s1_${String(index + 1).padStart(3, "0")}`;
      const response = await request.post("/api/purchase", {
        data: { run_id: runId, user_id: userId, idempotency_key: `s1-concurrent-${index + 1}` },
      });
      return { userId, response, body: await response.json() };
    }),
  );
  const reserved = attempts.filter((attempt) => attempt.response.status() === 201);
  const rejected = attempts.filter((attempt) => attempt.response.status() === 409);
  expect(reserved).toHaveLength(100);
  expect(rejected).toHaveLength(1);
  expect(rejected[0].body).toMatchObject({ error: "sold_out" });

  const beforeCompletion = await readOracle(request, runId);
  expect((await beforeCompletion.json()).stock_buckets).toEqual({
    available: 0,
    reserved: 100,
    sold: 0,
    pending_release: 0,
    released: 0,
  });

  const completions = await Promise.all(
    reserved.map(async (attempt) => {
      const response = await request.post(`/api/orders/${attempt.body.order.order_id}/simulate-complete`, {
        data: { run_id: runId },
      });
      return { response, body: await response.json() };
    }),
  );
  expect(completions.every((completion) => completion.response.status() === 200)).toBe(true);
  expect(completions.every((completion) => completion.body.order.status === "success")).toBe(true);

  const oracleResponse = await readOracle(request, runId);
  expect(oracleResponse.status()).toBe(200);
  const oracle = await oracleResponse.json();
  expect(oracle).toMatchObject({
    campaign: { status: "sold_out" },
    stock_buckets: { available: 0, reserved: 0, sold: 100, pending_release: 0, released: 0 },
  });
  expect(oracle.orders).toHaveLength(100);
  expect(oracle.stock_movements).toHaveLength(200);
  expect(new Set(oracle.orders.map((order: { order_id: string }) => order.order_id)).size).toBe(100);
  expect(oracle.stock_ledger_checksum).toMatch(/^[a-f0-9]{64}$/);

  await mkdir(resolve("evidence/s1/run-contexts"), { recursive: true });
  await writeFile(
    resolve("evidence/s1/run-contexts/s1-r02-concurrent-reservations.json"),
    JSON.stringify(
      {
        case_id: "S1",
        rule_id: "S1-R02",
        test_mode: "bounded_concurrent_http_requests_single_local_node_process",
        seed_id: seedId,
        run_id: runId,
        initial_stock: 100,
        concurrent_reservations: attempts.map((attempt) => ({
          user_id: attempt.userId,
          request_id: attempt.body.request_id,
          order_id: attempt.body.order?.order_id ?? null,
          result: attempt.body.error ?? "reserved",
        })),
        completed_orders: completions.map((completion) => ({
          request_id: completion.body.request_id,
          order_id: completion.body.order.order_id,
          result: completion.body.order.status,
        })),
        oracle,
        limitation: "This is a bounded regression of the single-process in-memory demo, not a production database race or load test.",
      },
      null,
      2,
    ) + "\n",
  );
});

test("FlashSaleOracle fails closed for unknown runs and clock input is bounded", async ({ trackedRequest: request }) => {
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
