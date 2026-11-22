import test from "node:test";
import assert from "node:assert/strict";
import {
  CONTRACT_ERROR_CODES,
  CONSTRAINT_CODES,
  CONSTRAINT_MESSAGES,
  parseContractError,
} from "../lib/escrow/errors.js";
import { CODES } from "../lib/escrow/constraints.js";
import { extractSimError } from "../lib/stellar/rpc.js";

test("exported tables are frozen and shared with constraints.js", () => {
  assert.equal(Object.isFrozen(CONTRACT_ERROR_CODES), true);
  assert.equal(Object.isFrozen(CONSTRAINT_CODES), true);
  assert.equal(Object.isFrozen(CONSTRAINT_MESSAGES), true);
  assert.equal(CODES, CONSTRAINT_CODES);
});

for (const [rawCode, expectedMessage] of Object.entries(CONTRACT_ERROR_CODES)) {
  const code = Number(rawCode);

  test(`parseContractError matches Error(Contract, #${code})`, () => {
    const raw = `HostError: Error(Contract, #${code}) while executing entrypoint`;
    assert.deepEqual(parseContractError(raw), { code, message: expectedMessage });
    assert.equal(extractSimError(raw), expectedMessage);
  });

  test(`parseContractError matches (${code}) form`, () => {
    const raw = `EscrowError(${code})`;
    assert.deepEqual(parseContractError(raw), { code, message: expectedMessage });
    assert.equal(extractSimError(raw), expectedMessage);
  });
}

test("unrelated numbers do not match", () => {
  const cases = [
    "ledger 14200",
    "fee 142 stroops",
    "block 220 reached",
    "tx #142 failed",
    "ledger (14200)",
    "Error(Contract, #999)",
    "Error(Budget, #142)",
  ];
  for (const raw of cases) {
    assert.equal(parseContractError(raw), null, `expected null for: ${raw}`);
    assert.equal(extractSimError(raw), raw, `expected raw passthrough for: ${raw}`);
  }
});

test("skips unknown parenthesized numbers to find a known contract error", () => {
  const raw = "attempt (1) failed: HostError: Error(Contract, #222)";
  assert.deepEqual(parseContractError(raw), {
    code: 222,
    message: CONTRACT_ERROR_CODES[222],
  });
});

test("handles null, undefined, and empty inputs", () => {
  for (const empty of [null, undefined, ""]) {
    assert.equal(parseContractError(empty), null);
    assert.equal(extractSimError(empty), null);
  }
});

test("extractSimError truncates unknown errors longer than 120 characters", () => {
  const longError = "X".repeat(200);
  assert.equal(parseContractError(longError), null);
  const out = extractSimError(longError);
  assert.equal(out.length, 120);
  assert.equal(out, "X".repeat(120));
});
