import { listInvoices } from "../api.js";
import { escrowFor } from "../escrow/registry.js";
import { projectedPayout } from "./summary.js";

export const CONTRIBUTION_KEY_PREFIX = "liquifact-contributions:";

async function simulateEscrowCall(options) {
  const { simulateCall } = await import("../stellar/rpc.js");
  return simulateCall(options);
}

async function makeAddressArg(address) {
  const { addressArg } = await import("../stellar/rpc.js");
  return addressArg(address);
}

function storageOrNull(storage) {
  if (storage) return storage;
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function readContributionLog(address, storage = storageOrNull()) {
  if (!storage) return [];
  try {
    const raw = storage.getItem(`${CONTRIBUTION_KEY_PREFIX}${address || "anon"}`);
    const rows = JSON.parse(raw || "[]");
    return Array.isArray(rows)
      ? rows.filter((row) => row && typeof row.invoiceId === "string" && Number.isFinite(Number(row.amount)) && Number(row.amount) > 0)
      : [];
  } catch {
    return [];
  }
}

/** Record a successful API funding event in the browser-local investor log. */
export async function recordContribution(entry, { storage, address, resolveAddress } = {}) {
  const target = storageOrNull(storage);
  if (!target || !entry || typeof entry.invoiceId !== "string") return false;
  let investor = address;
  if (investor === undefined) {
    try {
      const resolve = resolveAddress || (async () => (await import("../stellar/freighter.js")).getWalletAddress());
      investor = await resolve();
    } catch { investor = null; }
  }
  const key = `${CONTRIBUTION_KEY_PREFIX}${investor || "anon"}`;
  try {
    let current = [];
    try { current = JSON.parse(target.getItem(key) || "[]"); } catch { current = []; }
    const rows = Array.isArray(current) ? current : [];
    rows.push({
      invoiceId: entry.invoiceId,
      amount: Number(entry.amount),
      currency: String(entry.currency || "USDC").toUpperCase(),
      at: Number.isFinite(Number(entry.at)) ? Number(entry.at) : Date.now(),
    });
    target.setItem(key, JSON.stringify(rows));
    return true;
  } catch {
    return false;
  }
}

function invoiceRows(payload) {
  return Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : [];
}

function asAmount(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

function stroopsToAmount(value) {
  try {
    return Number(BigInt(value ?? 0)) / 10_000_000;
  } catch {
    return asAmount(value);
  }
}

function invoiceById(invoices) {
  return new Map(invoiceRows(invoices).map((invoice) => [String(invoice.id), invoice]));
}

export const localSource = {
  async listPositions({ address = null, storage, getInvoices = listInvoices } = {}) {
    const [invoicesPayload] = await Promise.all([getInvoices()]);
    const byId = invoiceById(invoicesPayload);
    const totals = new Map();
    for (const row of readContributionLog(address, storageOrNull(storage))) {
      const invoice = byId.get(row.invoiceId);
      const currency = String(row.currency || invoice?.currency || "USDC").toUpperCase();
      const key = `${row.invoiceId}:${currency}`;
      const previous = totals.get(key);
      totals.set(key, {
        invoiceId: row.invoiceId,
        amount: (previous?.amount || 0) + asAmount(row.amount),
        currency,
        yieldBps: Number(invoice?.yieldBps) || 0,
        status: invoice?.status || "unknown",
        dueAt: invoice?.dueDate || null,
        source: "browser",
        at: Math.max(previous?.at || 0, Number(row.at) || 0),
      });
    }
    return [...totals.values()].map((position) => ({
      ...position,
      principal: position.amount,
      projectedPayout: projectedPayout(position.amount, position.yieldBps),
      claimable: 0,
    }));
  },
};

export const onChainSource = {
  async listPositions({ address, call = simulateEscrowCall, addressArg = makeAddressArg, getInvoices = listInvoices } = {}) {
    if (!address) return { positions: [], errors: [] };
    const invoices = invoiceRows(await getInvoices());
    const settled = await Promise.all(invoices.map(async (invoice) => {
      const deployment = escrowFor(invoice);
      if (!deployment) return { position: null };
      try {
        const args = [await addressArg(address)];
        const contribution = await call({ contractId: deployment.contractId, method: "get_contribution", args });
        const amount = stroopsToAmount(contribution);
        if (amount <= 0) return { position: null };
        const [yieldBpsRaw, claimableRaw, claimedRaw] = await Promise.all([
          call({ contractId: deployment.contractId, method: "get_investor_yield_bps", args }),
          call({ contractId: deployment.contractId, method: "get_claimable_payout", args }),
          call({ contractId: deployment.contractId, method: "is_investor_claimed", args }),
        ]);
        const yieldBps = Number(yieldBpsRaw) || Number(invoice.yieldBps) || 0;
        const claimable = stroopsToAmount(claimableRaw);
        const status = claimedRaw ? "claimed" : invoice.status || "unknown";
        return { position: {
          invoiceId: String(invoice.id),
          amount,
          principal: amount,
          currency: String(invoice.currency || "USDC").toUpperCase(),
          yieldBps,
          status,
          dueAt: invoice.dueDate || null,
          projectedPayout: projectedPayout(amount, yieldBps),
          claimable,
          source: "on-chain",
          claimed: Boolean(claimedRaw),
        } };
      } catch (error) {
        return { error: { invoiceId: String(invoice.id), message: error?.message || "Unable to load this escrow." } };
      }
    }));
    return {
      positions: settled.flatMap((row) => row.position ? [row.position] : []),
      errors: settled.flatMap((row) => row.error ? [row.error] : []),
    };
  },
};

export const mockSource = {
  async listPositions() {
    return { positions: [
      { invoiceId: "INV_DEMO_1", amount: 100, principal: 100, currency: "USDC", yieldBps: 650, status: "funded", dueAt: Date.now() + 14 * 86400000, projectedPayout: 106.5, claimable: 0, source: "demo" },
      { invoiceId: "INV_DEMO_2", amount: 50, principal: 50, currency: "XLM", yieldBps: 800, status: "settled", dueAt: Date.now() + 7 * 86400000, projectedPayout: 54, claimable: 54, source: "demo" },
    ], errors: [] };
  },
};

export function resolveSources({ address = null, demo = false } = {}) {
  if (demo) return [mockSource];
  return address ? [localSource, onChainSource] : [localSource];
}

export async function listPositions(sources, options = {}) {
  const results = await Promise.all((sources || []).map(async (source) => {
    try {
      const value = await source.listPositions(options);
      return Array.isArray(value) ? { positions: value, errors: [] } : {
        positions: Array.isArray(value?.positions) ? value.positions : [],
        errors: Array.isArray(value?.errors) ? value.errors : [],
      };
    } catch (error) {
      return { positions: [], errors: [{ message: error?.message || "Unable to load positions." }] };
    }
  }));
  return results.reduce((all, current) => ({
    positions: all.positions.concat(current.positions),
    errors: all.errors.concat(current.errors),
  }), { positions: [], errors: [] });
}
