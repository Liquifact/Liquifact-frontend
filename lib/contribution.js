export function validateContribution(input, invoice) {
  if (input === undefined || input === null || String(input).trim() === "") {
    return { ok: false, amount: 0, error: "REQUIRED" };
  }
  if (invoice && invoice.status && invoice.status !== "open") {
    return { ok: false, amount: 0, error: "NOT_OPEN" };
  }
  const trimmed = String(input).trim();
  if (Number.isNaN(Number(trimmed))) {
    return { ok: false, amount: 0, error: "NOT_A_NUMBER" };
  }
  const n = Number(trimmed);
  if (n <= 0) {
    return { ok: false, amount: n, error: "NON_POSITIVE" };
  }
  if (trimmed.includes(".")) {
    const decimals = trimmed.split(".")[1];
    if (decimals && decimals.length > 7) {
      return { ok: false, amount: n, error: "TOO_MANY_DECIMALS" };
    }
  }
  if (invoice) {
    const remaining = Math.max(0, (invoice.amount || 0) - (invoice.fundedAmount || 0));
    if (n > remaining) {
      return { ok: false, amount: n, error: "EXCEEDS_REMAINING" };
    }
  }
  return { ok: true, amount: n, error: null };
}

export function creditedAmount(before, after) {
  if (!before || !after) return 0;
  const diff = (after.fundedAmount || 0) - (before.fundedAmount || 0);
  return Math.max(0, diff);
}
