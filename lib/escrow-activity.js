import { scValToNative, xdr } from "@stellar/stellar-sdk";

export function decodeContractEvent(event) {
  const topics = (event.topic || []).map((topic) =>
    scValToNative(xdr.ScVal.fromXDR(topic, "base64")),
  );
  const value = scValToNative(xdr.ScVal.fromXDR(event.value, "base64"));
  const name = String(topics[0] ?? "Event");
  const fields = value instanceof Map
    ? Object.fromEntries([...value.entries()].map(([key, item]) => [String(key), item]))
    : value && typeof value === "object" && !Array.isArray(value) ? value : { value };
  return {
    id: event.id,
    name,
    ledger: event.ledger,
    txHash: event.txHash,
    timestamp: event.ledgerClosedAt,
    fields,
  };
}

export async function fetchEscrowActivity({ rpcUrl, contractId, cursor, startLedger, fetchImpl = fetch }) {
  const params = {
    filters: [{ type: "contract", contractIds: [contractId] }],
    pagination: { limit: 100, ...(cursor ? { cursor } : {}) },
    ...(cursor ? {} : { startLedger }),
  };
  const response = await fetchImpl(rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getEvents", params }),
  });
  if (!response.ok) throw new Error(`RPC request failed (${response.status})`);
  const body = await response.json();
  if (body.error) throw new Error(body.error.message || "RPC request failed");
  return {
    events: (body.result?.events || []).map(decodeContractEvent),
    cursor: body.result?.cursor || null,
  };
}

export function eventMatchesInvoice(event, invoiceId) {
  return Object.values(event.fields).some((value) => String(value) === String(invoiceId));
}
