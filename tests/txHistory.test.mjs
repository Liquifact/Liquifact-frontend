import { test } from "node:test";
import assert from "node:assert/strict";
import { filterTxs, TX_COLUMNS, txsToCsv } from "../lib/txHistory.js";

const entries = [
  { hash: "a".repeat(64), label: "Fund invoice INV-101", invoiceId: "INV-101", status: "SUCCESS", createdAt: Date.UTC(2026, 0, 2) },
  { hash: "b".repeat(64), label: "Review transfer", invoiceId: "INV-202", status: "PENDING", createdAt: Date.UTC(2026, 0, 1) },
  { hash: "c".repeat(64), label: "Old payment", invoiceId: "INV-101", status: "FAILED", createdAt: Date.UTC(2025, 11, 31) },
];

test("filterTxs applies status, invoice ID and text query together", () => {
  assert.deepEqual(filterTxs(entries, { status: "success" }), [entries[0]]);
  assert.deepEqual(filterTxs(entries, { invoiceId: "inv-101" }), [entries[0], entries[2]]);
  assert.deepEqual(filterTxs(entries, { query: "BBBB" }), [entries[1]]);
  assert.deepEqual(filterTxs(entries, { status: "ALL", invoiceId: "101", query: "fund" }), [entries[0]]);
});

test("filterTxs handles empty and non-array input", () => {
  assert.deepEqual(filterTxs(entries), entries);
  assert.deepEqual(filterTxs(null), []);
});

test("txsToCsv emits stable columns and sanitizes formula-leading labels", () => {
  const hostile = {
    ...entries[0],
    label: '=HYPERLINK("https://example.invalid","Open")',
  };
  const csv = txsToCsv([hostile]);

  assert.equal(csv.split("\r\n")[0], TX_COLUMNS.map((column) => column.label).join(","));
  assert.ok(csv.includes('"\'=HYPERLINK(""https://example.invalid"",""Open"")"'));
  assert.ok(csv.includes("2026-01-02T00:00:00.000Z"));
});