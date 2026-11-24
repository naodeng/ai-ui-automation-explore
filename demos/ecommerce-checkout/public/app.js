const runId = new URL(window.location.href).searchParams.get("run_id") || "e1-local";
const scenario = document.querySelector("#cart-scenario");
const itemPrice = document.querySelector("#item-price");
const subtotal = document.querySelector("#subtotal");
const discount = document.querySelector("#discount");
const payable = document.querySelector("#payable-value");
const couponNote = document.querySelector("#coupon-note");
const couponState = document.querySelector("#coupon-state");
const createOrderButton = document.querySelector("#create-order");
const orderMessage = document.querySelector("#order-message");

let activeQuoteId;
let idempotencyKey = crypto.randomUUID();

function money(cents) {
  return `¥${(cents / 100).toFixed(2)}`;
}

function showMessage(message, isError = false) {
  orderMessage.textContent = message;
  orderMessage.classList.toggle("error", isError);
  orderMessage.style.display = "block";
}

function clearMessage() {
  orderMessage.textContent = "";
  orderMessage.classList.remove("error");
  orderMessage.style.display = "none";
}

async function requestJson(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: { "content-type": "application/json", ...options.headers },
  });
  let body;
  try {
    body = await response.json();
  } catch {
    throw new Error("服务暂不可用，请稍后重试。");
  }
  if (!response.ok) {
    const messages = {
      invalid_run_id: "本次测试 Run 标识无效，请刷新页面。",
      unsupported_coupon: "当前演示只支持优惠券 C20。",
      quote_not_found: "报价已失效，请重新确认金额。",
    };
    throw new Error(messages[body.error] ?? "服务暂不可用，请稍后重试。");
  }
  return body;
}

function renderCart(cart) {
  scenario.value = cart.sku_id;
  itemPrice.textContent = money(cart.subtotal_cents);
  subtotal.textContent = money(cart.subtotal_cents);
}

function renderQuote(quote) {
  const eligible = quote.discount_cents > 0;
  discount.textContent = `− ${money(quote.discount_cents)}`;
  payable.textContent = (quote.payable_cents / 100).toFixed(2);
  couponNote.textContent = eligible
    ? "已满足使用条件"
    : `还差 ${money(Math.max(0, 10_000 - quote.subtotal_cents))} 可使用`;
  couponState.textContent = eligible ? "已应用" : "未达到门槛";
  couponState.style.color = eligible ? "var(--green)" : "var(--orange)";
}

async function refreshQuote() {
  clearMessage();
  createOrderButton.disabled = true;
  const cart = await requestJson(`/api/cart?run_id=${encodeURIComponent(runId)}`);
  renderCart(cart);
  const quote = await requestJson("/api/checkout/quote", {
    method: "POST",
    body: JSON.stringify({ run_id: runId, coupon_code: "C20" }),
  });
  activeQuoteId = quote.quote_id;
  idempotencyKey = crypto.randomUUID();
  renderQuote(quote);
  createOrderButton.disabled = false;
}

scenario.addEventListener("change", async () => {
  createOrderButton.disabled = true;
  scenario.disabled = true;
  clearMessage();
  try {
    await requestJson("/api/cart/select", {
      method: "POST",
      body: JSON.stringify({ run_id: runId, sku_id: scenario.value }),
    });
    await refreshQuote();
  } catch (error) {
    showMessage(error instanceof Error ? error.message : "购物车金额更新失败，请重试。", true);
  } finally {
    scenario.disabled = false;
  }
});

createOrderButton.addEventListener("click", async () => {
  if (!activeQuoteId || createOrderButton.disabled) return;
  createOrderButton.disabled = true;
  createOrderButton.textContent = "正在创建…";
  clearMessage();
  try {
    const order = await requestJson("/api/orders", {
      method: "POST",
      body: JSON.stringify({
        run_id: runId,
        quote_id: activeQuoteId,
        idempotency_key: idempotencyKey,
      }),
    });
    showMessage(`沙盒订单已创建 · ${order.order_id} · ${money(order.payable_cents)}`);
    createOrderButton.textContent = "订单已创建";
  } catch (error) {
    showMessage(error instanceof Error ? error.message : "订单创建失败；没有收到成功确认。", true);
    createOrderButton.disabled = false;
    createOrderButton.textContent = "重试创建沙盒订单";
  }
});

refreshQuote().catch((error) => {
  showMessage(error instanceof Error ? error.message : "报价暂不可用，请刷新后重试。", true);
});
