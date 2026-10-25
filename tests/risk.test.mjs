import { test } from "node:test";
import assert from "node:assert/strict";
import { scoreInvoice, computeListMedians, getRiskBand, RISK_WEIGHTS } from "../lib/risk.js";

const NOW = new Date("2026-10-19T12:00:00Z").getTime();

test("settled and cancelled invoices have no risk band", () => {
  const settled = scoreInvoice({ id: "INV_1", status: "settled", amount: 1000, dueDate: "2026-12-01" }, NOW);
  assert.equal(settled.band, null);
  assert.equal(settled.score, null);
  assert.deepEqual(settled.factors, []);

  const cancelled = scoreInvoice({ id: "INV_2", status: "cancelled", amount: 1000, dueDate: "2026-12-01" }, NOW);
  assert.equal(cancelled.band, null);
  assert.equal(cancelled.score, null);
  assert.deepEqual(cancelled.factors, []);
});

test("overdue open invoice yields High risk", () => {
  const invoice = {
    id: "INV_OVERDUE",
    status: "open",
    amount: 10000,
    fundedAmount: 1000,
    dueDate: "2026-10-10", // 9 days overdue relative to NOW
    yieldBps: 800,
    onChain: false,
  };
  const result = scoreInvoice(invoice, NOW, { medianYield: 750, medianTicketSize: 10000 });
  assert.equal(result.band, "High");
  assert.ok(result.score >= 75);
  const dueFactor = result.factors.find((f) => f.id === "due_date");
  assert.ok(dueFactor);
  assert.equal(dueFactor.points, RISK_WEIGHTS.OVERDUE_OPEN);
});

test("healthy long-dated well-funded invoice yields Low risk", () => {
  const invoice = {
    id: "INV_HEALTHY",
    status: "open",
    amount: 10000,
    fundedAmount: 9500, // 95%
    dueDate: "2027-04-15", // ~6 months runway
    yieldBps: 700,
    onChain: true,
    smeAddress: "GA7TXEBMEPQCLHIYCWDN7RKAO5IMRD2UV7O7TZXMEW6VZUMEXNR4XBB5",
  };
  const result = scoreInvoice(invoice, NOW, { medianYield: 750, medianTicketSize: 10000 });
  assert.equal(result.band, "Low");
  assert.ok(result.score <= RISK_WEIGHTS.BAND_THRESHOLDS.LOW_MAX);
});

test("boundary values at band edges produce exact bands", () => {
  assert.equal(getRiskBand(0), "Low");
  assert.equal(getRiskBand(29), "Low");
  assert.equal(getRiskBand(30), "Moderate");
  assert.equal(getRiskBand(54), "Moderate");
  assert.equal(getRiskBand(55), "Elevated");
  assert.equal(getRiskBand(74), "Elevated");
  assert.equal(getRiskBand(75), "High");
  assert.equal(getRiskBand(100), "High");
  assert.equal(getRiskBand(null), null);
});

test("handles missing or invalid createdAt gracefully", () => {
  const invoiceWithoutCreated = {
    id: "INV_NO_CREATED",
    status: "open",
    amount: 10000,
    fundedAmount: 5000,
    dueDate: "2026-12-15",
    yieldBps: 700,
    onChain: true,
  };
  const res = scoreInvoice(invoiceWithoutCreated, NOW);
  assert.ok(res.band);
  assert.ok(typeof res.score === "number");
  assert.ok(!res.factors.some((f) => f.id === "funding_velocity"));
});

test("factor isolation: near due date (< 14 days) and underfunded (< 50%) triggers elevated factor", () => {
  const invoice = {
    id: "INV_NEAR_DUE",
    status: "open",
    amount: 20000,
    fundedAmount: 4000, // 20%
    dueDate: "2026-10-25", // 6 days away
    yieldBps: 700,
    onChain: true,
    smeAddress: "GA7TXE",
  };
  const res = scoreInvoice(invoice, NOW);
  const factor = res.factors.find((f) => f.id === "due_date");
  assert.ok(factor);
  assert.equal(factor.points, RISK_WEIGHTS.NEAR_DUE_UNDERFUNDED);
});

test("factor isolation: funding velocity with severe lag triggers penalty", () => {
  const invoice = {
    id: "INV_VELOCITY_LAG",
    status: "open",
    createdAt: "2026-09-01",
    dueDate: "2026-10-31", // total 60 days, ~48 days elapsed (80%)
    amount: 10000,
    fundedAmount: 1000, // 10% funded -> lag of 70%
    yieldBps: 700,
    onChain: true,
  };
  const res = scoreInvoice(invoice, NOW);
  const factor = res.factors.find((f) => f.id === "funding_velocity");
  assert.ok(factor);
  assert.equal(factor.points, RISK_WEIGHTS.FUNDING_VELOCITY_SEVERE_LAG);
});

test("factor isolation: yield outlier (> 2x median) is flagged with high points", () => {
  const normalInvoice = {
    id: "INV_NORMAL_YIELD",
    status: "open",
    amount: 10000,
    dueDate: "2026-12-01",
    yieldBps: 700,
  };
  const outlierInvoice = {
    ...normalInvoice,
    yieldBps: 1600, // > 2x 700
  };
  const normalRes = scoreInvoice(normalInvoice, NOW, { medianYield: 700 });
  const outlierRes = scoreInvoice(outlierInvoice, NOW, { medianYield: 700 });

  const outlierFactor = outlierRes.factors.find((f) => f.id === "yield_outlier");
  assert.ok(outlierFactor);
  assert.equal(outlierFactor.points, RISK_WEIGHTS.YIELD_OUTLIER_HIGH);
  assert.ok(outlierRes.score > normalRes.score);
});

test("factor isolation: on-chain contract and verified SME wallet reduce risk", () => {
  const offChainInvoice = {
    id: "INV_OFFCHAIN",
    status: "open",
    amount: 10000,
    dueDate: "2026-12-01",
    yieldBps: 700,
    onChain: false,
  };
  const onChainWithSme = {
    ...offChainInvoice,
    onChain: true,
    smeAddress: "GA7TXEBMEPQCLHIYCWDN7RKAO5IMRD2UV7O7TZXMEW6VZUMEXNR4XBB5",
  };

  const offRes = scoreInvoice(offChainInvoice, NOW);
  const onRes = scoreInvoice(onChainWithSme, NOW);

  const offFactor = offRes.factors.find((f) => f.id === "on_chain");
  const onFactor = onRes.factors.find((f) => f.id === "on_chain");

  assert.equal(offFactor.points, RISK_WEIGHTS.NO_ON_CHAIN_OR_SME);
  assert.equal(onFactor.points, RISK_WEIGHTS.ON_CHAIN_WITH_SME);
  assert.ok(onRes.score < offRes.score);
});

test("factor isolation: large ticket size relative to median increases points", () => {
  const smallTicket = {
    id: "INV_SMALL",
    status: "open",
    amount: 3000, // < 0.5x 10000
    dueDate: "2026-12-01",
    yieldBps: 700,
  };
  const largeTicket = {
    id: "INV_LARGE",
    status: "open",
    amount: 40000, // > 3x 10000
    dueDate: "2026-12-01",
    yieldBps: 700,
  };

  const smallRes = scoreInvoice(smallTicket, NOW, { medianTicketSize: 10000 });
  const largeRes = scoreInvoice(largeTicket, NOW, { medianTicketSize: 10000 });

  const smallFactor = smallRes.factors.find((f) => f.id === "ticket_size");
  const largeFactor = largeRes.factors.find((f) => f.id === "ticket_size");

  assert.equal(smallFactor.points, RISK_WEIGHTS.TICKET_SIZE_SMALL);
  assert.equal(largeFactor.points, RISK_WEIGHTS.TICKET_SIZE_LARGE);
  assert.ok(largeRes.score > smallRes.score);
});

test("computeListMedians calculates medians for empty, odd, and even lists", () => {
  assert.deepEqual(computeListMedians([]), { medianYield: 0, medianTicketSize: 0 });

  const oddList = [
    { yieldBps: 600, amount: 1000 },
    { yieldBps: 800, amount: 5000 },
    { yieldBps: 1200, amount: 20000 },
  ];
  assert.deepEqual(computeListMedians(oddList), { medianYield: 800, medianTicketSize: 5000 });

  const evenList = [
    { yieldBps: 600, amount: 1000 },
    { yieldBps: 700, amount: 4000 },
    { yieldBps: 900, amount: 8000 },
    { yieldBps: 1200, amount: 20000 },
  ];
  assert.deepEqual(computeListMedians(evenList), { medianYield: 800, medianTicketSize: 6000 });
});

test("INV_0003 and INV_0002 produce different bands with demo context", () => {
  const inv2 = {
    id: "INV_0002",
    sme: "Northwind Textiles",
    debtor: "Initech Wholesale",
    amount: 25000,
    currency: "USDC",
    fundedAmount: 18000,
    yieldBps: 650,
    dueDate: "2026-12-30",
    status: "open",
    onChain: false,
  };
  const inv3 = {
    id: "INV_0003",
    sme: "Blue Harbor Logistics",
    debtor: "Umbrella Foods",
    amount: 42000,
    currency: "USDC",
    fundedAmount: 42000,
    yieldBps: 720,
    dueDate: "2026-11-28",
    status: "funded",
    onChain: false,
  };

  const medians = { medianYield: 760, medianTicketSize: 18750 };
  const res2 = scoreInvoice(inv2, NOW, medians);
  const res3 = scoreInvoice(inv3, NOW, medians);

  assert.notEqual(res2.band, res3.band);
});
