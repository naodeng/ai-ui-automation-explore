const elements = {
  campaignView: document.querySelector("#campaign-view"),
  queueView: document.querySelector("#queue-view"),
  resultView: document.querySelector("#result-view"),
  runId: document.querySelector("#run-id"),
  footerRunId: document.querySelector("#footer-run-id"),
  footerClock: document.querySelector("#footer-clock"),
  seedId: document.querySelector("#seed-id"),
  campaignStatus: document.querySelector("#campaign-status"),
  saleStatusWrap: document.querySelector("#sale-status-wrap"),
  initialStock: document.querySelector("#initial-stock"),
  perUserLimit: document.querySelector("#per-user-limit"),
  stockTotal: document.querySelector("#stock-total"),
  serverClock: document.querySelector("#server-clock"),
  saleStart: document.querySelector("#sale-start"),
  stockAvailable: document.querySelector("#stock-available"),
  stockReserved: document.querySelector("#stock-reserved"),
  stockSold: document.querySelector("#stock-sold"),
  stockPendingRelease: document.querySelector("#stock-pending-release"),
  stockReleased: document.querySelector("#stock-released"),
  oracleCampaignStatus: document.querySelector("#oracle-campaign-status"),
  oracleOrderCount: document.querySelector("#oracle-order-count"),
  oracleMovementCount: document.querySelector("#oracle-movement-count"),
  oracleObservedAt: document.querySelector("#oracle-observed-at"),
  oracleChecksum: document.querySelector("#oracle-checksum"),
  feedback: document.querySelector("#feedback"),
  purchase: document.querySelector("#purchase"),
  purchaseNote: document.querySelector("#purchase-note"),
  resultHeading: document.querySelector("#result-heading"),
  resultDescription: document.querySelector("#result-description"),
  resultOrderStatus: document.querySelector("#result-order-status"),
  resultReservationExpiry: document.querySelector("#result-reservation-expiry"),
  resultReservationRemaining: document.querySelector("#result-reservation-remaining"),
  resultStockAvailable: document.querySelector("#result-stock-available"),
  resultStockReserved: document.querySelector("#result-stock-reserved"),
  resultStockSold: document.querySelector("#result-stock-sold"),
  resultStockReleased: document.querySelector("#result-stock-released"),
  resultStockTotal: document.querySelector("#result-stock-total"),
  resultOracleOrderCount: document.querySelector("#result-oracle-order-count"),
  resultOracleMovementCount: document.querySelector("#result-oracle-movement-count"),
  resultOracleObservedAt: document.querySelector("#result-oracle-observed-at"),
  resultOracleChecksum: document.querySelector("#result-oracle-checksum"),
  resultComplete: document.querySelector("#result-complete"),
  resultCancel: document.querySelector("#result-cancel"),
  resultAdvanceClock: document.querySelector("#result-advance-clock"),
  resultFeedback: document.querySelector("#result-feedback"),
};

let currentState = null;
let currentOracle = null;
let currentOrderRunId = null;
let currentOrderId = null;

function showFeedback(message, kind = "success") {
  elements.feedback.hidden = false;
  elements.feedback.dataset.kind = kind;
  elements.feedback.textContent = message;
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    method: options.method ?? "GET",
    headers: options.body ? { "content-type": "application/json" } : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  });
  const payload = await response.json();
  if (!response.ok) {
    const error = new Error(payload.error ?? "request_failed");
    error.status = response.status;
    error.payload = payload;
    throw error;
  }
  return payload;
}

function formatUtc(value) {
  return new Date(value).toISOString().replace("T", " ").replace(".000Z", " UTC").replace("Z", " UTC");
}

function statusLabel(status) {
  if (status === "open") return "开售中";
  if (status === "sold_out") return "已售罄";
  return "活动未开始";
}

function oracleUrl(run) {
  return "/__test/oracle/flash-sale?" + new URLSearchParams({
    run_id: run.run_id,
    seed_id: run.seed_id,
    campaign_id: run.campaign_id,
    sku_id: run.sku_id,
  });
}

function render(state, oracle) {
  currentState = state;
  currentOracle = oracle;
  const buckets = state.stock_buckets;
  const status = state.campaign.status;
  const alreadyPurchased = state.orders.some((order) => order.user_id === state.user_id && order.status === "success");
  const hasActiveReservation = state.orders.some((order) => order.user_id === state.user_id && order.status === "reserved");

  elements.runId.textContent = state.run_id;
  elements.footerRunId.textContent = state.run_id;
  elements.footerClock.textContent = state.fake_clock.now;
  elements.seedId.textContent = state.seed_id;
  elements.campaignStatus.textContent = statusLabel(status);
  elements.saleStatusWrap.dataset.status = status;
  elements.initialStock.textContent = `${state.initial_stock} 件`;
  elements.perUserLimit.textContent = `${state.per_user_limit} 件`;
  elements.stockAvailable.textContent = String(buckets.available);
  elements.stockReserved.textContent = String(buckets.reserved);
  elements.stockSold.textContent = String(buckets.sold);
  elements.stockPendingRelease.textContent = String(buckets.pending_release);
  elements.stockReleased.textContent = String(buckets.released);
  elements.stockTotal.textContent = String(state.initial_stock);
  elements.serverClock.textContent = `Seed 时钟 · ${formatUtc(state.fake_clock.now)} · ${statusLabel(status)}`;
  elements.saleStart.textContent = formatUtc(state.campaign.sale_start_at);
  elements.oracleCampaignStatus.textContent = statusLabel(oracle.campaign.status);
  elements.oracleOrderCount.textContent = String(oracle.orders.length);
  elements.oracleMovementCount.textContent = String(oracle.stock_movements.length);
  elements.oracleObservedAt.textContent = oracle.observed_at;
  elements.oracleChecksum.textContent = oracle.stock_ledger_checksum;
  elements.purchase.disabled = status !== "open" || alreadyPurchased || hasActiveReservation;
  elements.purchase.textContent = alreadyPurchased
    ? "本账号已完成测试购买"
    : hasActiveReservation
      ? "本账号已有待确认预约"
    : status === "sold_out"
      ? "测试库存已售罄"
      : status === "open"
        ? "预约一次测试库存"
        : "开售后预约测试库存";
  elements.purchaseNote.textContent = alreadyPurchased
    ? "每个合成用户最多一笔有效成功购买。"
    : hasActiveReservation
      ? "当前预约确认、取消或超时释放前，不能重复预约。"
    : status === "not_started"
      ? "服务端开售前，购买操作不可用。"
      : status === "sold_out"
        ? "当前可用库存为零。"
        : "预约暂存本地合成库存；随后可模拟完成、取消或推进时钟触发超时。";
}

async function refreshRun(runId) {
  const { state } = await api("/api/state?" + new URLSearchParams({ run_id: runId }));
  const oracle = await api(oracleUrl(state));
  render(state, oracle);
}

async function createRun() {
  const result = await api("/api/runs", { method: "POST" });
  currentState = result.state;
  const url = new URL(window.location.href);
  url.pathname = "/flash-sale";
  url.search = new URLSearchParams({ run_id: result.state.run_id }).toString();
  window.history.replaceState({}, "", url);
  await refreshRun(result.state.run_id);
}

async function startCampaignPage() {
  const query = new URLSearchParams(window.location.search);
  const runId = query.get("run_id");
  if (runId) return refreshRun(runId);
  return createRun();
}

async function renderResultPage(runId, orderId) {
  const { state } = await api("/api/state?" + new URLSearchParams({ run_id: runId }));
  const oracle = await api(oracleUrl(state));
  const order = oracle.orders.find((candidate) => candidate.order_id === orderId);
  if (!order) throw new Error("result_not_found");

  currentOrderRunId = runId;
  currentOrderId = orderId;
  elements.resultView.hidden = false;
  elements.campaignView.hidden = true;
  document.querySelector("#result-order-id").textContent = order.order_id;
  elements.resultOrderStatus.textContent = order.status === "reserved"
    ? "预约中"
    : order.status === "success"
      ? "模拟完成"
      : order.status === "cancelled"
        ? "已取消并释放"
        : "超时并释放";
  elements.resultHeading.textContent = order.status === "reserved"
    ? "预约待确认"
    : order.status === "success"
      ? "测试购买成功"
      : order.status === "cancelled"
        ? "预约已释放"
        : "预约超时已释放";
  elements.resultHeading.dataset.status = order.status;
  elements.resultDescription.textContent = order.status === "reserved"
    ? "库存已由本地合成 Run 预留；请在倒计时结束前模拟完成购买或取消预约。"
    : order.status === "success"
      ? "模拟完成只更新本地订单与库存账本，不会触发支付或履约。"
      : order.status === "cancelled"
        ? "取消已将预约库存归还可用桶；你可以回到验证台重新预约。"
        : "Fake Clock 到达预约期限，库存已释放回可用桶；你可以重新预约。";
  elements.resultReservationExpiry.textContent = formatUtc(order.reservation_expires_at);
  const remainingSeconds = Math.max(0, Math.ceil((Date.parse(order.reservation_expires_at) - Date.parse(oracle.observed_at)) / 1000));
  elements.resultReservationRemaining.textContent = order.status === "reserved" ? `${remainingSeconds} 秒` : "已结束";
  elements.resultStockAvailable.textContent = String(oracle.stock_buckets.available);
  elements.resultStockReserved.textContent = String(oracle.stock_buckets.reserved);
  elements.resultStockSold.textContent = String(oracle.stock_buckets.sold);
  elements.resultStockReleased.textContent = String(oracle.stock_buckets.released);
  elements.resultStockTotal.textContent = String(state.initial_stock);
  elements.resultOracleOrderCount.textContent = String(oracle.orders.length);
  elements.resultOracleMovementCount.textContent = String(oracle.stock_movements.length);
  elements.resultOracleObservedAt.textContent = oracle.observed_at;
  elements.resultOracleChecksum.textContent = oracle.stock_ledger_checksum;
  elements.resultComplete.disabled = order.status !== "reserved";
  elements.resultCancel.disabled = order.status !== "reserved";
  elements.resultAdvanceClock.disabled = order.status !== "reserved";
  elements.resultFeedback.hidden = true;
  document.querySelector("#result-back").href = "/flash-sale?" + new URLSearchParams({ run_id: runId });
  elements.footerRunId.textContent = runId;
  elements.footerClock.textContent = oracle.observed_at;
}

async function startResultPage() {
  const query = new URLSearchParams(window.location.search);
  const runId = query.get("run_id");
  const orderId = query.get("order_id");
  if (!runId || !orderId) throw new Error("result_not_found");
  await renderResultPage(runId, orderId);
}

async function submitPurchase() {
  elements.purchase.disabled = true;
  try {
    const result = await api("/api/purchase", {
      method: "POST",
      body: {
        run_id: currentState.run_id,
        user_id: currentState.user_id,
        idempotency_key: `s1-ui-${crypto.randomUUID()}`,
      },
    });
    window.location.assign("/flash-sale/result?" + new URLSearchParams({
      run_id: currentState.run_id,
      order_id: result.order.order_id,
    }));
  } catch (error) {
    showFeedback(error instanceof Error && error.message === "user_purchase_limit_reached"
      ? "该合成用户已达到单次购买上限。"
      : "本次本地请求未成功；请检查服务端状态后再继续。", "error");
    await refreshRun(currentState.run_id);
  }
}

async function transitionOrder(action) {
  if (!currentOrderRunId || !currentOrderId) throw new Error("result_not_found");
  try {
    await api(`/api/orders/${encodeURIComponent(currentOrderId)}/${action}`, {
      method: "POST",
      body: { run_id: currentOrderRunId },
    });
    await renderResultPage(currentOrderRunId, currentOrderId);
  } catch (error) {
    elements.resultFeedback.hidden = false;
    elements.resultFeedback.dataset.kind = "error";
    elements.resultFeedback.textContent = "状态未更新；请以当前只读库存账本为准。";
  }
}

async function advanceReservationClock() {
  if (!currentOrderRunId || !currentOrderId) throw new Error("result_not_found");
  try {
    await api("/api/clock/advance", {
      method: "POST",
      body: { run_id: currentOrderRunId, seconds: 30 },
    });
    await renderResultPage(currentOrderRunId, currentOrderId);
  } catch {
    elements.resultFeedback.hidden = false;
    elements.resultFeedback.dataset.kind = "error";
    elements.resultFeedback.textContent = "模拟时钟未能推进；请检查当前 Run。";
  }
}

async function advanceClock() {
  const response = await api("/api/clock/advance", {
    method: "POST",
    body: { run_id: currentState.run_id, seconds: 1 },
  });
  await refreshRun(response.state.run_id);
}

async function initialize() {
  const path = window.location.pathname;
  if (path === "/queue") {
    elements.campaignView.hidden = true;
    elements.queueView.hidden = false;
    return;
  }

  if (path === "/flash-sale/result") {
    await startResultPage();
    return;
  }

  await startCampaignPage();
}

document.querySelector("#advance-clock").addEventListener("click", () => {
  void advanceClock().catch(() => showFeedback("模拟时钟未能推进，请检查本地服务。", "error"));
});
document.querySelector("#reset-run").addEventListener("click", () => {
  void createRun().catch(() => showFeedback("无法创建新的本地 Run。", "error"));
});
elements.purchase.addEventListener("click", () => {
  void submitPurchase();
});
elements.resultComplete.addEventListener("click", () => {
  void transitionOrder("simulate-complete");
});
elements.resultCancel.addEventListener("click", () => {
  void transitionOrder("cancel");
});
elements.resultAdvanceClock.addEventListener("click", () => {
  void advanceReservationClock();
});

void initialize().catch(() => {
  showFeedback("无法读取当前 Run 或 Oracle；请返回秒杀验证台并重置本地 Run。", "error");
});
