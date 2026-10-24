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

/** RPC endpoint for the configured network; NEXT_PUBLIC_STELLAR_RPC_URL overrides the default. */
export const RPC_URL = process.env.NEXT_PUBLIC_STELLAR_RPC_URL || RPC_URLS[NETWORK] || RPC_URLS.testnet;

/** Network passphrase for the configured network (throws on an unsupported network). */
export function networkPassphrase() {
  if (NETWORK === "testnet") return NETWORK_PASSPHRASES.testnet;
  if (NETWORK === "public" || NETWORK === "mainnet") return NETWORK_PASSPHRASES.public;
  throw new Error("Unsupported Stellar network configuration.");
}

export function getRpcServer({ network = NETWORK, rpcUrl } = {}) {
  const url = rpcUrl || (network === NETWORK ? RPC_URL : RPC_URLS[network] || RPC_URLS.testnet);
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
import { signTransaction as freighterSignTransaction } from "./freighter.js";

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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Build → simulate → sign (Freighter) → submit → poll a state-mutating call.
 * @param {string} method
 * @param {Array} args - ScVal arguments
 * @param {string} signerAddress - connected wallet (G...)
 * @param {(status: string) => void} [onStatus] - progress callback
 */
export async function buildSignSubmit(method, args, signerAddress, onStatus = () => {}, { network = NETWORK, server, sign = freighterSignTransaction } = {}) {
  const rpcServer = server || getRpcServer({ network });
  const passphrase = NETWORK_PASSPHRASES[network] || NETWORK_PASSPHRASES.testnet;
  const account = await rpcServer.getAccount(signerAddress);

  onStatus("Building transaction…");
  const tx = new TransactionBuilder(account, { fee: "1000000", networkPassphrase: passphrase })
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
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    await sleep(2000);
    const status = await rpcServer.getTransaction(sendResponse.hash);
    if (status.status === StellarRpc.Api.GetTransactionStatus.SUCCESS) return;
    if (status.status === StellarRpc.Api.GetTransactionStatus.FAILED) throw new Error("Transaction failed on-chain");
  }
  throw new Error("Transaction not confirmed within 60 s");
}

/** Args for `refund(investor)`. */
export const buildRefundArgs = (investorAddress) => [addressArg(investorAddress)];

/** Args for `unfund(investor, amount)`. */
export const buildUnfundArgs = (investorAddress, amountStroops) => [addressArg(investorAddress), i128Arg(amountStroops)];

/** Map a Soroban simulation error (which may contain an EscrowError code) to a readable message. */
export function extractSimError(raw) {
  if (!raw) return null;
  const CODE_MAP = {
    142: "Escrow is not cancelled — refund not available",
    143: "No contribution to refund",
    220: "Escrow is not open — withdrawal not available",
    221: "Withdrawal amount exceeds your contribution",
    222: "A legal hold is active — withdrawal blocked",
  };
  for (const [code, msg] of Object.entries(CODE_MAP)) {
    if (String(raw).includes(`#${code}`) || String(raw).includes(`(${code})`) || new RegExp(`\\b${code}\\b`).test(String(raw))) return msg;
  }
  return String(raw).slice(0, 120);
}
