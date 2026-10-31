import { test } from "node:test";
import assert from "node:assert/strict";
import { nativeToScVal } from "@stellar/stellar-sdk";
import { decodeContractEvent, eventMatchesInvoice, fetchEscrowActivity } from "../lib/escrow-activity.js";

const b64 = (v, opts) => nativeToScVal(v, opts).toXDR("base64");

function rawEvent(id, invoiceId) {
  return {
    id,
    ledger: 123,
    txHash: "a".repeat(64),
    ledgerClosedAt: "2026-10-01T00:00:00Z",
    topic: [b64("fund", { type: "symbol" })],
    value: b64({ invoice_id: invoiceId, amount: 5n }, { type: { invoice_id: ["symbol", "string"], amount: ["symbol", "i128"] } }),
  };
}

test("decodeContractEvent names the event and exposes its fields", () => {
  const ev = decodeContractEvent(rawEvent("e1", "INV_0001"));
  assert.equal(ev.name, "fund");
  assert.equal(ev.ledger, 123);
  assert.equal(String(ev.fields.invoice_id), "INV_0001");
  assert.ok(eventMatchesInvoice(ev, "INV_0001"));
  assert.ok(!eventMatchesInvoice(ev, "INV_0002"));
});

test("fetchEscrowActivity posts getEvents and paginates by cursor", async () => {
  const bodies = [];
  const fetchImpl = async (_url, init) => {
    bodies.push(JSON.parse(init.body));
    return { ok: true, json: async () => ({ result: { events: [rawEvent("e1", "INV_0001")], cursor: "c1" } }) };
  };
  const page = await fetchEscrowActivity({ rpcUrl: "https://rpc.test", contractId: "CABC", startLedger: 10, fetchImpl });
  assert.equal(bodies[0].method, "getEvents");
  assert.equal(bodies[0].params.startLedger, 10);
  assert.deepEqual(bodies[0].params.filters[0].contractIds, ["CABC"]);
  assert.equal(page.cursor, "c1");
  assert.equal(page.events.length, 1);
  await fetchEscrowActivity({ rpcUrl: "https://rpc.test", contractId: "CABC", cursor: "c1", fetchImpl });
  assert.equal(bodies[1].params.pagination.cursor, "c1");
  assert.equal(bodies[1].params.startLedger, undefined);
});

test("fetchEscrowActivity surfaces RPC errors", async () => {
  await assert.rejects(fetchEscrowActivity({ rpcUrl: "x", contractId: "C", fetchImpl: async () => ({ ok: false, status: 503 }) }), /503/);
  await assert.rejects(fetchEscrowActivity({ rpcUrl: "x", contractId: "C", fetchImpl: async () => ({ ok: true, json: async () => ({ error: { message: "bad" } }) }) }), /bad/);
});
