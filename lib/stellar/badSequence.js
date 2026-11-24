import { xdr } from "@stellar/stellar-sdk";

const BAD_SEQUENCE_VALUE = -5;
const BAD_SEQUENCE_NAMES = new Set(["txBadSeq", "txBAD_SEQ", "tx_bad_seq"]);

function matchesBadSequence(value, seen = new Set()) {
  if (value == null || seen.has(value)) return false;
  seen.add(value);

  if (typeof value === "number" || typeof value === "bigint") return Number(value) === BAD_SEQUENCE_VALUE;
  if (typeof value === "string") return BAD_SEQUENCE_NAMES.has(value);
  if (typeof value === "function") {
    try {
      return matchesBadSequence(value(), seen);
    } catch {
      return BAD_SEQUENCE_NAMES.has(value.name);
    }
  }
  if (typeof value !== "object") return false;

  for (const field of ["type", "name", "value", "code", "switch"]) {
    if (matchesBadSequence(value[field], seen)) return true;
  }
  if (typeof value.toXdrObject === "function") {
    try {
      if (matchesBadSequence(value.toXdrObject()?.code, seen)) return true;
    } catch {
      // Malformed XDR is not evidence of a stale sequence number.
    }
  }
  return false;
}

function decodedCandidates(raw) {
  const candidates = [raw];
  if (typeof raw !== "string" && !(raw instanceof Uint8Array)) return candidates;
  for (const type of [xdr.TransactionResult, xdr.TransactionResultResult]) {
    try {
      candidates.push(type.fromXDR(raw, "base64"));
    } catch {
      // Not XDR for this type; another shape may still match.
    }
  }
  return candidates;
}

function hasBadSequence(raw) {
  for (const candidate of decodedCandidates(raw)) {
    if (matchesBadSequence(candidate) || matchesBadSequence(candidate?.result)) return true;
  }
  if (raw && typeof raw.toXDR === "function") {
    try {
      return hasBadSequence(raw.toXDR("base64"));
    } catch {
      return false;
    }
  }
  return false;
}

/** True when a failed send response carries the tx_bad_seq (stale sequence) result code. */
export function isBadSequence(sendResponse) {
  if (!sendResponse || (sendResponse.status && sendResponse.status !== "ERROR")) return false;
  return hasBadSequence(sendResponse.errorResult);
}
