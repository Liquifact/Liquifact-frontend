/**
 * @file lib/validation/invoiceId.test.js
 *
 * Unit tests for the invoice route-parameter validator.
 *
 * Coverage matrix
 * ───────────────
 * 1.  Accepted — ids that MUST return true
 *       a. real mock fixture ids (inv-001, inv-002, inv-003)
 *       b. all-lowercase, all-uppercase, mixed-case
 *       c. digits only
 *       d. letters only
 *       e. multiple hyphen segments
 *       f. exactly 1 character
 *       g. exactly MAX_ID_LENGTH characters
 *
 * 2.  Rejected — ids that MUST return false
 *       a. non-string inputs (null, undefined, number, boolean, object, array)
 *       b. empty string
 *       c. string containing only whitespace
 *       d. string exceeding MAX_ID_LENGTH by exactly 1 character
 *       e. string far exceeding MAX_ID_LENGTH
 *       f. path-traversal characters (`../`, `/`)
 *       g. dot-only and dot-segment strings
 *       h. strings containing spaces
 *       i. strings containing special characters (@, !, %, =, +, {})
 *       j. null byte (`\0`) and control characters
 *       k. Unicode / non-ASCII characters
 *       l. query-string / fragment characters (`?`, `#`, `&`, `=`)
 *       m. URL-encoded percent sequences (`%20`, `%2F`)
 *       n. double hyphens and leading/trailing hyphens (valid per regex,
 *          included explicitly to document the boundary decision)
 *
 * 3.  Boundary
 *       a. id of length 1 (accepted)
 *       b. id of length MAX_ID_LENGTH (accepted)
 *       c. id of length MAX_ID_LENGTH + 1 (rejected)
 *       d. id of length MAX_ID_LENGTH + 1000 (rejected)
 *
 * 4.  Regression / duplicate-submission guard
 *       a. calling isValidInvoiceId with the same valid id twice returns true
 *          both times (function is pure, no state mutation)
 *       b. calling isValidInvoiceId with the same invalid id twice returns
 *          false both times (same purity guarantee)
 *       c. alternating valid / invalid calls produce consistent results
 */

import { isValidInvoiceId, MAX_ID_LENGTH, VALID_ID_RE } from "./invoiceId";

// ── 1. Accepted ─────────────────────────────────────────────────────────────

describe("isValidInvoiceId — accepted inputs", () => {
  describe("real mock fixture ids", () => {
    it.each(["inv-001", "inv-002", "inv-003"])("accepts mock fixture id %s", (id) => {
      expect(isValidInvoiceId(id)).toBe(true);
    });
  });

  describe("case variants", () => {
    it("accepts all-lowercase letters", () => {
      expect(isValidInvoiceId("abcxyz")).toBe(true);
    });

    it("accepts all-uppercase letters", () => {
      expect(isValidInvoiceId("ABCXYZ")).toBe(true);
    });

    it("accepts mixed-case letters", () => {
      expect(isValidInvoiceId("AbCdEf")).toBe(true);
    });

    it("accepts mixed case with hyphens and digits", () => {
      expect(isValidInvoiceId("INV-Acme-2024")).toBe(true);
    });
  });

  describe("character class boundaries", () => {
    it("accepts digits only", () => {
      expect(isValidInvoiceId("1234567890")).toBe(true);
    });

    it("accepts letters only", () => {
      expect(isValidInvoiceId("invoice")).toBe(true);
    });

    it("accepts a single letter", () => {
      expect(isValidInvoiceId("a")).toBe(true);
    });

    it("accepts a single digit", () => {
      expect(isValidInvoiceId("0")).toBe(true);
    });

    it("accepts a hyphen-separated triple-segment id", () => {
      expect(isValidInvoiceId("inv-2024-abc")).toBe(true);
    });

    it("accepts multiple consecutive hyphens (regex permits it)", () => {
      // Double hyphens are syntactically valid per the spec; the data layer
      // will simply not find a matching invoice and return notFound naturally.
      expect(isValidInvoiceId("inv--001")).toBe(true);
    });

    it("accepts a leading hyphen (regex permits it)", () => {
      expect(isValidInvoiceId("-inv")).toBe(true);
    });

    it("accepts a trailing hyphen (regex permits it)", () => {
      expect(isValidInvoiceId("inv-")).toBe(true);
    });
  });

  describe("length boundaries — accepted", () => {
    it("accepts an id of length 1", () => {
      expect(isValidInvoiceId("a")).toBe(true);
    });

    it(`accepts an id of exactly MAX_ID_LENGTH (${MAX_ID_LENGTH}) characters`, () => {
      const id = "a".repeat(MAX_ID_LENGTH);
      expect(isValidInvoiceId(id)).toBe(true);
    });

    it(`accepts an id of ${MAX_ID_LENGTH} mixed-character safe chars`, () => {
      // Build a string that uses letters, digits, and hyphens up to the limit.
      const segment = "abc123-";
      const id =
        segment.repeat(Math.floor(MAX_ID_LENGTH / segment.length)) +
        segment.slice(0, MAX_ID_LENGTH % segment.length);
      expect(id.length).toBe(MAX_ID_LENGTH);
      expect(isValidInvoiceId(id)).toBe(true);
    });
  });
});

// ── 2. Rejected ─────────────────────────────────────────────────────────────

describe("isValidInvoiceId — rejected inputs", () => {
  describe("non-string types", () => {
    it("rejects null", () => {
      expect(isValidInvoiceId(null)).toBe(false);
    });

    it("rejects undefined", () => {
      expect(isValidInvoiceId(undefined)).toBe(false);
    });

    it("rejects a number", () => {
      expect(isValidInvoiceId(123)).toBe(false);
    });

    it("rejects zero (0)", () => {
      expect(isValidInvoiceId(0)).toBe(false);
    });

    it("rejects a boolean true", () => {
      expect(isValidInvoiceId(true)).toBe(false);
    });

    it("rejects a boolean false", () => {
      expect(isValidInvoiceId(false)).toBe(false);
    });

    it("rejects a plain object", () => {
      expect(isValidInvoiceId({ id: "inv-001" })).toBe(false);
    });

    it("rejects an array", () => {
      expect(isValidInvoiceId(["inv-001"])).toBe(false);
    });

    it("rejects a Symbol", () => {
      expect(isValidInvoiceId(Symbol("inv-001"))).toBe(false);
    });
  });

  describe("empty and blank strings", () => {
    it("rejects the empty string", () => {
      expect(isValidInvoiceId("")).toBe(false);
    });

    it("rejects a single space", () => {
      expect(isValidInvoiceId(" ")).toBe(false);
    });

    it("rejects a tab character", () => {
      expect(isValidInvoiceId("\t")).toBe(false);
    });

    it("rejects a newline character", () => {
      expect(isValidInvoiceId("\n")).toBe(false);
    });

    it("rejects a string of only whitespace", () => {
      expect(isValidInvoiceId("   ")).toBe(false);
    });
  });

  describe("path-traversal and slash characters", () => {
    it("rejects a forward slash", () => {
      expect(isValidInvoiceId("/")).toBe(false);
    });

    it("rejects a backslash", () => {
      expect(isValidInvoiceId("\\")).toBe(false);
    });

    it("rejects a classic path-traversal sequence", () => {
      expect(isValidInvoiceId("../../../etc/passwd")).toBe(false);
    });

    it("rejects an id with an embedded slash", () => {
      expect(isValidInvoiceId("inv/001")).toBe(false);
    });

    it("rejects a dot-only string", () => {
      expect(isValidInvoiceId(".")).toBe(false);
    });

    it("rejects double-dot (..)", () => {
      expect(isValidInvoiceId("..")).toBe(false);
    });

    it("rejects a dot segment mixed with valid chars", () => {
      expect(isValidInvoiceId("inv.001")).toBe(false);
    });
  });

  describe("whitespace embedded in the id", () => {
    it("rejects an id with an interior space", () => {
      expect(isValidInvoiceId("inv 001")).toBe(false);
    });

    it("rejects an id with a leading space", () => {
      expect(isValidInvoiceId(" inv-001")).toBe(false);
    });

    it("rejects an id with a trailing space", () => {
      expect(isValidInvoiceId("inv-001 ")).toBe(false);
    });
  });

  describe("special / shell-significant characters", () => {
    it("rejects @", () => expect(isValidInvoiceId("inv@001")).toBe(false));
    it("rejects !", () => expect(isValidInvoiceId("inv!001")).toBe(false));
    it("rejects %", () => expect(isValidInvoiceId("inv%001")).toBe(false));
    it("rejects =", () => expect(isValidInvoiceId("inv=001")).toBe(false));
    it("rejects +", () => expect(isValidInvoiceId("inv+001")).toBe(false));
    it("rejects {", () => expect(isValidInvoiceId("inv{001")).toBe(false));
    it("rejects }", () => expect(isValidInvoiceId("inv}001")).toBe(false));
    it("rejects [", () => expect(isValidInvoiceId("inv[001")).toBe(false));
    it("rejects ]", () => expect(isValidInvoiceId("inv]001")).toBe(false));
    it("rejects |", () => expect(isValidInvoiceId("inv|001")).toBe(false));
    it("rejects ;", () => expect(isValidInvoiceId("inv;001")).toBe(false));
    it("rejects :", () => expect(isValidInvoiceId("inv:001")).toBe(false));
    it("rejects ,", () => expect(isValidInvoiceId("inv,001")).toBe(false));
    it("rejects <", () => expect(isValidInvoiceId("inv<001")).toBe(false));
    it("rejects >", () => expect(isValidInvoiceId("inv>001")).toBe(false));
    it("rejects single-quote", () => expect(isValidInvoiceId("inv'001")).toBe(false));
    it("rejects double-quote", () => expect(isValidInvoiceId('inv"001')).toBe(false));
    it("rejects backtick", () => expect(isValidInvoiceId("inv`001")).toBe(false));
    it("rejects tilde (~)", () => expect(isValidInvoiceId("inv~001")).toBe(false));
    it("rejects caret (^)", () => expect(isValidInvoiceId("inv^001")).toBe(false));
    it("rejects asterisk (*)", () => expect(isValidInvoiceId("inv*001")).toBe(false));
    it("rejects parenthesis", () => expect(isValidInvoiceId("inv(001)")).toBe(false));
    it("rejects dollar sign ($)", () => expect(isValidInvoiceId("$inv001")).toBe(false));
    it("rejects hash (#)", () => expect(isValidInvoiceId("inv#001")).toBe(false));
  });

  describe("null bytes and control characters", () => {
    it("rejects a null byte", () => {
      expect(isValidInvoiceId("\x00")).toBe(false);
    });

    it("rejects a null byte embedded in a valid-looking id", () => {
      expect(isValidInvoiceId("inv" + String.fromCharCode(0) + "001")).toBe(false);
    });

    it("rejects a carriage-return character", () => {
      expect(isValidInvoiceId("inv\r001")).toBe(false);
    });

    it("rejects an escape character (\\x1b)", () => {
      expect(isValidInvoiceId("inv\x1b001")).toBe(false);
    });
  });

  describe("Unicode and non-ASCII characters", () => {
    it("rejects accented Latin (é)", () => {
      expect(isValidInvoiceId("café")).toBe(false);
    });

    it("rejects a CJK character", () => {
      expect(isValidInvoiceId("发票")).toBe(false);
    });

    it("rejects an emoji", () => {
      expect(isValidInvoiceId("inv-🧾")).toBe(false);
    });

    it("rejects a zero-width joiner", () => {
      expect(isValidInvoiceId("inv\u200D001")).toBe(false);
    });
  });

  describe("URL-significant characters", () => {
    it("rejects ? (query delimiter)", () => {
      expect(isValidInvoiceId("inv?id=1")).toBe(false);
    });

    it("rejects # (fragment delimiter)", () => {
      expect(isValidInvoiceId("inv#section")).toBe(false);
    });

    it("rejects & (query separator)", () => {
      expect(isValidInvoiceId("inv&001")).toBe(false);
    });

    it("rejects a percent-encoded space (%20)", () => {
      expect(isValidInvoiceId("inv%20001")).toBe(false);
    });

    it("rejects a percent-encoded slash (%2F)", () => {
      expect(isValidInvoiceId("inv%2F001")).toBe(false);
    });
  });
});

// ── 3. Boundary ─────────────────────────────────────────────────────────────

describe("isValidInvoiceId — length boundary values", () => {
  it("accepts id of length 1 (minimum valid length)", () => {
    expect(isValidInvoiceId("x")).toBe(true);
  });

  it(`accepts id of exactly MAX_ID_LENGTH (${MAX_ID_LENGTH})`, () => {
    expect(isValidInvoiceId("x".repeat(MAX_ID_LENGTH))).toBe(true);
  });

  it(`rejects id of exactly MAX_ID_LENGTH + 1 (${MAX_ID_LENGTH + 1})`, () => {
    expect(isValidInvoiceId("x".repeat(MAX_ID_LENGTH + 1))).toBe(false);
  });

  it("rejects a pathologically long id (1000 chars beyond MAX_ID_LENGTH)", () => {
    expect(isValidInvoiceId("x".repeat(MAX_ID_LENGTH + 1000))).toBe(false);
  });

  it("rejects id of length 2 * MAX_ID_LENGTH", () => {
    expect(isValidInvoiceId("a".repeat(MAX_ID_LENGTH * 2))).toBe(false);
  });
});

// ── 4. Regression / duplicate-submission guard ──────────────────────────────

describe("isValidInvoiceId — purity / duplicate-call regression", () => {
  it("returns true on two successive calls with the same valid id (no state mutation)", () => {
    expect(isValidInvoiceId("inv-001")).toBe(true);
    expect(isValidInvoiceId("inv-001")).toBe(true);
  });

  it("returns false on two successive calls with the same invalid id (no state mutation)", () => {
    expect(isValidInvoiceId("")).toBe(false);
    expect(isValidInvoiceId("")).toBe(false);
  });

  it("returns correct results when valid and invalid calls alternate", () => {
    expect(isValidInvoiceId("inv-001")).toBe(true);
    expect(isValidInvoiceId("")).toBe(false);
    expect(isValidInvoiceId("inv-002")).toBe(true);
    expect(isValidInvoiceId("../etc")).toBe(false);
    expect(isValidInvoiceId("inv-003")).toBe(true);
  });

  it("concurrent-safe: calling 100 times with the same valid id always returns true", () => {
    const id = "inv-concurrent-test";
    const results = Array.from({ length: 100 }, () => isValidInvoiceId(id));
    expect(results.every(Boolean)).toBe(true);
  });

  it("concurrent-safe: calling 100 times with the same invalid id always returns false", () => {
    const id = "../etc/passwd";
    const results = Array.from({ length: 100 }, () => isValidInvoiceId(id));
    expect(results.every((r) => r === false)).toBe(true);
  });
});

// ── 5. Module constants ──────────────────────────────────────────────────────

describe("module constants", () => {
  it("MAX_ID_LENGTH is a positive integer", () => {
    expect(Number.isInteger(MAX_ID_LENGTH)).toBe(true);
    expect(MAX_ID_LENGTH).toBeGreaterThan(0);
  });

  it("MAX_ID_LENGTH equals 128", () => {
    expect(MAX_ID_LENGTH).toBe(128);
  });

  it("VALID_ID_RE is a RegExp", () => {
    expect(VALID_ID_RE).toBeInstanceOf(RegExp);
  });

  it("VALID_ID_RE has anchors (full-string match)", () => {
    const src = VALID_ID_RE.source;
    expect(src.startsWith("^")).toBe(true);
    expect(src.endsWith("$")).toBe(true);
  });

  it("VALID_ID_RE matches only the documented character class", () => {
    expect(VALID_ID_RE.test("abc123-XYZ")).toBe(true);
    expect(VALID_ID_RE.test("abc.123")).toBe(false);
    expect(VALID_ID_RE.test("abc 123")).toBe(false);
    expect(VALID_ID_RE.test("abc/123")).toBe(false);
  });
});
