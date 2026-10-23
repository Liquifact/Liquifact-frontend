import { rpc } from "@stellar/stellar-sdk";
import { RPC_URL } from "./network.js";

/**
 * Create an SDK-backed Soroban RPC server. Used for the submission path
 * (getAccount / prepareTransaction / sendTransaction / getTransaction).
 */
export function getServer(rpcUrl = RPC_URL) {
  return new rpc.Server(rpcUrl, { allowHttp: rpcUrl.startsWith("http://") });
}

/**
 * Minimal raw JSON-RPC call against a Soroban RPC endpoint.
 * Supports AbortSignal so read-only calls (quotes, tier tables) can be
 * cancelled when inputs change — the SDK Server has no per-request signal.
 */
export async function rpcRequest(method, params, { rpcUrl = RPC_URL, signal } = {}) {
  const res = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method, params }),
    signal,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`RPC ${method} failed (${res.status})`);
  if (body.error) throw new Error(body.error.message || `RPC ${method} failed`);
  return body.result;
}
