/**
 * Minimal Soroban RPC helpers for the investor-exit flow.
 *
 * Uses @stellar/stellar-sdk to:
 *  - simulate a read-only contract call (no signature needed)
 *  - build → simulate → sign (via Freighter) → submit → poll a state-mutating call
 *
 * CONTRACT: CDQCKR2YU6IVQ4GYPBMXBPZ4FGFQB5H25AI7ZSETHS2CZ5ZRCWQDSO6P (testnet)
 *
 * Entrypoint signatures confirmed via `stellar contract info interface` (schema v6):
 *   get_contribution(investor: Address) -> i128
 *   is_investor_refunded(investor: Address) -> bool
 *   get_legal_hold() -> bool
 *   is_paused() -> bool
 *   get_escrow() -> InvoiceEscrow   { status: u32, funded_amount: i128, ... }
 *   refund(investor: Address)
 *   unfund(investor: Address, amount: i128) -> InvoiceEscrow
 */

import {
  Contract,
  Networks,
  nativeToScVal,
  scValToNative,
  rpc as SorobanRpc,
  TransactionBuilder,
  BASE_FEE,
  xdr,
  Address,
} from "@stellar/stellar-sdk";
import { CONTRACT_ID, NETWORK } from "../config.js";

const RPC_URL =
  NETWORK === "testnet"
    ? "https://soroban-testnet.stellar.org"
    : "https://soroban-mainnet.stellar.org";

export function getRpc() {
  return new SorobanRpc.Server(RPC_URL, { allowHttp: false });
}

const NETWORK_PASSPHRASE =
  NETWORK === "testnet" ? Networks.TESTNET : Networks.PUBLIC;

/** Convert a Stellar public key string to an Address ScVal. */
function addressVal(addr) {
  return nativeToScVal(Address.fromString(addr), { type: "address" });
}

/** Convert a BigInt / number to an i128 ScVal. */
function i128Val(n) {
  return nativeToScVal(BigInt(n), { type: "i128" });
}

/**
 * Simulate a read-only call. Returns the decoded native JS value.
 * Never requests a signature and never submits a transaction.
 *
 * @param {string} method - Contract entrypoint name
 * @param {xdr.ScVal[]} args - Encoded arguments
 * @param {string} sourceAddress - Any valid Stellar address (used as fee source; simulation only)
 * @returns {Promise<unknown>}
 */
export async function simulateRead(method, args, sourceAddress) {
  const rpc = getRpc();
  const contract = new Contract(CONTRACT_ID);
  const account = await rpc.getAccount(sourceAddress);
  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build();

  const sim = await rpc.simulateTransaction(tx);
  if (SorobanRpc.Api.isSimulationError(sim)) {
    const err = new Error(sim.error || "Simulation failed");
    err.simulationError = sim.error;
    throw err;
  }
  const result = sim.result;
  if (!result) return undefined;
  return scValToNative(result.retval);
}

/**
 * Read the investor's contribution (stroops / token units, i128 returned as BigInt).
 * Falls back to 0n on error so the UI degrades gracefully.
 */
export async function fetchContribution(investorAddress) {
  try {
    const val = await simulateRead(
      "get_contribution",
      [addressVal(investorAddress)],
      investorAddress
    );
    return BigInt(val ?? 0);
  } catch {
    return 0n;
  }
}

/**
 * Returns true if the investor has already been refunded in a cancelled escrow.
 */
export async function fetchIsRefunded(investorAddress) {
  try {
    const val = await simulateRead(
      "is_investor_refunded",
      [addressVal(investorAddress)],
      investorAddress
    );
    return Boolean(val);
  } catch {
    return false;
  }
}

/**
 * Returns { status: number, funded_amount: BigInt } from the escrow state.
 * status: 0=open, 1=funded, 2=settled, 3=withdrawn, 4=cancelled
 */
export async function fetchEscrowState(investorAddress) {
  try {
    const val = await simulateRead("get_escrow", [], investorAddress);
    return {
      status: Number(val?.status ?? -1),
      funded_amount: BigInt(val?.funded_amount ?? 0),
    };
  } catch {
    return { status: -1, funded_amount: 0n };
  }
}

/** Returns true when a legal hold is active on the escrow. */
export async function fetchLegalHold(investorAddress) {
  try {
    const val = await simulateRead("get_legal_hold", [], investorAddress);
    return Boolean(val);
  } catch {
    return false;
  }
}

/** Returns true when the escrow is paused. */
export async function fetchIsPaused(investorAddress) {
  try {
    const val = await simulateRead("is_paused", [], investorAddress);
    return Boolean(val);
  } catch {
    return false;
  }
}

/**
 * Build → simulate → sign (Freighter) → submit → poll a state-mutating call.
 *
 * @param {string} method
 * @param {xdr.ScVal[]} args
 * @param {string} signerAddress - Connected wallet (full G-address)
 * @param {(status: string) => void} onStatus - Progress callback
 * @returns {Promise<void>}
 */
export async function buildSignSubmit(method, args, signerAddress, onStatus) {
  // Freighter API is browser-only; import dynamically so SSR/test environments survive.
  const freighterApi = await import("@stellar/freighter-api");

  const rpc = getRpc();
  const contract = new Contract(CONTRACT_ID);
  const account = await rpc.getAccount(signerAddress);

  onStatus("Building transaction…");
  const tx = new TransactionBuilder(account, {
    fee: String(Math.max(Number(BASE_FEE), 1_000_000)), // generous fee for Soroban
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(180)
    .build();

  onStatus("Simulating…");
  const sim = await rpc.simulateTransaction(tx);
  if (SorobanRpc.Api.isSimulationError(sim)) {
    const err = new Error(
      extractSimError(sim.error) || "Simulation failed — check contract state"
    );
    err.simulationError = sim.error;
    throw err;
  }

  const assembled = SorobanRpc.assembleTransaction(tx, sim).build();
  const txXdr = assembled.toXDR();

  onStatus("Waiting for signature…");
  let signedXdr;
  try {
    const result = await freighterApi.signTransaction(txXdr, {
      network: NETWORK,
      networkPassphrase: NETWORK_PASSPHRASE,
      accountToSign: signerAddress,
    });
    // freighter-api v6 returns { signedTxXdr } or the xdr string directly
    signedXdr =
      typeof result === "string" ? result : result.signedTxXdr || result;
    if (!signedXdr) throw new Error("User rejected the transaction");
  } catch (e) {
    const msg = e?.message || String(e);
    if (
      msg.toLowerCase().includes("reject") ||
      msg.toLowerCase().includes("cancel") ||
      msg.toLowerCase().includes("declined")
    ) {
      const cancelErr = new Error("Transaction cancelled by user");
      cancelErr.userCancelled = true;
      throw cancelErr;
    }
    throw e;
  }

  onStatus("Submitting…");
  const { TransactionBuilder: TB } = await import("@stellar/stellar-sdk");
  const signedTx = TB.fromXDR(signedXdr, NETWORK_PASSPHRASE);

  const sendResponse = await rpc.sendTransaction(signedTx);
  if (sendResponse.status === "ERROR") {
    throw new Error(sendResponse.errorResult?.toString() || "Submit failed");
  }

  const txHash = sendResponse.hash;
  onStatus("Confirming on-chain…");

  // Poll up to 60 s
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    await sleep(2000);
    const status = await rpc.getTransaction(txHash);
    if (status.status === SorobanRpc.Api.GetTransactionStatus.SUCCESS) {
      return;
    }
    if (status.status === SorobanRpc.Api.GetTransactionStatus.FAILED) {
      throw new Error("Transaction failed on-chain");
    }
  }
  throw new Error("Transaction not confirmed within 60 s");
}

/** Build args for `refund(investor)`. */
export function buildRefundArgs(investorAddress) {
  return [addressVal(investorAddress)];
}

/** Build args for `unfund(investor, amount)`. */
export function buildUnfundArgs(investorAddress, amountStroops) {
  return [addressVal(investorAddress), i128Val(amountStroops)];
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Try to extract a human-readable error message from a Soroban simulation
 * error string that may contain an error code integer.
 */
export function extractSimError(raw) {
  if (!raw) return null;
  // Map known EscrowError codes to messages
  const CODE_MAP = {
    142: "Escrow is not cancelled — refund not available",
    143: "No contribution to refund",
    220: "Escrow is not open — withdrawal not available",
    221: "Withdrawal amount exceeds your contribution",
    222: "A legal hold is active — withdrawal blocked",
  };
  for (const [code, msg] of Object.entries(CODE_MAP)) {
    if (raw.includes(String(code))) return msg;
  }
  return raw.slice(0, 120);
}
