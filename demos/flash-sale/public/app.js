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
};

let currentState = null;
let currentOracle = null;

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
    user_id: run.user_id,
  });
}

function render(state, oracle) {
  currentState = state;
  currentOracle = oracle;
  const buckets = state.stock_buckets;
  const status = state.campaign.status;
  const alreadyPurchased = state.orders.some((order) => order.user_id === state.user_id && order.status === "success");

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
  elements.purchase.disabled = status !== "open" || alreadyPurchased;
  elements.purchase.textContent = alreadyPurchased ? "本账号已完成测试购买" : status === "open" ? "提交一次测试购买" : "开售后提交测试购买";
  elements.purchaseNote.textContent = alreadyPurchased
    ? "每个合成用户最多一笔有效成功购买。"
    : status === "not_started"
      ? "服务端开售前，购买操作不可用。"
      : status === "sold_out"
        ? "当前可用库存为零。"
        : "仅提交一次本地合成购买，不产生真实订单或支付。";
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

async function startResultPage() {
  const query = new URLSearchParams(window.location.search);
  const runId = query.get("run_id");
  const orderId = query.get("order_id");
  if (!runId || !orderId) throw new Error("result_not_found");

  const { state } = await api("/api/state?" + new URLSearchParams({ run_id: runId }));
  const oracle = await api(oracleUrl(state));
  const order = oracle.orders.find((candidate) => candidate.order_id === orderId);
  if (!order) throw new Error("result_not_found");

  elements.resultView.hidden = false;
  elements.campaignView.hidden = true;
  document.querySelector("#result-order-id").textContent = order.order_id;
  document.querySelector("#result-stock-available").textContent = String(oracle.stock_buckets.available);
  document.querySelector("#result-stock-sold").textContent = String(oracle.stock_buckets.sold);
  document.querySelector("#result-back").href = "/flash-sale?" + new URLSearchParams({ run_id: runId });
  elements.footerRunId.textContent = runId;
  elements.footerClock.textContent = oracle.observed_at;
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
    showFeedback(error.message === "user_purchase_limit_reached" ? "该合成用户已达到单次购买上限。" : "本次本地请求未成功；请检查服务端状态后再继续。", "error");
    await refreshRun(currentState.run_id);
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

void initialize().catch(() => {
  showFeedback("无法读取当前 Run 或 Oracle；请返回秒杀验证台并重置本地 Run。", "error");
});
