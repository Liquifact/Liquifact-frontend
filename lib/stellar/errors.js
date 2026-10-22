// Single decoder for Stellar/Soroban/Freighter failures.
// Returns { code, title, message, action, retryable } for any input.
// Never throws.

import ESCROW_CODE_NAMES from "./escrow-errors.json" with { type: "json" };

export { ESCROW_CODE_NAMES };

/** Code -> { title, message, action } table. */
export const ESCROW_ERRORS = {
  100: {
    title: "Contribution too small",
    message: "Your contribution is below the minimum this invoice accepts.",
    action: "Increase the amount to meet the minimum contribution and try again.",
  },
  101: {
    title: "Contribution too small",
    message: "Your contribution is below the minimum this invoice accepts.",
    action: "Increase the amount to meet the minimum contribution and try again.",
  },
  102: {
    title: "Legal hold in place",
    message: "This invoice is under a legal hold and cannot be funded right now.",
    action: "Wait for the hold to be lifted, or contact the issuer for details.",
  },
  103: {
    title: "Escrow not open for funding",
    message: "This escrow is no longer accepting contributions.",
    action: "Check the invoice status or pick a different invoice.",
  },
  104: {
    title: "Wallet not allowlisted",
    message: "Your wallet is not on the allowlist for this invoice.",
    action: "Contact the issuer to request allowlisting, then retry.",
  },
  105: {
    title: "Contribution too small",
    message: "Your contribution is below the minimum this invoice accepts.",
    action: "Increase the amount to meet the minimum contribution and try again.",
  },
  106: {
    title: "Exceeds investor cap",
    message: "This contribution would push you over the per-investor cap.",
    action: "Reduce the amount to stay within your cap and try again.",
  },
  107: {
    title: "Exceeds remaining amount",
    message: "This contribution is larger than the remaining amount to fund.",
    action: "Lower the amount to the remaining amount or less and try again.",
  },
  108: {
    title: "Amount must be positive",
    message: "The contribution amount must be greater than zero.",
    action: "Enter a positive amount and try again.",
  },
  109: {
    title: "Amount must be positive",
    message: "The contribution amount must be greater than zero.",
    action: "Enter a positive amount and try again.",
  },
  110: {
    title: "Currency mismatch",
    message: "You are funding with a different currency than this invoice requires.",
    action: "Switch the token/currency to the invoice currency and try again.",
  },
  111: {
    title: "Funding not yet open",
    message: "This invoice is not yet open for funding.",
    action: "Wait until the funding window opens and try again.",
  },
  120: {
    title: "Escrow not funded",
    message: "This escrow has not been fully funded yet.",
    action: "Wait for funding to complete before settling.",
  },
  121: {
    title: "Already settled",
    message: "This escrow has already been settled.",
    action: "Nothing to do — the settlement is complete.",
  },
  122: {
    title: "Settlement amount mismatch",
    message: "The settlement amount does not match the escrow terms.",
    action: "Check the amount against the invoice terms and retry.",
  },
  123: {
    title: "Settlement too early",
    message: "This invoice cannot be settled before its due date.",
    action: "Wait until the due date has passed and try again.",
  },
  124: {
    title: "Nothing to claim",
    message: "You have no funds available to claim.",
    action: "Confirm your contribution and that settlement has completed.",
  },
  125: {
    title: "Already claimed",
    message: "You have already claimed your funds from this escrow.",
    action: "Nothing to do — this claim is complete.",
  },
  126: {
    title: "Funds not yet available",
    message: "Your funds are not available to claim yet.",
    action: "Wait for settlement to complete and try again.",
  },
  127: {
    title: "Claim amount must be positive",
    message: "The claim amount must be greater than zero.",
    action: "Enter a positive amount and try again.",
  },
  128: {
    title: "Commitment lock not expired",
    message: "Your commitment is still locked and cannot be withdrawn yet.",
    action: "Wait until the lock expires and try again.",
  },
  129: {
    title: "Claim exceeds entitlement",
    message: "The claim amount is larger than what you are entitled to.",
    action: "Reduce the claim amount to your entitlement and try again.",
  },
  140: {
    title: "Nothing to refund",
    message: "This escrow has not been funded, so there is nothing to refund.",
    action: "Confirm the escrow was funded before requesting a refund.",
  },
  141: {
    title: "Already refunded",
    message: "This escrow has already been refunded.",
    action: "Nothing to do — the refund is complete.",
  },
  142: {
    title: "Refund too early",
    message: "This escrow cannot be refunded before its funding deadline.",
    action: "Wait until the funding deadline has passed and try again.",
  },
  143: {
    title: "Refund amount mismatch",
    message: "The refund amount does not match the escrow terms.",
    action: "Check the amount against the invoice terms and retry.",
  },
  144: {
    title: "Nothing to refund",
    message: "There are no funds available to refund.",
    action: "Confirm the escrow was funded before requesting a refund.",
  },
  145: {
    title: "Refund amount must be positive",
    message: "The refund amount must be greater than zero.",
    action: "Enter a positive amount and try again.",
  },
  164: {
    title: "Funding deadline passed",
    message: "The funding deadline for this invoice has passed.",
    action: "You can no longer contribute to this invoice.",
  },
  210: {
    title: "Funding paused",
    message: "Funding is temporarily paused for this escrow.",
    action: "Try again once funding is resumed.",
  },
  211: {
    title: "Settlement paused",
    message: "Settlement is temporarily paused for this escrow.",
    action: "Try again once settlement is resumed.",
  },
  212: {
    title: "Refunds paused",
    message: "Refunds are temporarily paused for this escrow.",
    action: "Try again once refunds are resumed.",
  },
  213: {
    title: "Withdrawals paused",
    message: "Withdrawals are temporarily paused for this escrow.",
    action: "Try again once withdrawals are resumed.",
  },
  220: {
    title: "Already unfunded",
    message: "This contribution has already been unfunded.",
    action: "Nothing to do — the unfund is complete.",
  },
  221: {
    title: "Nothing to unfund",
    message: "There is no contribution to unfund.",
    action: "Confirm you have an active contribution before unfunding.",
  },
  222: {
    title: "Cannot unfund after settlement",
    message: "Contributions cannot be unfunded once the escrow has settled.",
    action: "Contact the issuer if you need help with this contribution.",
  },
};

/** Transaction result codes from sendTransaction/getTransaction. */
export const TX_CODES = {
  txBadSeq: {
    code: "TX_BAD_SEQ",
    title: "Stale transaction sequence",
    message: "The transaction sequence is out of date, usually because another transaction was submitted first.",
    action: "Refresh the page and try again.",
    retryable: true,
  },
  txInsufficientFee: {
    code: "TX_INSUFFICIENT_FEE",
    title: "Network fee too low",
    message: "The transaction fee was too low for the current network conditions.",
    action: "Retry to have the fee bumped automatically.",
    retryable: true,
  },
  txInsufficientBalance: {
    code: "TX_INSUFFICIENT_BALANCE",
    title: "Insufficient balance",
    message: "Your account does not have enough lumens to cover this transaction.",
    action: "Fund your wallet and try again.",
    retryable: true,
  },
  txBadAuth: {
    code: "TX_BAD_AUTH",
    title: "Signature rejected",
    message: "The transaction signature was rejected by the network.",
    action: "Check that you signed with the correct account and try again.",
    retryable: true,
  },
  txTooLate: {
    code: "TX_TOO_LATE",
    title: "Transaction expired",
    message: "The transaction expired before it was confirmed.",
    action: "Retry the transaction.",
    retryable: true,
  },
};

/** Horizon extras.result_codes operation codes. */
export const HORIZON_CODES = {
  op_underfunded: {
    code: "OP_UNDERFUNDED",
    title: "Insufficient funds",
    message: "The source account does not have enough funds for this operation.",
    action: "Fund the account and try again.",
    retryable: true,
  },
  op_no_trust: {
    code: "OP_NO_TRUST",
    title: "Asset not trusted",
    message: "The account does not trust the asset being transferred.",
    action: "Add a trustline for the asset in your wallet and try again.",
    retryable: true,
  },
  op_low_reserve: {
    code: "OP_LOW_RESERVE",
    title: "Below minimum reserve",
    message: "The account would fall below the minimum reserve balance.",
    action: "Add funds to maintain the reserve requirement and try again.",
    retryable: true,
  },
};

function unknownContractCode(code) {
  return {
    code: `NUMERIC_${code}`,
    title: "Contract rejected the transaction",
    message: `Contract rejected the transaction (code ${code}).`,
    action: "Check the invoice details and try again.",
    retryable: false,
  };
}

const UNKNOWN_GENERIC = {
  code: "UNKNOWN",
  title: "Something went wrong",
  message: "The transaction could not be completed.",
  action: "Please try again. If the problem persists, contact support.",
  retryable: true,
};

const USER_REJECTED = {
  code: "USER_REJECTED",
  title: "Wallet request cancelled",
  message: "You cancelled the request in your wallet.",
  action: "Try again when you are ready to sign.",
  retryable: true,
};

const NETWORK = {
  code: "NETWORK",
  title: "Network problem",
  message: "We could not reach the Stellar network or the request timed out.",
  action: "Check your connection and try again.",
  retryable: true,
};

function safeString(v) {
  try {
    if (v == null) return "";
    if (typeof v === "string") return v;
    if (typeof v === "number" || typeof v === "boolean") return String(v);
    return "";
  } catch {
    return "";
  }
}

function collectStrings(v, out, depth = 0, seen = new WeakSet()) {
  if (depth > 6 || v == null) return out;
  const t = typeof v;
  if (t === "string") {
    out.push(v);
    return out;
  }
  if (t !== "object") return out;
  if (seen.has(v)) return out;
  seen.add(v);
  if (Array.isArray(v)) {
    for (const item of v) collectStrings(item, out, depth + 1, seen);
    return out;
  }
  for (const key of Object.keys(v)) {
    try {
      collectStrings(v[key], out, depth + 1, seen);
    } catch {
      // ignore getter throws
    }
  }
  return out;
}

function findContractCode(strings) {
  for (const s of strings) {
    const m = /Error\(\s*Contract\s*,\s*#(\d+)\s*\)/.exec(s);
    if (m) return Number(m[1]);
  }
  // Diagnostic events may surface the code as a standalone number under a contract topic.
  for (const s of strings) {
    const m = /"contract"\s*[,:]\s*(\d+)/i.exec(s);
    if (m) return Number(m[1]);
  }
  return null;
}

function fromContractCode(code) {
  const entry = ESCROW_ERRORS[code];
  if (!entry) {
    const fb = unknownContractCode(code);
    return { code: fb.code, title: fb.title, message: fb.message, action: fb.action, retryable: fb.retryable };
  }
  return {
    code: `ESCROW_${code}`,
    title: entry.title,
    message: entry.message,
    action: entry.action,
    retryable: false,
  };
}

function decodeString(str) {
  const lower = str.toLowerCase();
  // Freighter user rejection
  if (/user declined/.test(lower)) return { ...USER_REJECTED };
  // Abort / timeout / network
  if (/aborterror|aborted/.test(lower)) return { ...NETWORK };
  if (/timeout|timed out|network error|failed to fetch|econnection reset|econnection refused|gateway|50\d|econnrefused/.test(lower)) {
    return { ...NETWORK };
  }
  // Contract error embedded in a string
  const contractCode = findContractCode([str]);
  if (contractCode != null) return fromContractCode(contractCode);
  // Transaction result codes
  for (const key of Object.keys(TX_CODES)) {
    if (lower.includes(key.toLowerCase())) return { ...TX_CODES[key] };
  }
  // Horizon op codes
  for (const key of Object.keys(HORIZON_CODES)) {
    if (lower.includes(key.toLowerCase())) return { ...HORIZON_CODES[key] };
  }
  return null;
}

function decodeObject(err) {
  // Freighter rejection: numeric code -4 or message "User declined access"
  try {
    if (err && typeof err === "object") {
      if (err.code === -4 || err.code === "-4") return { ...USER_REJECTED };
      if (typeof err.name === "string" && /aborterror/i.test(err.name)) return { ...NETWORK };
    }
  } catch {
    // ignore
  }

  const strings = collectStrings(err, []);

  // 1. Contract error from simulation / diagnostics
  const contractCode = findContractCode(strings);
  if (contractCode != null) return fromContractCode(contractCode);

  // 2. Transaction result codes (txBadSeq, etc.)
  for (const s of strings) {
    for (const key of Object.keys(TX_CODES)) {
      if (s === key || s.includes(key)) return { ...TX_CODES[key] };
    }
  }

  // 3. Horizon extras.result_codes
  for (const s of strings) {
    for (const key of Object.keys(HORIZON_CODES)) {
      if (s === key || s.includes(key)) return { ...HORIZON_CODES[key] };
    }
  }

  // 4. Freighter / network / abort strings
  for (const s of strings) {
    const decoded = decodeString(s);
    if (decoded) return decoded;
  }

  return null;
}

/**
 * Decode any Stellar/Soroban/Freighter failure into a user-facing object.
 * Never throws.
 * @param {unknown} err
 * @returns {{code: string, title: string, message: string, action: string, retryable: boolean}}
 */
export function decodeStellarError(err) {
  try {
    if (err == null) return { ...UNKNOWN_GENERIC };
    if (typeof err === "string") {
      const decoded = decodeString(err);
      if (decoded) return decoded;
      return { ...UNKNOWN_GENERIC };
    }
    if (typeof err !== "object") {
      const decoded = decodeString(safeString(err));
      if (decoded) return decoded;
      return { ...UNKNOWN_GENERIC };
    }
    const decoded = decodeObject(err);
    if (decoded) return decoded;
    return { ...UNKNOWN_GENERIC };
  } catch {
    return { ...UNKNOWN_GENERIC };
  }
}
