import { test } from "node:test";
import assert from "node:assert/strict";
import { deriveExitUi, parseStroops, formatStroops, STROOPS_PER_UNIT } from "../lib/invest/deriveExitUi.js";

// ── deriveExitUi ─────────────────────────────────────────────────────────────

test("cancelled + refundable → mode refund", () => {
  const ui = deriveExitUi({ status: 4, contribution: 5_000_000n, refunded: false, legalHold: false, paused: false });
  assert.equal(ui.mode, "refund");
  assert.equal(ui.maxStroops, 5_000_000n);
  assert.equal(ui.reason, null);
});

test("cancelled + already refunded → mode none with reason", () => {
  const ui = deriveExitUi({ status: 4, contribution: 5_000_000n, refunded: true, legalHold: false, paused: false });
  assert.equal(ui.mode, "none");
  assert.ok(ui.reason, "should have a reason string");
});

test("cancelled + zero contribution → mode none", () => {
  const ui = deriveExitUi({ status: 4, contribution: 0n, refunded: false, legalHold: false, paused: false });
  assert.equal(ui.mode, "none");
});

test("open + contribution > 0 → mode unfund", () => {
  const ui = deriveExitUi({ status: 0, contribution: 10_000_000n, refunded: false, legalHold: false, paused: false });
  assert.equal(ui.mode, "unfund");
  assert.equal(ui.maxStroops, 10_000_000n);
  assert.equal(ui.reason, null);
});

test("open + legal hold → mode none with reason", () => {
  const ui = deriveExitUi({ status: 0, contribution: 10_000_000n, refunded: false, legalHold: true, paused: false });
  assert.equal(ui.mode, "none");
  assert.ok(ui.reason);
  assert.ok(ui.reason.toLowerCase().includes("legal hold"));
});

test("open + paused → mode none with reason", () => {
  const ui = deriveExitUi({ status: 0, contribution: 10_000_000n, refunded: false, legalHold: false, paused: true });
  assert.equal(ui.mode, "none");
  assert.ok(ui.reason);
  assert.ok(ui.reason.toLowerCase().includes("pause"));
});

test("open + zero contribution → mode none (hidden, no reason)", () => {
  const ui = deriveExitUi({ status: 0, contribution: 0n, refunded: false, legalHold: false, paused: false });
  assert.equal(ui.mode, "none");
  assert.equal(ui.reason, null);
});

test("settled (status 2) → mode none", () => {
  const ui = deriveExitUi({ status: 2, contribution: 10_000_000n, refunded: false, legalHold: false, paused: false });
  assert.equal(ui.mode, "none");
  assert.equal(ui.reason, null);
});

test("funded (status 1) → mode none", () => {
  const ui = deriveExitUi({ status: 1, contribution: 10_000_000n, refunded: false, legalHold: false, paused: false });
  assert.equal(ui.mode, "none");
});

// ── parseStroops ─────────────────────────────────────────────────────────────

const ONE_XLM = STROOPS_PER_UNIT; // 10_000_000n

test("parseStroops: exact contribution allowed", () => {
  const result = parseStroops("1", ONE_XLM);
  assert.deepEqual(result, { stroops: ONE_XLM });
});

test("parseStroops: contribution + 1 stroop rejected", () => {
  // 1 XLM + 1 stroop = "1.0000001"
  const result = parseStroops("1.0000001", ONE_XLM);
  assert.ok(result.error, "should return an error");
});

test("parseStroops: more than 7 decimals rejected", () => {
  const result = parseStroops("0.00000001", ONE_XLM * 2n);
  assert.ok(result.error, "8 decimal places should be rejected");
});

test("parseStroops: zero rejected", () => {
  const result = parseStroops("0", ONE_XLM);
  assert.ok(result.error, "zero should be rejected");
});

test("parseStroops: negative string rejected", () => {
  const result = parseStroops("-1", ONE_XLM);
  assert.ok(result.error, "negative number should be rejected");
});

test("parseStroops: empty string error", () => {
  const result = parseStroops("", ONE_XLM);
  assert.ok(result.error);
});

test("parseStroops: partial XLM (0.5 XLM = 5_000_000 stroops)", () => {
  const result = parseStroops("0.5", ONE_XLM);
  assert.deepEqual(result, { stroops: 5_000_000n });
});

test("parseStroops: non-numeric string error", () => {
  const result = parseStroops("abc", ONE_XLM);
  assert.ok(result.error);
});

// ── formatStroops ────────────────────────────────────────────────────────────

test("formatStroops: whole number", () => {
  assert.equal(formatStroops(10_000_000n), "1");
});

test("formatStroops: fractional", () => {
  assert.equal(formatStroops(5_000_000n), "0.5");
});

test("formatStroops: 1 stroop", () => {
  assert.equal(formatStroops(1n), "0.0000001");
});

test("formatStroops: trims trailing zeros", () => {
  assert.equal(formatStroops(10_100_000n), "1.01");
});
