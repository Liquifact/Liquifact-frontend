// Minimal Soroban RPC helper for read-only (simulate) contract calls.
// Used by escrow data loaders; no transaction signing happens here.
import { Account, Address, BASE_FEE, Contract, TransactionBuilder, nativeToScVal, rpc as StellarRpc, scValToNative } from "@stellar/stellar-sdk";
import { NETWORK } from "../config.js";
import { getEndpoints, parseEndpoints, selectEndpoint, withFailover } from "./endpoints.js";
import { NETWORK_PASSPHRASES } from "./networks.js";

export { NETWORK_PASSPHRASES };
import { CONFIGURED_NETWORK } from "./networks.js";
import { assertWalletNetwork } from "./networkGuard.js";
import { getNetworkName } from "./freighter.js";

export const RPC_URLS = {
  testnet: "https://soroban-testnet.stellar.org",
  public: "https://soroban-rpc.stellar.org",
};


export function getRpcEndpoints({ network = NETWORK } = {}) {
  const defaults = RPC_URLS[network] || RPC_URLS.testnet;
  if (network !== NETWORK) return parseEndpoints(defaults);
  return getEndpoints("rpc", { network, defaultEndpoints: defaults });
}

export const RPC_ENDPOINTS = getRpcEndpoints();

/** RPC endpoint for the configured network; NEXT_PUBLIC_STELLAR_RPC_URL overrides the default. */
export const RPC_URL = RPC_ENDPOINTS[0] || RPC_URLS[NETWORK] || RPC_URLS.testnet;

export { withFailover };

/** Network passphrase for the configured network (throws on an unsupported network). */
export function networkPassphrase() {
  if (NETWORK === "testnet") return NETWORK_PASSPHRASES.testnet;
  if (NETWORK === "public" || NETWORK === "mainnet") return NETWORK_PASSPHRASES.public;
  throw new Error("Unsupported Stellar network configuration.");
}

export function getRpcServer({ network = NETWORK, rpcUrl, endpoints, now, clock, cooldownMs } = {}) {
  const explicit = parseEndpoints(endpoints ?? rpcUrl);
  const pool = explicit.length ? explicit : getRpcEndpoints({ network });
  const url = selectEndpoint("rpc", pool, { now, clock, cooldownMs }) || RPC_URL;
  return new StellarRpc.Server(url, { allowHttp: url.startsWith("http://"), timeout: 10_000 });
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
export async function simulateCall({ contractId, method, args = [], server, network = NETWORK, rpcUrl, endpoints, now, clock, cooldownMs }) {
  const passphrase = NETWORK_PASSPHRASES[network] || NETWORK_PASSPHRASES.testnet;
  const account = new Account(SIMULATION_SOURCE, "0");
  const contract = new Contract(contractId);
  const tx = new TransactionBuilder(account, { fee: "100", networkPassphrase: passphrase })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build();

  const call = async (activeUrl) => {
    const rpcServer = server || getRpcServer({ network, rpcUrl: activeUrl });
    const res = await rpcServer.simulateTransaction(tx);
    if (res.error) {
      const error = new Error(`Contract call ${method} failed: ${res.error}`);
      error.retryable = false;
      error.contractError = true;
      throw error;
    }
    if (!res.result) {
      const error = new Error(`Contract call ${method} returned no result`);
      error.retryable = false;
      error.contractError = true;
      throw error;
    }
    return scValToNative(res.result.retval);
  };

  if (server) return call();
  const explicit = parseEndpoints(endpoints ?? rpcUrl);
  return withFailover("rpc", call, {
    network,
    endpoints: explicit.length ? explicit : getRpcEndpoints({ network }),
    now,
    clock,
    cooldownMs,
  });
}

/** Build an address argument (account G... or contract C...). */
export const addressArg = (value) => new Address(value).toScVal();
/** Build a u32 argument. */
export const u32Arg = (value) => nativeToScVal(Number(value), { type: "u32" });

// ---------------------------------------------------------------------------
// Investor exit flow (#1368): refund(investor) on cancelled escrows and
// unfund(investor, amount) while the escrow is open.
//
// Entrypoint signatures (escrow contract, schema v6):
//   get_contribution(investor: Address) -> i128
//   is_investor_refunded(investor: Address) -> bool
//   get_legal_hold() -> bool
//   is_paused() -> bool
//   get_escrow() -> InvoiceEscrow   { status: u32, funded_amount: i128, ... }
//   refund(investor: Address)
//   unfund(investor: Address, amount: i128) -> InvoiceEscrow
// ---------------------------------------------------------------------------
import { CONTRACT_ID } from "../config.js";
import { parseContractError } from "../escrow/errors.js";
import { signTransaction as freighterSignTransaction } from "./freighter.js";
import { pollTransaction, RESULT } from "./pollTx.js";

/** Build an i128 argument from a BigInt / number / numeric string. */
export const i128Arg = (value) => nativeToScVal(BigInt(value), { type: "i128" });

/**
 * Simulate a read-only call on the configured escrow contract.
 * Never requests a signature and never submits a transaction.
 */
export async function simulateRead(method, args = []) {
  return simulateCall({ contractId: CONTRACT_ID, method, args });
}

/** Investor contribution (i128 as BigInt). Falls back to 0n on error. */
export async function fetchContribution(investorAddress) {
  try {
    return BigInt((await simulateRead("get_contribution", [addressArg(investorAddress)])) ?? 0);
  } catch {
    return 0n;
  }
}

/** True if the investor has already been refunded in a cancelled escrow. */
export async function fetchIsRefunded(investorAddress) {
  try {
    return Boolean(await simulateRead("is_investor_refunded", [addressArg(investorAddress)]));
  } catch {
    return false;
  }
}

/**
 * Escrow state `{ status, funded_amount }`.
 * status: 0=open, 1=funded, 2=settled, 3=withdrawn, 4=cancelled (-1 when unreadable)
 */
export async function fetchEscrowState() {
  try {
    const val = await simulateRead("get_escrow");
    return { status: Number(val?.status ?? -1), funded_amount: BigInt(val?.funded_amount ?? 0) };
  } catch {
    return { status: -1, funded_amount: 0n };
  }
}

/** True when a legal hold is active on the escrow. */
export async function fetchLegalHold() {
  try {
    return Boolean(await simulateRead("get_legal_hold"));
  } catch {
    return false;
  }
}

/** True when the escrow is paused. */
export async function fetchIsPaused() {
  try {
    return Boolean(await simulateRead("is_paused"));
  } catch {
    return false;
  }
}

/**
 * Build → simulate → sign (Freighter) → submit → poll a state-mutating call.
 * @param {string} method
 * @param {Array} args - ScVal arguments
 * @param {string} signerAddress - connected wallet (G...)
 * @param {(status: string) => void} [onStatus] - progress callback
 * @param {object} [opts]
 * @param {string} [opts.network]
 * @param {StellarRpc.Server} [opts.server]
 * @param {(xdr: string, passphrase: string) => Promise<string>} [opts.sign]
 * @param {AbortSignal} [opts.signal]
 * @param {number} [opts.pollIntervalMs]
 * @param {number} [opts.pollTimeoutMs]
 */
export async function buildSignSubmit(
  method,
  args,
  signerAddress,
  onStatus = () => {},
  { network = NETWORK, server, sign = freighterSignTransaction, getNetwork = getNetworkName, signal, pollIntervalMs, pollTimeoutMs } = {},
) {
  await assertWalletNetwork({ getNetwork, expected: network || CONFIGURED_NETWORK });
  const rpcServer = server || getRpcServer({ network });
  const passphrase = NETWORK_PASSPHRASES[network] || NETWORK_PASSPHRASES.testnet;
  const account = await rpcServer.getAccount(signerAddress);

  onStatus("Building transaction…");
  const tx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: passphrase })
    .addOperation(new Contract(CONTRACT_ID).call(method, ...args))
    .setTimeout(180)
    .build();

  onStatus("Simulating…");
  const sim = await rpcServer.simulateTransaction(tx);
  if (StellarRpc.Api.isSimulationError(sim)) {
    const err = new Error(extractSimError(sim.error) || "Simulation failed — check contract state");
    err.simulationError = sim.error;
    throw err;
  }
  const assembled = StellarRpc.assembleTransaction(tx, sim).build();

  onStatus("Waiting for signature…");
  let signedXdr;
  try {
    signedXdr = await sign(assembled.toXDR(), passphrase);
    if (!signedXdr) throw new Error("User rejected the transaction");
  } catch (e) {
    const msg = String(e?.message || e).toLowerCase();
    if (msg.includes("reject") || msg.includes("cancel") || msg.includes("declined")) {
      const cancelErr = new Error("Transaction cancelled by user");
      cancelErr.userCancelled = true;
      throw cancelErr;
    }
    throw e;
  }

  onStatus("Submitting…");
  const sendResponse = await rpcServer.sendTransaction(TransactionBuilder.fromXDR(signedXdr, passphrase));
  if (sendResponse.status === "ERROR") {
    throw new Error(sendResponse.errorResult?.toString() || "Submit failed");
  }

  onStatus("Confirming on-chain…");
  const outcome = await pollTransaction(rpcServer, sendResponse.hash, {
    signal,
    intervalMs: pollIntervalMs,
    timeoutMs: pollTimeoutMs,
  });
  if (outcome === RESULT.SUCCESS) return;
  if (outcome === RESULT.FAILED) throw new Error("Transaction failed on-chain");
  throw new Error("Transaction not confirmed within 60 s");
}

/** Args for `refund(investor)`. */
export const buildRefundArgs = (investorAddress) => [addressArg(investorAddress)];

/** Args for `unfund(investor, amount)`. */
export const buildUnfundArgs = (investorAddress, amountStroops) => [addressArg(investorAddress), i128Arg(amountStroops)];

/** Map a Soroban simulation error (which may contain an EscrowError code) to a readable message. */
export function extractSimError(raw) {
  if (!raw) return null;
  const parsed = parseContractError(raw);
  if (parsed) return parsed.message;
  return String(raw).slice(0, 120);
}
