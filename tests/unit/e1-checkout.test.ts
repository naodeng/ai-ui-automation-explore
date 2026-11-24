import assert from "node:assert/strict";
import test from "node:test";
import { calculateQuote } from "../../demos/ecommerce-checkout/src/checkout.ts";

test("E1-R01: C20 reduces the 100-unit subtotal by 20", () => {
  assert.deepEqual(calculateQuote({ subtotalCents: 10_000, couponCode: "C20" }), {
    subtotal_cents: 10_000,
    coupon_code: "C20",
    discount_cents: 2_000,
    shipping_cents: 0,
    tax_cents: 0,
    payable_cents: 8_000,
  });
});

test("E1-R01: C20 does not discount the 99-unit subtotal", () => {
  assert.deepEqual(calculateQuote({ subtotalCents: 9_900, couponCode: "C20" }), {
    subtotal_cents: 9_900,
    coupon_code: "C20",
    discount_cents: 0,
    shipping_cents: 0,
    tax_cents: 0,
    payable_cents: 9_900,
  });
});

test("rejects a negative subtotal at the domain boundary", () => {
  assert.throws(() => calculateQuote({ subtotalCents: -1, couponCode: "C20" }), /subtotal/i);
});
