import { test } from "node:test";
import assert from "node:assert/strict";
import { isActivePath } from "../lib/nav.js";

test("root only matches exactly", () => {
  assert.equal(isActivePath("/", "/"), true);
  assert.equal(isActivePath("/marketplace", "/"), false);
  assert.equal(isActivePath("/docs/", "/"), false);
});

test("matches nested routes", () => {
  assert.equal(isActivePath("/marketplace", "/marketplace"), true);
  assert.equal(isActivePath("/marketplace/INV_1", "/marketplace"), true);
  assert.equal(isActivePath("/marketplace/INV_1/fund", "/marketplace"), true);
});

test("does not match sibling routes sharing a prefix", () => {
  assert.equal(isActivePath("/submit-guide", "/submit"), false);
  assert.equal(isActivePath("/marketplaces", "/marketplace"), false);
  assert.equal(isActivePath("/docs", "/submit"), false);
});

test("ignores trailing slashes", () => {
  assert.equal(isActivePath("/submit/", "/submit"), true);
  assert.equal(isActivePath("/submit", "/submit/"), true);
  assert.equal(isActivePath("/marketplace/INV_1/", "/marketplace"), true);
  assert.equal(isActivePath("//", "/"), true);
});

test("handles empty or invalid input", () => {
  assert.equal(isActivePath("", "/"), true);
  assert.equal(isActivePath(null, "/"), false);
  assert.equal(isActivePath("/docs", undefined), false);
});
