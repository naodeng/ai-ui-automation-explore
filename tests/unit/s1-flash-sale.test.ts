import assert from "node:assert/strict";
import test from "node:test";
import {
  advanceFlashSaleClock,
  createFlashSaleRun,
  flashSaleStockTotal,
  submitFlashSalePurchase,
  type S1SeedEntry,
} from "../../demos/flash-sale/src/flash-sale.ts";

const seed: S1SeedEntry = {
  case_id: "S1",
  seed_id: "s1-100-stock",
  clock_epoch: "2026-11-23T09:59:50Z",
  synthetic_users: ["user_s1_001"],
  initial_conditions: {
    stock: 100,
    per_user_limit: 1,
    sale_start: "2026-11-23T10:00:00Z",
    orders: 0,
  },
};

function createRun(runId: string) {
  return createFlashSaleRun(seed, runId);
}

test("S1-R01: a purchase before the server start time leaves the run unchanged", () => {
  const run = createRun("s1-before-open");
  const before = structuredClone(run.stock_buckets);

  const result = submitFlashSalePurchase(run, "user_s1_001", "request-before-open");

  assert.equal(result.kind, "rejected");
  assert.equal(result.code, "campaign_not_started");
  assert.match(result.request_id, /^s1-request-/);
  assert.deepEqual(run.stock_buckets, before);
  assert.equal(run.orders.length, 0);
  assert.equal(run.movements.length, 0);
});

test("S1-R02: one successful sandbox purchase preserves all stock buckets", () => {
  const run = createRun("s1-stock-conservation");
  advanceFlashSaleClock(run, 10);

  const result = submitFlashSalePurchase(run, "user_s1_001", "request-stock-1");

  assert.equal(result.kind, "created");
  assert.deepEqual(run.stock_buckets, {
    available: 99,
    reserved: 0,
    sold: 1,
    pending_release: 0,
    released: 0,
  });
  assert.equal(flashSaleStockTotal(run.stock_buckets), run.initial_stock);
  assert.equal(run.movements.length, 1);
  assert.equal(result.kind === "created" ? result.order.order_id : "", run.movements[0].order_id);
  assert.equal(result.kind === "created" ? result.request_id : "", run.movements[0].request_id);
  assert.equal(run.movements[0].from_bucket, "available");
  assert.equal(run.movements[0].to_bucket, "sold");
  assert.equal(run.movements[0].quantity, 1);
});

test("S1-R03: a synthetic user cannot make a second effective successful purchase", () => {
  const run = createRun("s1-user-limit");
  advanceFlashSaleClock(run, 10);
  const first = submitFlashSalePurchase(run, "user_s1_001", "request-user-1");

  const second = submitFlashSalePurchase(run, "user_s1_001", "request-user-2");

  assert.equal(first.kind, "created");
  assert.equal(second.kind, "rejected");
  assert.equal(second.code, "user_purchase_limit_reached");
  assert.equal(run.orders.length, 1);
  assert.equal(run.stock_buckets.sold, 1);
  assert.equal(flashSaleStockTotal(run.stock_buckets), run.initial_stock);
});

test("S1-R04: replaying the same idempotency key returns one order and one movement", () => {
  const run = createRun("s1-idempotency");
  advanceFlashSaleClock(run, 10);
  const first = submitFlashSalePurchase(run, "user_s1_001", "same-request-key");

  const replay = submitFlashSalePurchase(run, "user_s1_001", "same-request-key");

  assert.equal(first.kind, "created");
  assert.equal(replay.kind, "replayed");
  assert.equal(first.order.order_id, replay.order.order_id);
  assert.equal(run.orders.length, 1);
  assert.equal(run.movements.length, 1);
  assert.notEqual(first.request_id, replay.request_id);
  assert.equal(flashSaleStockTotal(run.stock_buckets), run.initial_stock);
});

test("S1 Runs isolate their clocks, orders and stock buckets", () => {
  const firstRun = createRun("s1-isolated-a");
  const secondRun = createRun("s1-isolated-b");
  advanceFlashSaleClock(firstRun, 10);
  submitFlashSalePurchase(firstRun, "user_s1_001", "request-isolated-a");

  assert.notEqual(firstRun.run_id, secondRun.run_id);
  assert.equal(firstRun.stock_buckets.sold, 1);
  assert.equal(secondRun.stock_buckets.sold, 0);
  assert.equal(secondRun.stock_buckets.available, 100);
  assert.equal(secondRun.simulated_at_ms, secondRun.clock_epoch_ms);
  assert.equal(secondRun.orders.length, 0);
  assert.equal(secondRun.movements.length, 0);
});
