import { DEFAULT_CURRENCY, DEFAULT_LOCALE, FORMAT_CONFIG, INVALID_VALUE_FALLBACK } from "./config";

describe("FORMAT_CONFIG central configuration", () => {
  it("provides single source of truth default constants", () => {
    expect(DEFAULT_LOCALE).toBe("en-US");
    expect(DEFAULT_CURRENCY).toBe("USD");
    expect(INVALID_VALUE_FALLBACK).toBe("—");
  });

  it("contains frozen default configuration values for currency, amount, and percentage", () => {
    expect(FORMAT_CONFIG).toEqual({
      defaultLocale: "en-US",
      defaultCurrency: "USD",
      invalidValueFallback: "—",
      currency: {
        style: "currency",
        currency: "USD",
        locale: "en-US",
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
        integerMaximumFractionDigits: 0,
      },
      amount: {
        locale: "en-US",
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      },
      percentage: {
        locale: "en-US",
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
        style: "percent",
        suffix: "%",
      },
    });

    expect(Object.isFrozen(FORMAT_CONFIG)).toBe(true);
    expect(Object.isFrozen(FORMAT_CONFIG.currency)).toBe(true);
    expect(Object.isFrozen(FORMAT_CONFIG.amount)).toBe(true);
    expect(Object.isFrozen(FORMAT_CONFIG.percentage)).toBe(true);
  });
});
