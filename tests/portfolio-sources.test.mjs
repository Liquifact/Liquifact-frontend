import test from "node:test";
import assert from "node:assert/strict";
import {
  CONTRIBUTION_KEY_PREFIX,
  listPositions,
  localSource,
  mockSource,
  onChainSource,
  readContributionLog,
  recordContribution,
  resolveSources,
} from "../lib/portfolio/sources.js";

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
  };
}

test("recordContribution writes address-scoped rows and localSource joins invoice details", async () => {
  const storage = memoryStorage();
  const ok = await recordContribution({ invoiceId: "INV_1", amount: 25, currency: "usdc", at: 123 }, {
    storage,
    address: "G-investor",
  });
  assert.equal(ok, true);
  assert.deepEqual(readContributionLog("G-investor", storage), [
    { invoiceId: "INV_1", amount: 25, currency: "USDC", at: 123 },
  ]);
  const positions = await localSource.listPositions({
    address: "G-investor",
    storage,
    getInvoices: async () => ({ data: [{ id: "INV_1", currency: "USDC", yieldBps: 650, status: "funded", dueDate: "2027-01-01" }] }),
  });
  assert.equal(positions[0].principal, 25);
  assert.equal(positions[0].yieldBps, 650);
  assert.equal(positions[0].source, "browser");
});

test("corrupted local storage is treated as an empty contribution log", () => {
  const storage = memoryStorage({ [`${CONTRIBUTION_KEY_PREFIX}anon`]: "not-json" });
  assert.deepEqual(readContributionLog(null, storage), []);
});

test("a later contribution repairs a corrupted local log", async () => {
  const storage = memoryStorage({ [`${CONTRIBUTION_KEY_PREFIX}anon`]: "not-json" });
  assert.equal(await recordContribution({ invoiceId: "INV_2", amount: 5, currency: "USDC" }, { storage, address: null }), true);
  assert.equal(readContributionLog(null, storage).length, 1);
});

test("on-chain source keeps successful invoice data and reports a failed invoice", async () => {
  const goodContract = `C${"A".repeat(55)}`;
  const badContract = `C${"B".repeat(55)}`;
  const call = async ({ contractId, method }) => {
    if (contractId === badContract) throw new Error("RPC unavailable");
    if (method === "get_contribution") return 1_000_000_000n;
    if (method === "get_investor_yield_bps") return 650;
    if (method === "get_claimable_payout") return 1_000_000n;
    if (method === "is_investor_claimed") return false;
    throw new Error(`Unexpected call: ${method}`);
  };
  const result = await onChainSource.listPositions({
    address: "G-investor",
    addressArg: (address) => address,
    call,
    getInvoices: async () => ({ data: [
      { id: "INV_GOOD", contractId: goodContract, currency: "USDC", status: "funded", dueDate: "2027-01-01" },
      { id: "INV_BAD", contractId: badContract, currency: "USDC", status: "funded" },
    ] }),
  });
  assert.equal(result.positions.length, 1);
  assert.equal(result.positions[0].amount, 100);
  assert.equal(result.positions[0].claimable, 0.1);
  assert.deepEqual(result.errors.map((error) => error.invoiceId), ["INV_BAD"]);
});

test("demo mode resolves to mock data and source failures become partial errors", async () => {
  assert.deepEqual(resolveSources({ demo: true }), [mockSource]);
  const demo = await listPositions([mockSource]);
  assert.equal(demo.positions.length, 2);
  const result = await listPositions([
    { listPositions: async () => [{ invoiceId: "INV_1" }] },
    { listPositions: async () => { throw new Error("offline"); } },
  ]);
  assert.equal(result.positions.length, 1);
  assert.equal(result.errors[0].message, "offline");
});
