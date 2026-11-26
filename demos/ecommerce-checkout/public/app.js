const pageUrl = new URL(window.location.href);
let runId = pageUrl.searchParams.get("run_id");
if (!runId) {
  runId = `e1-${crypto.randomUUID()}`;
  pageUrl.searchParams.set("run_id", runId);
  window.history.replaceState(null, "", pageUrl);
}
const scenario = document.querySelector("#cart-scenario");
const itemPrice = document.querySelector("#item-price");
const subtotal = document.querySelector("#subtotal");
const discount = document.querySelector("#discount");
const payable = document.querySelector("#payable-value");
const couponNote = document.querySelector("#coupon-note");
const couponState = document.querySelector("#coupon-state");
const createOrderButton = document.querySelector("#create-order");
const orderMessage = document.querySelector("#order-message");
const checkoutIntro = document.querySelector("#checkout-intro");
const checkoutLayout = document.querySelector("#checkout-layout");
const lifecycleView = document.querySelector("#lifecycle-view");
const pageTitle = document.querySelector("#page-title");
const introCopy = document.querySelector(".intro-copy");
const lifecycleSubtotal = document.querySelector("#lifecycle-subtotal");
const lifecycleDiscount = document.querySelector("#lifecycle-discount");
const lifecyclePayable = document.querySelector("#lifecycle-payable-value");
const lifecycleBanner = document.querySelector("#lifecycle-banner");
const lifecycleIcon = document.querySelector("#lifecycle-icon");
const lifecycleStatusLabel = document.querySelector("#lifecycle-status-label");
const lifecycleCouponStatus = document.querySelector("#lifecycle-coupon-status");
const lifecycleCouponNote = document.querySelector("#lifecycle-coupon-note");
const lifecycleActions = document.querySelector("#lifecycle-actions");
const lifecycleResult = document.querySelector("#lifecycle-result");
const lifecycleResultHeading = document.querySelector("#lifecycle-result-heading");
const lifecycleResultMessage = document.querySelector("#lifecycle-result-message");
const lifecycleMessage = document.querySelector("#lifecycle-message");
const returnToCheckoutButton = document.querySelector("#return-to-checkout");
const simulatePaymentButton = document.querySelector("#simulate-payment");
const cancelOrderButton = document.querySelector("#cancel-order");

let activeQuote;
let activeOrder;
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
      coupon_unavailable: "优惠券已被另一笔订单锁定或模拟使用，请重新获取报价。",
      invalid_order_transition: "当前订单状态不支持此操作。",
      order_not_found: "沙盒订单不存在，请返回结算后重新创建。",
      run_not_found: "本次演示 Run 不存在，请刷新页面。",
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
  if (eligible) {
    couponNote.textContent = "已满足使用条件";
    couponState.textContent = "已应用";
    couponState.style.color = "var(--green)";
  } else if (quote.coupon_status === "reserved") {
    couponNote.textContent = "优惠券已锁定在另一笔待处理订单";
    couponState.textContent = "已锁定";
    couponState.style.color = "var(--orange)";
  } else if (quote.coupon_status === "sandbox_redeemed") {
    couponNote.textContent = "本 Run 中优惠券已模拟使用";
    couponState.textContent = "模拟已使用";
    couponState.style.color = "var(--orange)";
  } else {
    couponNote.textContent = `还差 ${money(Math.max(0, 10_000 - quote.subtotal_cents))} 可使用`;
    couponState.textContent = "未达到门槛";
    couponState.style.color = "var(--orange)";
  }
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
  activeQuote = quote;
  idempotencyKey = crypto.randomUUID();
  renderQuote(quote);
  createOrderButton.disabled = false;
}

function renderSteps(order) {
  const steps = [...document.querySelectorAll(".steps .step")];
  const terminal = order.status !== "sandbox_created";
  steps.forEach((step, index) => {
    const number = step.querySelector(".step-number");
    step.classList.remove("current", "complete");
    if (index === 0 || (terminal && index === 1)) {
      step.classList.add("complete");
      number.textContent = "✓";
    } else {
      number.textContent = String(index + 1);
    }
  });
  if (!terminal) steps[1].classList.add("current");
  else steps[2].classList.add("current");
}

function renderLifecycle(order) {
  activeOrder = order;
  const hasCoupon = activeQuote.discount_cents > 0;
  const paid = order.status === "sandbox_paid";
  const cancelled = order.status === "cancelled";
  simulatePaymentButton.disabled = order.status !== "sandbox_created";
  cancelOrderButton.disabled = order.status !== "sandbox_created";
  checkoutLayout.hidden = true;
  lifecycleView.hidden = false;
  clearLifecycleMessage();
  renderSteps(order);

  lifecycleSubtotal.textContent = money(activeQuote.subtotal_cents);
  lifecycleDiscount.textContent = `− ${money(activeQuote.discount_cents)}`;
  lifecyclePayable.textContent = (activeQuote.payable_cents / 100).toFixed(2);
  lifecycleBanner.classList.toggle("success", paid);
  lifecycleIcon.textContent = paid ? "✓" : cancelled ? "×" : "◷";
  lifecycleStatusLabel.textContent = paid ? "沙盒模拟支付完成" : cancelled ? "已取消" : "待模拟支付";

  lifecycleCouponStatus.textContent = hasCoupon
    ? paid ? "模拟已使用" : cancelled ? "已释放" : "已锁定"
    : "未使用";
  lifecycleCouponNote.textContent = paid
    ? hasCoupon ? "该状态只记录在本地演示账本" : "订单未使用优惠券，模拟支付状态已记录在本地账本"
    : cancelled
      ? hasCoupon ? "优惠券可用于新的沙盒订单" : "订单已取消，可返回结算创建新订单"
      : hasCoupon ? "本地沙盒订单正在等待模拟支付" : "当前 ¥99 购物车未达到 C20 使用门槛";

  lifecycleActions.hidden = paid || cancelled;
  lifecycleResult.hidden = !paid && !cancelled;
  if (paid || cancelled) {
    lifecycleResultHeading.textContent = paid ? "完成结果" : "取消结果";
    lifecycleResultMessage.textContent = paid ? "✓  模拟支付完成" : "×  订单已取消";
    lifecycleResultMessage.classList.toggle("cancelled", cancelled);
    returnToCheckoutButton.hidden = !cancelled;
  }

  pageTitle.textContent = paid ? "沙盒模拟支付完成" : cancelled ? "沙盒订单已取消" : "沙盒订单待支付";
  introCopy.textContent = paid
    ? "本地模拟订单状态已更新，不代表真实支付或优惠券核销。"
    : cancelled
      ? "本地沙盒订单已取消，不会产生退款或发货。"
      : "本地模拟订单，不会真实扣款或发货。";
}

function clearLifecycleMessage() {
  lifecycleMessage.textContent = "";
  lifecycleMessage.classList.remove("visible");
}

function showLifecycleMessage(message) {
  lifecycleMessage.textContent = message;
  lifecycleMessage.classList.add("visible");
}

async function transitionOrder(action) {
  if (!activeOrder) return;
  simulatePaymentButton.disabled = true;
  cancelOrderButton.disabled = true;
  clearLifecycleMessage();
  try {
    const updatedOrder = await requestJson(`/api/orders/${encodeURIComponent(activeOrder.order_id)}/${action}`, {
      method: "POST",
      body: JSON.stringify({ run_id: runId }),
    });
    renderLifecycle(updatedOrder);
  } catch (error) {
    showLifecycleMessage(error instanceof Error ? error.message : "订单状态更新失败，请重试。");
    simulatePaymentButton.disabled = false;
    cancelOrderButton.disabled = false;
  }
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
  if (!activeQuote || createOrderButton.disabled) return;
  createOrderButton.disabled = true;
  createOrderButton.textContent = "正在创建…";
  clearMessage();
  try {
    const order = await requestJson("/api/orders", {
      method: "POST",
      body: JSON.stringify({
        run_id: runId,
        quote_id: activeQuote.quote_id,
        idempotency_key: idempotencyKey,
      }),
    });
    renderLifecycle(order);
  } catch (error) {
    showMessage(error instanceof Error ? error.message : "订单创建失败；没有收到成功确认。", true);
    createOrderButton.disabled = false;
    createOrderButton.textContent = "重试创建沙盒订单";
  }
});

simulatePaymentButton.addEventListener("click", () => transitionOrder("simulate-payment"));
cancelOrderButton.addEventListener("click", () => transitionOrder("cancel"));
returnToCheckoutButton.addEventListener("click", async () => {
  activeOrder = undefined;
  lifecycleView.hidden = true;
  checkoutLayout.hidden = false;
  pageTitle.textContent = "确认订单";
  introCopy.textContent = "检查优惠与应付金额，然后创建一笔本地沙盒订单。";
  renderSteps({ status: "sandbox_created" });
  createOrderButton.textContent = "创建沙盒订单";
  await refreshQuote().catch((error) => showMessage(error instanceof Error ? error.message : "报价暂不可用，请刷新后重试。", true));
});

refreshQuote().catch((error) => {
  showMessage(error instanceof Error ? error.message : "报价暂不可用，请刷新后重试。", true);
});
