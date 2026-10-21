import { CONTRACT_ID } from "../config.js";
import { simulateRead, loadStellarDeps } from "../stellar/simulate.js";
import { UserRejectedError } from "../stellar/freighter.js";

const STROOPS = 10_000_000n;
const STATUS_NAMES = ["open", "funded", "settled", "withdrawn"];

// Contract errors that can block a claim (EscrowError 125–128, 213).
export const CLAIM_ERRORS = {
  127: "This escrow is not settled yet.",
  128: "Your payout is still time-locked.",
  125: "Claims are currently blocked.",
  126: "Claims are currently blocked.",
  213: "Claims are paused or under legal hold.",
};

export function normalizeStatus(raw) {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (typeof v === "string") return v.toLowerCase();
  if (typeof v === "number" || typeof v === "bigint") return STATUS_NAMES[Number(v)] || "unknown";
  return "unknown";
}

/** Formats a stroop amount (BigInt) as a decimal string with 7dp, no float math. */
export function formatStroops(value) {
  const v = BigInt(value);
  const neg = v < 0n;
  const abs = neg ? -v : v;
  const whole = (abs / STROOPS).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const frac = (abs % STROOPS).toString().padStart(7, "0");
  return `${neg ? "-" : ""}${whole}.${frac}`;
}

export async function loadClaimState(investor, { read = simulateRead, deps, contractId = CONTRACT_ID } = {}) {
  const d = deps || (await loadStellarDeps());
  const addr = d.sdk.Address.fromString(investor).toScVal();
  const call = (m, a = []) => read(contractId, m, a, d);
  const [claimable, claimed, notBefore, legalHold, paused, escrow] = await Promise.all([
    call("get_claimable_payout", [addr]),
    call("is_investor_claimed", [addr]),
    call("get_investor_claim_not_before", [addr]),
    call("get_legal_hold"),
    call("is_paused"),
    call("get_escrow"),
  ]);
  return {
    status: normalizeStatus(escrow?.status),
    claimable: BigInt(claimable ?? 0),
    claimed: Boolean(claimed),
    notBefore: BigInt(notBefore ?? 0),
    legalHold: Boolean(legalHold),
    paused: Boolean(paused),
  };
}

export function deriveClaimUi(state, nowSec) {
  const base = { kind: "nothing", amount: 0n, unlockAt: 0, reason: "" };
  if (!state || state.status !== "settled") {
    return { ...base, kind: "not-settled", reason: "This escrow has not settled yet." };
  }
  const amount = BigInt(state.claimable ?? 0);
  if (state.claimed) return { ...base, kind: "claimed", amount };
  if (amount <= 0n) return base;
  if (state.paused || state.legalHold) {
    return {
      ...base,
      kind: "blocked",
      amount,
      reason: state.legalHold ? "Claims are blocked by a legal hold." : "Claims are paused by the protocol.",
    };
  }
  const unlockAt = Number(state.notBefore ?? 0);
  if (unlockAt > nowSec) return { ...base, kind: "locked", amount, unlockAt };
  return { ...base, kind: "claimable", amount };
}

function contractErrorMessage(err) {
  const m = /Error\(Contract, #(\d+)\)/.exec(String(err?.message ?? err));
  return m && CLAIM_ERRORS[m[1]] ? CLAIM_ERRORS[m[1]] : null;
}

/**
 * Builds, prepares, signs (via `sign`) and submits claim_investor_payout(investor), then polls.
 * Returns { hash }. `investor` must be the connected wallet address.
 */
export async function submitClaim(investor, { sign, deps, contractId = CONTRACT_ID, pollMs = 1000, maxPolls = 30 }) {
  const { sdk, server, networkPassphrase } = deps || (await loadStellarDeps());
  try {
    const account = await server.getAccount(investor);
    const built = new sdk.TransactionBuilder(account, { fee: sdk.BASE_FEE, networkPassphrase })
      .addOperation(new sdk.Contract(contractId).call("claim_investor_payout", sdk.Address.fromString(investor).toScVal()))
      .setTimeout(60)
      .build();
    const prepared = await server.prepareTransaction(built);
    const signedXdr = await sign(prepared.toXDR(), networkPassphrase, investor);
    const signed = sdk.TransactionBuilder.fromXDR(signedXdr, networkPassphrase);
    const sent = await server.sendTransaction(signed);
    if (sent.status === "ERROR") throw new Error("Transaction was rejected by the network.");
    for (let i = 0; i < maxPolls; i++) {
      const r = await server.getTransaction(sent.hash);
      if (r.status === "SUCCESS") return { hash: sent.hash };
      if (r.status === "FAILED") throw new Error("Transaction failed on-chain.");
      await new Promise((res) => setTimeout(res, pollMs));
    }
    throw new Error("Timed out waiting for confirmation.");
  } catch (err) {
    if (err instanceof UserRejectedError) throw err;
    const friendly = contractErrorMessage(err);
    if (friendly) throw new Error(friendly);
    throw err;
  }
}
