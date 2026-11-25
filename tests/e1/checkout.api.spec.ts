import { expect, test } from "../support/playwright-api-test.ts";
import { newRunId, resetRun } from "./support.ts";

test("E1-R01: authoritative quote enforces the 99/100 C20 boundary", async ({ trackedRequest: request }) => {
  const runId = newRunId();
  await resetRun(request, runId);

  const atThreshold = await request.post("/api/checkout/quote", {
    data: { run_id: runId, coupon_code: "C20" },
  });
  expect(atThreshold.status()).toBe(201);
  const quote100 = await atThreshold.json();
  expect(quote100).toMatchObject({
    subtotal_cents: 10_000,
    coupon_code: "C20",
    discount_cents: 2_000,
    payable_cents: 8_000,
  });

  const cart99 = await request.post("/api/cart/select", {
    data: { run_id: runId, sku_id: "E1-99" },
  });
  expect(cart99.status()).toBe(200);
  const belowThreshold = await request.post("/api/checkout/quote", {
    data: { run_id: runId, coupon_code: "C20" },
  });
  expect(belowThreshold.status()).toBe(201);
  const quote99 = await belowThreshold.json();
  expect(quote99).toMatchObject({
    subtotal_cents: 9_900,
    discount_cents: 0,
    payable_cents: 9_900,
  });
});

test("E1-R02/R03: order equals its quote and the same key creates one order", async ({ trackedRequest: request }) => {
  const runId = newRunId();
  await resetRun(request, runId);

  const quoteResponse = await request.post("/api/checkout/quote", {
    data: { run_id: runId, coupon_code: "C20" },
  });
  const quote = await quoteResponse.json();
  const payload = {
    run_id: runId,
    quote_id: quote.quote_id,
    idempotency_key: "e1-order-once",
  };
  const first = await request.post("/api/orders", { data: payload });
  const second = await request.post("/api/orders", { data: payload });
  expect(first.status()).toBe(201);
  expect(second.status()).toBe(200);
  const firstOrder = await first.json();
  const secondOrder = await second.json();
  expect(secondOrder.order_id).toBe(firstOrder.order_id);
  expect(firstOrder.payable_cents).toBe(quote.payable_cents);

  const oracleResponse = await request.get("/__test/oracle/checkout", {
    params: {
      run_id: runId,
      seed_id: "e1-threshold",
      user_id: "user_e1",
      quote_id: quote.quote_id,
      order_id: firstOrder.order_id,
    },
  });
  expect(oracleResponse.status()).toBe(200);
  const oracle = await oracleResponse.json();
  expect(oracle.quotes).toHaveLength(1);
  expect(oracle.orders).toHaveLength(1);
  expect(oracle.orders[0].payable_cents).toBe(oracle.quotes[0].payable_cents);
  expect(oracle.orders[0].payable_cents).toBe(8_000);
});

test("reset is deterministic and isolated to its run", async ({ trackedRequest: request }) => {
  const runA = newRunId();
  const runB = newRunId();
  const resetA1 = await resetRun(request, runA);
  const resetB = await resetRun(request, runB);
  const quoteResponse = await request.post("/api/checkout/quote", {
    data: { run_id: runB, coupon_code: "C20" },
  });
  const quote = await quoteResponse.json();
  await request.post("/api/orders", {
    data: { run_id: runB, quote_id: quote.quote_id, idempotency_key: "isolated-order" },
  });
  const resetA2 = await resetRun(request, runA);
  expect(resetA2.state_sha256).toBe(resetA1.state_sha256);
  expect(resetB.state_sha256).toBe(resetA1.state_sha256);

  const oracleB = await request.get("/__test/oracle/checkout", {
    params: { run_id: runB, seed_id: "e1-threshold", user_id: "user_e1" },
  });
  expect((await oracleB.json()).orders).toHaveLength(1);
});

test("reset management requires a control token", async ({ trackedRequest: request }) => {
  const response = await request.post("/__test/reset", {
    data: { case_id: "E1", run_id: newRunId(), seed_id: "e1-threshold" },
  });
  expect(response.status()).toBe(401);
});

test("Oracle fails closed for an unknown run", async ({ trackedRequest: request }) => {
  const response = await request.get("/__test/oracle/checkout", {
    params: { run_id: newRunId(), seed_id: "e1-threshold", user_id: "user_e1" },
  });
  expect(response.status()).toBe(404);
});
