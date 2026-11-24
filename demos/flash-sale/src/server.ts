import { randomUUID } from "node:crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  advanceFlashSaleClock,
  createFlashSaleRun,
  flashSaleLedgerChecksum,
  getFlashSaleCampaignStatus,
  submitFlashSalePurchase,
  type FlashSaleRun,
  type S1SeedEntry,
} from "./flash-sale.ts";

const HOST = "127.0.0.1";
const PORT = Number(process.env.S1_PORT ?? 4181);
const MAX_BODY_BYTES = 16_384;
const PUBLIC_DIR = resolve(process.cwd(), "demos/flash-sale/public");
const SEED_FILE = resolve(process.cwd(), "fixtures/seed-manifest.json");
const runs = new Map<string, FlashSaleRun>();

class HttpError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string) {
    super(code);
    this.status = status;
    this.code = code;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function loadS1Seed(): S1SeedEntry {
  const manifest: unknown = JSON.parse(readFileSync(SEED_FILE, "utf8"));
  if (!isRecord(manifest) || !Array.isArray(manifest.cases)) throw new Error("Seed Manifest is malformed");

  const entry = manifest.cases.find((candidate) => isRecord(candidate) && candidate.case_id === "S1");
  if (!isRecord(entry) || !isRecord(entry.initial_conditions)) throw new Error("S1 Seed Manifest entry is missing");

  const initial = entry.initial_conditions;
  const users = entry.synthetic_users;
  const clockEpoch = entry.clock_epoch;
  if (
    entry.case_id !== "S1" ||
    typeof entry.seed_id !== "string" ||
    typeof clockEpoch !== "string" ||
    Number.isNaN(Date.parse(clockEpoch)) ||
    !Array.isArray(users) ||
    users.length === 0 ||
    users.some((userId) => typeof userId !== "string" || !/^[a-zA-Z0-9_-]{3,80}$/.test(userId)) ||
    typeof initial.stock !== "number" ||
    !Number.isSafeInteger(initial.stock) ||
    initial.stock <= 0 ||
    initial.per_user_limit !== 1 ||
    initial.orders !== 0 ||
    typeof initial.sale_start !== "string" ||
    Number.isNaN(Date.parse(initial.sale_start)) ||
    Date.parse(initial.sale_start) < Date.parse(clockEpoch)
  ) {
    throw new Error("S1 Seed Manifest entry is incomplete or invalid");
  }

  return entry as unknown as S1SeedEntry;
}

const seed = loadS1Seed();

function createRunId(): string {
  return `s1-${randomUUID()}`;
}

function createRun(): FlashSaleRun {
  const runId = createRunId();
  const run = createFlashSaleRun(seed, runId);
  runs.set(runId, run);
  return run;
}

function fakeTime(run: FlashSaleRun): string {
  return new Date(run.simulated_at_ms).toISOString();
}

function stockView(run: FlashSaleRun) {
  return {
    case_id: run.case_id,
    run_id: run.run_id,
    seed_id: run.seed_id,
    campaign_id: run.campaign_id,
    sku_id: run.sku_id,
    user_id: run.user_id,
    campaign: {
      status: getFlashSaleCampaignStatus(run),
      sale_start_at: run.sale_start_at,
    },
    fake_clock: {
      epoch: run.clock_epoch,
      now: fakeTime(run),
      simulated_seconds_since_start: Math.floor((run.simulated_at_ms - run.clock_epoch_ms) / 1000),
    },
    initial_stock: run.initial_stock,
    per_user_limit: run.per_user_limit,
    stock_buckets: { ...run.stock_buckets },
    orders: run.orders.map((order) => ({ ...order })),
    stock_movements: run.movements.map((movement) => ({ ...movement })),
    stock_ledger_checksum: flashSaleLedgerChecksum(run),
  };
}

function oracle(run: FlashSaleRun, userId?: string) {
  return {
    case_id: run.case_id,
    run_id: run.run_id,
    seed_id: run.seed_id,
    campaign_id: run.campaign_id,
    sku_id: run.sku_id,
    campaign: {
      status: getFlashSaleCampaignStatus(run),
      sale_start_at: run.sale_start_at,
    },
    observed_at: fakeTime(run),
    stock_buckets: { ...run.stock_buckets },
    orders: run.orders
      .filter((order) => userId === undefined || order.user_id === userId)
      .map((order) => ({ ...order })),
    stock_movements: run.movements.map((movement) => ({ ...movement })),
    stock_ledger_checksum: flashSaleLedgerChecksum(run),
  };
}

function json(res: ServerResponse, status: number, data: unknown): void {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "referrer-policy": "no-referrer",
    "content-security-policy": "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
  });
  res.end(JSON.stringify(data));
}

function requireMethod(req: IncomingMessage, method: string): void {
  if (req.method !== method) throw new HttpError(405, "method_not_allowed");
}

function readRequiredString(value: unknown, name: string, maxLength = 200): string {
  if (typeof value !== "string" || value.length < 1 || value.length > maxLength || value.trim() !== value) {
    throw new HttpError(400, `invalid_${name}`);
  }
  return value;
}

function readRunId(value: unknown): string {
  const runId = readRequiredString(value, "run_id", 120);
  if (!/^[a-zA-Z0-9._:-]{3,120}$/.test(runId)) throw new HttpError(400, "invalid_run_id");
  return runId;
}

async function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  const declaredLength = Number(req.headers["content-length"] ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) throw new HttpError(413, "request_too_large");
  const chunks: Buffer[] = [];
  let totalBytes = 0;
  for await (const chunk of req) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalBytes += bytes.byteLength;
    if (totalBytes > MAX_BODY_BYTES) throw new HttpError(413, "request_too_large");
    chunks.push(bytes);
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

function getRun(value: unknown): FlashSaleRun {
  const run = runs.get(readRunId(value));
  if (!run) throw new HttpError(404, "run_not_found");
  return run;
}

function staticFile(res: ServerResponse, filename: string, contentType: string): void {
  res.writeHead(200, {
    "content-type": contentType,
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "referrer-policy": "no-referrer",
    "content-security-policy": "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
  });
  res.end(readFileSync(resolve(PUBLIC_DIR, filename)));
}

async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url ?? "/", `http://${HOST}:${PORT}`);
  const path = url.pathname;

  if (path === "/health") {
    requireMethod(req, "GET");
    return json(res, 200, { status: "ok", case_id: "S1", environment: "isolated_local_demo" });
  }

  if (path === "/") {
    requireMethod(req, "GET");
    res.writeHead(302, { location: "/flash-sale", "cache-control": "no-store" });
    res.end();
    return;
  }

  const staticFiles: Record<string, [string, string]> = {
    "/flash-sale": ["index.html", "text/html; charset=utf-8"],
    "/flash-sale/result": ["index.html", "text/html; charset=utf-8"],
    "/queue": ["index.html", "text/html; charset=utf-8"],
    "/app.js": ["app.js", "text/javascript; charset=utf-8"],
    "/styles.css": ["styles.css", "text/css; charset=utf-8"],
    "/synthetic-headphones.png": ["synthetic-headphones.png", "image/png"],
  };
  if (staticFiles[path]) {
    requireMethod(req, "GET");
    staticFile(res, ...staticFiles[path]);
    return;
  }

  if (path === "/api/runs") {
    requireMethod(req, "POST");
    const run = createRun();
    return json(res, 201, { state: stockView(run) });
  }

  if (path === "/api/state") {
    requireMethod(req, "GET");
    const run = getRun(url.searchParams.get("run_id"));
    return json(res, 200, { state: stockView(run) });
  }

  if (path === "/__test/oracle/flash-sale") {
    requireMethod(req, "GET");
    const run = getRun(url.searchParams.get("run_id"));
    const seedId = readRequiredString(url.searchParams.get("seed_id"), "seed_id", 120);
    const campaignId = readRequiredString(url.searchParams.get("campaign_id"), "campaign_id", 120);
    const skuId = readRequiredString(url.searchParams.get("sku_id"), "sku_id", 120);
    const userIdValue = url.searchParams.get("user_id");
    const userId = userIdValue === null ? undefined : readRequiredString(userIdValue, "user_id", 80);
    if (
      seedId !== run.seed_id ||
      campaignId !== run.campaign_id ||
      skuId !== run.sku_id ||
      (userId !== undefined && !seed.synthetic_users.includes(userId))
    ) {
      throw new HttpError(404, "oracle_scope_not_found");
    }
    return json(res, 200, oracle(run, userId));
  }

  if (path === "/api/clock/advance") {
    requireMethod(req, "POST");
    const body = await readJsonBody(req);
    const run = getRun(body.run_id);
    const seconds = body.seconds;
    if (typeof seconds !== "number" || !Number.isSafeInteger(seconds) || seconds < 1 || seconds > 30) {
      throw new HttpError(400, "invalid_clock_advance");
    }
    advanceFlashSaleClock(run, seconds);
    return json(res, 200, { state: stockView(run) });
  }

  if (path === "/api/purchase") {
    requireMethod(req, "POST");
    const body = await readJsonBody(req);
    const run = getRun(body.run_id);
    const userId = readRequiredString(body.user_id, "user_id", 80);
    const idempotencyKey = readRequiredString(body.idempotency_key, "idempotency_key", 128);
    const result = submitFlashSalePurchase(run, userId, idempotencyKey);
    if (result.kind === "rejected") {
      const status = result.code === "unknown_synthetic_user" ? 400 : 409;
      return json(res, status, { error: result.code, request_id: result.request_id, state: stockView(run) });
    }
    return json(res, result.kind === "created" ? 201 : 200, {
      result: result.kind,
      request_id: result.request_id,
      order: result.order,
      state: stockView(run),
    });
  }

  return json(res, 404, { error: "not_found" });
}

if (!Number.isInteger(PORT) || PORT < 1024 || PORT > 65_535) throw new Error("S1_PORT must be an integer between 1024 and 65535");

const server = createServer((req, res) => {
  void handle(req, res).catch((error: unknown) => {
    if (error instanceof HttpError) return json(res, error.status, { error: error.code });
    process.stderr.write(`S1 request failed: ${error instanceof Error ? error.message : String(error)}\n`);
    if (!res.headersSent) json(res, 500, { error: "internal_error" });
    else res.destroy();
  });
});

server.listen(PORT, HOST, () => {
  process.stdout.write(`S1 synthetic demo listening on http://${HOST}:${PORT}\n`);
});
