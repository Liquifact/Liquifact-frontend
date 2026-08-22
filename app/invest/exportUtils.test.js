import {
  escapeCSVField,
  generateCSV,
  generateJSON,
  triggerDownload,
} from "./exportUtils";

describe("escapeCSVField", () => {
  it("returns simple strings unchanged", () => {
    expect(escapeCSVField("hello")).toBe("hello");
  });

  it("escapes fields containing commas by wrapping in double-quotes", () => {
    expect(escapeCSVField("12,500")).toBe('"12,500"');
  });

  it("escapes fields containing double-quotes by doubling them", () => {
    expect(escapeCSVField('say "hi"')).toBe('"say ""hi"""');
  });

  it("escapes fields containing newlines", () => {
    expect(escapeCSVField("line1\nline2")).toBe('"line1\nline2"');
  });

  it("escapes fields containing commas, quotes and newlines together", () => {
    expect(escapeCSVField('a,b "c"\nd')).toBe('"a,b ""c""\nd"');
  });

  it("neutralises cell starting with = (formula injection)", () => {
    expect(escapeCSVField('=SUM(A1)')).toBe("'=SUM(A1)");
  });

  it("neutralises cell starting with +", () => {
    expect(escapeCSVField("+cmd|'/C calc'!A0")).toBe("'+cmd|'/C calc'!A0");
  });

  it("neutralises cell starting with -", () => {
    expect(escapeCSVField("-1+2")).toBe("'-1+2");
  });

  it("neutralises cell starting with @", () => {
    expect(escapeCSVField("@SUM(A1)")).toBe("'@SUM(A1)");
  });

  it("does not neutralise characters that appear later in the string", () => {
    expect(escapeCSVField("abc=123")).toBe("abc=123");
  });

  it("converts numbers to their string representation", () => {
    expect(escapeCSVField(42)).toBe("42");
  });

  it("converts null and undefined to strings", () => {
    expect(escapeCSVField(null)).toBe("null");
    expect(escapeCSVField(undefined)).toBe("undefined");
  });
});

describe("generateCSV", () => {
  const sampleInvoices = [
    {
      id: "inv-001",
      issuer: "Acme",
      amount: "12,500",
      currency: "USD",
      dueDate: "2026-06-15",
      yield: "8.2%",
      status: "Open",
    },
    {
      id: "inv-002",
      issuer: "Bright",
      amount: "7,800",
      currency: "EUR",
      dueDate: "2026-07-01",
      yield: "7.5%",
      status: "Open",
    },
  ];

  it("produces valid CSV with header and data rows", () => {
    const csv = generateCSV(sampleInvoices);
    const lines = csv.trim().split("\n");
    expect(lines[0]).toBe("id,issuer,amount,currency,dueDate,yield,status");
    expect(lines).toHaveLength(3);
  });

  it("correctly escapes values with commas in CSV output", () => {
    const csv = generateCSV(sampleInvoices);
    // "12,500" should appear quoted in the CSV
    expect(csv).toContain('"12,500"');
  });

  it("respects the active filter (exports only provided invoices)", () => {
    const filtered = [sampleInvoices[0]];
    const csv = generateCSV(filtered);
    const lines = csv.trim().split("\n");
    expect(lines).toHaveLength(2); // header + 1 row
    expect(csv).toContain("inv-001");
    expect(csv).not.toContain("inv-002");
  });

  it("produces valid empty CSV for an empty array with known columns", () => {
    const columns = ["id", "issuer", "amount"];
    const csv = generateCSV([], columns);
    expect(csv.trim()).toBe("id,issuer,amount");
  });

  it("produces empty string for an empty array with no columns", () => {
    expect(generateCSV([])).toBe("");
  });

  it("handles null/undefined input gracefully", () => {
    expect(generateCSV(null)).toBe("");
    expect(generateCSV(undefined)).toBe("");
  });

  it("neutralises formula-injection characters in CSV cells", () => {
    const data = [{ id: "=SUM(A1)", issuer: "Test" }];
    const csv = generateCSV(data);
    expect(csv).toContain("'=SUM(A1)");
  });

  it("uses explicit column order when provided", () => {
    const csv = generateCSV(sampleInvoices, ["id", "status"]);
    const lines = csv.trim().split("\n");
    expect(lines[0]).toBe("id,status");
    // Each data row should only have 2 fields
    expect(lines[1].split(",")).toHaveLength(2);
  });
});

describe("generateJSON", () => {
  it("returns a JSON string with 2-space indent", () => {
    const data = [{ id: "1" }];
    const json = generateJSON(data);
    expect(JSON.parse(json)).toEqual(data);
    expect(json).toContain("  ");
  });

  it("returns an empty array string for null input", () => {
    expect(generateJSON(null)).toBe("[]");
  });

  it("returns an empty array string for undefined input", () => {
    expect(generateJSON(undefined)).toBe("[]");
  });

  it("round-trips: parse(generateJSON(data)) equals original", () => {
    const data = [
      { id: "inv-001", issuer: "Acme", amount: "12,500" },
      { id: "inv-002", issuer: "Bright", amount: "7,800" },
    ];
    const roundTripped = JSON.parse(generateJSON(data));
    expect(roundTripped).toEqual(data);
  });

  it("preserves special characters in JSON", () => {
    const data = [{ issuer: 'He said "hello"', note: "line1\nline2" }];
    const parsed = JSON.parse(generateJSON(data));
    expect(parsed[0].issuer).toBe('He said "hello"');
    expect(parsed[0].note).toBe("line1\nline2");
  });
});

describe("triggerDownload", () => {
  let originalCreateObjectURL;
  let originalRevokeObjectURL;
  let appendChildSpy;
  let clickSpy;

  beforeEach(() => {
    clickSpy = jest.fn();
    appendChildSpy = jest
      .spyOn(document.body, "appendChild")
      .mockImplementation(() => {});
    jest.spyOn(document.body, "removeChild").mockImplementation(() => {});
    jest
      .spyOn(document, "createElement")
      .mockReturnValue({ style: {}, click: clickSpy });

    originalCreateObjectURL = URL.createObjectURL;
    originalRevokeObjectURL = URL.revokeObjectURL;
    URL.createObjectURL = jest.fn(() => "blob:mock-url");
    URL.revokeObjectURL = jest.fn();

    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.advanceTimersByTime(150);
    jest.useRealTimers();
    jest.restoreAllMocks();
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
  });

  it("creates a blob and triggers a click on the anchor", () => {
    triggerDownload("content", "file.csv", "text/csv");

    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(appendChildSpy).toHaveBeenCalledTimes(1);
    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  it("cleans up the anchor and revokes the URL after delay", () => {
    triggerDownload("content", "file.csv", "text/csv");

    jest.advanceTimersByTime(100);

    expect(document.body.removeChild).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
  });
});
