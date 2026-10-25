import { describe, it } from "node:test";
import assert from "node:assert";
import { validateContribution, creditedAmount } from "../lib/contribution.js";

describe("validateContribution", () => {
  const openInvoice = { id: "INV_0001", amount: 10000, fundedAmount: 3000, status: "open" };
  const closedInvoice = { id: "INV_0002", amount: 10000, fundedAmount: 10000, status: "funded" };

  it("rejects empty/missing input with REQUIRED", () => {
    assert.deepEqual(validateContribution("", openInvoice), { ok: false, amount: 0, error: "REQUIRED" });
    assert.deepEqual(validateContribution(null, openInvoice), { ok: false, amount: 0, error: "REQUIRED" });
  });

  it("rejects non-numeric input with NOT_A_NUMBER", () => {
    assert.deepEqual(validateContribution("abc", openInvoice), { ok: false, amount: 0, error: "NOT_A_NUMBER" });
  });

  it("rejects zero or negative input with NON_POSITIVE", () => {
    assert.deepEqual(validateContribution("0", openInvoice), { ok: false, amount: 0, error: "NON_POSITIVE" });
    assert.deepEqual(validateContribution("-50", openInvoice), { ok: false, amount: -50, error: "NON_POSITIVE" });
  });

  it("rejects too many decimals (> 7) with TOO_MANY_DECIMALS", () => {
    assert.deepEqual(validateContribution("10.12345678", openInvoice), { ok: false, amount: 10.12345678, error: "TOO_MANY_DECIMALS" });
    assert.deepEqual(validateContribution("10.1234567", openInvoice), { ok: true, amount: 10.1234567, error: null });
  });

  it("rejects input exceeding remaining capacity with EXCEEDS_REMAINING", () => {
    assert.deepEqual(validateContribution("7000.0000001", openInvoice), { ok: false, amount: 7000.0000001, error: "EXCEEDS_REMAINING" });
    assert.deepEqual(validateContribution("10000", openInvoice), { ok: false, amount: 10000, error: "EXCEEDS_REMAINING" });
    assert.deepEqual(validateContribution("7000", openInvoice), { ok: true, amount: 7000, error: null });
  });

  it("rejects closed invoice with NOT_OPEN", () => {
    assert.deepEqual(validateContribution("100", closedInvoice), { ok: false, amount: 0, error: "NOT_OPEN" });
  });
});

describe("creditedAmount", () => {
  it("calculates correct credited amount delta", () => {
    const before = { fundedAmount: 3000 };
    const after = { fundedAmount: 10000 };
    assert.equal(creditedAmount(before, after), 7000);
  });

  it("handles clamp and no-change (never negative)", () => {
    const before = { fundedAmount: 5000 };
    const after = { fundedAmount: 5000 };
    assert.equal(creditedAmount(before, after), 0);
  });
});
