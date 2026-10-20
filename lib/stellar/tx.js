import { Address, BASE_FEE, Contract, TransactionBuilder, nativeToScVal } from "@stellar/stellar-sdk";
import { NETWORK_PASSPHRASE } from "./network.js";

/** Convert a whole-token amount (e.g. 1 XLM) to i128 stroops (1 XLM = 10^8 stroops). */
export function toStroops(amount) {
  return BigInt(Math.round(Number(amount) * 1e8));
}

/**
 * Build an unsigned funding transaction.
 * lockSecs > 0 → fund_with_commitment(investor, amount, committed_lock_secs)
 * lockSecs = 0 → fund(investor, amount)
 *
 * `source` is a stellar-sdk Account (real for submission, throwaway for tests).
 */
export function buildFundTransaction({
  contractId,
  investor,
  amountStroops,
  lockSecs = 0,
  source,
  networkPassphrase = NETWORK_PASSPHRASE,
}) {
  const contract = new Contract(contractId);
  const amount = nativeToScVal(BigInt(amountStroops), { type: "i128" });
  const who = new Address(investor).toScVal();
  const invocation =
    Number(lockSecs) > 0
      ? contract.call("fund_with_commitment", who, amount, nativeToScVal(BigInt(Math.trunc(lockSecs)), { type: "u64" }))
      : contract.call("fund", who, amount);

  return new TransactionBuilder(source, { fee: BASE_FEE, networkPassphrase })
    .addOperation(invocation)
    .setTimeout(180)
    .build();
}

/** The contract function name a funding transaction will invoke. */
export function fundFunctionName(lockSecs) {
  return Number(lockSecs) > 0 ? "fund_with_commitment" : "fund";
}
