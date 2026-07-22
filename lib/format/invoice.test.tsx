import { formatAmount, formatYield } from "@/lib/format/invoice";

describe("Invoice format helpers - Table Driven Tests", () => {
  describe("formatYield test table", () => {
    it.each([
      { value: 8.2, expected: "8.2%" },
      { value: 7, expected: "7%" },
      { value: 0, expected: "0%" },
      { value: 3.14, expected: "3.14%" },
      { value: -2.5, expected: "-2.5%" },
    ])("formats yield %p into %p", ({ value, expected }) => {
      expect(formatYield(value)).toBe(expected);
    });
  });

  describe("formatAmount test table", () => {
    it.each([
      { value: 12500, currency: undefined, expected: "12,500" },
      { value: 12500, currency: "", expected: "12,500" },
      { value: 12500, currency: "USD", expected: "12,500" },
      { value: 0, currency: undefined, expected: "0" },
      { value: 1_000_000, currency: "", expected: "1,000,000" },
      { value: -500, currency: "", expected: "-500" },
    ])("formats amount %p with currency %p into %p", ({ value, currency, expected }) => {
      expect(formatAmount(value, currency)).toBe(expected);
    });
  });

  test("numeric sorting works for invoice fixtures", () => {
    const invoices = [
      { id: "a", amountValue: 22000 },
      { id: "b", amountValue: 12500 },
      { id: "c", amountValue: 7800 },
    ];
    const sorted = [...invoices].sort((x, y) => x.amountValue - y.amountValue);
    expect(sorted.map((i) => i.id)).toEqual(["c", "b", "a"]);
  });
});
