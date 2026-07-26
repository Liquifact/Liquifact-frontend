import { formatInvoiceDate, formatRelativeTime, INVALID_DATE_FALLBACK } from "@/lib/format/date";

describe("formatInvoiceDate", () => {
  it("formats an ISO string", () => {
    expect(formatInvoiceDate("2026-01-15")).toBe("Jan 15, 2026");
  });

  it("formats a Date object", () => {
    expect(formatInvoiceDate(new Date("2026-03-02T00:00:00Z"))).toBe("Mar 2, 2026");
  });

  it("formats a unix timestamp (ms)", () => {
    expect(formatInvoiceDate(new Date("2026-06-01T00:00:00Z").getTime())).toBe("Jun 1, 2026");
  });

  it.each([null, undefined, ""])("returns the fallback for %p", (value) => {
    expect(formatInvoiceDate(value)).toBe(INVALID_DATE_FALLBACK);
  });

  it("returns the fallback for an unparseable string", () => {
    expect(formatInvoiceDate("not-a-date")).toBe(INVALID_DATE_FALLBACK);
  });

  it("returns the fallback for an unsupported type", () => {
    // @ts-expect-error deliberately passing an invalid type
    expect(formatInvoiceDate({})).toBe(INVALID_DATE_FALLBACK);
  });

  it("respects a custom locale and format", () => {
    const result = formatInvoiceDate("2026-01-15", {
      locale: "en-GB",
      format: { year: "numeric", month: "2-digit", day: "2-digit" },
    });
    expect(result).toBe("15/01/2026");
  });

  it("falls back to INVALID_DATE_FALLBACK when Intl rejects a malformed locale tag", () => {
    const result = formatInvoiceDate("2026-01-15", { locale: "not-a-real-locale-!!" });
    expect(result).toBe(INVALID_DATE_FALLBACK);
  });
});

describe("formatRelativeTime", () => {
  const FIXED_NOW = new Date("2026-07-26T12:00:00.000Z").getTime();

  it("returns null when there is no timestamp", () => {
    expect(formatRelativeTime(null, FIXED_NOW)).toBeNull();
    expect(formatRelativeTime(undefined, FIXED_NOW)).toBeNull();
  });

  it('returns "just now" for under a minute', () => {
    expect(formatRelativeTime(FIXED_NOW, FIXED_NOW)).toBe("just now");
    expect(formatRelativeTime(FIXED_NOW - 45 * 1000, FIXED_NOW)).toBe("just now");
  });

  it("formats singular and plural minutes", () => {
    expect(formatRelativeTime(FIXED_NOW - 60 * 1000, FIXED_NOW)).toBe("1 minute ago");
    expect(formatRelativeTime(FIXED_NOW - 5 * 60 * 1000, FIXED_NOW)).toBe("5 minutes ago");
    expect(formatRelativeTime(FIXED_NOW - 59 * 60 * 1000, FIXED_NOW)).toBe("59 minutes ago");
  });

  it("formats singular and plural hours", () => {
    expect(formatRelativeTime(FIXED_NOW - 60 * 60 * 1000, FIXED_NOW)).toBe("1 hour ago");
    expect(formatRelativeTime(FIXED_NOW - 4 * 60 * 60 * 1000, FIXED_NOW)).toBe("4 hours ago");
    expect(formatRelativeTime(FIXED_NOW - 23 * 60 * 60 * 1000, FIXED_NOW)).toBe("23 hours ago");
  });

  it("formats singular and plural days beyond 24 hours", () => {
    expect(formatRelativeTime(FIXED_NOW - 24 * 60 * 60 * 1000, FIXED_NOW)).toBe("1 day ago");
    expect(formatRelativeTime(FIXED_NOW - 72 * 60 * 60 * 1000, FIXED_NOW)).toBe("3 days ago");
  });

  it("defaults `now` to the current time when omitted", () => {
    expect(formatRelativeTime(Date.now())).toBe("just now");
  });

  it("treats non-finite input as null", () => {
    expect(formatRelativeTime(NaN, FIXED_NOW)).toBeNull();
    expect(formatRelativeTime(Infinity, FIXED_NOW)).toBeNull();
  });

  it("never returns a negative duration for a future timestamp (clock skew)", () => {
    expect(formatRelativeTime(FIXED_NOW + 60_000, FIXED_NOW)).toBe("just now");
  });
});