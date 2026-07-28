/**
 * @file lib/validation/invoice.test.js
 *
 * Unit tests for `lib/validation/invoice.js`.
 *
 * These tests pin the validator behaviour so the inline-edit UI (in
 * InvoiceDetailClient / EditableInvoiceRow) can rely on a stable contract:
 *   - return `null` for valid values,
 *   - return a non-empty error message otherwise,
 *   - accept comma-separated numerics for amount / yield,
 *   - check dueDate format strictly (YYYY-MM-DD) and reject impossible
 *     calendar dates like "2026-02-30".
 */

import {
  validateIssuer,
  validateAmount,
  validateYield,
  validateDueDate,
  validateCurrency,
  validateStatus,
  getInvoiceFieldValidator,
  invoiceFieldValidators,
  validateInvoiceDraft,
} from "./invoice";

describe("validateIssuer", () => {
  it.each(["Acme Corp", "  Padded  ", "123"])("accepts non-empty trimmed %p", (v) => {
    expect(validateIssuer(v)).toBeNull();
  });

  it.each(["", "   "])("rejects empty / whitespace-only %p", (v) => {
    expect(validateIssuer(v)).toMatch(/empty/i);
  });

  it("rejects non-string inputs", () => {
    expect(validateIssuer(null)).toMatch(/empty/i);
    expect(validateIssuer(undefined)).toMatch(/empty/i);
    expect(validateIssuer(42)).toMatch(/empty/i);
  });
});

describe("validateAmount", () => {
  it.each(["1", "12500", "12,500", "0.01", "999999.99"])(
    "accepts positive amount %p",
    (v) => {
      expect(validateAmount(v)).toBeNull();
    }
  );

  it.each(["0", "-1", "-500", "abc", "", "   "])(
    "rejects invalid amount %p",
    (v) => {
      expect(validateAmount(v)).toMatch(/positive number/i);
    }
  );

  it("treats multiple commas as separators (1,2,3 → 123, valid)", () => {
    // `1,2,3` strips commas to `123`, which is a valid positive number.
    // The validator is intentionally permissive about comma placement so
    // users can paste "1,234,567" without surprise.
    expect(validateAmount("1,2,3")).toBeNull();
  });
});

describe("validateYield", () => {
  it.each(["0", "1", "8.2", "12.5", "100"])("accepts 0–100 percentage %p", (v) => {
    expect(validateYield(v)).toBeNull();
  });

  it.each(["-1", "-0.1", "101", "150", "abc", "", "   "])(
    "rejects out-of-range or non-numeric yield %p",
    (v) => {
      expect(validateYield(v)).toMatch(/non-negative/i);
    }
  );

  it("accepts comma-separated yield", () => {
    expect(validateYield("9,5")).toBeNull();
  });
});

describe("validateDueDate", () => {
  it.each(["2026-06-15", "2030-01-01", "2024-12-31"])(
    "accepts well-formed ISO date %p",
    (v) => {
      expect(validateDueDate(v)).toBeNull();
    }
  );

  it.each([
    "06/15/2026", // US format
    "15-06-2026", // wrong order
    "2026-6-15", // un-padded month
    "2026/06/15", // wrong separator
    "",
    "   ",
    "2026-13-01", // impossible month
    "2026-02-30", // impossible day
    "abcd-ef-gh",
  ])("rejects malformed / impossible date %p", (v) => {
    expect(validateDueDate(v)).toMatch(/valid date/i);
  });

  it("does NOT reject past dates (Overdue invoices have past maturities)", () => {
    // The Overdue status exists precisely so an invoice can legitimately
    // have a maturity date in the past. The validator must accept these so
    // users can still edit / correct overdue invoices.
    expect(validateDueDate("2020-01-01")).toBeNull();
  });
});

describe("validateCurrency", () => {
  it.each(["USD", "EUR", "usd", "Usd", "  GBP  ", "ABC"])(
    "accepts 3-letter ISO code %p",
    (v) => {
      expect(validateCurrency(v)).toBeNull();
    }
  );

  it.each(["", "US", "USDD", "12", "USDX", "US$"])(
    "rejects non-3-letter or invalid currency %p",
    (v) => {
      expect(validateCurrency(v)).toMatch(/iso/i);
    }
  );

  it("normalises the input (trim + uppercase) before checking", () => {
    // `  usd  ` → `USD` after trim+uppercase → valid.
    expect(validateCurrency("  usd  ")).toBeNull();
  });

  it("rejects 4-letter codes such as USDC", () => {
    expect(validateCurrency("USDC")).toMatch(/iso/i);
  });
});

describe("validateStatus", () => {
  it.each(["Open", "Funded", "Settled", "Overdue"])(
    "accepts canonical status %p",
    (v) => {
      expect(validateStatus(v)).toBeNull();
    }
  );

  it.each(["open", "Pending", "", "Unknown", "Garbage"])(
    "rejects non-canonical status %p",
    (v) => {
      expect(validateStatus(v)).toMatch(/status/i);
    }
  );
});

describe("getInvoiceFieldValidator", () => {
  it("returns the registered validator for known fields", () => {
    expect(getInvoiceFieldValidator("issuer")).toBe(validateIssuer);
    expect(getInvoiceFieldValidator("amount")).toBe(validateAmount);
    expect(getInvoiceFieldValidator("yield")).toBe(validateYield);
    expect(getInvoiceFieldValidator("dueDate")).toBe(validateDueDate);
    expect(getInvoiceFieldValidator("currency")).toBe(validateCurrency);
    expect(getInvoiceFieldValidator("status")).toBe(validateStatus);
  });

  it("falls back to a permissive non-empty validator for unknown fields", () => {
    const v = getInvoiceFieldValidator("brandNewField");
    expect(v("hello")).toBeNull();
    expect(v("")).toMatch(/cannot be empty/i);
    expect(v("   ")).toMatch(/cannot be empty/i);
  });
});

describe("invoiceFieldValidators", () => {
  it("is frozen so it cannot be mutated at runtime", () => {
    expect(Object.isFrozen(invoiceFieldValidators)).toBe(true);
  });

  it("exposes an entry for every invoice field", () => {
    expect(Object.keys(invoiceFieldValidators).sort()).toEqual(
      ["amount", "currency", "dueDate", "issuer", "status", "yield"].sort()
    );
  });
});

describe("validateInvoiceDraft", () => {
  it("returns null when every field is valid", () => {
    expect(
      validateInvoiceDraft({
        issuer: "Acme Corp",
        amount: "12500",
        yield: "8.2",
        dueDate: "2030-01-01",
        currency: "USD",
        status: "Open",
      })
    ).toBeNull();
  });

  it("returns the first invalid field with its error message", () => {
    const result = validateInvoiceDraft({
      issuer: "", // first invalid
      amount: "12500",
      yield: "8.2",
      dueDate: "2030-01-01",
      currency: "USD",
      status: "Open",
    });
    expect(result).toEqual({ field: "issuer", error: expect.stringMatching(/empty/i) });
  });

  it("stops at the first invalid field rather than returning all of them", () => {
    const result = validateInvoiceDraft({
      issuer: "Acme Corp",
      amount: "abc", // invalid
      yield: "-5", // also invalid
      dueDate: "blah", // also invalid
      currency: "USD",
      status: "Open",
    });
    expect(result?.field).toBe("amount");
  });

  it("returns null for a non-object input (defensive)", () => {
    expect(validateInvoiceDraft(null)).toBeNull();
    expect(validateInvoiceDraft(undefined)).toBeNull();
    expect(validateInvoiceDraft("not an object")).toBeNull();
  });
});
