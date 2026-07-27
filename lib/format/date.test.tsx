import { formatInvoiceDate, formatRelativeTime, INVALID_DATE_FALLBACK } from "./date";

// Fixed reference "now" so every test is deterministic regardless of the
// wall-clock time the suite happens to run at.
const NOW = new Date("2026-07-26T12:00:00.000Z");

describe("formatRelativeTime - Table Driven Tests", () => {
  it.each([
    // ── just now ──────────────────────────────────────────────────────────
    { input: new Date("2026-07-26T12:00:00.000Z"), expected: "just now" },
    { input: new Date("2026-07-26T11:59:31.000Z"), expected: "just now" },
    { input: "2026-07-26T12:00:30.000Z", expected: "just now" },

    // ── minutes ───────────────────────────────────────────────────────────
    { input: new Date("2026-07-26T11:59:00.000Z"), expected: "1 minute ago" },
    { input: new Date("2026-07-26T11:45:00.000Z"), expected: "15 minutes ago" },
    { input: new Date("2026-07-26T11:00:30.000Z"), expected: "59 minutes ago" },

    // ── hours ─────────────────────────────────────────────────────────────
    { input: new Date("2026-07-26T11:00:00.000Z"), expected: "1 hour ago" },
    { input: new Date("2026-07-26T09:00:00.000Z"), expected: "3 hours ago" },
    { input: new Date("2026-07-26T00:00:00.000Z"), expected: "12 hours ago" },

    // ── days ──────────────────────────────────────────────────────────────
    { input: new Date("2026-07-25T12:00:00.000Z"), expected: "yesterday" },
    { input: new Date("2026-07-23T12:00:00.000Z"), expected: "3 days ago" },

    // ── weeks ─────────────────────────────────────────────────────────────
    { input: new Date("2026-07-12T12:00:00.000Z"), expected: "2 weeks ago" },

    // ── unix ms timestamps ───────────────────────────────────────────────
    { input: NOW.getTime() - 5 * 60 * 1000, expected: "5 minutes ago" },
  ])("formats %p relative to a fixed clock as %p", ({ input, expected }) => {
    expect(formatRelativeTime(input, { now: NOW })).toBe(expected);
  });

  it.each([
    { input: null, expected: INVALID_DATE_FALLBACK },
    { input: undefined, expected: INVALID_DATE_FALLBACK },
    { input: "", expected: INVALID_DATE_FALLBACK },
    { input: "not-a-date", expected: INVALID_DATE_FALLBACK },
    { input: Number.NaN, expected: INVALID_DATE_FALLBACK },
    { input: {} as unknown as string, expected: INVALID_DATE_FALLBACK },
  ])("returns the fallback for invalid input %p", ({ input, expected }) => {
    expect(formatRelativeTime(input, { now: NOW })).toBe(expected);
  });

  it("returns the fallback when the `now` reference itself is invalid", () => {
    expect(formatRelativeTime(NOW, { now: new Date("invalid") })).toBe(INVALID_DATE_FALLBACK);
  });

  it("accepts a numeric epoch-ms value for `now`", () => {
    expect(formatRelativeTime(NOW.getTime() - 60_000, { now: NOW.getTime() })).toBe("1 minute ago");
  });

  it("defaults `now` to the current time when omitted", () => {
    const justNow = new Date();
    expect(formatRelativeTime(justNow)).toBe("just now");
  });

  it("falls back when Intl.RelativeTimeFormat throws for a malformed locale", () => {
    const fiveMinAgo = new Date(NOW.getTime() - 5 * 60 * 1000);
    expect(formatRelativeTime(fiveMinAgo, { now: NOW, locale: "!!bad!!" })).toBe(
      INVALID_DATE_FALLBACK
    );
  });

  it("respects a custom locale", () => {
    const fiveMinAgo = new Date(NOW.getTime() - 5 * 60 * 1000);
    expect(formatRelativeTime(fiveMinAgo, { now: NOW, locale: "es-ES" })).toMatch(/hace/i);
  });
});

describe("formatInvoiceDate (existing behaviour, unaffected by the new formatter)", () => {
  it("still formats a plain date string", () => {
    expect(formatInvoiceDate("2026-01-15T00:00:00.000Z")).toBe("Jan 15, 2026");
  });

  it("accepts a Date instance", () => {
    expect(formatInvoiceDate(new Date("2026-01-15T00:00:00.000Z"))).toBe("Jan 15, 2026");
  });

  it("accepts a Unix ms timestamp", () => {
    expect(formatInvoiceDate(new Date("2026-01-15T00:00:00.000Z").getTime())).toBe("Jan 15, 2026");
  });

  it("falls back for an unsupported input type", () => {
    expect(formatInvoiceDate({} as unknown as string)).toBe(INVALID_DATE_FALLBACK);
  });

  it("falls back for an unparsable date string", () => {
    expect(formatInvoiceDate("not-a-date")).toBe(INVALID_DATE_FALLBACK);
  });

  it("falls back for null/undefined/empty input", () => {
    expect(formatInvoiceDate(null)).toBe(INVALID_DATE_FALLBACK);
    expect(formatInvoiceDate(undefined)).toBe(INVALID_DATE_FALLBACK);
    expect(formatInvoiceDate("")).toBe(INVALID_DATE_FALLBACK);
  });

  it("falls back when Intl.DateTimeFormat throws for a malformed locale", () => {
    expect(formatInvoiceDate("2026-01-15T00:00:00.000Z", { locale: "!!bad!!" })).toBe(
      INVALID_DATE_FALLBACK
    );
  });
});
