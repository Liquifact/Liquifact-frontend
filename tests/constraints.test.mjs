import test from "node:test";
import assert from "node:assert/strict";
import {
  loadConstraints,
  validateContribution,
  maxFillAmount,
  remainingCapRoom,
  CODES,
} from "../lib/escrow/constraints.js";

const XLM = 10000000n; // stroops per unit
const NOW = 1_800_000_000;

const base = {
  minContributionFloor: 10n * XLM,
  maxPerInvestorCap: 400n * XLM,
  remainingCapacity: 700n * XLM,
  fundingDeadline: NOW + 3 * 86400,
  paused: false,
  legalHold: false,
  status: 0,
  contribution: 100n * XLM,
  errors: [],
};

test("ok for an amount inside every bound", () => {
  const r = validateContribution(50n * XLM, base, { nowSeconds: NOW });
  assert.deepEqual(r, { ok: true, code: null, message: null });
});

test("BELOW_FLOOR below the floor, ok exactly at the floor", () => {
  assert.equal(validateContribution(10n * XLM - 1n, base, { nowSeconds: NOW }).code, CODES.BELOW_FLOOR);
  assert.equal(validateContribution(10n * XLM, base, { nowSeconds: NOW }).ok, true);
});

test("ABOVE_INVESTOR_CAP accounts for the existing contribution; boundary exactly cap - contribution", () => {
  // cap 400, contributed 100 -> room 300
  assert.equal(validateContribution(300n * XLM, base, { nowSeconds: NOW }).ok, true);
  assert.equal(validateContribution(300n * XLM + 1n, base, { nowSeconds: NOW }).code, CODES.ABOVE_INVESTOR_CAP);
});

test("cap None (null) never fails the cap check", () => {
  const c = { ...base, maxPerInvestorCap: null, contribution: 900n * XLM, remainingCapacity: 2000n * XLM };
  assert.equal(validateContribution(1500n * XLM, c, { nowSeconds: NOW }).ok, true);
});

test("ABOVE_CAPACITY above remaining; ok exactly at remaining", () => {
  const c = { ...base, maxPerInvestorCap: null, remainingCapacity: 700n * XLM };
  assert.equal(validateContribution(700n * XLM, c, { nowSeconds: NOW }).ok, true);
  assert.equal(validateContribution(700n * XLM + 1n, c, { nowSeconds: NOW }).code, CODES.ABOVE_CAPACITY);
});

test("PAUSED, LEGAL_HOLD, DEADLINE_PASSED, NOT_OPEN block regardless of amount", () => {
  assert.equal(validateContribution(1n, { ...base, paused: true }, { nowSeconds: NOW }).code, CODES.PAUSED);
  assert.equal(validateContribution(1n, { ...base, legalHold: true }, { nowSeconds: NOW }).code, CODES.LEGAL_HOLD);
  assert.equal(
    validateContribution(1n, { ...base, fundingDeadline: NOW - 1 }, { nowSeconds: NOW }).code,
    CODES.DEADLINE_PASSED
  );
  // exactly at the deadline counts as passed
  assert.equal(
    validateContribution(1n, { ...base, fundingDeadline: NOW }, { nowSeconds: NOW }).code,
    CODES.DEADLINE_PASSED
  );
  assert.equal(validateContribution(1n, { ...base, status: 1 }, { nowSeconds: NOW }).code, CODES.NOT_OPEN);
});

test("deterministic order: status blockers beat amount violations", () => {
  const c = { ...base, paused: true, legalHold: true, minContributionFloor: 1000n * XLM };
  assert.equal(validateContribution(1n, c, { nowSeconds: NOW }).code, CODES.PAUSED);
  const c2 = { ...base, legalHold: true, fundingDeadline: NOW - 5 };
  assert.equal(validateContribution(1n, c2, { nowSeconds: NOW }).code, CODES.LEGAL_HOLD);
  const c3 = { ...base, status: 2, minContributionFloor: 1000n * XLM };
  assert.equal(validateContribution(1n, c3, { nowSeconds: NOW }).code, CODES.NOT_OPEN);
});

test("unknown (null) fields never fail a check", () => {
  const c = {
    minContributionFloor: null, maxPerInvestorCap: null, remainingCapacity: null,
    fundingDeadline: null, paused: null, legalHold: null, status: null, contribution: null,
  };
  assert.equal(validateContribution(1n, c, { nowSeconds: NOW }).ok, true);
});

test("7-decimal precision at boundaries", () => {
  const c = { ...base, minContributionFloor: 12345678n }; // 1.2345678
  assert.equal(validateContribution(12345677n, c, { nowSeconds: NOW }).code, CODES.BELOW_FLOOR);
  assert.equal(validateContribution(12345678n, c, { nowSeconds: NOW }).ok, true);
});

test("remainingCapRoom floors at 0 when the investor is over cap", () => {
  assert.equal(remainingCapRoom({ maxPerInvestorCap: 100n, contribution: 250n }), 0n);
  assert.equal(remainingCapRoom({ maxPerInvestorCap: null, contribution: 250n }), null);
});

test("maxFillAmount is min(cap room, remaining capacity); null without bounds", () => {
  assert.equal(maxFillAmount({ maxPerInvestorCap: 400n, contribution: 100n, remainingCapacity: 700n }), 300n);
  assert.equal(maxFillAmount({ maxPerInvestorCap: null, contribution: null, remainingCapacity: 700n }), 700n);
  assert.equal(maxFillAmount({ maxPerInvestorCap: 400n, contribution: 100n, remainingCapacity: null }), 300n);
  assert.equal(maxFillAmount({ maxPerInvestorCap: null, contribution: null, remainingCapacity: null }), null);
});

test("loadConstraints maps getters and decodes the summary", async () => {
  const responses = {
    get_escrow_summary: { escrow: { status: 0 }, paused: false, legal_hold: false },
    get_min_contribution_floor: 10n * XLM,
    get_max_per_investor_cap: null,
    get_remaining_funding_capacity: 700n * XLM,
    get_funding_deadline: null,
    get_contribution: 5n * XLM,
  };
  const calls = [];
  const call = async ({ method }) => {
    calls.push(method);
    return responses[method];
  };
  const c = await loadConstraints({ investor: "GCSYKWAREGGDA7RN4UWNUUSFV3D56PXID7WOWXA5B6V4OVGR3KVTH62T", call });
  assert.equal(c.minContributionFloor, 10n * XLM);
  assert.equal(c.maxPerInvestorCap, null);
  assert.equal(c.remainingCapacity, 700n * XLM);
  assert.equal(c.fundingDeadline, null);
  assert.equal(c.paused, false);
  assert.equal(c.legalHold, false);
  assert.equal(c.status, 0);
  assert.equal(c.contribution, 5n * XLM);
  assert.deepEqual(c.errors, []);
  assert.ok(calls.includes("get_contribution"));
});

test("loadConstraints without an investor skips get_contribution", async () => {
  const calls = [];
  const call = async ({ method }) => {
    calls.push(method);
    return method === "get_escrow_summary" ? { escrow: { status: 0 }, paused: false, legal_hold: false } : null;
  };
  const c = await loadConstraints({ call });
  assert.equal(c.contribution, null);
  assert.ok(!calls.includes("get_contribution"));
});

test("loadConstraints with one failing getter returns a partial result with errors", async () => {
  const call = async ({ method }) => {
    if (method === "get_remaining_funding_capacity") throw new Error("HostError: unknown entrypoint");
    if (method === "get_escrow_summary") return { escrow: { status: 0 }, paused: false, legal_hold: false };
    if (method === "get_max_per_investor_cap") return null;
    if (method === "get_min_contribution_floor") return 1n;
    if (method === "get_funding_deadline") return null;
    if (method === "get_contribution") return 0n;
    return null;
  };
  const c = await loadConstraints({ investor: "GCSYKWAREGGDA7RN4UWNUUSFV3D56PXID7WOWXA5B6V4OVGR3KVTH62T", call });
  assert.equal(c.remainingCapacity, null);
  assert.equal(c.legalHold, false);
  assert.equal(c.errors.length, 1);
  assert.equal(c.errors[0].method, "get_remaining_funding_capacity");
  // capacity unknown -> capacity check cannot fail
  assert.equal(validateContribution(10n ** 18n, c, { nowSeconds: NOW }).ok, true);
});
