import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFileSync } from "node:fs";
import { isIP } from "node:net";
import { resolve } from "node:path";
import { E1_CATALOG, E1_POLICY, calculateQuote, type E1SkuId, type QuoteAmounts } from "./checkout.ts";

const HOST = "127.0.0.1";
const PORT = Number(process.env.PORT ?? 4179);
const CONTROL_TOKEN = process.env.E1_CONTROL_TOKEN;
const BLIND_EVAL_MODE = process.env.E1_BLIND_EVAL_MODE === "1";
const PUBLIC_HOST = BLIND_EVAL_MODE ? process.env.E1_PUBLIC_HOST : HOST;
const EVALUATOR_HOST = process.env.E1_EVALUATOR_HOST;
const EVALUATOR_PORT = process.env.E1_EVALUATOR_PORT === undefined ? Number.NaN : Number(process.env.E1_EVALUATOR_PORT);
const USER_ID = "user_e1";
const FIXTURE_VERSION = "1.0-demo";
const PUBLIC_DIR = resolve(process.cwd(), "demos/ecommerce-checkout/public");

interface SeedCase {
  case_id: string;
  seed_id: string;
  clock_epoch: string;
  synthetic_users: string[];
  initial_conditions: Record<string, unknown>;
}

interface SeedManifest {
  manifest_version: string;
  status: string;
  cases: SeedCase[];
}

interface QuoteRecord extends QuoteAmounts {
  case_id: "E1";
  run_id: string;
  seed_id: string;
  user_id: string;
  quote_id: string;
  created_at: string;
  coupon_status: CouponStatus;
  rule_ids: string[];
}

type CouponStatus = "available" | "reserved" | "sandbox_redeemed";

interface OrderRecord {
  case_id: "E1";
  run_id: string;
  seed_id: string;
  user_id: string;
  order_id: string;
  quote_id: string;
  idempotency_key: string;
  status: "sandbox_created" | "sandbox_paid" | "cancelled";
  payable_cents: number;
  created_at: string;
  rule_ids: string[];
}

interface CouponObservation {
  event_type:
    | "discount_applied_to_quote"
    | "reserved_for_sandbox_order"
    | "sandbox_redeemed_after_payment"
    | "released_after_cancellation";
  quote_id: string;
  order_id?: string;
  user_id: string;
  coupon_code: string;
  discount_cents: number;
  observed_at: string;
}

interface RunState {
  run_id: string;
  seed_id: string;
  user_id: string;
  clock_epoch: string;
  cart_sku_id: E1SkuId;
  quotes: Map<string, QuoteRecord>;
  orders: Map<string, OrderRecord>;
  orderByIdempotencyKey: Map<string, string>;
  couponLedger: CouponObservation[];
  coupon_status: CouponStatus;
  coupon_reserved_order_id: string | null;
}

class HttpError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string) {
    super(code);
    this.status = status;
    this.code = code;
  }
}

const runs = new Map<string, RunState>();
const seedCase = loadE1Seed();

function loadE1Seed(): SeedCase {
  const manifest = JSON.parse(readFileSync(resolve(process.cwd(), "fixtures/seed-manifest.json"), "utf8")) as unknown;
  if (!isRecord(manifest) || typeof manifest.manifest_version !== "string" || !Array.isArray(manifest.cases)) {
    throw new Error("Seed Manifest is malformed");
  }
  const seed = manifest.cases.find((entry) => isRecord(entry) && entry.case_id === "E1");
  if (!isRecord(seed) || typeof seed.seed_id !== "string" || typeof seed.clock_epoch !== "string" || !Array.isArray(seed.synthetic_users) || !isRecord(seed.initial_conditions)) {
    throw new Error("E1 Seed Manifest entry is incomplete");
  }
  if (Number.isNaN(Date.parse(seed.clock_epoch)) || seed.synthetic_users[0] !== USER_ID) {
    throw new Error("E1 Seed Manifest clock or synthetic user is invalid");
  }
  if (seed.initial_conditions.coupon_code !== E1_POLICY.coupon_code || typeof seed.initial_conditions.subtotal !== "number") {
    throw new Error("E1 Seed Manifest does not match the approved coupon contract");
  }
  return seed as unknown as SeedCase;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateRunId(value: unknown): string {
  if (typeof value !== "string" || !/^[a-zA-Z0-9._:-]{3,120}$/.test(value)) {
    throw new HttpError(400, "invalid_run_id");
  }
  return value;
}

function readRequiredString(value: unknown, name: string, maxLength = 200): string {
  if (typeof value !== "string" || value.length < 1 || value.length > maxLength || value.trim() !== value) {
    throw new HttpError(400, `invalid_${name}`);
  }
  return value;
}

function toCents(value: number): number {
  const cents = Math.round(value * 100);
  if (!Number.isSafeInteger(cents) || cents < 0 || Math.abs(value * 100 - cents) > 0.000001) {
    throw new Error("E1 Seed Manifest subtotal must be a non-negative amount with at most two decimals");
  }
  return cents;
}

function createInitialState(runId: string): RunState {
  const initialSubtotal = toCents(seedCase.initial_conditions.subtotal as number);
  const initialSku = Object.values(E1_CATALOG).find((product) => product.subtotal_cents === initialSubtotal);
  if (!initialSku) throw new Error("E1 Seed Manifest subtotal does not exist in the synthetic catalog");
  return {
    run_id: runId,
    seed_id: seedCase.seed_id,
    user_id: seedCase.synthetic_users[0],
    clock_epoch: seedCase.clock_epoch,
    cart_sku_id: initialSku.sku_id,
    quotes: new Map(),
    orders: new Map(),
    orderByIdempotencyKey: new Map(),
    couponLedger: [],
    coupon_status: "available",
    coupon_reserved_order_id: null,
  };
}

function getOrCreateRun(runId: string): RunState {
  let state = runs.get(runId);
  if (!state) {
    state = createInitialState(runId);
    runs.set(runId, state);
  }
  return state;
}

function resetRun(runId: string): RunState {
  const state = createInitialState(runId);
  runs.set(runId, state);
  return state;
}

function stateChecksum(state: RunState): string {
  const snapshot = {
    case_id: "E1",
    seed_id: state.seed_id,
    user_id: state.user_id,
    clock_epoch: state.clock_epoch,
    cart_sku_id: state.cart_sku_id,
    quotes: [...state.quotes.values()].sort((a, b) => a.quote_id.localeCompare(b.quote_id)),
    orders: [...state.orders.values()].sort((a, b) => a.order_id.localeCompare(b.order_id)),
    coupon_ledger: [...state.couponLedger],
    coupon: { status: state.coupon_status, reserved_order_id: state.coupon_reserved_order_id },
  };
  return createHash("sha256").update(JSON.stringify(snapshot)).digest("hex");
}

function json(res: ServerResponse, status: number, data: unknown): void {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "referrer-policy": "no-referrer",
    "content-security-policy": "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
  });
  res.end(JSON.stringify(data));
}

function isAuthorizedControlRequest(req: IncomingMessage): boolean {
  const supplied = req.headers["x-control-token"];
  if (!CONTROL_TOKEN || typeof supplied !== "string") return false;
  const expectedBytes = Buffer.from(CONTROL_TOKEN);
  const suppliedBytes = Buffer.from(supplied);
  return expectedBytes.length === suppliedBytes.length && timingSafeEqual(expectedBytes, suppliedBytes);
}

async function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  const declaredLength = Number(req.headers["content-length"] ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > 16_384) throw new HttpError(413, "request_too_large");
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buffer.byteLength;
    if (total > 16_384) throw new HttpError(413, "request_too_large");
    chunks.push(buffer);
  }
  let body: unknown;
  try {
    body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new HttpError(400, "invalid_json");
  }
  if (!isRecord(body)) throw new HttpError(400, "invalid_json_object");
  return body;
}

function requireMethod(req: IncomingMessage, expected: string): void {
  if (req.method !== expected) throw new HttpError(405, "method_not_allowed");
}

function cartResponse(state: RunState) {
  const product = E1_CATALOG[state.cart_sku_id];
  return {
    case_id: "E1",
    run_id: state.run_id,
    seed_id: state.seed_id,
    user_id: state.user_id,
    sku_id: product.sku_id,
    name: product.name,
    subtotal_cents: product.subtotal_cents,
    clock_epoch: state.clock_epoch,
  };
}

type RouteSurface = "combined" | "public" | "evaluator";

const evaluatorPaths = new Set(["/__test/reset", "/__test/oracle/checkout"]);

async function route(req: IncomingMessage, res: ServerResponse, surface: RouteSurface): Promise<void> {
  const url = new URL(req.url ?? "/", `http://${HOST}:${PORT}`);
  const isEvaluatorPath = evaluatorPaths.has(url.pathname);
  if (surface === "public" && isEvaluatorPath) throw new HttpError(404, "not_found");
  if (surface === "evaluator") {
    if (!isEvaluatorPath) throw new HttpError(404, "not_found");
    if (!isAuthorizedControlRequest(req)) throw new HttpError(401, "control_token_required");
  }
  if (url.pathname === "/health") {
    requireMethod(req, "GET");
    return json(res, 200, { status: "ok", case_id: "E1", environment: "isolated_local_demo" });
  }
  if (url.pathname === "/" || url.pathname === "/app.js") {
    requireMethod(req, "GET");
    const filename = url.pathname === "/" ? "index.html" : "app.js";
    const content = readFileSync(resolve(PUBLIC_DIR, filename));
    res.writeHead(200, {
      "content-type": filename.endsWith(".js") ? "text/javascript; charset=utf-8" : "text/html; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      "referrer-policy": "no-referrer",
      "content-security-policy": "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
    });
    res.end(content);
    return;
  }
  if (url.pathname === "/api/cart" && req.method === "GET") {
    const state = getOrCreateRun(validateRunId(url.searchParams.get("run_id") ?? undefined));
    return json(res, 200, cartResponse(state));
  }
  if (url.pathname === "/api/cart/select") {
    requireMethod(req, "POST");
    const body = await readJsonBody(req);
    const runId = validateRunId(body.run_id);
    const skuId = readRequiredString(body.sku_id, "sku_id", 40);
    if (!Object.hasOwn(E1_CATALOG, skuId)) throw new HttpError(400, "unknown_synthetic_sku");
    const state = getOrCreateRun(runId);
    state.cart_sku_id = skuId as E1SkuId;
    return json(res, 200, cartResponse(state));
  }
  if (url.pathname === "/api/checkout/quote") {
    requireMethod(req, "POST");
    const body = await readJsonBody(req);
    const runId = validateRunId(body.run_id);
    const couponCode = readRequiredString(body.coupon_code, "coupon_code", 40);
    if (couponCode !== E1_POLICY.coupon_code) throw new HttpError(400, "unsupported_coupon");
    const state = getOrCreateRun(runId);
    const cart = E1_CATALOG[state.cart_sku_id];
    const amounts = calculateQuote({
      subtotalCents: cart.subtotal_cents,
      couponCode,
      couponAvailable: state.coupon_status === "available",
    });
    const quote: QuoteRecord = {
      case_id: "E1",
      run_id: runId,
      seed_id: state.seed_id,
      user_id: state.user_id,
      quote_id: randomUUID(),
      created_at: state.clock_epoch,
      coupon_status: state.coupon_status,
      rule_ids: ["E1-R01"],
      ...amounts,
    };
    state.quotes.set(quote.quote_id, quote);
    if (quote.discount_cents > 0) {
      state.couponLedger.push({
        event_type: "discount_applied_to_quote",
        quote_id: quote.quote_id,
        user_id: state.user_id,
        coupon_code: quote.coupon_code,
        discount_cents: quote.discount_cents,
        observed_at: state.clock_epoch,
      });
    }
    return json(res, 201, quote);
  }
  if (url.pathname === "/api/orders") {
    requireMethod(req, "POST");
    if (surface === "public") throw new HttpError(403, "orders_disabled_in_blind_eval");
    const body = await readJsonBody(req);
    const runId = validateRunId(body.run_id);
    const quoteId = readRequiredString(body.quote_id, "quote_id", 100);
    const idempotencyKey = readRequiredString(body.idempotency_key, "idempotency_key", 200);
    const state = getOrCreateRun(runId);
    const quote = state.quotes.get(quoteId);
    if (!quote) throw new HttpError(404, "quote_not_found");

    const existingOrderId = state.orderByIdempotencyKey.get(idempotencyKey);
    if (existingOrderId) {
      const existing = state.orders.get(existingOrderId);
      if (!existing || existing.quote_id !== quoteId) throw new HttpError(409, "idempotency_key_conflict");
      return json(res, 200, existing);
    }
    if (quote.discount_cents > 0 && state.coupon_status !== "available") {
      throw new HttpError(409, "coupon_unavailable");
    }

    const order: OrderRecord = {
      case_id: "E1",
      run_id: runId,
      seed_id: state.seed_id,
      user_id: state.user_id,
      order_id: randomUUID(),
      quote_id: quote.quote_id,
      idempotency_key: idempotencyKey,
      status: "sandbox_created",
      payable_cents: quote.payable_cents,
      created_at: state.clock_epoch,
      rule_ids: ["E1-R02", "E1-R03", "E1-R04"],
    };
    state.orders.set(order.order_id, order);
    state.orderByIdempotencyKey.set(idempotencyKey, order.order_id);
    if (quote.discount_cents > 0) {
      state.coupon_status = "reserved";
      state.coupon_reserved_order_id = order.order_id;
      state.couponLedger.push({
        event_type: "reserved_for_sandbox_order",
        quote_id: quote.quote_id,
        order_id: order.order_id,
        user_id: state.user_id,
        coupon_code: quote.coupon_code,
        discount_cents: quote.discount_cents,
        observed_at: state.clock_epoch,
      });
    }
    return json(res, 201, order);
  }
  const orderAction = url.pathname.match(/^\/api\/orders\/([a-f0-9-]+)\/(simulate-payment|cancel)$/);
  if (orderAction) {
    requireMethod(req, "POST");
    if (surface === "public") throw new HttpError(403, "orders_disabled_in_blind_eval");
    const body = await readJsonBody(req);
    const runId = validateRunId(body.run_id);
    const state = runs.get(runId);
    if (!state) throw new HttpError(404, "run_not_found");
    const order = state.orders.get(orderAction[1]);
    if (!order) throw new HttpError(404, "order_not_found");

    if (orderAction[2] === "simulate-payment") {
      if (order.status === "sandbox_paid") return json(res, 200, order);
      if (order.status === "cancelled") throw new HttpError(409, "invalid_order_transition");
      order.status = "sandbox_paid";
      if (state.coupon_reserved_order_id === order.order_id) {
        state.coupon_status = "sandbox_redeemed";
        state.coupon_reserved_order_id = null;
        state.couponLedger.push({
          event_type: "sandbox_redeemed_after_payment",
          quote_id: order.quote_id,
          order_id: order.order_id,
          user_id: state.user_id,
          coupon_code: E1_POLICY.coupon_code,
          discount_cents: E1_POLICY.discount_cents,
          observed_at: state.clock_epoch,
        });
      }
      return json(res, 200, order);
    }

    if (order.status === "cancelled") return json(res, 200, order);
    if (order.status === "sandbox_paid") throw new HttpError(409, "invalid_order_transition");
    order.status = "cancelled";
    if (state.coupon_reserved_order_id === order.order_id) {
      state.coupon_status = "available";
      state.coupon_reserved_order_id = null;
      state.couponLedger.push({
        event_type: "released_after_cancellation",
        quote_id: order.quote_id,
        order_id: order.order_id,
        user_id: state.user_id,
        coupon_code: E1_POLICY.coupon_code,
        discount_cents: E1_POLICY.discount_cents,
        observed_at: state.clock_epoch,
      });
    }
    return json(res, 200, order);
  }
  if (url.pathname === "/__test/reset") {
    requireMethod(req, "POST");
    if (surface !== "evaluator" && !isAuthorizedControlRequest(req)) throw new HttpError(401, "control_token_required");
    const body = await readJsonBody(req);
    if (body.case_id !== "E1") throw new HttpError(400, "unsupported_case");
    const runId = validateRunId(body.run_id);
    const seedId = readRequiredString(body.seed_id, "seed_id", 80);
    if (seedId !== seedCase.seed_id) throw new HttpError(400, "unknown_seed");
    const state = resetRun(runId);
    return json(res, 200, {
      case_id: "E1",
      run_id: state.run_id,
      seed_id: state.seed_id,
      fixture_version: FIXTURE_VERSION,
      clock_time: state.clock_epoch,
      state_sha256: stateChecksum(state),
    });
  }
  if (url.pathname === "/__test/oracle/checkout") {
    requireMethod(req, "GET");
    const runId = validateRunId(url.searchParams.get("run_id"));
    const seedId = url.searchParams.get("seed_id");
    const userId = url.searchParams.get("user_id");
    const state = runs.get(runId);
    if (!state || seedId !== state.seed_id || userId !== state.user_id) throw new HttpError(404, "run_not_found");
    const quoteId = url.searchParams.get("quote_id");
    const orderId = url.searchParams.get("order_id");
    const selectedOrder = orderId ? state.orders.get(orderId) : undefined;
    const quotes = [...state.quotes.values()].filter((record) => !quoteId || record.quote_id === quoteId);
    const orders = [...state.orders.values()].filter((record) => !orderId || record.order_id === orderId);
    const couponLedger = state.couponLedger.filter((event) =>
      (!quoteId || event.quote_id === quoteId)
      && (!orderId || event.order_id === orderId || event.quote_id === selectedOrder?.quote_id),
    );
    return json(res, 200, {
      case_id: "E1",
      run_id: state.run_id,
      seed_id: state.seed_id,
      user_id: state.user_id,
      observed_at: state.clock_epoch,
      quotes,
      orders,
      coupon: {
        coupon_code: E1_POLICY.coupon_code,
        status: state.coupon_status,
        reserved_order_id: state.coupon_reserved_order_id,
      },
      coupon_ledger: couponLedger,
    });
  }
  throw new HttpError(404, "not_found");
}

function isValidTokenConfiguration(value: string | undefined): value is string {
  return typeof value === "string" && value.length >= 32;
}

function isWildcardHost(host: string): boolean {
  const normalized = host.trim().toLowerCase();
  if (normalized === "*" || normalized === "0.0.0.0") return true;
  return isIP(normalized) === 6 && normalized.split(":").every((part) => part === "" || part === "0");
}

if (!isValidTokenConfiguration(CONTROL_TOKEN)) {
  throw new Error("Start the E1 demo with `npm run dev` to create its local control token");
}
if (!Number.isInteger(PORT) || PORT < 1024 || PORT > 65_535) throw new Error("PORT must be an unprivileged TCP port");
if (BLIND_EVAL_MODE) {
  if (!PUBLIC_HOST) throw new Error("E1_PUBLIC_HOST is required in blind evaluation mode");
  if (!EVALUATOR_HOST) throw new Error("E1_EVALUATOR_HOST is required in blind evaluation mode");
  if (isWildcardHost(EVALUATOR_HOST)) throw new Error("E1_EVALUATOR_HOST must be a specific non-wildcard interface");
  if (!Number.isInteger(EVALUATOR_PORT) || EVALUATOR_PORT < 1024 || EVALUATOR_PORT > 65_535 || EVALUATOR_PORT === PORT) {
    throw new Error("E1_EVALUATOR_PORT must be a distinct unprivileged TCP port");
  }
}
function createListener(surface: RouteSurface) {
  return createServer((req, res) => {
    void route(req, res, surface).catch((error: unknown) => {
      if (error instanceof HttpError) return json(res, error.status, { error: error.code });
      return json(res, 500, { error: "internal_error" });
    });
  });
}

const listeners: { server: ReturnType<typeof createServer>; surface: RouteSurface; host: string; port: number }[] = [];
if (BLIND_EVAL_MODE) {
  listeners.push({ surface: "public", host: PUBLIC_HOST!, port: PORT, server: createListener("public") });
  listeners.push({ surface: "evaluator", host: EVALUATOR_HOST!, port: EVALUATOR_PORT, server: createListener("evaluator") });
} else {
  listeners.push({ surface: "combined", host: HOST, port: PORT, server: createListener("combined") });
}

for (const listener of listeners) {
  listener.server.listen(listener.port, listener.host, () => {
    process.stdout.write(`E1 ${listener.surface} listener ready\n`);
  });
}

function closeListeners(): void {
  const openListeners = listeners.filter(({ server }) => server.listening);
  if (openListeners.length === 0) {
    process.exit(0);
    return;
  }
  let remaining = openListeners.length;
  for (const { server } of openListeners) {
    server.close(() => {
      remaining -= 1;
      if (remaining === 0) process.exit(0);
    });
  }
}

process.once("SIGINT", closeListeners);
process.once("SIGTERM", closeListeners);
