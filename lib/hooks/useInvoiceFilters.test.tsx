import { renderHook } from "@testing-library/react";
import useInvoiceFilters from "./useInvoiceFilters";

const MOCK_INVOICES = [
  {
    id: "inv-001",
    issuer: "Acme Supplies Ltd",
    amount: "12,500",
    currency: "USD",
    dueDate: "2026-06-15",
    yield: "8.2%",
    status: "Open",
  },
  {
    id: "inv-002",
    issuer: "Bright Logistics GmbH",
    amount: "7,800",
    currency: "EUR",
    dueDate: "2026-07-01",
    yield: "7.5%",
    status: "Open",
  },
  {
    id: "inv-003",
    issuer: "Sunrise Exports Pte",
    amount: "22,000",
    currency: "USD",
    dueDate: "2026-05-30",
    yield: "9.1%",
    status: "Open",
  },
];

const DEFAULT_FILTERS = {
  yieldMin: "",
  yieldMax: "",
  currency: "",
  maturityFrom: "",
  maturityTo: "",
  sort: "",
};

describe("useInvoiceFilters", () => {
  it("returns empty array if invoices is null", () => {
    const { result } = renderHook(() => useInvoiceFilters(null, "", DEFAULT_FILTERS));
    expect(result.current).toEqual([]);
  });

  it("returns all invoices when no filters are applied", () => {
    const { result } = renderHook(() => useInvoiceFilters(MOCK_INVOICES, "", DEFAULT_FILTERS));
    expect(result.current.length).toBe(3);
  });

  describe("Search Query Filtering", () => {
    it("filters by issuer name (case insensitive)", () => {
      const { result } = renderHook(() =>
        useInvoiceFilters(MOCK_INVOICES, "ACME", DEFAULT_FILTERS)
      );
      expect(result.current.length).toBe(1);
      expect(result.current[0].issuer).toBe("Acme Supplies Ltd");
    });

    it("filters by invoice ID", () => {
      const { result } = renderHook(() => useInvoiceFilters(MOCK_INVOICES, "002", DEFAULT_FILTERS));
      expect(result.current.length).toBe(1);
      expect(result.current[0].id).toBe("inv-002");
    });
  });

  describe("Yield Filtering", () => {
    it("filters by yieldMin", () => {
      const { result } = renderHook(() =>
        useInvoiceFilters(MOCK_INVOICES, "", { ...DEFAULT_FILTERS, yieldMin: "8.0" })
      );
      expect(result.current.length).toBe(2); // 8.2 and 9.1
      expect(result.current.map((i) => i.id)).toEqual(["inv-001", "inv-003"]);
    });

    it("filters by yieldMax", () => {
      const { result } = renderHook(() =>
        useInvoiceFilters(MOCK_INVOICES, "", { ...DEFAULT_FILTERS, yieldMax: "8.0" })
      );
      expect(result.current.length).toBe(1); // 7.5
      expect(result.current[0].id).toBe("inv-002");
    });
  });

  describe("Currency Filtering", () => {
    it("filters by currency", () => {
      const { result } = renderHook(() =>
        useInvoiceFilters(MOCK_INVOICES, "", { ...DEFAULT_FILTERS, currency: "EUR" })
      );
      expect(result.current.length).toBe(1);
      expect(result.current[0].id).toBe("inv-002");
    });
  });

  describe("Maturity Filtering", () => {
    it("filters by maturityFrom", () => {
      const { result } = renderHook(() =>
        useInvoiceFilters(MOCK_INVOICES, "", { ...DEFAULT_FILTERS, maturityFrom: "2026-06-20" })
      );
      expect(result.current.length).toBe(1); // 2026-07-01
      expect(result.current[0].id).toBe("inv-002");
    });

    it("filters by maturityTo", () => {
      const { result } = renderHook(() =>
        useInvoiceFilters(MOCK_INVOICES, "", { ...DEFAULT_FILTERS, maturityTo: "2026-06-10" })
      );
      expect(result.current.length).toBe(1); // 2026-05-30
      expect(result.current[0].id).toBe("inv-003");
    });
  });

  describe("Sorting", () => {
    it("sorts by yield descending", () => {
      const { result } = renderHook(() =>
        useInvoiceFilters(MOCK_INVOICES, "", { ...DEFAULT_FILTERS, sort: "yield_desc" })
      );
      expect(result.current.map((i) => i.yield)).toEqual(["9.1%", "8.2%", "7.5%"]);
    });

    it("sorts by yield ascending", () => {
      const { result } = renderHook(() =>
        useInvoiceFilters(MOCK_INVOICES, "", { ...DEFAULT_FILTERS, sort: "yield_asc" })
      );
      expect(result.current.map((i) => i.yield)).toEqual(["7.5%", "8.2%", "9.1%"]);
    });

    it("sorts by amount descending (ignoring commas)", () => {
      const { result } = renderHook(() =>
        useInvoiceFilters(MOCK_INVOICES, "", { ...DEFAULT_FILTERS, sort: "amount_desc" })
      );
      expect(result.current.map((i) => i.amount)).toEqual(["22,000", "12,500", "7,800"]);
    });

    it("sorts by amount ascending", () => {
      const { result } = renderHook(() =>
        useInvoiceFilters(MOCK_INVOICES, "", { ...DEFAULT_FILTERS, sort: "amount_asc" })
      );
      expect(result.current.map((i) => i.amount)).toEqual(["7,800", "12,500", "22,000"]);
    });

    it("sorts by maturity ascending", () => {
      const { result } = renderHook(() =>
        useInvoiceFilters(MOCK_INVOICES, "", { ...DEFAULT_FILTERS, sort: "maturity_asc" })
      );
      expect(result.current.map((i) => i.dueDate)).toEqual([
        "2026-05-30",
        "2026-06-15",
        "2026-07-01",
      ]);
    });

    it("sorts by maturity descending", () => {
      const { result } = renderHook(() =>
        useInvoiceFilters(MOCK_INVOICES, "", { ...DEFAULT_FILTERS, sort: "maturity_desc" })
      );
      expect(result.current.map((i) => i.dueDate)).toEqual([
        "2026-07-01",
        "2026-06-15",
        "2026-05-30",
      ]);
    });
  });
});
