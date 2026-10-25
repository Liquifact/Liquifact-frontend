import { test } from "node:test";
import assert from "node:assert/strict";
import { pickFeatured } from "../lib/featured.js";

const NOW = Date.parse("2026-10-01T00:00:00Z");
const DAY = 24 * 60 * 60 * 1000;
const due = (days) => new Date(NOW + days * DAY).toISOString().slice(0, 10);
const inv = (o) => ({ status: "open", amount: 100, fundedAmount: 10, yieldBps: 500, dueDate: due(30), ...o });

test("picks the highest-yield qualifying open invoice", () => {
  const pick = pickFeatured([inv({ id: "A", yieldBps: 600 }), inv({ id: "B", yieldBps: 900 }), inv({ id: "C", yieldBps: 700 })], NOW);
  assert.equal(pick.id, "B");
});

test("excludes non-open, fully funded and due-within-7-days invoices", () => {
  const list = [
    inv({ id: "funded", status: "funded", yieldBps: 2000 }),
    inv({ id: "full", fundedAmount: 100, yieldBps: 2000 }),
    inv({ id: "soon", dueDate: due(3), yieldBps: 2000 }),
    inv({ id: "ok", yieldBps: 100 }),
  ];
  assert.equal(pickFeatured(list, NOW).id, "ok");
});

test("an invoice due in 6 days is excluded, 8 days is included", () => {
  assert.equal(pickFeatured([inv({ id: "six", dueDate: due(6) })], NOW), null);
  assert.equal(pickFeatured([inv({ id: "eight", dueDate: due(8) })], NOW).id, "eight");
});

test("ties break on most funded, then on id", () => {
  assert.equal(pickFeatured([inv({ id: "X", fundedAmount: 10 }), inv({ id: "Y", fundedAmount: 50 })], NOW).id, "Y");
  assert.equal(pickFeatured([inv({ id: "b" }), inv({ id: "a" })], NOW).id, "a");
});

test("returns null for empty or invalid input", () => {
  assert.equal(pickFeatured([], NOW), null);
  assert.equal(pickFeatured(null, NOW), null);
});
