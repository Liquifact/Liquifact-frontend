// Minimal Soroban RPC helper for read-only (simulate) contract calls.
// Used by escrow data loaders; no transaction signing happens here.
import { Account, Address, Contract, TransactionBuilder, nativeToScVal, rpc as StellarRpc, scValToNative } from "@stellar/stellar-sdk";
import { NETWORK } from "../config.js";

export const RPC_URLS = {
  testnet: "https://soroban-testnet.stellar.org",
  public: "https://soroban-rpc.stellar.org",
};

export const NETWORK_PASSPHRASES = {
  testnet: "Test SDF Network ; September 2015",
  public: "Public Global Stellar Network ; September 2015",
};

export function getRpcServer({ network = NETWORK, rpcUrl } = {}) {
  const url = rpcUrl || RPC_URLS[network] || RPC_URLS.testnet;
  return new StellarRpc.Server(url, { allowHttp: url.startsWith("http://") });
}

// A read-only simulation source account. Never submitted to the network.
const SIMULATION_SOURCE = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";

/**
 * Simulate a read-only contract call and return the decoded native value.
 * @param {object} opts
 * @param {string} opts.contractId - contract address (C...)
 * @param {string} opts.method - entrypoint name
 * @param {Array}  [opts.args] - ScVal arguments (use nativeToScVal/Address helpers)
 * @param {StellarRpc.Server} [opts.server] - injected RPC server (tests)
 */
export async function simulateCall({ contractId, method, args = [], server, network = NETWORK, rpcUrl }) {
  const rpcServer = server || getRpcServer({ network, rpcUrl });
  const passphrase = NETWORK_PASSPHRASES[network] || NETWORK_PASSPHRASES.testnet;
  const account = new Account(SIMULATION_SOURCE, "0");
  const contract = new Contract(contractId);
  const tx = new TransactionBuilder(account, { fee: "100", networkPassphrase: passphrase })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build();
  const res = await rpcServer.simulateTransaction(tx);
  if (res.error) {
    throw new Error(`Contract call ${method} failed: ${res.error}`);
  }
  if (!res.result) {
    throw new Error(`Contract call ${method} returned no result`);
  }
  return scValToNative(res.result.retval);
}

/** Build an address argument (account G... or contract C...). */
export const addressArg = (value) => new Address(value).toScVal();
/** Build a u32 argument. */
export const u32Arg = (value) => nativeToScVal(Number(value), { type: "u32" });
