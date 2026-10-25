import { fundedPercent } from "./format.js";

export const RISK_WEIGHTS = {
  BASE_SCORE: 20,
  OVERDUE_OPEN: 55,
  OVERDUE_FUNDED: 30,
  NEAR_DUE_UNDERFUNDED: 35, // < 14 days and < 50% funded
  NEAR_DUE_WELLFUNDED: 10,   // < 14 days and >= 50% funded
  APPROACHING_DUE: 5,        // 14-30 days
  FULLY_FUNDED_BONUS: -10,   // 100% funded eliminates syndication risk
  FUNDING_VELOCITY_SEVERE_LAG: 20,
  FUNDING_VELOCITY_MODERATE_LAG: 10,
  FUNDING_VELOCITY_ON_TRACK: -5,
  YIELD_OUTLIER_HIGH: 25,    // > 2x median yield
  YIELD_ELEVATED: 12,        // > 1.4x median yield
  ON_CHAIN_WITH_SME: -15,    // verified contract + SME wallet
  ON_CHAIN_ONLY: -10,        // smart contract escrow only
  SME_ADDRESS_ONLY: -5,      // verified SME wallet only
  NO_ON_CHAIN_OR_SME: 10,    // unverified off-chain
  TICKET_SIZE_LARGE: 15,     // > 3x median ticket size
  TICKET_SIZE_MODERATE: 8,   // > 1.5x median ticket size
  TICKET_SIZE_SMALL: -5,     // < 0.5x median ticket size
  BAND_THRESHOLDS: {
    LOW_MAX: 29,
    MODERATE_MAX: 54,
    ELEVATED_MAX: 74,
  },
};

export function getRiskBand(score) {
  if (score === null || score === undefined || Number.isNaN(Number(score))) {
    return null;
  }
  const s = Number(score);
  const { LOW_MAX, MODERATE_MAX, ELEVATED_MAX } = RISK_WEIGHTS.BAND_THRESHOLDS;
  if (s <= LOW_MAX) return "Low";
  if (s <= MODERATE_MAX) return "Moderate";
  if (s <= ELEVATED_MAX) return "Elevated";
  return "High";
}

export function computeListMedians(invoices = []) {
  if (!Array.isArray(invoices) || invoices.length === 0) {
    return { medianYield: 0, medianTicketSize: 0 };
  }

  const yields = invoices
    .map((i) => Number(i?.yieldBps))
    .filter((n) => Number.isFinite(n) && n > 0)
    .sort((a, b) => a - b);

  const amounts = invoices
    .map((i) => Number(i?.amount))
    .filter((n) => Number.isFinite(n) && n > 0)
    .sort((a, b) => a - b);

  function calcMedian(arr) {
    if (arr.length === 0) return 0;
    const mid = Math.floor(arr.length / 2);
    if (arr.length % 2 === 1) return arr[mid];
    return (arr[mid - 1] + arr[mid]) / 2;
  }

  return {
    medianYield: calcMedian(yields),
    medianTicketSize: calcMedian(amounts),
  };
}

export function scoreInvoice(invoice, nowInput, contextInput) {
  if (!invoice || invoice.status === "settled" || invoice.status === "cancelled") {
    return { score: null, band: null, factors: [] };
  }

  let nowMs = Date.now();
  let context = {};

  if (typeof nowInput === "object" && nowInput !== null && !(nowInput instanceof Date)) {
    context = nowInput;
    if (context.nowMs) nowMs = Number(context.nowMs);
    else if (context.now) nowMs = new Date(context.now).getTime();
  } else if (nowInput !== undefined && nowInput !== null) {
    nowMs = new Date(nowInput).getTime();
    if (typeof contextInput === "object" && contextInput !== null) {
      context = contextInput;
    }
  } else if (typeof contextInput === "object" && contextInput !== null) {
    context = contextInput;
  }

  const factors = [];
  const pct = fundedPercent(invoice);
  const dueMs = invoice.dueDate ? new Date(invoice.dueDate).getTime() : NaN;
  const isDateValid = !Number.isNaN(dueMs);

  // 1. Time to due date
  if (!isDateValid) {
    factors.push({
      id: "due_date",
      label: "Time to due date",
      points: RISK_WEIGHTS.NEAR_DUE_UNDERFUNDED,
      detail: "Due date missing or unparseable",
    });
  } else {
    const diffMs = dueMs - nowMs;
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffMs < 0) {
      const overdueDays = Math.max(1, Math.ceil(Math.abs(diffMs) / (1000 * 60 * 60 * 24)));
      if (invoice.status === "open") {
        factors.push({
          id: "due_date",
          label: "Time to due date",
          points: RISK_WEIGHTS.OVERDUE_OPEN,
          detail: `Invoice is overdue by ${overdueDays} day${overdueDays === 1 ? "" : "s"} while still open`,
        });
      } else {
        factors.push({
          id: "due_date",
          label: "Time to due date",
          points: RISK_WEIGHTS.OVERDUE_FUNDED,
          detail: `Due date passed ${overdueDays} day${overdueDays === 1 ? "" : "s"} ago; awaiting settlement`,
        });
      }
    } else if (diffDays < 14) {
      if (pct < 50) {
        factors.push({
          id: "due_date",
          label: "Time to due date",
          points: RISK_WEIGHTS.NEAR_DUE_UNDERFUNDED,
          detail: `Due in ${diffDays} day${diffDays === 1 ? "" : "s"} with only ${pct}% funded`,
        });
      } else {
        factors.push({
          id: "due_date",
          label: "Time to due date",
          points: RISK_WEIGHTS.NEAR_DUE_WELLFUNDED,
          detail: `Due in ${diffDays} day${diffDays === 1 ? "" : "s"} (${pct}% funded)`,
        });
      }
    } else if (diffDays <= 30) {
      factors.push({
        id: "due_date",
        label: "Time to due date",
        points: RISK_WEIGHTS.APPROACHING_DUE,
        detail: `Approaching due date in ${diffDays} days`,
      });
    } else {
      factors.push({
        id: "due_date",
        label: "Time to due date",
        points: 0,
        detail: `Comfortable maturity window (${diffDays} days remaining)`,
      });
    }
  }

  // 2. Funding velocity vs elapsed listing time (if createdAt present and valid)
  if (invoice.createdAt) {
    const createdMs = new Date(invoice.createdAt).getTime();
    if (!Number.isNaN(createdMs) && isDateValid && dueMs > createdMs && nowMs >= createdMs) {
      const totalLifespan = dueMs - createdMs;
      const elapsed = Math.min(totalLifespan, nowMs - createdMs);
      const expectedPct = Math.round((elapsed / totalLifespan) * 100);
      const lag = expectedPct - pct;

      if (lag > 30) {
        factors.push({
          id: "funding_velocity",
          label: "Funding velocity",
          points: RISK_WEIGHTS.FUNDING_VELOCITY_SEVERE_LAG,
          detail: `Funding (${pct}%) severely lags elapsed listing timeline (${expectedPct}%)`,
        });
      } else if (lag > 15) {
        factors.push({
          id: "funding_velocity",
          label: "Funding velocity",
          points: RISK_WEIGHTS.FUNDING_VELOCITY_MODERATE_LAG,
          detail: `Funding (${pct}%) is trailing elapsed listing timeline (${expectedPct}%)`,
        });
      } else {
        factors.push({
          id: "funding_velocity",
          label: "Funding velocity",
          points: RISK_WEIGHTS.FUNDING_VELOCITY_ON_TRACK,
          detail: `Funding velocity is healthy relative to elapsed listing duration`,
        });
      }
    }
  }

  // Fully funded bonus (if 100% funded)
  if (pct >= 100 || invoice.status === "funded") {
    factors.push({
      id: "funding_completion",
      label: "Funding status",
      points: RISK_WEIGHTS.FULLY_FUNDED_BONUS,
      detail: "Fully funded: capital commitment complete",
    });
  }

  // 3. Yield outlier (> 2x median yield flagged)
  const medianYield = Number(context.medianYield) || 0;
  const yieldBps = Number(invoice.yieldBps) || 0;
  if (medianYield > 0) {
    if (yieldBps > 2 * medianYield) {
      factors.push({
        id: "yield_outlier",
        label: "Yield outlier",
        points: RISK_WEIGHTS.YIELD_OUTLIER_HIGH,
        detail: `Yield of ${(yieldBps / 100).toFixed(2)}% is more than 2x list median of ${(medianYield / 100).toFixed(2)}%`,
      });
    } else if (yieldBps > 1.4 * medianYield) {
      factors.push({
        id: "yield_outlier",
        label: "Yield comparison",
        points: RISK_WEIGHTS.YIELD_ELEVATED,
        detail: `Yield of ${(yieldBps / 100).toFixed(2)}% is elevated compared to median ${(medianYield / 100).toFixed(2)}%`,
      });
    } else {
      factors.push({
        id: "yield_outlier",
        label: "Yield comparison",
        points: 0,
        detail: `Yield of ${(yieldBps / 100).toFixed(2)}% is aligned with market median`,
      });
    }
  } else if (yieldBps > 1500) {
    factors.push({
      id: "yield_outlier",
      label: "Nominal yield",
      points: RISK_WEIGHTS.YIELD_ELEVATED,
      detail: `Nominal yield of ${(yieldBps / 100).toFixed(2)}% is elevated`,
    });
  }

  // 4. On-chain backing and verified SME wallet
  const hasOnChain = Boolean(invoice.onChain);
  const hasSmeAddress = Boolean(invoice.smeAddress && String(invoice.smeAddress).trim().length > 0);

  if (hasOnChain && hasSmeAddress) {
    factors.push({
      id: "on_chain",
      label: "On-chain backing",
      points: RISK_WEIGHTS.ON_CHAIN_WITH_SME,
      detail: "Verified smart contract escrow and verified on-chain SME address",
    });
  } else if (hasOnChain) {
    factors.push({
      id: "on_chain",
      label: "On-chain backing",
      points: RISK_WEIGHTS.ON_CHAIN_ONLY,
      detail: "Smart contract escrow backing verified on Stellar network",
    });
  } else if (hasSmeAddress) {
    factors.push({
      id: "on_chain",
      label: "On-chain backing",
      points: RISK_WEIGHTS.SME_ADDRESS_ONLY,
      detail: "Verified on-chain SME wallet address",
    });
  } else {
    factors.push({
      id: "on_chain",
      label: "On-chain backing",
      points: RISK_WEIGHTS.NO_ON_CHAIN_OR_SME,
      detail: "Off-chain listing without verified on-chain SME wallet",
    });
  }

  // 5. Ticket size relative to list median
  const medianTicket = Number(context.medianTicketSize) || 0;
  const amount = Number(invoice.amount) || 0;
  if (medianTicket > 0) {
    if (amount > 3 * medianTicket) {
      factors.push({
        id: "ticket_size",
        label: "Ticket size",
        points: RISK_WEIGHTS.TICKET_SIZE_LARGE,
        detail: `Face value (${amount}) exceeds 3x list median (${medianTicket})`,
      });
    } else if (amount > 1.5 * medianTicket) {
      factors.push({
        id: "ticket_size",
        label: "Ticket size",
        points: RISK_WEIGHTS.TICKET_SIZE_MODERATE,
        detail: `Face value (${amount}) is above list median (${medianTicket})`,
      });
    } else if (amount < 0.5 * medianTicket) {
      factors.push({
        id: "ticket_size",
        label: "Ticket size",
        points: RISK_WEIGHTS.TICKET_SIZE_SMALL,
        detail: `Smaller ticket size (${amount}) lowers single-asset exposure`,
      });
    } else {
      factors.push({
        id: "ticket_size",
        label: "Ticket size",
        points: 0,
        detail: "Ticket size in line with market median",
      });
    }
  }

  const rawScore = RISK_WEIGHTS.BASE_SCORE + factors.reduce((sum, f) => sum + f.points, 0);
  const score = Math.max(0, Math.min(100, Math.round(rawScore)));
  const band = getRiskBand(score);

  return {
    score,
    band,
    factors,
  };
}
