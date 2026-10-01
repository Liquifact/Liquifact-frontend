/**
 * Focused tests for the /invest validation boundaries (issues #1167, #1170).
 *
 * Covers accepted input, rejected input, duplicate submissions, and boundary
 * values. These are pure functions, so the tests assert deterministic results
 * for each reason code.
 */
import {
  MAX_INVOICE_ID_LENGTH,
  VALIDATION_REASONS,
  normalizeInvoiceId,
  isWellFormedInvoice,
  validateInvestChildren,
  validateInvestLayoutParams,
} from "./validation";

const wellFormedInvoice = {
  id: "inv-001",
  issuer: "Acme Supplies Ltd",
  currency: "USD",
  amountValue: 12500,
  yieldValue: 8.2,
};

describe("normalizeInvoiceId", () => {
  it("accepts a valid id and returns it normalized", () => {
    expect(normalizeInvoiceId("inv-001")).toEqual({ ok: true, id: "inv-001" });
  });

  it("trims surrounding whitespace", () => {
    expect(normalizeInvoiceId("  inv-001  ")).toEqual({ ok: true, id: "inv-001" });
  });

  it("accepts the full allowed charset", () => {
    expect(normalizeInvoiceId("inv_001.2:beta-3")).toEqual({
      ok: true,
      id: "inv_001.2:beta-3",
    });
  });

  it("accepts an id at exactly the length boundary", () => {
    const id = "a".repeat(MAX_INVOICE_ID_LENGTH);
    expect(normalizeInvoiceId(id)).toEqual({ ok: true, id });
  });

  it("rejects an id one character over the boundary", () => {
    const id = "a".repeat(MAX_INVOICE_ID_LENGTH + 1);
    expect(normalizeInvoiceId(id)).toEqual({
      ok: false,
      reason: VALIDATION_REASONS.ID_TOO_LONG,
    });
  });

  it("rejects an empty or whitespace-only id", () => {
    expect(normalizeInvoiceId("")).toEqual({
      ok: false,
      reason: VALIDATION_REASONS.MISSING_ID,
    });
    expect(normalizeInvoiceId("   ")).toEqual({
      ok: false,
      reason: VALIDATION_REASONS.MISSING_ID,
    });
  });

  it("rejects non-string segments", () => {
    expect(normalizeInvoiceId(undefined).reason).toBe(VALIDATION_REASONS.INVALID_TYPE);
    expect(normalizeInvoiceId(42).reason).toBe(VALIDATION_REASONS.INVALID_TYPE);
    expect(normalizeInvoiceId({}).reason).toBe(VALIDATION_REASONS.INVALID_TYPE);
  });

  it("rejects a repeated (duplicate) segment", () => {
    expect(normalizeInvoiceId(["inv-001", "inv-002"])).toEqual({
      ok: false,
      reason: VALIDATION_REASONS.DUPLICATE_SEGMENT,
    });
  });

  it("rejects path-trickery and disallowed characters", () => {
    for (const raw of ["..", ".", "../etc", "inv/001", "inv 001", "<script>", "inv#001"]) {
      expect(normalizeInvoiceId(raw).reason).toBe(VALIDATION_REASONS.INVALID_CHARSET);
    }
  });

  it("is deterministic across repeated calls", () => {
    expect(normalizeInvoiceId("inv-001")).toEqual(normalizeInvoiceId("inv-001"));
    expect(normalizeInvoiceId("../x")).toEqual(normalizeInvoiceId("../x"));
  });
});

describe("isWellFormedInvoice", () => {
  it("accepts a well-formed record", () => {
    expect(isWellFormedInvoice(wellFormedInvoice)).toBe(true);
  });

  it("accepts a record without an optional yieldValue", () => {
    const { yieldValue, ...rest } = wellFormedInvoice;
    void yieldValue;
    expect(isWellFormedInvoice(rest)).toBe(true);
  });

  it("rejects null, arrays, and non-objects", () => {
    expect(isWellFormedInvoice(null)).toBe(false);
    expect(isWellFormedInvoice(undefined)).toBe(false);
    expect(isWellFormedInvoice([])).toBe(false);
    expect(isWellFormedInvoice("inv-001")).toBe(false);
  });

  it("rejects records missing required fields", () => {
    expect(isWellFormedInvoice({ ...wellFormedInvoice, id: "" })).toBe(false);
    expect(isWellFormedInvoice({ ...wellFormedInvoice, issuer: "  " })).toBe(false);
    expect(isWellFormedInvoice({ ...wellFormedInvoice, currency: undefined })).toBe(false);
  });

  it("rejects non-finite numeric fields", () => {
    expect(isWellFormedInvoice({ ...wellFormedInvoice, amountValue: NaN })).toBe(false);
    expect(isWellFormedInvoice({ ...wellFormedInvoice, amountValue: "12500" })).toBe(false);
    expect(isWellFormedInvoice({ ...wellFormedInvoice, yieldValue: Infinity })).toBe(false);
  });
});

describe("validateInvestChildren", () => {
  it("accepts a renderable child", () => {
    const child = { type: "div" };
    expect(validateInvestChildren(child)).toEqual({ ok: true, children: child });
  });

  it("accepts a non-empty array of renderable children", () => {
    const children = [{ type: "div" }, null];
    expect(validateInvestChildren(children)).toEqual({ ok: true, children });
  });

  it("rejects null / undefined / boolean children", () => {
    expect(validateInvestChildren(null)).toEqual({
      ok: false,
      reason: VALIDATION_REASONS.INVALID_CHILDREN,
    });
    expect(validateInvestChildren(undefined).reason).toBe(VALIDATION_REASONS.INVALID_CHILDREN);
    expect(validateInvestChildren(false).reason).toBe(VALIDATION_REASONS.INVALID_CHILDREN);
  });

  it("rejects an array with nothing renderable", () => {
    expect(validateInvestChildren([null, false]).reason).toBe(VALIDATION_REASONS.INVALID_CHILDREN);
  });
});

describe("validateInvestLayoutParams", () => {
  it("accepts missing params", () => {
    expect(validateInvestLayoutParams(undefined)).toEqual({ ok: true, params: {} });
    expect(validateInvestLayoutParams(null)).toEqual({ ok: true, params: {} });
  });

  it("accepts string and string[] segment values", () => {
    const params = { id: "inv-001", tags: ["a", "b"] };
    expect(validateInvestLayoutParams(params)).toEqual({ ok: true, params });
  });

  it("rejects non-string segment values", () => {
    expect(validateInvestLayoutParams({ id: 5 })).toEqual({
      ok: false,
      reason: VALIDATION_REASONS.INVALID_PARAMS,
      key: "id",
    });
    expect(validateInvestLayoutParams({ id: ["a", 5] }).reason).toBe(
      VALIDATION_REASONS.INVALID_PARAMS
    );
  });

  it("rejects non-object params", () => {
    expect(validateInvestLayoutParams("inv-001").reason).toBe(VALIDATION_REASONS.INVALID_PARAMS);
    expect(validateInvestLayoutParams([]).reason).toBe(VALIDATION_REASONS.INVALID_PARAMS);
  });
});
