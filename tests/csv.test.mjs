import { test } from "node:test";
import assert from "node:assert/strict";
import { defaultFilename, invoicesToCsv, INVOICE_COLUMNS, quoteField, sanitizeCell, toCsv } from "../lib/csv.js";

test("toCsv quotes commas, quotes and newlines and uses CRLF", () => {
  const csv = toCsv([{ a: "x,y", b: 'say "hi"' }, { a: "line\nbreak", b: "ünïcødé" }, { a: "", b: null }], [
    { key: "a", label: "A" },
    { key: "b", label: "B" },
  ]);
  assert.equal(csv, 'A,B\r\n"x,y","say ""hi"""\r\n"line\nbreak",ünïcødé\r\n,\r\n');
});

test("toCsv optionally prefixes a UTF-8 BOM", () => {
  assert.ok(toCsv([], [{ key: "a" }], { bom: true }).startsWith("﻿"));
  assert.equal(quoteField("plain"), "plain");
});

test("sanitizeCell neutralises every dangerous prefix", () => {
  for (const v of ["=1+1", "+cmd", "-5", "@SUM(A1)", "\tx", "\rx"]) {
    assert.equal(sanitizeCell(v), `'${v}`);
  }
  assert.equal(sanitizeCell(-5), -5);
  assert.equal(sanitizeCell("Acme"), "Acme");
  assert.equal(sanitizeCell(null), "");
});

test("invoice export uses the issue's column spec with plain decimals", () => {
  const csv = invoicesToCsv([
    { id: "INV_1", sme: '=HYPERLINK("http://evil","Click")', debtor: "Globex", amount: 25000, currency: "USDC", fundedAmount: 18000, yieldBps: 650, dueDate: "2026-12-30", status: "open", onChain: false },
  ]);
  const [header, row] = csv.trim().split("\r\n");
  assert.equal(header, INVOICE_COLUMNS.map((c) => c.label).join(","));
  assert.ok(row.startsWith('INV_1,"\'=HYPERLINK(""http://evil"",""Click"")",Globex,25000,USDC,18000,72,6.5,2026-12-30T00:00:00.000Z,open,No,'));
});

test("defaultFilename is dated", () => {
  assert.equal(defaultFilename(new Date("2026-10-25T12:00:00Z")), "liquifact-invoices-2026-10-25.csv");
});

// Risk columns (#1510)
import { computeListMedians, getRiskBand, scoreInvoice } from "../lib/risk.js";
import { RISK_COLUMNS } from "../lib/csv.js";

const NOW = Date.parse("2026-11-01T00:00:00Z");
const RISK_INVOICES = [
  { id: "INV_A", sme: "Acme", amount: 25000, currency: "USDC", fundedAmount: 5000, yieldBps: 650, dueDate: "2026-11-05", status: "open", onChain: false },
  { id: "=INV_B", sme: "Beta", amount: 100000, currency: "USDC", fundedAmount: 100000, yieldBps: 2200, dueDate: "2027-03-01", status: "funded", onChain: true, smeAddress: "GABC" },
  { id: "INV_C", sme: "Gamma", amount: 8000, currency: "USDC", fundedAmount: 8000, yieldBps: 500, dueDate: "2026-09-01", status: "settled", onChain: true },
];

function parseRows(csv) {
  return csv.trim().split("\r\n").map((line) => line.split(","));
}

test("risk columns are omitted when no context is supplied", () => {
  const [header] = parseRows(invoicesToCsv(RISK_INVOICES));
  assert.deepEqual(header, INVOICE_COLUMNS.map((c) => c.label));
  assert.ok(!header.includes("Risk score"));
});

test("risk score and band are appended after the default columns when context is supplied", () => {
  const medians = computeListMedians(RISK_INVOICES);
  const rows = parseRows(invoicesToCsv(RISK_INVOICES, { context: { medians, now: NOW } }));
  assert.deepEqual(rows[0], [...INVOICE_COLUMNS.map((c) => c.label), "Risk score", "Risk band"]);
  assert.deepEqual(RISK_COLUMNS.map((c) => c.key), ["riskScore", "riskBand"]);

  for (const [i, inv] of RISK_INVOICES.slice(0, 2).entries()) {
    const { score, band } = scoreInvoice(inv, NOW, medians);
    const row = rows[i + 1];
    assert.equal(row.length, INVOICE_COLUMNS.length + 2);
    assert.equal(row.at(-2), String(score));
    assert.equal(row.at(-1), band);
    assert.equal(getRiskBand(score), band);
  }
});

test("unscorable rows export empty risk cells", () => {
  const rows = parseRows(invoicesToCsv(RISK_INVOICES, { context: { medians: computeListMedians(RISK_INVOICES), now: NOW } }));
  const settled = rows[3];
  assert.equal(settled[0], "INV_C");
  assert.equal(settled.at(-2), "");
  assert.equal(settled.at(-1), "");
});

test("rows with risk columns are still formula-injection sanitised", () => {
  const rows = parseRows(invoicesToCsv(RISK_INVOICES, { context: { medians: {}, now: NOW } }));
  assert.equal(rows[2][0], "'=INV_B");
  // Context reaches custom column value() functions and their output is sanitised too.
  const csv = toCsv([{ a: 1 }], [{ key: "x", label: "X", value: (_row, ctx) => ctx.payload }], { context: { payload: "=cmd|' /C calc'!A0" } });
  assert.equal(csv, "X\r\n'=cmd|' /C calc'!A0\r\n");
});

test("risk scoring uses context.now rather than wall-clock time", () => {
  const inv = RISK_INVOICES[0];
  const early = parseRows(invoicesToCsv([inv], { context: { medians: {}, now: Date.parse("2026-01-01T00:00:00Z") } }))[1];
  const late = parseRows(invoicesToCsv([inv], { context: { medians: {}, now: Date.parse("2026-12-01T00:00:00Z") } }))[1];
  assert.equal(early.at(-2), String(scoreInvoice(inv, Date.parse("2026-01-01T00:00:00Z"), {}).score));
  assert.equal(late.at(-2), String(scoreInvoice(inv, Date.parse("2026-12-01T00:00:00Z"), {}).score));
  assert.notEqual(early.at(-2), late.at(-2));
});
