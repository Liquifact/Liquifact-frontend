import { CONTRACT_ID, NETWORK, RPC_URL } from "../config.js";

// Well-known all-zero ed25519 key; only used as a source for read-only simulation.
const THROWAWAY_ACCOUNT = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";

export class SimulationError extends Error {
  constructor(message, method) {
    super(message);
    this.name = "SimulationError";
    this.method = method;
  }
}

export async function loadStellarDeps() {
  const sdk = await import("@stellar/stellar-sdk");
  const server = new sdk.rpc.Server(RPC_URL);
  const networkPassphrase = NETWORK === "mainnet" ? sdk.Networks.PUBLIC : sdk.Networks.TESTNET;
  return { sdk, server, networkPassphrase };
}

/**
 * Simulates a read-only contract call and returns the native value.
 * i128/u64 values come back as BigInt (no JSON round-trip).
 * `deps` ({ sdk, server, networkPassphrase }) is injectable for tests.
 */
export async function simulateRead(contractId = CONTRACT_ID, method, args = [], deps) {
  const { sdk, server, networkPassphrase } = deps || (await loadStellarDeps());
  const tx = new sdk.TransactionBuilder(new sdk.Account(THROWAWAY_ACCOUNT, "0"), {
    fee: sdk.BASE_FEE,
    networkPassphrase,
  })
    .addOperation(new sdk.Contract(contractId).call(method, ...args))
    .setTimeout(30)
    .build();
  const sim = await server.simulateTransaction(tx);
  if (sdk.rpc.Api.isSimulationError(sim)) {
    throw new SimulationError(sim.error, method);
  }
  const retval = sim.result?.retval;
  return retval === undefined ? undefined : sdk.scValToNative(retval);
}
