import test from "node:test";
import assert from "node:assert/strict";
import { buildReceipt, receiptFilename } from "../lib/receipt.js";

const VALID_HASH = "a".repeat(64);
const SAMPLE_INVOICE = {
  id: "INV_0001",
  sme: "Acme Manufacturing Ltd",
  debtor: "Global Retail Corp",
  amount: 25000,
  fundedAmount: 10000,
  currency: "USDC",
  yieldBps: 850,
  dueDate: "2026-12-31T00:00:00.000Z",
  status: "open",
};

const SAMPLE_TX = {
  hash: VALID_HASH,
  label: "Fund INV_0001 (250 USDC)",
  invoiceId: "INV_0001",
  status: "SUCCESS",
  createdAt: 1730000000000,
  updatedAt: 1730000005000,
};

test("buildReceipt returns a complete plain object for a confirmed matching tx", () => {
  const now = new Date("2026-11-22T12:00:00.000Z");
  const receipt = buildReceipt({
    tx: SAMPLE_TX,
    invoice: SAMPLE_INVOICE,
    investor: "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
    amountStroops: 2500000000n,
    network: "testnet",
    now,
  });

  assert.ok(receipt);
  assert.equal(receipt.hash, VALID_HASH);
  assert.equal(receipt.invoiceId, "INV_0001");
  assert.equal(receipt.sme, "Acme Manufacturing Ltd");
  assert.equal(receipt.debtor, "Global Retail Corp");
  assert.equal(receipt.currency, "USDC");
  assert.equal(receipt.amountStroops, "2500000000");
  assert.equal(receipt.amountFormatted, "250 USDC");
  assert.equal(receipt.yieldPercent, "8.50%");
  assert.equal(receipt.network, "testnet");
  assert.equal(receipt.explorerUrl, `https://stellar.expert/explorer/testnet/tx/${VALID_HASH}`);
  assert.equal(receipt.investor, "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF");
  assert.equal(receipt.issuedAt, "2026-11-22T12:00:00.000Z");
  assert.equal(receipt.confirmedAt, new Date(1730000005000).toISOString());
  assert.equal(receipt.filename, "liquifact-receipt-INV_0001-aaaaaaaa.pdf");
  // Plain JSON-serializable object
  assert.doesNotThrow(() => JSON.stringify(receipt));
});

test("buildReceipt parses amount from tx label when amountStroops is omitted", () => {
  const receipt = buildReceipt({
    tx: SAMPLE_TX,
    invoice: SAMPLE_INVOICE,
    network: "testnet",
    now: new Date("2026-11-22T12:00:00.000Z"),
  });

  assert.ok(receipt);
  assert.equal(receipt.amountStroops, "2500000000");
  assert.equal(receipt.amountFormatted, "250 USDC");
});

test("buildReceipt uses custom network in explorerUrl", () => {
  const receipt = buildReceipt({
    tx: SAMPLE_TX,
    invoice: SAMPLE_INVOICE,
    amountStroops: 10000000n,
    network: "public",
  });

  assert.ok(receipt);
  assert.equal(receipt.network, "public");
  assert.equal(receipt.explorerUrl, `https://stellar.expert/explorer/public/tx/${VALID_HASH}`);
});

test("buildReceipt returns null for unknown or missing tx", () => {
  assert.equal(buildReceipt({ tx: null, invoice: SAMPLE_INVOICE }), null);
  assert.equal(buildReceipt({ tx: undefined, invoice: SAMPLE_INVOICE }), null);
});

test("buildReceipt returns null for foreign tx belonging to another invoice", () => {
  const foreignTx = { ...SAMPLE_TX, invoiceId: "INV_9999" };
  assert.equal(buildReceipt({ tx: foreignTx, invoice: SAMPLE_INVOICE }), null);

  const unassignedTx = { ...SAMPLE_TX, invoiceId: null };
  assert.equal(buildReceipt({ tx: unassignedTx, invoice: SAMPLE_INVOICE }), null);
});

test("buildReceipt returns null for unconfirmed or malformed tx", () => {
  assert.equal(buildReceipt({ tx: { ...SAMPLE_TX, status: "PENDING" }, invoice: SAMPLE_INVOICE }), null);
  assert.equal(buildReceipt({ tx: { ...SAMPLE_TX, status: "FAILED" }, invoice: SAMPLE_INVOICE }), null);
  assert.equal(buildReceipt({ tx: { ...SAMPLE_TX, hash: "not-a-hash" }, invoice: SAMPLE_INVOICE }), null);
  assert.equal(buildReceipt({ tx: SAMPLE_TX, invoice: null }), null);
});

test("receiptFilename produces a safe deterministic filename", () => {
  assert.equal(
    receiptFilename({ invoiceId: "INV_0001", hash: VALID_HASH }),
    "liquifact-receipt-INV_0001-aaaaaaaa.pdf"
  );
  assert.equal(
    receiptFilename({ invoiceId: "INV/2026 #42", hash: "ABCDEF1234567890" }),
    "liquifact-receipt-INV-2026-42-abcdef12.pdf"
  );
});
