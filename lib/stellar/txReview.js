/**
 * Human-readable review of a prepared Stellar transaction.
 *
 * Signing raw XDR in a wallet popup is unreadable for most users. This module
 * decodes the prepared transaction, extracts the contract call (or payment)
 * that is actually about to be signed, and checks it against the caller's
 * stated intent before the dialog allows Freighter to open.
 */

import { StrKey, TransactionBuilder, scValToNative } from "@stellar/stellar-sdk";

import { getNetwork } from "./networks.js";

function contractIdOf(address) {
  const value = address?.contractId?.value;
  if (!value) return null;
  try {
    return StrKey.encodeContract(Buffer.from(value));
  } catch {
    return null;
  }
}

function summarizeOperation(operation) {
  if (
    operation.type === "invokeHostFunction" &&
    operation.func?.type === "hostFunctionTypeInvokeContract"
  ) {
    const call = operation.func.invokeContract;
    return {
      kind: "contract_call",
      contractId: contractIdOf(call.contractAddress),
      functionName: String(call.functionName),
      args: (call.args || []).map((arg) => scValToNative(arg)),
    };
  }
  if (operation.type === "payment") {
    return {
      kind: "payment",
      destination: operation.destination,
      amount: operation.amount,
      asset: operation.asset?.toString?.() ?? String(operation.asset ?? ""),
    };
  }
  return { kind: operation.type };
}

/**
 * Decode a prepared XDR for the expected network.
 *
 * Decoding does not prove the transaction was built for that network (the
 * passphrase is used to hash, not to encode), so the dialog always displays the
 * network the caller asked for and the caller must pass its own configuration.
 */
export function summarizeTransactionXdr(xdr, networkName = "testnet") {
  if (typeof xdr !== "string" || !xdr.trim()) {
    throw new Error("No prepared transaction was supplied.");
  }
  const network = getNetwork(networkName);
  let transaction;
  try {
    transaction = TransactionBuilder.fromXDR(xdr, network.passphrase);
  } catch {
    throw new Error(`This transaction is not valid on ${network.name}.`);
  }
  return {
    network: network.name,
    fee: transaction.fee,
    source: transaction.source,
    operations: transaction.operations.map(summarizeOperation),
  };
}

function toBigInt(value) {
  if (typeof value === "bigint") return value;
  try {
    return BigInt(String(value));
  } catch {
    return null;
  }
}

/**
 * Compare a decoded summary with the action the user asked for.
 *
 * Returns `{ ok, problems }`. `ok` is only true for a single contract call that
 * matches the expected contract, function and (when supplied) amount.
 */
export function checkIntent(summary, intent = {}) {
  const problems = [];
  if (!summary || !Array.isArray(summary.operations)) {
    return { ok: false, problems: ["The transaction could not be read."] };
  }
  if (!intent.contractId || !intent.functionName) {
    problems.push("No expected contract and function were supplied, so the transaction cannot be verified.");
  }
  if (summary.operations.length !== 1) {
    problems.push(
      `The transaction contains ${summary.operations.length} operations; exactly one was expected.`
    );
  }
  const call = summary.operations.find((operation) => operation.kind === "contract_call") || null;
  if (!call) {
    problems.push("The transaction does not call a Soroban contract.");
  } else {
    if (intent.contractId && call.contractId !== intent.contractId) {
      problems.push("The target contract does not match the expected contract.");
    }
    if (intent.functionName && call.functionName !== intent.functionName) {
      problems.push("The called function does not match the expected action.");
    }
    if (intent.amount !== undefined && intent.amount !== null) {
      const expected = toBigInt(intent.amount);
      const found = expected !== null && call.args.some((arg) => toBigInt(arg) === expected);
      if (!found) {
        problems.push("The amount in the transaction does not match the amount you entered.");
      }
    }
  }
  return { ok: problems.length === 0, problems };
}

/** Convenience wrapper used by the dialog. */
export function reviewTransactionXdr(xdr, { intent, network } = {}) {
  const summary = summarizeTransactionXdr(xdr, network);
  return { summary, verification: checkIntent(summary, intent) };
}
