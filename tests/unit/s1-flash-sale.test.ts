import assert from "node:assert/strict";
import test from "node:test";
import {
  advanceFlashSaleClock,
  cancelFlashSaleReservation,
  completeFlashSalePurchase,
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
    reservation_timeout_seconds: 30,
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

test("S1-R02: completing one reservation preserves all stock buckets", () => {
  const run = createRun("s1-stock-conservation");
  advanceFlashSaleClock(run, 10);

  const reservation = submitFlashSalePurchase(run, "user_s1_001", "request-stock-1");
  if (reservation.kind !== "created") throw new Error("Expected the reservation to be created");
  const result = completeFlashSalePurchase(run, reservation.order.order_id);

  assert.equal(result.kind, "updated");
  assert.equal(result.order.status, "success");
  assert.deepEqual(run.stock_buckets, {
    available: 99,
    reserved: 0,
    sold: 1,
    pending_release: 0,
    released: 0,
  });
  assert.equal(flashSaleStockTotal(run.stock_buckets), run.initial_stock);
  assert.equal(run.movements.length, 2);
  assert.equal(result.order.order_id, run.movements[1].order_id);
  assert.equal(result.request_id, run.movements[1].request_id);
  assert.equal(run.movements[1].from_bucket, "reserved");
  assert.equal(run.movements[1].to_bucket, "sold");
  assert.equal(run.movements[1].quantity, 1);
});

test("S1-R03: a synthetic user cannot make a second effective successful purchase", () => {
  const run = createRun("s1-user-limit");
  advanceFlashSaleClock(run, 10);
  const reservation = submitFlashSalePurchase(run, "user_s1_001", "request-user-1");
  if (reservation.kind !== "created") throw new Error("Expected the reservation to be created");
  const first = completeFlashSalePurchase(run, reservation.order.order_id);

  const second = submitFlashSalePurchase(run, "user_s1_001", "request-user-2");

  assert.equal(first.kind, "updated");
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

test("S1-R05: cancelling a reservation returns stock through the release ledger exactly once", () => {
  const run = createRun("s1-cancel-release");
  advanceFlashSaleClock(run, 10);
  const reservation = submitFlashSalePurchase(run, "user_s1_001", "request-cancel-1");
  if (reservation.kind !== "created") throw new Error("Expected the reservation to be created");
  const cancelled = cancelFlashSaleReservation(run, reservation.order.order_id);
  const repeated = cancelFlashSaleReservation(run, reservation.order.order_id);

  assert.equal(cancelled.kind, "updated");
  assert.equal(cancelled.order.status, "cancelled");
  assert.equal(repeated.kind, "replayed");
  assert.deepEqual(run.stock_buckets, {
    available: 100,
    reserved: 0,
    sold: 0,
    pending_release: 0,
    released: 0,
  });
  assert.deepEqual(run.movements.map((movement) => [movement.from_bucket, movement.to_bucket]), [
    ["available", "reserved"],
    ["reserved", "released"],
    ["released", "available"],
  ]);
  assert.equal(flashSaleStockTotal(run.stock_buckets), run.initial_stock);
});

test("S1-R05: a reservation expires at the exact Fake Clock boundary", () => {
  const run = createRun("s1-timeout-release");
  advanceFlashSaleClock(run, 10);
  const reservation = submitFlashSalePurchase(run, "user_s1_001", "request-timeout-1");
  if (reservation.kind !== "created") throw new Error("Expected the reservation to be created");

  advanceFlashSaleClock(run, 29);
  assert.equal(run.orders[0].status, "reserved");
  advanceFlashSaleClock(run, 1);
  const afterExpiryMovements = run.movements.length;
  advanceFlashSaleClock(run, 1);

  assert.equal(run.orders[0].status, "expired");
  assert.equal(run.movements.length, afterExpiryMovements);
  assert.equal(run.movements.length, 3);
  assert.equal(run.stock_buckets.available, 100);
  assert.equal(run.stock_buckets.reserved, 0);
  assert.equal(flashSaleStockTotal(run.stock_buckets), run.initial_stock);
  assert.equal(completeFlashSalePurchase(run, reservation.order.order_id).kind, "rejected");
});

test("S1 Runs isolate their clocks, orders and stock buckets", () => {
  const firstRun = createRun("s1-isolated-a");
  const secondRun = createRun("s1-isolated-b");
  advanceFlashSaleClock(firstRun, 10);
  const reservation = submitFlashSalePurchase(firstRun, "user_s1_001", "request-isolated-a");
  if (reservation.kind !== "created") throw new Error("Expected the reservation to be created");
  completeFlashSalePurchase(firstRun, reservation.order.order_id);

  assert.notEqual(firstRun.run_id, secondRun.run_id);
  assert.equal(firstRun.stock_buckets.sold, 1);
  assert.equal(secondRun.stock_buckets.sold, 0);
  assert.equal(secondRun.stock_buckets.available, 100);
  assert.equal(secondRun.simulated_at_ms, secondRun.clock_epoch_ms);
  assert.equal(secondRun.orders.length, 0);
  assert.equal(secondRun.movements.length, 0);
});
