import {
  DEFAULT_CURRENCY,
  DEFAULT_LOCALE,
  FORMAT_CONFIG,
  INVALID_VALUE_FALLBACK,
  formatAmount,
  formatCurrency,
  formatCurrencyCompact,
  formatPercent,
} from "./currency";

describe("formatCurrency - Table Driven Tests", () => {
  it.each([
    { input: 12500, options: undefined, expected: "$12,500" },
    { input: "12,500.75", options: undefined, expected: "$12,500.75" },
    { input: 7800, options: { currency: "EUR" }, expected: "€7,800" },
    { input: 12500, options: { currency: "USD", locale: "en-IN" }, expected: "$12,500" },
    { input: 1250000, options: { currency: "INR", locale: "en-IN" }, expected: "₹12,50,000" },
    { input: 50, options: { currency: "not-a-code" }, expected: "$50" },
    { input: 50, options: { currency: "USD", locale: "bad-locale" }, expected: "$50" },
    { input: 50.25, options: { currency: "not-a-code" }, expected: "$50.25" },
    { input: 50, options: { currency: "", locale: "" }, expected: "$50" },
    { input: 50, options: { currency: 123 as unknown as string }, expected: "$50" },
    { input: null, options: undefined, expected: INVALID_VALUE_FALLBACK },
    { input: undefined, options: undefined, expected: INVALID_VALUE_FALLBACK },
    { input: "", options: undefined, expected: INVALID_VALUE_FALLBACK },
    { input: Number.NaN, options: undefined, expected: INVALID_VALUE_FALLBACK },
  ])("formats currency correctly for %#: %p with options %p", ({ input, options, expected }) => {
    expect(formatCurrency(input, options)).toBe(expected);
  });
});

describe("formatAmount - Table Driven Tests", () => {
  it.each([
    { input: 1234567.89, options: undefined, expected: "1,234,567.89" },
    { input: "8.25%", options: undefined, expected: "8.25" },
    { input: 1250000, options: { locale: "en-IN" }, expected: "12,50,000" },
    {
      input: 8,
      options: { minimumFractionDigits: 1, maximumFractionDigits: 1 },
      expected: "8.0",
    },
    { input: null, options: undefined, expected: INVALID_VALUE_FALLBACK },
    { input: undefined, options: undefined, expected: INVALID_VALUE_FALLBACK },
    { input: "not-a-number", options: undefined, expected: INVALID_VALUE_FALLBACK },
    { input: Infinity, options: undefined, expected: INVALID_VALUE_FALLBACK },
  ])("formats amount correctly for %#: %p with options %p", ({ input, options, expected }) => {
    expect(formatAmount(input, options)).toBe(expected);
  });
});

describe("formatCurrencyCompact - Table Driven Tests", () => {
  it.each([
    { input: 1_500_000_000, options: undefined, expected: "1.5B USD" },
    { input: -2_000_000_000, options: { currency: "EUR" }, expected: "-2B EUR" },
    { input: 12_500_000, options: undefined, expected: "12.5M USD" },
    { input: 45_000, options: undefined, expected: "45K USD" },
    { input: 500, options: undefined, expected: "$500" },
    { input: null, options: undefined, expected: INVALID_VALUE_FALLBACK },
    { input: undefined, options: undefined, expected: INVALID_VALUE_FALLBACK },
    { input: "invalid", options: undefined, expected: INVALID_VALUE_FALLBACK },
  ])(
    "formats compact currency correctly for %#: %p with options %p",
    ({ input, options, expected }) => {
      expect(formatCurrencyCompact(input, options)).toBe(expected);
    }
  );
});

describe("formatPercent - Table Driven Tests", () => {
  it.each([
    { input: 8.2, options: undefined, expected: "8.2%" },
    { input: 7, options: undefined, expected: "7%" },
    { input: 0, options: undefined, expected: "0%" },
    { input: "12.5%", options: undefined, expected: "12.5%" },
    { input: 3.14159, options: { maximumFractionDigits: 2 }, expected: "3.14%" },
    {
      input: 5,
      options: { minimumFractionDigits: 2, maximumFractionDigits: 2 },
      expected: "5.00%",
    },
    { input: null, options: undefined, expected: INVALID_VALUE_FALLBACK },
    { input: undefined, options: undefined, expected: INVALID_VALUE_FALLBACK },
    { input: "invalid-percent", options: undefined, expected: INVALID_VALUE_FALLBACK },
  ])("formats percentage correctly for %#: %p with options %p", ({ input, options, expected }) => {
    expect(formatPercent(input, options)).toBe(expected);
  });
});

describe("format constants and config re-exports", () => {
  it("exports documented defaults and config object", () => {
    expect(DEFAULT_CURRENCY).toBe("USD");
    expect(DEFAULT_LOCALE).toBe("en-US");
    expect(INVALID_VALUE_FALLBACK).toBe("—");
    expect(FORMAT_CONFIG.defaultCurrency).toBe("USD");
  });
});
