import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { resolve } from "node:path";

const page = readFileSync(resolve("demos/ecommerce-checkout/public/index.html"), "utf8");
const title = page.match(/<title>(.*?)<\/title>/)?.[1] ?? "";
const description = page.match(/<meta name="description" content="(.*?)"\s*\/>/)?.[1] ?? "";

test("E1 checkout page metadata describes the local sandbox demo", () => {
  assert.match(title, /本地沙盒 Demo/);
  assert.doesNotMatch(title, /原型|prototype|评审/i);
  assert.match(description, /本地合成数据/);
  assert.match(description, /不会触发真实支付或发货/);
});
