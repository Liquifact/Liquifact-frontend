import { test } from "node:test";
import assert from "node:assert/strict";
import { DUE_SOON_DAYS, dueStatus, utcDayMs } from "../lib/dueStatus.js";

const at = (iso) => Date.parse(iso);
const open = (dueDate, status = "open") => ({ status, dueDate });

test("utcDayMs parses date-only strings as UTC dates, not local time", () => {
  assert.equal(utcDayMs("2026-12-01"), Date.UTC(2026, 11, 1));
  assert.equal(utcDayMs(" 2026-12-01 "), Date.UTC(2026, 11, 1));
  // Instants collapse to their UTC calendar day.
  assert.equal(utcDayMs("2026-12-01T23:59:59.999Z"), Date.UTC(2026, 11, 1));
  assert.equal(utcDayMs("2026-12-01T23:30:00-05:00"), Date.UTC(2026, 11, 2));
  assert.equal(utcDayMs(new Date("2026-12-01T00:00:00Z")), Date.UTC(2026, 11, 1));
  assert.equal(utcDayMs(Date.UTC(2026, 11, 1, 12)), Date.UTC(2026, 11, 1));
});

test("utcDayMs rejects missing, invalid and rolled-over dates", () => {
  for (const v of [undefined, null, "", "not a date", "2026-02-30", "2026-13-01"]) {
    assert.ok(Number.isNaN(utcDayMs(v)), String(v));
  }
});

test("due today is due-soon with 0 days at both ends of the UTC day", () => {
  assert.deepEqual(dueStatus(open("2026-12-01"), at("2026-12-01T00:00:00Z")), { kind: "due-soon", days: 0 });
  assert.deepEqual(dueStatus(open("2026-12-01"), at("2026-12-01T23:59:59.999Z")), { kind: "due-soon", days: 0 });
});

test("overdue starts the UTC day after the due date", () => {
  assert.deepEqual(dueStatus(open("2026-12-01"), at("2026-12-02T00:00:00Z")), { kind: "overdue", days: 1 });
  assert.deepEqual(dueStatus(open("2026-12-01"), at("2026-12-31T08:00:00Z")), { kind: "overdue", days: 30 });
});

test("due-soon boundary is inclusive at DUE_SOON_DAYS", () => {
  assert.equal(DUE_SOON_DAYS, 7);
  assert.deepEqual(dueStatus(open("2026-12-08"), at("2026-12-01T23:59:00Z")), { kind: "due-soon", days: 7 });
  assert.deepEqual(dueStatus(open("2026-12-09"), at("2026-12-01T00:00:00Z")), { kind: "ok", days: 8 });
  assert.deepEqual(dueStatus(open("2026-12-02"), at("2026-12-01T12:00:00Z")), { kind: "due-soon", days: 1 });
});

test("result does not depend on the process timezone", () => {
  // A viewer at UTC-10 late on Nov 30 local is already on Dec 1 UTC.
  assert.deepEqual(dueStatus(open("2026-12-01"), at("2026-11-30T22:00:00-10:00")), { kind: "due-soon", days: 0 });
  // A viewer at UTC+14 early on Dec 2 local is still on Dec 1 UTC.
  assert.deepEqual(dueStatus(open("2026-12-01"), at("2026-12-02T05:00:00+14:00")), { kind: "due-soon", days: 0 });
});

test("days are whole UTC days across a DST change", () => {
  assert.deepEqual(dueStatus(open("2026-11-10"), at("2026-10-27T12:00:00Z")), { kind: "ok", days: 14 });
});

test("funded invoices past due are still overdue (awaiting settlement)", () => {
  assert.equal(dueStatus(open("2026-11-01", "funded"), at("2026-11-05T00:00:00Z")).kind, "overdue");
});

test("closed invoices show no countdown, whatever the due date", () => {
  for (const status of ["settled", "Settled", "cancelled", "CANCELLED", "withdrawn"]) {
    assert.deepEqual(dueStatus(open("2020-01-01", status), at("2026-12-01T00:00:00Z")), { kind: "closed", days: null }, status);
  }
});

test("missing invoice or due date yields null", () => {
  assert.equal(dueStatus(null, at("2026-12-01T00:00:00Z")), null);
  assert.equal(dueStatus({ status: "open" }, at("2026-12-01T00:00:00Z")), null);
  assert.equal(dueStatus(open("garbage"), at("2026-12-01T00:00:00Z")), null);
});

test("defaults nowMs to the current time", () => {
  const far = new Date(Date.now() + 400 * 86400000).toISOString().slice(0, 10);
  assert.equal(dueStatus(open(far)).kind, "ok");
});
