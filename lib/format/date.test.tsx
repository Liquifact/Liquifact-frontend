import { formatInvoiceDate, INVALID_DATE_FALLBACK } from "@/lib/format/date";

describe("formatInvoiceDate - Table Driven Tests", () => {
  describe("valid ISO string inputs", () => {
    it.each([
      // The output is locale-dependent; we verify format rather than exact string
      { input: "2025-01-15", locale: "en-US" },
      { input: "2025-12-31", locale: "en-US" },
      { input: "2000-06-01", locale: "en-US" },
    ])("formats ISO date string '$input' to a non-fallback string", ({ input, locale }) => {
      const result = formatInvoiceDate(input, { locale });
      expect(result).not.toBe(INVALID_DATE_FALLBACK);
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
    });

    it("formats '2025-01-15' in en-US locale to contain 'Jan'", () => {
      const result = formatInvoiceDate("2025-01-15", { locale: "en-US" });
      expect(result).toContain("Jan");
      expect(result).toContain("2025");
      expect(result).toContain("15");
    });

    it("formats '2025-12-31' in en-US locale to contain 'Dec'", () => {
      const result = formatInvoiceDate("2025-12-31", { locale: "en-US" });
      expect(result).toContain("Dec");
      expect(result).toContain("2025");
      expect(result).toContain("31");
    });
  });

  describe("Date object inputs", () => {
    it("accepts a Date object and returns a formatted string", () => {
      const date = new Date("2025-06-15T00:00:00Z");
      const result = formatInvoiceDate(date, { locale: "en-US" });
      expect(result).not.toBe(INVALID_DATE_FALLBACK);
      expect(result).toContain("2025");
    });

    it("returns INVALID_DATE_FALLBACK for Invalid Date object", () => {
      expect(formatInvoiceDate(new Date("not-a-date"))).toBe(INVALID_DATE_FALLBACK);
    });
  });

  describe("Unix timestamp inputs (milliseconds)", () => {
    it("accepts a numeric timestamp and returns a formatted string", () => {
      // 2025-01-01T00:00:00.000Z
      const ts = new Date("2025-01-01").getTime();
      const result = formatInvoiceDate(ts, { locale: "en-US" });
      expect(result).not.toBe(INVALID_DATE_FALLBACK);
      expect(result).toContain("2025");
    });

    it("handles timestamp 0 (epoch) without returning fallback", () => {
      const result = formatInvoiceDate(0, { locale: "en-US" });
      expect(result).not.toBe(INVALID_DATE_FALLBACK);
    });
  });

  describe("invalid and missing inputs → INVALID_DATE_FALLBACK", () => {
    it.each([
      { label: "null", input: null },
      { label: "undefined", input: undefined },
      { label: "empty string", input: "" },
      { label: "non-date string", input: "not-a-date" },
      { label: "random string", input: "hello world" },
    ] as const)("returns INVALID_DATE_FALLBACK for $label", ({ input }) => {
      expect(formatInvoiceDate(input)).toBe(INVALID_DATE_FALLBACK);
    });
  });

  describe("custom format options", () => {
    it("respects custom Intl.DateTimeFormatOptions", () => {
      const result = formatInvoiceDate("2025-03-20", {
        locale: "en-US",
        format: { year: "numeric", month: "long", day: "2-digit" },
      });
      expect(result).toContain("March");
      expect(result).toContain("2025");
    });

    it("supports numeric-only format", () => {
      const result = formatInvoiceDate("2025-06-15", {
        locale: "en-US",
        format: { year: "numeric", month: "2-digit", day: "2-digit" },
      });
      expect(result).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/);
    });
  });

  describe("default options", () => {
    it("uses default format when called with only a date value", () => {
      const result = formatInvoiceDate("2025-07-04");
      expect(result).not.toBe(INVALID_DATE_FALLBACK);
      expect(result).toContain("2025");
    });

    it("uses default en-US locale when no options are provided", () => {
      const result = formatInvoiceDate("2025-07-04");
      // en-US default format: "Jul 4, 2025"
      expect(result).toContain("Jul");
      expect(result).toContain("4");
      expect(result).toContain("2025");
    });
  });

  describe("INVALID_DATE_FALLBACK export", () => {
    it("exports the correct fallback string '—'", () => {
      expect(INVALID_DATE_FALLBACK).toBe("—");
    });
  });
});
