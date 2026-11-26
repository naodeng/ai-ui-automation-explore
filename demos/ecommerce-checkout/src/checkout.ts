import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse } from "yaml";

interface E1Scenario {
  coupon_code: string;
  threshold_subtotal: number;
  discount_amount: number;
  below_threshold_subtotal: number;
  shipping: number;
  tax: number;
}

interface E1Contract {
  case_id: string;
  status: string;
  contract_version: string;
  scenario: E1Scenario;
  rules: Array<{ id: string; oracle: string }>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readContract(): E1Contract {
  const document = parse(readFileSync(resolve(process.cwd(), "contracts/cases/E1.yaml"), "utf8")) as unknown;
  if (!isRecord(document) || document.case_id !== "E1" || document.status !== "approved_for_demo") {
    throw new Error("E1 contract must exist and be approved_for_demo before the demo starts");
  }
  if (typeof document.contract_version !== "string" || !isRecord(document.scenario) || !Array.isArray(document.rules)) {
    throw new Error("E1 contract is missing its version, scenario, or rules");
  }
  const expectedRules = new Map([["E1-R01", "checkout_quote"], ["E1-R02", "order_ledger"], ["E1-R03", "order_ledger"], ["E1-R04", "coupon_ledger"]]);
  for (const [id, oracle] of expectedRules) {
    const rule = document.rules.find((item) => isRecord(item) && item.id === id);
    if (!isRecord(rule) || rule.oracle !== oracle) {
      throw new Error(`${id} must use the ${oracle} Oracle`);
    }
  }

  const scenario = document.scenario;
  for (const field of ["coupon_code", "threshold_subtotal", "discount_amount", "below_threshold_subtotal", "shipping", "tax"] as const) {
    const value = scenario[field];
    if (field === "coupon_code" ? typeof value !== "string" : typeof value !== "number" || !Number.isFinite(value)) {
      throw new Error(`E1 contract scenario has an invalid ${field}`);
    }
  }
  return document as unknown as E1Contract;
}

function toCents(amount: number): number {
  const cents = Math.round(amount * 100);
  if (!Number.isSafeInteger(cents) || cents < 0 || Math.abs(amount * 100 - cents) > 0.000001) {
    throw new Error("E1 contract amounts must be non-negative values with at most two decimals");
  }
  return cents;
}

export const E1_CONTRACT = readContract();
const scenario = E1_CONTRACT.scenario;

export const E1_POLICY = {
  contract_version: E1_CONTRACT.contract_version,
  coupon_code: scenario.coupon_code,
  threshold_cents: toCents(scenario.threshold_subtotal),
  discount_cents: toCents(scenario.discount_amount),
  shipping_cents: toCents(scenario.shipping),
  tax_cents: toCents(scenario.tax),
};

export const E1_CATALOG = {
  "E1-99": {
    sku_id: "E1-99",
    name: "结算边界演示商品",
    subtotal_cents: toCents(scenario.below_threshold_subtotal),
  },
  "E1-100": {
    sku_id: "E1-100",
    name: "结算边界演示商品",
    subtotal_cents: E1_POLICY.threshold_cents,
  },
} as const;

export type E1SkuId = keyof typeof E1_CATALOG;

export interface QuoteAmounts {
  subtotal_cents: number;
  coupon_code: string;
  discount_cents: number;
  shipping_cents: number;
  tax_cents: number;
  payable_cents: number;
}

export function calculateQuote(input: { subtotalCents: number; couponCode: string; couponAvailable?: boolean }): QuoteAmounts {
  const { subtotalCents, couponCode } = input;
  if (!Number.isSafeInteger(subtotalCents) || subtotalCents < 0) {
    throw new RangeError("subtotal must be a non-negative integer amount in cents");
  }

  const discount = (input.couponAvailable ?? true) && couponCode === E1_POLICY.coupon_code && subtotalCents >= E1_POLICY.threshold_cents
    ? E1_POLICY.discount_cents
    : 0;
  return {
    subtotal_cents: subtotalCents,
    coupon_code: couponCode,
    discount_cents: discount,
    shipping_cents: E1_POLICY.shipping_cents,
    tax_cents: E1_POLICY.tax_cents,
    payable_cents: subtotalCents - discount + E1_POLICY.shipping_cents + E1_POLICY.tax_cents,
  };
}
