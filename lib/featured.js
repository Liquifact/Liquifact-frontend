// Featured hero invoice selection (#1410). Pure, so node:test can import it.
//
// Rule: among open invoices due at least 7 days from now and not yet fully
// funded, pick the highest yield; ties break on most funded, then on ID.
const MIN_DAYS_TO_DUE = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

export function pickFeatured(invoices, nowMs) {
  if (!Array.isArray(invoices)) return null;
  const minDueMs = nowMs + MIN_DAYS_TO_DUE * DAY_MS;
  const candidates = invoices.filter((inv) => {
    if (!inv || inv.status !== "open") return false;
    const dueMs = Date.parse(inv.dueDate);
    if (!Number.isFinite(dueMs)) return false;
    if (dueMs < minDueMs) return false;
    const amount = Number(inv.amount);
    const funded = Number(inv.fundedAmount);
    if (!Number.isFinite(amount) || amount <= 0) return false;
    if (!Number.isFinite(funded)) return false;
    if (funded >= amount) return false;
    return true;
  });

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => {
    const yieldDiff = Number(b.yieldBps) - Number(a.yieldBps);
    if (yieldDiff !== 0) return yieldDiff;
    const fundedDiff = Number(b.fundedAmount) - Number(a.fundedAmount);
    if (fundedDiff !== 0) return fundedDiff;
    return String(a.id).localeCompare(String(b.id));
  });

  return candidates[0];
}
