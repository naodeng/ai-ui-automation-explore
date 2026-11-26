import { expect, test } from "../support/playwright-api-test.ts";
import { newRunId, resetRun } from "./support.ts";

test("E1 default run isolation: cart API rejects requests without a run_id", async ({ trackedRequest: request }) => {
  const response = await request.get("/api/cart");
  expect(response.status()).toBe(400);
  expect(await response.json()).toMatchObject({ error: "invalid_run_id" });
});

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

test("E1-R04: payment reserves then consumes C20 exactly once", async ({ trackedRequest: request }) => {
  const runId = newRunId();
  await resetRun(request, runId);
  const quoteResponse = await request.post("/api/checkout/quote", {
    data: { run_id: runId, coupon_code: "C20" },
  });
  const quote = await quoteResponse.json();
  const orderResponse = await request.post("/api/orders", {
    data: { run_id: runId, quote_id: quote.quote_id, idempotency_key: "r04-pay-once" },
  });
  const order = await orderResponse.json();
  expect(orderResponse.status()).toBe(201);
  expect(order).toMatchObject({ status: "sandbox_created", payable_cents: 8_000 });

  const repeatedCreate = await request.post("/api/orders", {
    data: { run_id: runId, quote_id: quote.quote_id, idempotency_key: "r04-pay-once" },
  });
  expect(repeatedCreate.status()).toBe(200);
  expect((await repeatedCreate.json()).order_id).toBe(order.order_id);

  const payPath = `/api/orders/${order.order_id}/simulate-payment`;
  const paidResponse = await request.post(payPath, { data: { run_id: runId } });
  const repeatedPayment = await request.post(payPath, { data: { run_id: runId } });
  expect(paidResponse.status()).toBe(200);
  expect(repeatedPayment.status()).toBe(200);
  expect((await paidResponse.json()).status).toBe("sandbox_paid");
  expect((await repeatedPayment.json()).status).toBe("sandbox_paid");

  const oracleResponse = await request.get("/__test/oracle/checkout", {
    params: { run_id: runId, seed_id: "e1-threshold", user_id: "user_e1" },
  });
  const oracle = await oracleResponse.json();
  expect(oracle.coupon).toMatchObject({ status: "sandbox_redeemed", reserved_order_id: null });
  expect(oracle.orders).toMatchObject([{ order_id: order.order_id, status: "sandbox_paid" }]);
  expect(oracle.coupon_ledger.map((event: { event_type: string }) => event.event_type)).toEqual([
    "discount_applied_to_quote",
    "reserved_for_sandbox_order",
    "sandbox_redeemed_after_payment",
  ]);

  const afterPaymentQuoteResponse = await request.post("/api/checkout/quote", {
    data: { run_id: runId, coupon_code: "C20" },
  });
  const afterPaymentQuote = await afterPaymentQuoteResponse.json();
  expect(afterPaymentQuote).toMatchObject({ coupon_status: "sandbox_redeemed", discount_cents: 0, payable_cents: 10_000 });

  const cancelAfterPayment = await request.post(`/api/orders/${order.order_id}/cancel`, { data: { run_id: runId } });
  expect(cancelAfterPayment.status()).toBe(409);
  expect((await cancelAfterPayment.json()).error).toBe("invalid_order_transition");
});

test("E1-R04: cancellation releases C20 for a later sandbox order and blocks payment", async ({ trackedRequest: request }) => {
  const runId = newRunId();
  await resetRun(request, runId);
  const quoteResponse = await request.post("/api/checkout/quote", {
    data: { run_id: runId, coupon_code: "C20" },
  });
  const quote = await quoteResponse.json();
  const orderResponse = await request.post("/api/orders", {
    data: { run_id: runId, quote_id: quote.quote_id, idempotency_key: "r04-cancel-once" },
  });
  const order = await orderResponse.json();

  const cancelPath = `/api/orders/${order.order_id}/cancel`;
  const cancelled = await request.post(cancelPath, { data: { run_id: runId } });
  const repeatedCancellation = await request.post(cancelPath, { data: { run_id: runId } });
  expect(cancelled.status()).toBe(200);
  expect(repeatedCancellation.status()).toBe(200);
  expect((await cancelled.json()).status).toBe("cancelled");
  expect((await repeatedCancellation.json()).status).toBe("cancelled");

  const paymentAfterCancellation = await request.post(`/api/orders/${order.order_id}/simulate-payment`, {
    data: { run_id: runId },
  });
  expect(paymentAfterCancellation.status()).toBe(409);
  expect((await paymentAfterCancellation.json()).error).toBe("invalid_order_transition");

  const nextQuoteResponse = await request.post("/api/checkout/quote", {
    data: { run_id: runId, coupon_code: "C20" },
  });
  const nextQuote = await nextQuoteResponse.json();
  expect(nextQuote.discount_cents).toBe(2_000);
  const nextOrderResponse = await request.post("/api/orders", {
    data: { run_id: runId, quote_id: nextQuote.quote_id, idempotency_key: "r04-reuse-after-release" },
  });
  expect(nextOrderResponse.status()).toBe(201);
  expect((await nextOrderResponse.json()).payable_cents).toBe(8_000);

  const oracleResponse = await request.get("/__test/oracle/checkout", {
    params: { run_id: runId, seed_id: "e1-threshold", user_id: "user_e1" },
  });
  const oracle = await oracleResponse.json();
  expect(oracle.coupon).toMatchObject({ status: "reserved" });
  expect(oracle.coupon_ledger.map((event: { event_type: string }) => event.event_type)).toEqual([
    "discount_applied_to_quote",
    "reserved_for_sandbox_order",
    "released_after_cancellation",
    "discount_applied_to_quote",
    "reserved_for_sandbox_order",
  ]);
});

test("E1-R04: stale discounted quotes cannot reserve an already reserved coupon", async ({ trackedRequest: request }) => {
  const runId = newRunId();
  await resetRun(request, runId);
  const firstQuoteResponse = await request.post("/api/checkout/quote", {
    data: { run_id: runId, coupon_code: "C20" },
  });
  const firstQuote = await firstQuoteResponse.json();
  const staleQuoteResponse = await request.post("/api/checkout/quote", {
    data: { run_id: runId, coupon_code: "C20" },
  });
  const staleQuote = await staleQuoteResponse.json();
  const firstOrderResponse = await request.post("/api/orders", {
    data: { run_id: runId, quote_id: firstQuote.quote_id, idempotency_key: "r04-first-reservation" },
  });
  expect(firstOrderResponse.status()).toBe(201);

  const quoteWhileReservedResponse = await request.post("/api/checkout/quote", {
    data: { run_id: runId, coupon_code: "C20" },
  });
  expect(await quoteWhileReservedResponse.json()).toMatchObject({ coupon_status: "reserved", discount_cents: 0, payable_cents: 10_000 });

  const staleOrderResponse = await request.post("/api/orders", {
    data: { run_id: runId, quote_id: staleQuote.quote_id, idempotency_key: "r04-stale-reservation" },
  });
  expect(staleOrderResponse.status()).toBe(409);
  expect((await staleOrderResponse.json()).error).toBe("coupon_unavailable");

  const oracleResponse = await request.get("/__test/oracle/checkout", {
    params: { run_id: runId, seed_id: "e1-threshold", user_id: "user_e1" },
  });
  const oracle = await oracleResponse.json();
  expect(oracle.orders).toHaveLength(1);
  expect(oracle.coupon_ledger.filter((event: { event_type: string }) => event.event_type === "reserved_for_sandbox_order")).toHaveLength(1);
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
