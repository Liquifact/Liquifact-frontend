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
