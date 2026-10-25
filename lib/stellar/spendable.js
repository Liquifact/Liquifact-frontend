// Pure spendable-balance maths. All amounts are decimal strings at 7dp,
// converted through BigInt stroops to avoid float drift.
import { STROOPS_PER_UNIT } from "./amount.js";

const XLM = (n) => BigInt(Math.round(n * 1e7));
const toDisplay = (stroops) => {
  const whole = stroops / STROOPS_PER_UNIT;
  const frac = (stroops % STROOPS_PER_UNIT).toString().padStart(7, "0").replace(/0+$/, "");
  return `${whole.toString()}${frac ? `.${frac}` : ""}`;
};

/**
 * Spendable balance for one asset.
 * XLM: balance - min reserve ((2 + subentries + sponsored - sponsoring) * 0.5) - 1 XLM fee buffer.
 * Tokens: the token balance (reserve rules don't apply per trustline here since
 * the trustline reserve is already covered by the subentry reserve).
 * @returns {string} decimal string, never negative
 */
export function spendable({ balances = [], subentryCount = 0, numSponsoring = 0, numSponsored = 0, code }) {
  const entry = balances.find((b) => b.code === code);
  if (!entry) return "0";
  const balanceStroops = BigInt(Math.round(Number(entry.balance) * 1e7));
  if (code !== "XLM") return toDisplay(balanceStroops);
  const effectiveSubentries = Math.max(0, Number(subentryCount) + Number(numSponsored) - Number(numSponsoring));
  const reserve = XLM((2 + effectiveSubentries) * 0.5);
  const feeBuffer = XLM(1);
  const result = balanceStroops - reserve - feeBuffer;
  return toDisplay(result > 0n ? result : 0n);
}
