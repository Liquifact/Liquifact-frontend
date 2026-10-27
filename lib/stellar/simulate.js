// Typed read-only Soroban simulation (#1367).
// Thin layer over the shared `simulateCall` in ./rpc.js: the return value is
// decoded with `scValToNative`, so an i128 comes back as a BigInt and never
// passes through a JSON round-trip that would lose precision above 2^53.
import { simulateCall } from "./rpc.js";

/** A contract read whose simulation failed (contract error, bad args, RPC error). */
export class SimulationError extends Error {
  /**
   * @param {string} method - contract entrypoint that was simulated
   * @param {string} message
   * @param {unknown} [cause]
   */
  constructor(method, message, cause) {
    super(message);
    this.name = "SimulationError";
    this.method = method;
    this.cause = cause;
  }
}

/**
 * Simulate `method(...args)` on `contractId` and return the decoded value.
 * Never signs or submits. Throws SimulationError on any failure.
 *
 * @param {string} contractId - contract address (C...)
 * @param {string} method - entrypoint name
 * @param {Array} [args] - ScVal arguments
 * @param {{ server?: object, network?: string }} [options] - injected RPC server for tests
 */
export async function simulateRead(contractId, method, args = [], { server, network } = {}) {
  try {
    return await simulateCall({ contractId, method, args, server, ...(network ? { network } : {}) });
  } catch (error) {
    throw new SimulationError(method, error?.message || String(error), error);
  }
}
