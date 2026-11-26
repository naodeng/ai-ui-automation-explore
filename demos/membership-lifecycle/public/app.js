const feedback = document.querySelector("#feedback");
const runResult = document.querySelector("#run-result");
const actionButtons = Array.from(document.querySelectorAll("button"));
let runId = new URLSearchParams(window.location.search).get("run_id");
let feedbackTimer;

const errorMessages = {
  invalid_run_id: "本地 Run 标识无效，请重置合成夹具。",
  run_not_found: "此 Run 不在当前本地服务中，请重置合成夹具。",
  invalid_scenario_id: "当前场景不在 M1 合成契约范围内。",
  invalid_replay_kind: "事件重放请求无效。",
  invalid_clock_advance: "模拟时钟每次只能推进 1 到 30 秒。",
  membership_event_version_must_increase: "事件版本没有递增，状态未改变。",
  membership_event_source_tier_mismatch: "当前等级与场景起始条件不一致，状态未改变。",
};

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}

function showFeedback(message, isError = false) {
  feedback.textContent = message;
  feedback.dataset.kind = isError ? "error" : "success";
  feedback.hidden = false;
  window.clearTimeout(feedbackTimer);
  feedbackTimer = window.setTimeout(() => {
    feedback.hidden = true;
  }, 5200);
}

function showRunResult(message, isWarning = false) {
  runResult.textContent = message;
  runResult.dataset.kind = isWarning ? "warning" : "observed";
  runResult.hidden = false;
}

function setCheckStatus(id, message, kind = "pending") {
  const element = document.getElementById(id);
  if (!element) return;
  element.textContent = message;
  element.dataset.kind = kind;
}

function setBusy(isBusy) {
  for (const button of actionButtons) button.disabled = isBusy;
}

function parseRunResponse(value) {
  if (!isRecord(value) || !isRecord(value.state) || !isRecord(value.oracle)) {
    throw new Error("本地服务返回的状态格式无效。");
  }
  const state = value.state;
  const oracle = value.oracle;
  if (
    typeof state.run_id !== "string" ||
    typeof state.seed_id !== "string" ||
    typeof state.user_id !== "string" ||
    !["normal", "silver", "gold", "platinum"].includes(state.tier) ||
    !Number.isSafeInteger(state.event_version) ||
    typeof state.old_session_available !== "boolean" ||
    !isRecord(state.fake_clock) ||
    typeof state.fake_clock.now !== "string" ||
    !Array.isArray(state.membership_events) ||
    !Array.isArray(state.replay_attempts) ||
    !isRecord(state.historical_coupon)
  ) {
    throw new Error("本地服务返回的会员状态不完整。");
  }
  if (
    oracle.case_id !== "M1" ||
    typeof oracle.run_id !== "string" ||
    !isRecord(oracle.membership_events) ||
    !isRecord(oracle.entitlement_ledger)
  ) {
    throw new Error("只读 Oracle 返回的数据不完整。");
  }
  return { state, oracle, replay: isRecord(value.replay) ? value.replay : null };
}

async function requestJson(path, options = {}) {
  const headers = { accept: "application/json", ...options.headers };
  if (options.body !== undefined) headers["content-type"] = "application/json";
  const response = await fetch(path, { ...options, headers });
  let body;
  try {
    body = await response.json();
  } catch {
    throw new Error("本地服务暂不可用，请稍后重试。");
  }
  if (!response.ok) {
    const message = isRecord(body) && typeof body.error === "string"
      ? errorMessages[body.error]
      : undefined;
    throw new Error(message ?? "本地服务暂不可用，请稍后重试。");
  }
  return body;
}

function formatTier(tier) {
  const labels = { normal: "Normal", silver: "Silver", gold: "Gold", platinum: "Platinum" };
  return labels[tier] ?? "未知";
}

function setUrlRunId(nextRunId) {
  runId = nextRunId;
  const nextUrl = new URL(window.location.href);
  nextUrl.searchParams.set("run_id", runId);
  window.history.replaceState(null, "", nextUrl);
}

function renderReplayStatus(attempts) {
  if (attempts.length === 0) {
    setCheckStatus("check-r04", "待运行");
    return;
  }
  const latest = attempts[attempts.length - 1];
  const versionText = "v" + latest.requested_version + " " + (latest.disposition === "duplicate" ? "重复" : "较旧");
  const unchanged = latest.tier_before === latest.tier_after && latest.version_before === latest.version_after;
  setCheckStatus(
    "check-r04",
    "合成观察：" + versionText + (unchanged ? " · 状态未变" : " · 状态已变"),
    unchanged ? "observed" : "pending",
  );
}

function renderScenarioChecks(state, oracle) {
  const authorization = oracle.membership_authorization;
  if (!isRecord(authorization) || typeof authorization.rule_id !== "string") return;
  const decision = authorization.decision === "allowed" ? "允许" : "拒绝";
  const sessionText = authorization.session_kind === "old" ? "旧会话" : "当前会话";
  const observation = "合成观察：" + sessionText + decision + "发起 Gold-only 购买";
  if (authorization.rule_id === "M1-R01") setCheckStatus("check-r01", observation, "observed");
  if (authorization.rule_id === "M1-R02") setCheckStatus("check-r02", observation, "observed");
  const serverMembership = oracle.membership_events;
  const synchronized =
    isRecord(serverMembership) &&
    state.tier === serverMembership.effective_tier &&
    state.event_version === serverMembership.current_event_version &&
    state.fake_clock.now === oracle.observed_at &&
    authorization.observed_at === oracle.observed_at;
  if (synchronized) setCheckStatus("check-r05", "本地观察：0 个模拟秒（即时同步）", "observed");
}

function renderResponse(value) {
  const response = parseRunResponse(value);
  const state = response.state;
  const membership = response.oracle.membership_events;
  const authorization = response.oracle.membership_authorization;
  const entitlement = response.oracle.entitlement_ledger;

  setUrlRunId(state.run_id);
  setText("run-meta", "Run " + state.run_id);
  setText("footer-run-id", state.run_id);
  setText("member-id", state.user_id);
  setText("member-tier", formatTier(state.tier));
  document.getElementById("member-tier").dataset.tier = state.tier;
  setText("event-version", "v" + state.event_version);
  setText("old-session", state.old_session_available ? "可用" : "不可用");
  setText("footer-clock", state.fake_clock.now.replace("T", " ").replace(".000Z", " UTC"));
  setText("oracle-tier", formatTier(membership.effective_tier));
  setText("oracle-events", membership.transitions.length + " 条变更 · " + membership.replay_attempts.length + " 次重放");

  if (isRecord(authorization) && authorization.status === "not_observed") {
    setText("oracle-authorization", "尚未探测");
  } else if (isRecord(authorization) && typeof authorization.decision === "string") {
    setText(
      "oracle-authorization",
      authorization.decision === "allowed" ? "允许 · 合成观察" : "拒绝 · 合成观察",
    );
  } else {
    setText("oracle-authorization", "未读取");
  }

  if (isRecord(entitlement.historical_coupon)) {
    const couponStatus = entitlement.historical_coupon.current_status === "expired"
      ? "已领取 · 已过期（本地模拟）"
      : entitlement.historical_coupon.current_status === "valid_at_seed"
        ? "已领取 · Seed 时点有效"
        : "已领取 · 到期前有效（本地模拟）";
    setText("oracle-coupon", couponStatus);
  }
  setText("oracle-observed-at", "Oracle 观察时间（模拟）：" + response.oracle.observed_at);
  setText(
    "replay-duplicate",
    "重放当前版本 v" + state.event_version,
  );
  setText(
    "replay-older",
    "重放较旧版本 v" + Math.max(1, state.event_version - 1),
  );
  const couponStatus = state.historical_coupon.current_status;
  const couponAtSeed = couponStatus === "valid_at_seed";
  const couponExpired = couponStatus === "expired";
  setText(
    "coupon-status",
    couponExpired ? "已过期（本地模拟）" : couponAtSeed ? "Seed 时点有效" : "到期前有效（本地模拟）",
  );
  setCheckStatus(
    "check-r03",
    couponExpired ? "到期边界：已过期" : couponAtSeed ? "夹具观察：Seed 时点有效" : "到期前仍有效",
    "observed",
  );
  renderReplayStatus(membership.replay_attempts);
  renderScenarioChecks(state, response.oracle);
  return response;
}

function resetVisibleChecks() {
  setCheckStatus("check-r01", "待运行");
  setCheckStatus("check-r02", "待运行");
  setCheckStatus("check-r03", "夹具：Seed 时点有效", "observed");
  setCheckStatus("check-r04", "待运行");
  setCheckStatus("check-r05", "待运行");
  runResult.hidden = true;
}

async function createFreshRun() {
  setBusy(true);
  try {
    const response = await requestJson("/api/runs", { method: "POST" });
    const rendered = renderResponse(response);
    resetVisibleChecks();
    setText("oracle-authorization", "尚未探测");
    setText("oracle-events", "暂无变更事件");
    showFeedback("已创建新的合成 Run，状态已恢复到固定 Seed。");
    return rendered;
  } catch (error) {
    showFeedback(error instanceof Error ? error.message : "重置合成夹具失败。", true);
  } finally {
    setBusy(false);
  }
}

async function boot() {
  setBusy(true);
  try {
    if (runId) {
      const response = await requestJson("/api/state?run_id=" + encodeURIComponent(runId));
      renderResponse(response);
    } else {
      const response = await requestJson("/api/runs", { method: "POST" });
      renderResponse(response);
    }
  } catch (error) {
    showFeedback(error instanceof Error ? error.message : "无法读取 M1 合成状态。", true);
    setText("run-meta", "需要重置本地 Run");
  } finally {
    setBusy(false);
  }
}

async function runScenario(scenarioId) {
  setBusy(true);
  runResult.hidden = true;
  try {
    const body = await requestJson("/api/scenarios/run", {
      method: "POST",
      body: JSON.stringify({ scenario_id: scenarioId }),
    });
    const response = renderResponse(body);
    const observation = response.oracle.membership_authorization;
    const labels = {
      silver_to_gold: "Silver → Gold",
      gold_to_silver: "Gold → Silver",
      platinum_to_gold: "Platinum → Gold",
    };
    const result = labels[scenarioId] + " · 事件版本 v" + response.state.event_version;
    if (isRecord(observation) && typeof observation.decision === "string") {
      const decision = observation.decision === "allowed" ? "允许" : "拒绝";
      showRunResult(result + "；Gold-only 授权 Oracle：" + decision + "。这是本地合成 Run 的观察结果。");
    } else {
      showRunResult(result + "；本场景未采集 Gold-only 授权。仅显示等级迁移观察。");
    }
    showFeedback("场景已在独立合成 Run 中执行；页面显示当前服务端返回的状态。");
  } catch (error) {
    showFeedback(error instanceof Error ? error.message : "场景执行失败；请重置后重试。", true);
  } finally {
    setBusy(false);
  }
}

async function replayEvent(replayKind) {
  if (!runId) {
    showFeedback("请先创建本地 Run。", true);
    return;
  }
  setBusy(true);
  try {
    const body = await requestJson("/api/events/replay", {
      method: "POST",
      body: JSON.stringify({ run_id: runId, replay_kind: replayKind }),
    });
    const response = renderResponse(body);
    const attempt = response.replay;
    const label = attempt.disposition === "duplicate" ? "重复" : "较旧";
    showRunResult(
      "已重放事件版本 v" + attempt.requested_version + "（" + label + "）；等级 " +
        formatTier(attempt.tier_before) + "、版本 v" + attempt.version_before + " 均未改变。",
    );
    showFeedback("重放请求已记录到只读事件 Oracle。");
  } catch (error) {
    showFeedback(error instanceof Error ? error.message : "事件重放失败。", true);
  } finally {
    setBusy(false);
  }
}

async function advanceClock() {
  if (!runId) {
    showFeedback("请先创建本地 Run。", true);
    return;
  }
  setBusy(true);
  try {
    const body = await requestJson("/api/clock/advance", {
      method: "POST",
      body: JSON.stringify({ run_id: runId, seconds: 30 }),
    });
    renderResponse(body);
    showRunResult("模拟时钟已推进 30 秒。当前界面已读取最新服务端状态；本次不是独立的 SLA 回归证据。");
    showFeedback("模拟时钟已推进 30 秒；优惠券不会在未定义的过期时间上自动失效。");
  } catch (error) {
    showFeedback(error instanceof Error ? error.message : "模拟时钟推进失败。", true);
  } finally {
    setBusy(false);
  }
}

document.getElementById("reset-run").addEventListener("click", createFreshRun);
document.querySelectorAll("[data-scenario]").forEach((button) => {
  button.addEventListener("click", () => runScenario(button.dataset.scenario));
});
document.getElementById("replay-duplicate").addEventListener("click", () => replayEvent("duplicate_current"));
document.getElementById("replay-older").addEventListener("click", () => replayEvent("older"));
document.getElementById("advance-clock").addEventListener("click", advanceClock);

boot();
