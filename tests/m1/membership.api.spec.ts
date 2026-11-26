import { expect, test } from "../support/playwright-api-test.ts";

test("M1 baseline exposes the approved synthetic seed and read-only oracles", async ({ trackedRequest: request }) => {
  const createResponse = await request.post("/api/runs");
  expect(createResponse.status()).toBe(201);

  const created = await createResponse.json();
  expect(created.state).toMatchObject({
    case_id: "M1",
    seed_id: "m1-gold-to-silver",
    user_id: "user_m1",
    tier: "gold",
    event_version: 5,
    old_session_available: true,
  });
  expect(created.state.historical_coupon).toMatchObject({
    claimed: true,
    current_status: "valid_at_seed",
    expiry_policy: "retain_until_expiry",
    exact_expiry: "2026-11-23T10:00:30.000Z",
  });
  expect(created.oracle.membership_authorization).toEqual({ status: "not_observed" });

  const oracleResponse = await request.get("/api/oracle?run_id=" + created.state.run_id);
  expect(oracleResponse.status()).toBe(200);
  expect(await oracleResponse.json()).toMatchObject({
    case_id: "M1",
    run_id: created.state.run_id,
    membership_events: { effective_tier: "gold", current_event_version: 5 },
    entitlement_ledger: {
      historical_coupon: {
        claimed: true,
        current_status: "valid_at_seed",
        expiry_policy: "retain_until_expiry",
        exact_expiry: "2026-11-23T10:00:30.000Z",
      },
    },
  });
});

test("Silver to Gold applies a strictly newer event and enables Gold-only authorization", async ({ trackedRequest: request }) => {
  const response = await request.post("/api/scenarios/run", { data: { scenario_id: "silver_to_gold" } });
  expect(response.status()).toBe(201);
  const result = await response.json();

  expect(result.state).toMatchObject({
    scenario_id: "silver_to_gold",
    tier: "gold",
    event_version: 6,
    scenario_setup: { kind: "fixture_preparation", fromTier: "gold", toTier: "silver" },
  });
  expect(result.state.membership_events).toEqual([
    expect.objectContaining({
      event_version: 6,
      event_type: "threshold_reached",
      from_tier: "silver",
      to_tier: "gold",
      disposition: "applied",
    }),
  ]);
  expect(result.oracle.membership_authorization).toMatchObject({
    rule_id: "M1-R01",
    resource: "gold-only purchase",
    session_id: "session_m1_current",
    decision: "allowed",
    effective_tier: "gold",
    event_version: 6,
  });
  const authorization = await request.get(
    "/api/authorization?run_id=" + result.state.run_id + "&session_kind=current",
  );
  expect(authorization.status()).toBe(200);
  expect(await authorization.json()).toMatchObject({
    rule_id: "M1-R01",
    session_id: "session_m1_current",
    decision: "allowed",
    effective_tier: "gold",
  });
});

test("Gold to Silver blocks the available old session from a new Gold-only purchase", async ({ trackedRequest: request }) => {
  const response = await request.post("/api/scenarios/run", { data: { scenario_id: "gold_to_silver" } });
  expect(response.status()).toBe(201);
  const result = await response.json();

  expect(result.state).toMatchObject({
    scenario_id: "gold_to_silver",
    tier: "silver",
    event_version: 6,
    old_session_available: true,
  });
  expect(result.oracle.membership_authorization).toMatchObject({
    rule_id: "M1-R02",
    resource: "gold-only purchase",
    session_kind: "old",
    session_id: "session_m1_old",
    decision: "denied",
    effective_tier: "silver",
    event_version: 6,
  });
  const authorization = await request.get(
    "/api/authorization?run_id=" + result.state.run_id + "&session_kind=old",
  );
  expect(authorization.status()).toBe(200);
  expect(await authorization.json()).toMatchObject({
    rule_id: "M1-R02",
    session_id: "session_m1_old",
    decision: "denied",
    effective_tier: "silver",
  });
});

test("M1 Platinum renewal failure applies the approved Platinum to Gold example", async ({ trackedRequest: request }) => {
  const response = await request.post("/api/scenarios/run", { data: { scenario_id: "platinum_to_gold" } });
  expect(response.status()).toBe(201);
  const result = await response.json();

  expect(result.state).toMatchObject({
    scenario_id: "platinum_to_gold",
    tier: "gold",
    event_version: 6,
    scenario_setup: { kind: "fixture_preparation", fromTier: "gold", toTier: "platinum" },
    membership_events: [
      expect.objectContaining({
        event_version: 6,
        event_type: "renewal_failed_at_period_end",
        from_tier: "platinum",
        to_tier: "gold",
        disposition: "applied",
      }),
    ],
  });
  expect(result.oracle.membership_events).toMatchObject({ effective_tier: "gold", current_event_version: 6 });
  expect(result.oracle.membership_authorization).toEqual({ status: "not_observed" });
});

test("duplicate and older event replays leave tier and event version unchanged", async ({ trackedRequest: request }) => {
  const created = await (await request.post("/api/runs")).json();
  const runId = created.state.run_id;

  const duplicateResponse = await request.post("/api/events/replay", {
    data: { run_id: runId, replay_kind: "duplicate_current" },
  });
  expect(duplicateResponse.status()).toBe(200);
  const duplicate = await duplicateResponse.json();
  expect(duplicate.replay).toMatchObject({
    requested_version: 5,
    disposition: "duplicate",
    tier_before: "gold",
    tier_after: "gold",
    version_before: 5,
    version_after: 5,
  });

  const olderResponse = await request.post("/api/events/replay", {
    data: { run_id: runId, replay_kind: "older" },
  });
  expect(olderResponse.status()).toBe(200);
  const older = await olderResponse.json();
  expect(older.replay).toMatchObject({
    requested_version: 4,
    disposition: "older",
    tier_before: "gold",
    tier_after: "gold",
    version_before: 5,
    version_after: 5,
  });
  expect(older.oracle.membership_events).toMatchObject({
    effective_tier: "gold",
    current_event_version: 5,
  });
});

test("M1-R03: a claimed synthetic coupon expires at the exact configured fake-clock boundary", async ({ trackedRequest: request }) => {
  const created = await (await request.post("/api/runs")).json();
  const beforeExpiryResponse = await request.post("/api/clock/advance", {
    data: { run_id: created.state.run_id, seconds: 29 },
  });
  expect(beforeExpiryResponse.status()).toBe(200);
  const beforeExpiry = await beforeExpiryResponse.json();
  expect(beforeExpiry.state.fake_clock).toMatchObject({
    epoch: "2026-11-23T10:00:00Z",
    now: "2026-11-23T10:00:29.000Z",
    simulated_seconds_since_start: 29,
  });
  expect(beforeExpiry.state.historical_coupon.current_status).toBe("valid");

  const atExpiryResponse = await request.post("/api/clock/advance", {
    data: { run_id: created.state.run_id, seconds: 1 },
  });
  expect(atExpiryResponse.status()).toBe(200);
  const atExpiry = await atExpiryResponse.json();
  expect(atExpiry.state.fake_clock.now).toBe("2026-11-23T10:00:30.000Z");
  expect(atExpiry.state.historical_coupon.current_status).toBe("expired");
  expect(atExpiry.oracle.entitlement_ledger.historical_coupon).toMatchObject({
    current_status: "expired",
    exact_expiry: "2026-11-23T10:00:30.000Z",
  });
});

test("unknown scenarios and invalid fake clock input fail at the API boundary", async ({ trackedRequest: request }) => {
  const unsupported = await request.post("/api/scenarios/run", {
    data: { scenario_id: "emerald_to_gold" },
  });
  expect(unsupported.status()).toBe(400);
  expect(await unsupported.json()).toMatchObject({ error: "invalid_scenario_id" });

  const created = await (await request.post("/api/runs")).json();
  const invalidClock = await request.post("/api/clock/advance", {
    data: { run_id: created.state.run_id, seconds: 31 },
  });
  expect(invalidClock.status()).toBe(400);
  expect(await invalidClock.json()).toMatchObject({ error: "invalid_clock_advance" });
});
