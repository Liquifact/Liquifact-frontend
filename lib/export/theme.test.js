/**
 * @file lib/export/theme.test.js
 *
 * Unit tests for lib/export/theme.js — the design-token CSV/JSON export module.
 *
 * Coverage targets (per issue requirements):
 * • Safe CSV escaping (commas, double-quotes, newlines, carriage returns)
 * • Export respects filtered input — only the rows passed in are exported
 * • Empty-view guard — returns false and triggers no download on empty input
 * • Correct MIME types and filenames for CSV and JSON
 */

import {
  escapeCSVValue,
  buildCSV,
  exportTokensAsCSV,
  exportTokensAsJSON,
  triggerDownload,
} from "./theme";

// ── Helpers ──────────────────────────────────────────────────────────────────

const readBlobText = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsText(blob);
  });

// ── Setup ────────────────────────────────────────────────────────────────────

let mockCreateObjectURL;
let mockRevokeObjectURL;
let mockClick;

beforeEach(() => {
  jest.clearAllMocks();

  mockCreateObjectURL = jest.fn(() => "blob:mock-url");
  mockRevokeObjectURL = jest.fn();
  URL.createObjectURL = mockCreateObjectURL;
  URL.revokeObjectURL = mockRevokeObjectURL;
  mockClick = jest.fn();

  // Spy on anchor creation (called by triggerDownload)
  const original = document.createElement.bind(document);
  jest.spyOn(document, "createElement").mockImplementation((tag) => {
    if (tag === "a") return { click: mockClick, href: "", download: "" };
    return original(tag);
  });
  jest.spyOn(document.body, "appendChild").mockImplementation(() => {});
  jest.spyOn(document.body, "removeChild").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

// ── escapeCSVValue ────────────────────────────────────────────────────────────

describe("escapeCSVValue", () => {
  it("returns empty string for null", () => {
    expect(escapeCSVValue(null)).toBe("");
  });

  it("returns empty string for undefined", () => {
    expect(escapeCSVValue(undefined)).toBe("");
  });

  it("returns plain strings unmodified", () => {
    expect(escapeCSVValue("hello")).toBe("hello");
    expect(escapeCSVValue("--color-bg")).toBe("--color-bg");
  });

  it("wraps values with commas in double-quotes", () => {
    expect(escapeCSVValue("cyan, 400")).toBe('"cyan, 400"');
  });

  it("doubles inner quotes and wraps the value", () => {
    expect(escapeCSVValue('value "with" quotes')).toBe('"value ""with"" quotes"');
  });

  it("wraps values with newlines", () => {
    expect(escapeCSVValue("line1\nline2")).toBe('"line1\nline2"');
  });

  it("wraps values with carriage returns", () => {
    expect(escapeCSVValue("line1\rline2")).toBe('"line1\rline2"');
  });

  it("coerces numbers to strings", () => {
    expect(escapeCSVValue(42)).toBe("42");
    expect(escapeCSVValue(0)).toBe("0");
  });

  it("coerces booleans to strings", () => {
    expect(escapeCSVValue(true)).toBe("true");
    expect(escapeCSVValue(false)).toBe("false");
  });
});

// ── buildCSV ──────────────────────────────────────────────────────────────────

describe("buildCSV", () => {
  it("returns empty string for an empty array", () => {
    expect(buildCSV([])).toBe("");
  });

  it("returns empty string for non-array input", () => {
    expect(buildCSV(null)).toBe("");
    expect(buildCSV(undefined)).toBe("");
  });

  it("includes a header row derived from object keys", () => {
    const rows = [{ name: "--color-bg", value: "#020617" }];
    const csv = buildCSV(rows);
    const lines = csv.split("\n");
    expect(lines[0]).toBe("name,value");
  });

  it("includes one data row per input object", () => {
    const rows = [
      { name: "--color-bg", value: "#020617" },
      { name: "--color-primary", value: "#22d3ee" },
    ];
    const csv = buildCSV(rows);
    const lines = csv.split("\n");
    expect(lines).toHaveLength(3); // header + 2 rows
  });

  it("escapes special characters in values", () => {
    const rows = [{ name: "--font", value: 'Geist, "sans-serif"' }];
    const csv = buildCSV(rows);
    expect(csv).toContain('"Geist, ""sans-serif"""');
  });
});

// ── Design-token fixture ──────────────────────────────────────────────────────

const TOKENS = [
  { name: "--color-bg", value: "#020617", category: "color", description: "Page background" },
  { name: "--color-primary", value: "#22d3ee", category: "color", description: "Brand cyan" },
  { name: "--font-sans", value: "Geist Sans", category: "typography", description: "Body font" },
];

// ── exportTokensAsCSV ─────────────────────────────────────────────────────────

describe("exportTokensAsCSV", () => {
  it("returns false and does not download when tokens is empty", () => {
    const result = exportTokensAsCSV([], "theme.csv");
    expect(result).toBe(false);
    expect(mockCreateObjectURL).not.toHaveBeenCalled();
  });

  it("returns false and does not download when tokens is not an array", () => {
    expect(exportTokensAsCSV(null, "theme.csv")).toBe(false);
    expect(exportTokensAsCSV(undefined, "theme.csv")).toBe(false);
    expect(mockCreateObjectURL).not.toHaveBeenCalled();
  });

  it("returns true when a download is triggered", () => {
    const result = exportTokensAsCSV(TOKENS, "theme.csv");
    expect(result).toBe(true);
  });

  it("creates a Blob with text/csv MIME type", async () => {
    exportTokensAsCSV(TOKENS, "theme.csv");

    const blob = mockCreateObjectURL.mock.calls[0][0];
    expect(blob.type).toMatch(/text\/csv/);
  });

  it("uses the provided filename", () => {
    const anchor = { click: mockClick, href: "", download: "" };
    jest.spyOn(document, "createElement").mockImplementation((tag) => {
      if (tag === "a") return anchor;
      return document.createElement.wrappedMethod?.(tag) ?? { tagName: tag.toUpperCase() };
    });

    exportTokensAsCSV(TOKENS, "design-tokens.csv");
    expect(anchor.download).toBe("design-tokens.csv");
  });

  it("defaults to 'theme-export.csv' when no filename is provided", () => {
    const anchor = { click: mockClick, href: "", download: "" };
    jest.spyOn(document, "createElement").mockImplementation((tag) => {
      if (tag === "a") return anchor;
      return document.createElement.wrappedMethod?.(tag) ?? { tagName: tag.toUpperCase() };
    });

    exportTokensAsCSV(TOKENS);
    expect(anchor.download).toBe("theme-export.csv");
  });

  it("CSV content has the correct header columns", async () => {
    exportTokensAsCSV(TOKENS, "theme.csv");
    const blob = mockCreateObjectURL.mock.calls[0][0];
    const text = await readBlobText(blob);
    const [header] = text.split("\n");
    expect(header).toBe("name,value,category,description");
  });

  it("CSV content contains all token rows", async () => {
    exportTokensAsCSV(TOKENS, "theme.csv");
    const blob = mockCreateObjectURL.mock.calls[0][0];
    const text = await readBlobText(blob);
    expect(text).toContain("--color-bg");
    expect(text).toContain("--color-primary");
    expect(text).toContain("--font-sans");
  });

  it("filter-respect: only exports the rows passed in", async () => {
    const colorTokens = TOKENS.filter((t) => t.category === "color");
    exportTokensAsCSV(colorTokens, "theme.csv");

    const blob = mockCreateObjectURL.mock.calls[0][0];
    const text = await readBlobText(blob);

    expect(text).toContain("--color-bg");
    expect(text).toContain("--color-primary");
    expect(text).not.toContain("--font-sans");
  });

  it("calls URL.revokeObjectURL after click", () => {
    exportTokensAsCSV(TOKENS, "theme.csv");
    expect(mockRevokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
  });
});

// ── exportTokensAsJSON ────────────────────────────────────────────────────────

describe("exportTokensAsJSON", () => {
  it("returns false and does not download when tokens is empty", () => {
    const result = exportTokensAsJSON([], "theme.json");
    expect(result).toBe(false);
    expect(mockCreateObjectURL).not.toHaveBeenCalled();
  });

  it("returns false and does not download when tokens is not an array", () => {
    expect(exportTokensAsJSON(null, "theme.json")).toBe(false);
    expect(exportTokensAsJSON(undefined, "theme.json")).toBe(false);
    expect(mockCreateObjectURL).not.toHaveBeenCalled();
  });

  it("returns true when a download is triggered", () => {
    const result = exportTokensAsJSON(TOKENS, "theme.json");
    expect(result).toBe(true);
  });

  it("creates a Blob with application/json MIME type", () => {
    exportTokensAsJSON(TOKENS, "theme.json");
    const blob = mockCreateObjectURL.mock.calls[0][0];
    expect(blob.type).toMatch(/application\/json/);
  });

  it("uses the provided filename", () => {
    const anchor = { click: mockClick, href: "", download: "" };
    jest.spyOn(document, "createElement").mockImplementation((tag) => {
      if (tag === "a") return anchor;
      return document.createElement.wrappedMethod?.(tag) ?? { tagName: tag.toUpperCase() };
    });

    exportTokensAsJSON(TOKENS, "design-tokens.json");
    expect(anchor.download).toBe("design-tokens.json");
  });

  it("defaults to 'theme-export.json' when no filename is provided", () => {
    const anchor = { click: mockClick, href: "", download: "" };
    jest.spyOn(document, "createElement").mockImplementation((tag) => {
      if (tag === "a") return anchor;
      return document.createElement.wrappedMethod?.(tag) ?? { tagName: tag.toUpperCase() };
    });

    exportTokensAsJSON(TOKENS);
    expect(anchor.download).toBe("theme-export.json");
  });

  it("JSON content is valid and round-trips correctly", async () => {
    exportTokensAsJSON(TOKENS, "theme.json");
    const blob = mockCreateObjectURL.mock.calls[0][0];
    const text = await readBlobText(blob);
    const parsed = JSON.parse(text);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(3);
    expect(parsed[0]).toMatchObject({ name: "--color-bg", category: "color" });
  });

  it("filter-respect: only exports the rows passed in", async () => {
    const typographyTokens = TOKENS.filter((t) => t.category === "typography");
    exportTokensAsJSON(typographyTokens, "theme.json");

    const blob = mockCreateObjectURL.mock.calls[0][0];
    const text = await readBlobText(blob);
    const parsed = JSON.parse(text);

    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toMatchObject({ name: "--font-sans", category: "typography" });
  });

  it("calls URL.revokeObjectURL after click", () => {
    exportTokensAsJSON(TOKENS, "theme.json");
    expect(mockRevokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
  });
});
