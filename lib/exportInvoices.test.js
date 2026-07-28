import {
  escapeCsvField,
  invoicesToCsv,
  invoicesToJson,
  downloadInvoices,
  EXPORT_COLUMNS,
} from "./exportInvoices";

describe("escapeCsvField", () => {
  it("returns plain values unchanged", () => {
    expect(escapeCsvField("USD")).toBe("USD");
    expect(escapeCsvField(1500)).toBe("1500");
  });

  it("wraps and escapes values containing a comma", () => {
    expect(escapeCsvField("Acme, Inc.")).toBe('"Acme, Inc."');
  });

  it("wraps and doubles embedded double quotes", () => {
    expect(escapeCsvField('Say "hi"')).toBe('"Say ""hi"""');
  });

  it("wraps values containing a newline or carriage return", () => {
    expect(escapeCsvField("line1\nline2")).toBe('"line1\nline2"');
    expect(escapeCsvField("a\rb")).toBe('"a\rb"');
  });

  it("returns empty string for null/undefined", () => {
    expect(escapeCsvField(null)).toBe("");
    expect(escapeCsvField(undefined)).toBe("");
  });
});

describe("invoicesToCsv", () => {
  it("returns just the header row for an empty array", () => {
    expect(invoicesToCsv([])).toBe(EXPORT_COLUMNS.join(","));
  });

  it("produces a header row plus one row per invoice", () => {
    const invoices = [
      { id: "inv-1", issuer: "Acme", amount: "100", currency: "USD", dueDate: "2026-01-01", yield: "5%", status: "Funded" },
    ];
    const csv = invoicesToCsv(invoices);
    const lines = csv.split("\r\n");
    expect(lines[0]).toBe(EXPORT_COLUMNS.join(","));
    expect(lines[1]).toBe("inv-1,Acme,100,USD,2026-01-01,5%,Funded");
  });

  it("escapes fields containing commas and quotes within a row", () => {
    const invoices = [
      { id: "inv-2", issuer: 'Acme, "Best" Inc.', amount: "50", currency: "EUR", dueDate: "2026-02-01", yield: "3%", status: "Settled" },
    ];
    const csv = invoicesToCsv(invoices);
    expect(csv).toContain('"Acme, ""Best"" Inc."');
  });

  it("omits fields not in EXPORT_COLUMNS", () => {
    const invoices = [{ id: "inv-3", issuer: "X", amount: "1", currency: "USD", dueDate: "d", yield: "y", status: "s", internalNote: "secret" }];
    expect(invoicesToCsv(invoices)).not.toContain("secret");
  });
});

describe("invoicesToJson", () => {
  it("returns an empty array literal for an empty array", () => {
    expect(invoicesToJson([])).toBe("[]");
  });

  it("pretty-prints the full invoice objects", () => {
    const invoices = [{ id: "inv-1", issuer: "Acme" }];
    const json = invoicesToJson(invoices);
    expect(JSON.parse(json)).toEqual(invoices);
    expect(json).toContain("\n");
  });
});

describe("downloadInvoices", () => {
  let createObjectURL, revokeObjectURL, clickSpy;

  beforeEach(() => {
    createObjectURL = jest.fn(() => "blob:mock-url");
    revokeObjectURL = jest.fn();
    global.URL.createObjectURL = createObjectURL;
    global.URL.revokeObjectURL = revokeObjectURL;
    clickSpy = jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  });

  afterEach(() => {
    clickSpy.mockRestore();
    jest.restoreAllMocks();
  });

  it("creates a CSV blob and triggers a download with the default filename", () => {
    downloadInvoices([{ id: "inv-1", issuer: "A", amount: "1", currency: "USD", dueDate: "d", yield: "y", status: "s" }], "csv");
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    const blobArg = createObjectURL.mock.calls[0][0];
    expect(blobArg.type).toBe("text/csv;charset=utf-8");
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
  });

  it("creates a JSON blob with a custom filename", () => {
    downloadInvoices([], "json", "custom.json");
    const blobArg = createObjectURL.mock.calls[0][0];
    expect(blobArg.type).toBe("application/json;charset=utf-8");
  });

  it("handles an empty invoice list without throwing", () => {
    expect(() => downloadInvoices([], "csv")).not.toThrow();
    expect(clickSpy).toHaveBeenCalledTimes(1);
  });
});
