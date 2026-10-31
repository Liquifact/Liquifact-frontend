import assert from "node:assert/strict";
import test from "node:test";
import { calculateNetWithdrawal, deriveSmeActions } from "../lib/smeActions.js";

const SME = "GSME";
const other = "GOTHER";
const readiness = {
  ready_now: true,
  funded: true,
  maturity_reached: true,
  no_legal_hold: true,
};

function derive(status, overrides = {}, connected = SME) {
  return deriveSmeActions({
    escrow: { sme_address: SME, status },
    readiness: { ...readiness, ...overrides },
    connected,
  });
}

test("deriveSmeActions hides actions from non-SME wallets using exact strkey matching", () => {
  assert.equal(derive(1, {}, other).isSme, false);
  assert.equal(derive(1, {}, `${SME} `).isSme, false);
});

test("withdraw is enabled only for the SME while escrow is funded", () => {
  assert.equal(derive(0).withdraw.enabled, false);
  assert.equal(derive(1).withdraw.enabled, true);
  assert.equal(derive(2).withdraw.enabled, false);
  assert.equal(derive(3).withdraw.enabled, false);
});

test("settle readiness reports every failed prerequisite", () => {
  assert.deepEqual(
    derive(1, { funded: false }).settle.reason,
    "Invoice is not funded.",
  );
  assert.deepEqual(
    derive(1, { maturity_reached: false }).settle.reason,
    "Maturity has not been reached.",
  );
  assert.deepEqual(
    derive(1, { no_legal_hold: false }).settle.reason,
    "A legal hold is active.",
  );
  assert.equal(
    derive(1, { legal_hold: true, no_legal_hold: undefined }).settle.enabled,
    false,
  );
  assert.equal(derive(1, { ready_now: false }).settle.enabled, false);
  assert.equal(derive(1).settle.enabled, true);
});

test("net withdrawal uses floor rounding across protocol fee rates", () => {
  assert.equal(calculateNetWithdrawal(10_001n, 0), 10_001n);
  assert.equal(calculateNetWithdrawal(10_001n, 100), 9_900n);
  assert.equal(calculateNetWithdrawal(10_001n, 10_000), 0n);
});
