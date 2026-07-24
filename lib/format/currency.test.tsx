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

// ---------------------------------------------------------------------------
// Edge-case hardening
// ---------------------------------------------------------------------------

describe("formatCurrency – edge cases", () => {
  // --- zero and negative ---
  it("formats zero as $0", () => {
    expect(formatCurrency(0)).toBe("$0");
  });

  it("formats negative integer", () => {
    expect(formatCurrency(-500)).toBe("-$500");
  });

  it("formats negative decimal", () => {
    expect(formatCurrency(-1234.56)).toBe("-$1,234.56");
  });

  // NOTE: Intl.NumberFormat preserves the sign of -0, so formatCurrency(-0)
  // returns "-$0" rather than "$0". This is standard JavaScript/ICU behaviour,
  // not a defect. The test documents the actual output so regressions are caught.
  it("renders -0 with a negative sign (Intl.NumberFormat -0 behaviour)", () => {
    expect(formatCurrency(-0)).toBe("-$0");
  });

  // --- Infinity / -Infinity ---
  it("returns fallback for Infinity", () => {
    expect(formatCurrency(Infinity)).toBe(INVALID_VALUE_FALLBACK);
  });

  it("returns fallback for -Infinity", () => {
    expect(formatCurrency(-Infinity)).toBe(INVALID_VALUE_FALLBACK);
  });

  // --- string numeric inputs ---
  it("parses a plain numeric string", () => {
    expect(formatCurrency("1234.56")).toBe("$1,234.56");
  });

  it("parses a numeric string with leading/trailing whitespace", () => {
    expect(formatCurrency("  750  ")).toBe("$750");
  });

  it("returns fallback for a whitespace-only string", () => {
    expect(formatCurrency("   ")).toBe(INVALID_VALUE_FALLBACK);
  });

  it("parses a comma-separated numeric string", () => {
    expect(formatCurrency("1,000,000")).toBe("$1,000,000");
  });

  // --- large values ---
  it("formats a billion-scale integer", () => {
    expect(formatCurrency(1_000_000_000)).toBe("$1,000,000,000");
  });

  it("formats a million-scale integer", () => {
    expect(formatCurrency(1_000_000)).toBe("$1,000,000");
  });

  // --- boolean / object / array inputs ---
  it("returns fallback for boolean true", () => {
    expect(formatCurrency(true as unknown as number)).toBe(INVALID_VALUE_FALLBACK);
  });

  it("returns fallback for boolean false", () => {
    expect(formatCurrency(false as unknown as number)).toBe(INVALID_VALUE_FALLBACK);
  });

  it("returns fallback for an array input", () => {
    expect(formatCurrency([] as unknown as number)).toBe(INVALID_VALUE_FALLBACK);
  });

  it("returns fallback for an object input", () => {
    expect(formatCurrency({} as unknown as number)).toBe(INVALID_VALUE_FALLBACK);
  });

  // --- currency option edge cases ---
  it("trims whitespace from currency code option", () => {
    // "  USD  ".trim() → "USD" → should not fall back
    expect(formatCurrency(100, { currency: "  USD  " })).toBe("$100");
  });

  it("returns fallback for currency option that is null", () => {
    // null is not a string; falls back to USD default, should still format
    expect(formatCurrency(100, { currency: null as unknown as string })).toBe("$100");
  });

  it("formats EUR correctly for a negative value", () => {
    expect(formatCurrency(-250, { currency: "EUR" })).toBe("-€250");
  });

  // --- fraction-digit boundary ---
  it("shows up to 2 decimal places for non-integer values", () => {
    expect(formatCurrency(9.9)).toBe("$9.90");
  });

  it("shows no decimal places for an integer value", () => {
    expect(formatCurrency(9)).toBe("$9");
  });
});

describe("formatAmount – edge cases", () => {
  // --- zero and negative ---
  it("formats zero", () => {
    expect(formatAmount(0)).toBe("0");
  });

  it("formats negative integer", () => {
    expect(formatAmount(-500)).toBe("-500");
  });

  it("formats negative decimal", () => {
    expect(formatAmount(-1234.56)).toBe("-1,234.56");
  });

  // NOTE: Intl.NumberFormat preserves the sign of -0 → produces "-0".
  // This is standard JavaScript behaviour; the test documents the actual output.
  it("renders -0 with a negative sign (Intl.NumberFormat -0 behaviour)", () => {
    expect(formatAmount(-0)).toBe("-0");
  });

  // --- Infinity / -Infinity ---
  it("returns fallback for -Infinity", () => {
    expect(formatAmount(-Infinity)).toBe(INVALID_VALUE_FALLBACK);
  });

  // --- string numeric inputs ---
  it("parses a plain numeric string without percent suffix", () => {
    expect(formatAmount("1234")).toBe("1,234");
  });

  it("parses a numeric string with leading/trailing whitespace", () => {
    expect(formatAmount("  500  ")).toBe("500");
  });

  it("returns fallback for a whitespace-only string", () => {
    expect(formatAmount("   ")).toBe(INVALID_VALUE_FALLBACK);
  });

  it("parses a comma-separated numeric string", () => {
    expect(formatAmount("1,000")).toBe("1,000");
  });

  // --- boolean / object / array inputs ---
  it("returns fallback for boolean true", () => {
    expect(formatAmount(true as unknown as number)).toBe(INVALID_VALUE_FALLBACK);
  });

  it("returns fallback for boolean false", () => {
    expect(formatAmount(false as unknown as number)).toBe(INVALID_VALUE_FALLBACK);
  });

  it("returns fallback for an array input", () => {
    expect(formatAmount([] as unknown as number)).toBe(INVALID_VALUE_FALLBACK);
  });

  it("returns fallback for an object input", () => {
    expect(formatAmount({} as unknown as number)).toBe(INVALID_VALUE_FALLBACK);
  });

  // --- large values ---
  it("formats a billion-scale integer", () => {
    expect(formatAmount(1_000_000_000)).toBe("1,000,000,000");
  });

  // --- fraction digits ---
  it("respects maximumFractionDigits of 0", () => {
    expect(formatAmount(9.99, { maximumFractionDigits: 0 })).toBe("10");
  });

  it("respects minimumFractionDigits of 3", () => {
    expect(formatAmount(5, { minimumFractionDigits: 3, maximumFractionDigits: 3 })).toBe("5.000");
  });
});

describe("formatCurrencyCompact – edge cases", () => {
  // --- zero ---
  it("formats zero (below K threshold)", () => {
    expect(formatCurrencyCompact(0)).toBe("$0");
  });

  // NOTE: -0 falls to the formatCurrency path (abs is 0, below all thresholds),
  // which in turn uses Intl.NumberFormat → produces "-$0". Documenting actual output.
  it("renders -0 with a negative sign via formatCurrency fallback (Intl.NumberFormat -0 behaviour)", () => {
    expect(formatCurrencyCompact(-0)).toBe("-$0");
  });

  // --- negative below-threshold ---
  it("formats a negative value below 1K via formatCurrency fallback", () => {
    expect(formatCurrencyCompact(-999)).toBe("-$999");
  });

  // --- K boundary ---
  it("formats exactly 1,000 as compact K", () => {
    expect(formatCurrencyCompact(1_000)).toBe("1K USD");
  });

  it("formats 999.99 as standard currency (just below K threshold)", () => {
    expect(formatCurrencyCompact(999.99)).toBe("$999.99");
  });

  it("formats negative thousands compactly", () => {
    expect(formatCurrencyCompact(-45_000)).toBe("-45K USD");
  });

  // --- M boundary ---
  it("formats exactly 1,000,000 as compact M", () => {
    expect(formatCurrencyCompact(1_000_000)).toBe("1M USD");
  });

  it("formats 999,999 as K notation (just below M threshold)", () => {
    // 999,999 / 1,000 = 999.999 → formatted with up to 2 decimal places → "1,000K USD"
    // (rounds at display level)
    const result = formatCurrencyCompact(999_999);
    expect(result).toMatch(/K USD$/);
  });

  it("formats negative millions compactly", () => {
    expect(formatCurrencyCompact(-12_500_000)).toBe("-12.5M USD");
  });

  // --- B boundary ---
  it("formats exactly 1,000,000,000 as compact B", () => {
    expect(formatCurrencyCompact(1_000_000_000)).toBe("1B USD");
  });

  it("formats 999,999,999 as M notation (just below B threshold)", () => {
    const result = formatCurrencyCompact(999_999_999);
    expect(result).toMatch(/M USD$/);
  });

  // --- Infinity / -Infinity ---
  it("returns fallback for Infinity", () => {
    expect(formatCurrencyCompact(Infinity)).toBe(INVALID_VALUE_FALLBACK);
  });

  it("returns fallback for -Infinity", () => {
    expect(formatCurrencyCompact(-Infinity)).toBe(INVALID_VALUE_FALLBACK);
  });

  // --- string numeric inputs ---
  it("parses a numeric string into compact notation", () => {
    expect(formatCurrencyCompact("50000")).toBe("50K USD");
  });

  it("returns fallback for a whitespace-only string", () => {
    expect(formatCurrencyCompact("   ")).toBe(INVALID_VALUE_FALLBACK);
  });

  // --- boolean / object / array ---
  it("returns fallback for boolean true", () => {
    expect(formatCurrencyCompact(true as unknown as number)).toBe(INVALID_VALUE_FALLBACK);
  });

  it("returns fallback for an object input", () => {
    expect(formatCurrencyCompact({} as unknown as number)).toBe(INVALID_VALUE_FALLBACK);
  });

  // --- custom currency label ---
  it("uses the custom currency label in compact output", () => {
    expect(formatCurrencyCompact(5_000, { currency: "GBP" })).toBe("5K GBP");
  });

  it("uses the custom currency label for M notation", () => {
    expect(formatCurrencyCompact(3_500_000, { currency: "EUR" })).toBe("3.5M EUR");
  });

  it("uses the custom currency label for B notation", () => {
    expect(formatCurrencyCompact(2_000_000_000, { currency: "JPY" })).toBe("2B JPY");
  });
});

describe("formatPercent – edge cases", () => {
  // --- negative values ---
  it("formats a negative percentage", () => {
    expect(formatPercent(-5)).toBe("-5%");
  });

  it("formats a negative decimal percentage", () => {
    expect(formatPercent(-3.14)).toBe("-3.14%");
  });

  // NOTE: Intl.NumberFormat preserves the sign of -0 → produces "-0%".
  // This is standard JavaScript behaviour; the test documents the actual output.
  it("renders -0 with a negative sign (Intl.NumberFormat -0 behaviour)", () => {
    expect(formatPercent(-0)).toBe("-0%");
  });

  // --- large values ---
  it("formats a large percentage", () => {
    expect(formatPercent(1000)).toBe("1,000%");
  });

  // --- Infinity / -Infinity ---
  it("returns fallback for Infinity", () => {
    expect(formatPercent(Infinity)).toBe(INVALID_VALUE_FALLBACK);
  });

  it("returns fallback for -Infinity", () => {
    expect(formatPercent(-Infinity)).toBe(INVALID_VALUE_FALLBACK);
  });

  // --- string numeric inputs ---
  it("parses a plain numeric string", () => {
    expect(formatPercent("3.5")).toBe("3.5%");
  });

  it("parses a numeric string with leading/trailing whitespace", () => {
    expect(formatPercent("  7  ")).toBe("7%");
  });

  it("returns fallback for a whitespace-only string", () => {
    expect(formatPercent("   ")).toBe(INVALID_VALUE_FALLBACK);
  });

  it("parses a comma-separated numeric string", () => {
    expect(formatPercent("1,000")).toBe("1,000%");
  });

  // --- boolean / object / array ---
  it("returns fallback for boolean true", () => {
    expect(formatPercent(true as unknown as number)).toBe(INVALID_VALUE_FALLBACK);
  });

  it("returns fallback for boolean false", () => {
    expect(formatPercent(false as unknown as number)).toBe(INVALID_VALUE_FALLBACK);
  });

  it("returns fallback for an array input", () => {
    expect(formatPercent([] as unknown as number)).toBe(INVALID_VALUE_FALLBACK);
  });

  it("returns fallback for an object input", () => {
    expect(formatPercent({} as unknown as number)).toBe(INVALID_VALUE_FALLBACK);
  });

  // --- NaN string ---
  it("returns fallback for string 'NaN'", () => {
    expect(formatPercent("NaN")).toBe(INVALID_VALUE_FALLBACK);
  });

  // --- fraction digits ---
  it("formats 100% with minimumFractionDigits=2", () => {
    expect(formatPercent(100, { minimumFractionDigits: 2, maximumFractionDigits: 2 })).toBe(
      "100.00%"
    );
  });
});
