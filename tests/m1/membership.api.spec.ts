import { expect, test } from "@playwright/test";

test("M1 baseline exposes the approved synthetic seed and read-only oracles", async ({ request }) => {
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
    exact_expiry: null,
  });
  expect(created.oracle.membership_authorization).toEqual({ status: "not_observed" });

  const oracleResponse = await request.get("/api/oracle?run_id=" + created.state.run_id);
  expect(oracleResponse.status()).toBe(200);
  expect(await oracleResponse.json()).toMatchObject({
    case_id: "M1",
    run_id: created.state.run_id,
    membership_events: { effective_tier: "gold", current_event_version: 5 },
    entitlement_ledger: {
      historical_coupon: { claimed: true, current_status: "valid_at_seed", expiry_policy: "retain_until_expiry" },
    },
  });
});

test("Silver to Gold applies a strictly newer event and enables Gold-only authorization", async ({ request }) => {
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

test("Gold to Silver blocks the available old session from a new Gold-only purchase", async ({ request }) => {
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

test("duplicate and older event replays leave tier and event version unchanged", async ({ request }) => {
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

test("fake clock advances by a bounded amount without inventing coupon expiry", async ({ request }) => {
  const created = await (await request.post("/api/runs")).json();
  const response = await request.post("/api/clock/advance", {
    data: { run_id: created.state.run_id, seconds: 30 },
  });
  expect(response.status()).toBe(200);
  const advanced = await response.json();
  expect(advanced.state.fake_clock).toMatchObject({
    epoch: "2026-11-23T10:00:00Z",
    now: "2026-11-23T10:00:30.000Z",
    simulated_seconds_since_start: 30,
  });
  expect(advanced.state.historical_coupon.current_status).toBe("not_evaluated");
  expect(advanced.oracle.entitlement_ledger.historical_coupon.current_status).toBe("not_evaluated");
});

test("unknown scenarios and invalid fake clock input fail at the API boundary", async ({ request }) => {
  const unsupported = await request.post("/api/scenarios/run", {
    data: { scenario_id: "platinum_to_gold" },
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
