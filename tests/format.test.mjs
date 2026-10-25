import { test } from "node:test";
import assert from "node:assert/strict";
import { formatAmount, bpsToPercent, fundedPercent, shortAddress, validateInvoiceForm } from "../lib/format.js";

test("formats amounts and yields", () => {
  assert.equal(formatAmount(25000, "USDC"), "25,000 USDC");
  assert.equal(bpsToPercent(800), "8.00%");
});

test("funded percent is clamped", () => {
  assert.equal(fundedPercent({ amount: 100, fundedAmount: 50 }), 50);
  assert.equal(fundedPercent({ amount: 100, fundedAmount: 500 }), 100);
  assert.equal(fundedPercent(null), 0);
});

test("shortens addresses", () => {
  assert.equal(shortAddress("GA7TXEBMEPQCLHIYCWDN7RKAO5IMRD2UV7O7TZXMEW6VZUMEXNR4XBB5"), "GA7TXE…R4XBB5");
  assert.equal(shortAddress("SHORT"), "SHORT");
});

test("validates invoice form", () => {
  assert.deepEqual(validateInvoiceForm({ sme: "A", debtor: "B", amount: "10", yieldBps: "800", dueDate: "2027-01-01" }), {});
  const errs = validateInvoiceForm({ sme: "", debtor: "", amount: "-1", yieldBps: "x", dueDate: "" });
  assert.deepEqual(Object.keys(errs).sort(), ["amount", "debtor", "dueDate", "sme", "yieldBps"]);
});
