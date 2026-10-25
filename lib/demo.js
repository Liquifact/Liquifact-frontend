// Offline fallback used when the API cannot be reached.
export const DEMO_INVOICES = [
  { id: "INV_0001", sme: "Acme Components Ltd", debtor: "Globex Retail", amount: 100, currency: "XLM", fundedAmount: 0, yieldBps: 800, dueDate: "2027-01-17", status: "open", onChain: true, smeAddress: "GA7TXEBMEPQCLHIYCWDN7RKAO5IMRD2UV7O7TZXMEW6VZUMEXNR4XBB5" },
  { id: "INV_0002", sme: "Northwind Textiles", debtor: "Initech Wholesale", amount: 25000, currency: "USDC", fundedAmount: 18000, yieldBps: 650, dueDate: "2026-12-30", status: "open", onChain: false },
  { id: "INV_0003", sme: "Blue Harbor Logistics", debtor: "Umbrella Foods", amount: 42000, currency: "USDC", fundedAmount: 42000, yieldBps: 720, dueDate: "2026-11-28", status: "funded", onChain: false },
  { id: "INV_0004", sme: "Sunrise Agritech", debtor: "Stark Industries", amount: 12500, currency: "USDC", fundedAmount: 12500, yieldBps: 900, dueDate: "2026-09-30", status: "settled", onChain: false },
  { id: "INV_0005", sme: "Meridian Exports", debtor: "Prestige Corp", amount: 8000, currency: "XLM", fundedAmount: 3200, yieldBps: 750, dueDate: "2026-10-15", status: "cancelled", onChain: true, smeAddress: "GA7TXEBMEPQCLHIYCWDN7RKAO5IMRD2UV7O7TZXMEW6VZUMEXNR4XBB5" },
];

