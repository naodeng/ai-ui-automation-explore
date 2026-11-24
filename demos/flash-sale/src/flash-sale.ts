import { createHash, randomUUID } from "node:crypto";

export interface S1SeedEntry {
  case_id: "S1";
  seed_id: string;
  clock_epoch: string;
  synthetic_users: string[];
  initial_conditions: {
    stock: number;
    per_user_limit: number;
    sale_start: string;
    orders: number;
  };
}

export interface StockBuckets {
  available: number;
  reserved: number;
  sold: number;
  pending_release: number;
  released: number;
}

export interface StockMovement {
  movement_id: string;
  from_bucket: keyof StockBuckets;
  to_bucket: keyof StockBuckets;
  quantity: 1;
  order_id: string;
  request_id: string;
  observed_at: string;
}

export interface FlashSaleOrder {
  order_id: string;
  request_id: string;
  idempotency_key: string;
  user_id: string;
  sku_id: "s1-synthetic-item";
  quantity: 1;
  status: "success";
  created_at: string;
}

export interface FlashSaleRun {
  case_id: "S1";
  run_id: string;
  seed_id: string;
  campaign_id: "campaign_s1";
  sku_id: "s1-synthetic-item";
  user_id: string;
  clock_epoch: string;
  clock_epoch_ms: number;
  simulated_at_ms: number;
  sale_start_at: string;
  sale_start_at_ms: number;
  initial_stock: number;
  per_user_limit: number;
  synthetic_user_ids: string[];
  stock_buckets: StockBuckets;
  orders: FlashSaleOrder[];
  movements: StockMovement[];
  idempotency_index: Map<string, string>;
}

export type PurchaseResult =
  | { kind: "created"; request_id: string; order: FlashSaleOrder }
  | { kind: "replayed"; request_id: string; order: FlashSaleOrder }
  | { kind: "rejected"; request_id: string; code: string };

export function createFlashSaleRun(seed: S1SeedEntry, runId: string): FlashSaleRun {
  const clockEpochMs = Date.parse(seed.clock_epoch);
  const saleStartAtMs = Date.parse(seed.initial_conditions.sale_start);
  if (
    !Number.isFinite(clockEpochMs) ||
    !Number.isFinite(saleStartAtMs) ||
    !Number.isSafeInteger(seed.initial_conditions.stock) ||
    seed.initial_conditions.stock <= 0 ||
    seed.initial_conditions.per_user_limit !== 1 ||
    seed.initial_conditions.orders !== 0 ||
    seed.synthetic_users.length === 0 ||
    seed.synthetic_users.some((userId) => typeof userId !== "string" || userId.length === 0) ||
    new Set(seed.synthetic_users).size !== seed.synthetic_users.length ||
    saleStartAtMs < clockEpochMs
  ) {
    throw new Error("S1 Seed entry is invalid");
  }

  return {
    case_id: "S1",
    run_id: runId,
    seed_id: seed.seed_id,
    campaign_id: "campaign_s1",
    sku_id: "s1-synthetic-item",
    user_id: seed.synthetic_users[0],
    clock_epoch: new Date(clockEpochMs).toISOString(),
    clock_epoch_ms: clockEpochMs,
    simulated_at_ms: clockEpochMs,
    sale_start_at: new Date(saleStartAtMs).toISOString(),
    sale_start_at_ms: saleStartAtMs,
    initial_stock: seed.initial_conditions.stock,
    per_user_limit: seed.initial_conditions.per_user_limit,
    synthetic_user_ids: [...seed.synthetic_users],
    stock_buckets: {
      available: seed.initial_conditions.stock,
      reserved: 0,
      sold: 0,
      pending_release: 0,
      released: 0,
    },
    orders: [],
    movements: [],
    idempotency_index: new Map(),
  };
}

export function advanceFlashSaleClock(run: FlashSaleRun, seconds: number): void {
  run.simulated_at_ms += seconds * 1000;
}

export function flashSaleStockTotal(buckets: StockBuckets): number {
  return buckets.available + buckets.reserved + buckets.sold + buckets.pending_release + buckets.released;
}

export function getFlashSaleCampaignStatus(run: FlashSaleRun): "not_started" | "open" | "sold_out" {
  if (run.simulated_at_ms < run.sale_start_at_ms) return "not_started";
  if (run.stock_buckets.available === 0) return "sold_out";
  return "open";
}

export function flashSaleLedgerChecksum(run: FlashSaleRun): string {
  const snapshot = {
    case_id: run.case_id,
    run_id: run.run_id,
    seed_id: run.seed_id,
    campaign_id: run.campaign_id,
    simulated_at_ms: run.simulated_at_ms,
    stock_buckets: run.stock_buckets,
    orders: run.orders,
    movements: run.movements,
  };
  return createHash("sha256").update(JSON.stringify(snapshot)).digest("hex");
}

function assertStockConservation(run: FlashSaleRun): void {
  const values = Object.values(run.stock_buckets);
  if (values.some((value) => !Number.isSafeInteger(value) || value < 0) || flashSaleStockTotal(run.stock_buckets) !== run.initial_stock) {
    throw new Error("S1 stock buckets do not conserve the initial stock");
  }
}

export function submitFlashSalePurchase(
  run: FlashSaleRun,
  userId: string,
  idempotencyKey: string,
): PurchaseResult {
  const requestId = `s1-request-${randomUUID()}`;
  if (!run.synthetic_user_ids.includes(userId)) return { kind: "rejected", request_id: requestId, code: "unknown_synthetic_user" };

  const replayOrderId = run.idempotency_index.get(idempotencyKey);
  if (replayOrderId) {
    const replayOrder = run.orders.find((order) => order.order_id === replayOrderId);
    if (!replayOrder) throw new Error("S1 idempotency index references a missing order");
    if (replayOrder.user_id !== userId) return { kind: "rejected", request_id: requestId, code: "idempotency_key_conflict" };
    return { kind: "replayed", request_id: requestId, order: replayOrder };
  }

  if (run.simulated_at_ms < run.sale_start_at_ms) return { kind: "rejected", request_id: requestId, code: "campaign_not_started" };
  if (run.orders.filter((order) => order.user_id === userId && order.status === "success").length >= run.per_user_limit) {
    return { kind: "rejected", request_id: requestId, code: "user_purchase_limit_reached" };
  }
  if (run.stock_buckets.available < 1) return { kind: "rejected", request_id: requestId, code: "sold_out" };

  const now = new Date(run.simulated_at_ms).toISOString();
  const order: FlashSaleOrder = {
    order_id: `s1-order-${randomUUID()}`,
    request_id: requestId,
    idempotency_key: idempotencyKey,
    user_id: userId,
    sku_id: run.sku_id,
    quantity: 1,
    status: "success",
    created_at: now,
  };
  const movement: StockMovement = {
    movement_id: `s1-movement-${randomUUID()}`,
    from_bucket: "available",
    to_bucket: "sold",
    quantity: 1,
    order_id: order.order_id,
    request_id: order.request_id,
    observed_at: now,
  };

  run.stock_buckets.available -= 1;
  run.stock_buckets.sold += 1;
  run.orders.push(order);
  run.movements.push(movement);
  run.idempotency_index.set(idempotencyKey, order.order_id);
  assertStockConservation(run);
  return { kind: "created", request_id: requestId, order };
}
