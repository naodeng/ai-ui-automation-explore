import { randomUUID } from "node:crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const HOST = "127.0.0.1";
const PORT = Number(process.env.M1_PORT ?? 4180);
const PUBLIC_DIR = resolve(process.cwd(), "demos/membership-lifecycle/public");
const SEED_FILE = resolve(process.cwd(), "fixtures/seed-manifest.json");
const MAX_BODY_BYTES = 16_384;

type RunId = string & { readonly __brand: "RunId" };
type EventVersion = number & { readonly __brand: "EventVersion" };
type Tier = "normal" | "silver" | "gold" | "platinum";
type ScenarioId = "seed" | "silver_to_gold" | "gold_to_silver" | "platinum_to_gold";
type ReplayKind = "duplicate_current" | "older";

interface M1Seed {
  seedId: string;
  clockEpoch: string;
  clockEpochMs: number;
  couponExpiresAt: string;
  couponExpiresAtMs: number;
  userId: string;
  tier: Tier;
  eventVersion: EventVersion;
  oldSessionAvailable: boolean;
  historicalCouponIsClaimedAndValid: boolean;
}

interface ScenarioSetup {
  kind: "fixture_preparation";
  fromTier: Tier;
  toTier: Tier;
}

interface MembershipEvent {
  event_version: EventVersion;
  event_type: "threshold_reached" | "renewal_failed_at_period_end";
  from_tier: Tier;
  to_tier: Tier;
  disposition: "applied";
  observed_at: string;
}

interface ReplayAttempt {
  requested_version: EventVersion;
  disposition: "duplicate" | "older";
  tier_before: Tier;
  tier_after: Tier;
  version_before: EventVersion;
  version_after: EventVersion;
  observed_at: string;
}

interface AuthorizationObservation {
  rule_id: "M1-R01" | "M1-R02";
  resource: "gold-only purchase";
  session_kind: "current" | "old";
  session_id: "session_m1_current" | "session_m1_old";
  decision: "allowed" | "denied";
  effective_tier: Tier;
  event_version: EventVersion;
  observed_at: string;
}

interface M1Run {
  runId: RunId;
  seedId: string;
  clockEpoch: string;
  clockEpochMs: number;
  couponExpiresAt: string;
  couponExpiresAtMs: number;
  simulatedAtMs: number;
  userId: string;
  tier: Tier;
  eventVersion: EventVersion;
  oldSessionAvailable: boolean;
  historicalCouponIsClaimedAndValid: boolean;
  scenarioId: ScenarioId;
  scenarioSetup: ScenarioSetup | null;
  membershipEvents: MembershipEvent[];
  replayAttempts: ReplayAttempt[];
  authorizationObservation: AuthorizationObservation | null;
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

const runs = new Map<RunId, M1Run>();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isRunId(value: unknown): value is RunId {
  return typeof value === "string" && /^[a-zA-Z0-9._:-]{3,120}$/.test(value);
}

function parseRunId(value: unknown): RunId {
  if (!isRunId(value)) throw new HttpError(400, "invalid_run_id");
  return value;
}

function isEventVersion(value: unknown): value is EventVersion {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function makeEventVersion(value: number): EventVersion {
  if (!isEventVersion(value)) throw new HttpError(400, "invalid_event_version");
  return value;
}

function isTier(value: unknown): value is Tier {
  return value === "normal" || value === "silver" || value === "gold" || value === "platinum";
}

function loadM1Seed(): M1Seed {
  const manifest: unknown = JSON.parse(readFileSync(SEED_FILE, "utf8"));
  if (!isRecord(manifest) || !Array.isArray(manifest.cases)) {
    throw new Error("Seed Manifest is malformed");
  }

  const entry = manifest.cases.find((candidate) => isRecord(candidate) && candidate.case_id === "M1");
  if (!isRecord(entry) || !isRecord(entry.initial_conditions)) {
    throw new Error("M1 Seed Manifest entry is missing");
  }

  const initial = entry.initial_conditions;
  const seedId = entry.seed_id;
  const clockEpoch = entry.clock_epoch;
  const couponExpiresAt = initial.claimed_coupon_expires_at;
  const userIds = entry.synthetic_users;
  const eventVersion = initial.event_version;
  const tier = initial.tier;
  const coupon = initial.claimed_coupon;
  const oldSessionAvailable = initial.old_session_available;
  const clockEpochMs = typeof clockEpoch === "string" ? Date.parse(clockEpoch) : Number.NaN;
  const couponExpiresAtMs = typeof couponExpiresAt === "string" ? Date.parse(couponExpiresAt) : Number.NaN;

  if (
    typeof seedId !== "string" ||
    typeof clockEpoch !== "string" ||
    Number.isNaN(clockEpochMs) ||
    typeof couponExpiresAt !== "string" ||
    Number.isNaN(couponExpiresAtMs) ||
    couponExpiresAtMs <= clockEpochMs ||
    !Array.isArray(userIds) ||
    typeof userIds[0] !== "string" ||
    !isTier(tier) ||
    !isEventVersion(eventVersion) ||
    coupon !== "already_claimed_and_not_expired" ||
    oldSessionAvailable !== true
  ) {
    throw new Error("M1 Seed Manifest entry is incomplete or invalid");
  }

  return {
    seedId,
    clockEpoch,
    clockEpochMs,
    couponExpiresAt: new Date(couponExpiresAtMs).toISOString(),
    couponExpiresAtMs,
    userId: userIds[0],
    tier,
    eventVersion,
    oldSessionAvailable,
    historicalCouponIsClaimedAndValid: true,
  };
}

const seed = loadM1Seed();

function createRunId(): RunId {
  const runId = "m1-" + randomUUID();
  if (!isRunId(runId)) throw new Error("Generated M1 Run ID is invalid");
  return runId;
}

function createInitialRun(runId = createRunId()): M1Run {
  return {
    runId,
    seedId: seed.seedId,
    clockEpoch: seed.clockEpoch,
    clockEpochMs: seed.clockEpochMs,
    couponExpiresAt: seed.couponExpiresAt,
    couponExpiresAtMs: seed.couponExpiresAtMs,
    simulatedAtMs: seed.clockEpochMs,
    userId: seed.userId,
    tier: seed.tier,
    eventVersion: seed.eventVersion,
    oldSessionAvailable: seed.oldSessionAvailable,
    historicalCouponIsClaimedAndValid: seed.historicalCouponIsClaimedAndValid,
    scenarioId: "seed",
    scenarioSetup: null,
    membershipEvents: [],
    replayAttempts: [],
    authorizationObservation: null,
  };
}

function fakeTime(run: M1Run): string {
  return new Date(run.simulatedAtMs).toISOString();
}

function couponStatusAt(run: M1Run): "valid_at_seed" | "valid" | "expired" {
  if (run.simulatedAtMs >= run.couponExpiresAtMs) return "expired";
  return run.simulatedAtMs === run.clockEpochMs ? "valid_at_seed" : "valid";
}

function applyMembershipEvent(
  run: M1Run,
  event: Omit<MembershipEvent, "disposition" | "observed_at">,
): M1Run {
  if (event.event_version <= run.eventVersion) {
    throw new HttpError(409, "membership_event_version_must_increase");
  }
  if (event.from_tier !== run.tier) throw new HttpError(409, "membership_event_source_tier_mismatch");

  const appliedEvent: MembershipEvent = {
    ...event,
    disposition: "applied",
    observed_at: fakeTime(run),
  };

  return {
    ...run,
    tier: event.to_tier,
    eventVersion: event.event_version,
    membershipEvents: [...run.membershipEvents, appliedEvent],
  };
}

function probeGoldOnlyAuthorization(
  run: M1Run,
  sessionKind: AuthorizationObservation["session_kind"],
): AuthorizationObservation | null {
  if (run.scenarioId === "silver_to_gold" && run.tier === "gold" && sessionKind === "current") {
    return {
      rule_id: "M1-R01",
      resource: "gold-only purchase",
      session_kind: "current",
      session_id: "session_m1_current",
      decision: "allowed",
      effective_tier: run.tier,
      event_version: run.eventVersion,
      observed_at: fakeTime(run),
    };
  }
  if (
    run.scenarioId === "gold_to_silver" &&
    run.tier === "silver" &&
    run.oldSessionAvailable &&
    sessionKind === "old"
  ) {
    return {
      rule_id: "M1-R02",
      resource: "gold-only purchase",
      session_kind: "old",
      session_id: "session_m1_old",
      decision: "denied",
      effective_tier: run.tier,
      event_version: run.eventVersion,
      observed_at: fakeTime(run),
    };
  }
  return null;
}

function runScenario(scenarioId: Exclude<ScenarioId, "seed">): M1Run {
  let run = createInitialRun();

  if (scenarioId === "silver_to_gold") {
    run = {
      ...run,
      tier: "silver",
      scenarioId,
      scenarioSetup: {
        kind: "fixture_preparation",
        fromTier: "gold",
        toTier: "silver",
      },
    };
    run = applyMembershipEvent(run, {
      event_version: makeEventVersion(run.eventVersion + 1),
      event_type: "threshold_reached",
      from_tier: "silver",
      to_tier: "gold",
    });
    const authorizationObservation = probeGoldOnlyAuthorization(run, "current");
    if (!authorizationObservation) throw new Error("M1-R01 authorization probe was unavailable");
    return { ...run, authorizationObservation };
  }

  if (scenarioId === "platinum_to_gold") {
    run = {
      ...run,
      tier: "platinum",
      scenarioId,
      scenarioSetup: {
        kind: "fixture_preparation",
        fromTier: "gold",
        toTier: "platinum",
      },
    };
    return applyMembershipEvent(run, {
      event_version: makeEventVersion(run.eventVersion + 1),
      event_type: "renewal_failed_at_period_end",
      from_tier: "platinum",
      to_tier: "gold",
    });
  }

  run = applyMembershipEvent(run, {
    event_version: makeEventVersion(run.eventVersion + 1),
    event_type: "renewal_failed_at_period_end",
    from_tier: "gold",
    to_tier: "silver",
  });
  run = { ...run, scenarioId };
  const authorizationObservation = probeGoldOnlyAuthorization(run, "old");
  if (!authorizationObservation) throw new Error("M1-R02 authorization probe was unavailable");
  return { ...run, authorizationObservation };
}

function snapshot(run: M1Run) {
  return {
    case_id: "M1",
    run_id: run.runId,
    seed_id: run.seedId,
    user_id: run.userId,
    tier: run.tier,
    event_version: run.eventVersion,
    old_session_available: run.oldSessionAvailable,
    historical_coupon: {
      claimed: run.historicalCouponIsClaimedAndValid,
      current_status: couponStatusAt(run),
      expiry_policy: "retain_until_expiry",
      exact_expiry: run.couponExpiresAt,
    },
    fake_clock: {
      epoch: run.clockEpoch,
      now: fakeTime(run),
      simulated_seconds_since_start: Math.floor((run.simulatedAtMs - run.clockEpochMs) / 1000),
    },
    scenario_id: run.scenarioId,
    scenario_setup: run.scenarioSetup,
    membership_events: run.membershipEvents,
    replay_attempts: run.replayAttempts,
    authorization_observation: run.authorizationObservation,
  };
}

function oracle(run: M1Run) {
  return {
    case_id: "M1",
    run_id: run.runId,
    seed_id: run.seedId,
    observed_at: fakeTime(run),
    membership_authorization: run.authorizationObservation ?? { status: "not_observed" },
    membership_events: {
      effective_tier: run.tier,
      current_event_version: run.eventVersion,
      transitions: run.membershipEvents,
      replay_attempts: run.replayAttempts,
    },
    entitlement_ledger: {
      historical_coupon: {
        claimed: run.historicalCouponIsClaimedAndValid,
        current_status: couponStatusAt(run),
        expiry_policy: "retain_until_expiry",
        exact_expiry: run.couponExpiresAt,
      },
    },
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

async function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  const declaredLength = Number(req.headers["content-length"] ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    throw new HttpError(413, "request_too_large");
  }

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

function getRun(value: unknown): M1Run {
  const runId = parseRunId(value);
  const run = runs.get(runId);
  if (!run) throw new HttpError(404, "run_not_found");
  return run;
}

function runResponse(run: M1Run) {
  return { state: snapshot(run), oracle: oracle(run) };
}

function replayEvent(run: M1Run, replayKind: ReplayKind): { run: M1Run; attempt: ReplayAttempt } {
  const requestedVersion =
    replayKind === "duplicate_current"
      ? run.eventVersion
      : makeEventVersion(Math.max(1, run.eventVersion - 1));
  const disposition = requestedVersion === run.eventVersion ? "duplicate" : "older";
  const attempt: ReplayAttempt = {
    requested_version: requestedVersion,
    disposition,
    tier_before: run.tier,
    tier_after: run.tier,
    version_before: run.eventVersion,
    version_after: run.eventVersion,
    observed_at: fakeTime(run),
  };
  return {
    run: { ...run, replayAttempts: [...run.replayAttempts, attempt] },
    attempt,
  };
}

async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url ?? "/", "http://" + HOST + ":" + PORT);
  const path = url.pathname;

  if (path === "/health") {
    requireMethod(req, "GET");
    json(res, 200, { status: "ok", case_id: "M1", environment: "isolated_local_demo" });
    return;
  }

  if (path === "/" || path === "/app.js" || path === "/styles.css") {
    requireMethod(req, "GET");
    const filename = path === "/" ? "index.html" : path.slice(1);
    const contentType = filename.endsWith(".js")
      ? "text/javascript; charset=utf-8"
      : filename.endsWith(".css")
        ? "text/css; charset=utf-8"
        : "text/html; charset=utf-8";
    res.writeHead(200, {
      "content-type": contentType,
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      "referrer-policy": "no-referrer",
      "content-security-policy": "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
    });
    res.end(readFileSync(resolve(PUBLIC_DIR, filename)));
    return;
  }

  if (path === "/api/runs") {
    requireMethod(req, "POST");
    const run = createInitialRun();
    runs.set(run.runId, run);
    json(res, 201, runResponse(run));
    return;
  }

  if (path === "/api/state" || path === "/api/oracle") {
    requireMethod(req, "GET");
    const run = getRun(url.searchParams.get("run_id"));
    json(res, 200, path === "/api/state" ? runResponse(run) : oracle(run));
    return;
  }

  if (path === "/api/authorization") {
    requireMethod(req, "GET");
    const run = getRun(url.searchParams.get("run_id"));
    const sessionKind = url.searchParams.get("session_kind");
    if (sessionKind !== "current" && sessionKind !== "old") {
      throw new HttpError(400, "invalid_session_kind");
    }
    json(res, 200, probeGoldOnlyAuthorization(run, sessionKind) ?? { status: "not_observed" });
    return;
  }

  if (path === "/api/scenarios/run") {
    requireMethod(req, "POST");
    const body = await readJsonBody(req);
    if (body.scenario_id !== "silver_to_gold" && body.scenario_id !== "gold_to_silver" && body.scenario_id !== "platinum_to_gold") {
      throw new HttpError(400, "invalid_scenario_id");
    }
    const run = runScenario(body.scenario_id);
    runs.set(run.runId, run);
    json(res, 201, runResponse(run));
    return;
  }

  if (path === "/api/events/replay") {
    requireMethod(req, "POST");
    const body = await readJsonBody(req);
    if (body.replay_kind !== "duplicate_current" && body.replay_kind !== "older") {
      throw new HttpError(400, "invalid_replay_kind");
    }
    const currentRun = getRun(body.run_id);
    const replay = replayEvent(currentRun, body.replay_kind);
    runs.set(replay.run.runId, replay.run);
    json(res, 200, { ...runResponse(replay.run), replay: replay.attempt });
    return;
  }

  if (path === "/api/clock/advance") {
    requireMethod(req, "POST");
    const body = await readJsonBody(req);
    const run = getRun(body.run_id);
    const seconds = body.seconds;
    if (typeof seconds !== "number" || !Number.isInteger(seconds) || seconds < 1 || seconds > 30) {
      throw new HttpError(400, "invalid_clock_advance");
    }
    const updatedRun = { ...run, simulatedAtMs: run.simulatedAtMs + seconds * 1000 };
    runs.set(updatedRun.runId, updatedRun);
    json(res, 200, runResponse(updatedRun));
    return;
  }

  json(res, 404, { error: "not_found" });
}

const server = createServer((req, res) => {
  void handle(req, res).catch((error: unknown) => {
    if (error instanceof HttpError) {
      json(res, error.status, { error: error.code });
      return;
    }
    process.stderr.write(
      JSON.stringify({
        event: "m1_request_failed",
        message: error instanceof Error ? error.message : "unknown_error",
      }) + "\n",
    );
    json(res, 500, { error: "internal_error" });
  });
});

server.listen(PORT, HOST, () => {
  process.stdout.write("M1 synthetic demo listening on http://" + HOST + ":" + PORT + "\n");
});
