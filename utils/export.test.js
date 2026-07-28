import { escapeCSVValue, exportAsCSV, exportAsJSON } from "./export";

const readBlobText = (blob) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsText(blob);
  });
};

describe("export utilities", () => {
  let originalCreateObjectURL;
  let originalRevokeObjectURL;
  let mockCreateObjectURL;
  let mockRevokeObjectURL;
  let mockClick;
  let mockAppendChild;
  let mockRemoveChild;

  beforeEach(() => {
    jest.clearAllMocks();
    originalCreateObjectURL = URL.createObjectURL;
    originalRevokeObjectURL = URL.revokeObjectURL;
    
    mockCreateObjectURL = jest.fn(() => "mock-url");
    mockRevokeObjectURL = jest.fn();
    URL.createObjectURL = mockCreateObjectURL;
    URL.revokeObjectURL = mockRevokeObjectURL;

    mockClick = jest.fn();
    mockAppendChild = jest.spyOn(document.body, 'appendChild').mockImplementation(() => {});
    mockRemoveChild = jest.spyOn(document.body, 'removeChild').mockImplementation(() => {});

    jest.spyOn(document, 'createElement').mockImplementation((tagName) => {
      if (tagName === 'a') {
        return {
          click: mockClick,
          href: '',
          download: ''
        };
      }
      return document.createElement(tagName);
    });
  });

  afterEach(() => {
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
    jest.restoreAllMocks();
  });

  describe("escapeCSVValue", () => {
    it("returns empty string for null or undefined", () => {
      expect(escapeCSVValue(null)).toBe("");
      expect(escapeCSVValue(undefined)).toBe("");
    });

    it("returns plain strings unmodified", () => {
      expect(escapeCSVValue("hello")).toBe("hello");
      expect(escapeCSVValue("123")).toBe("123");
    });

    it("escapes strings with commas", () => {
      expect(escapeCSVValue("hello, world")).toBe('"hello, world"');
    });

    it("escapes strings with quotes and doubles them", () => {
      expect(escapeCSVValue('She said "Hello"')).toBe('"She said ""Hello"""');
    });

    it("escapes strings with newlines", () => {
      expect(escapeCSVValue("Line 1\nLine 2")).toBe('"Line 1\nLine 2"');
    });

    it("escapes strings with carriage returns", () => {
      expect(escapeCSVValue("Line 1\r\nLine 2")).toBe('"Line 1\r\nLine 2"');
    });

    it("handles unicode and emoji characters", () => {
      expect(escapeCSVValue("café")).toBe("café");
      expect(escapeCSVValue("你好")).toBe("你好");
      expect(escapeCSVValue("🚀")).toBe("🚀");
      expect(escapeCSVValue("café, emoji 🚀")).toBe('"café, emoji 🚀"');
    });

    it("preserves leading and trailing whitespace", () => {
      expect(escapeCSVValue("  spaced  ")).toBe("  spaced  ");
      expect(escapeCSVValue(", leading comma")).toBe('", leading comma"');
    });

    it("converts numbers to strings", () => {
      expect(escapeCSVValue(123)).toBe("123");
      expect(escapeCSVValue(45.67)).toBe("45.67");
      expect(escapeCSVValue(0)).toBe("0");
    });

    it("converts booleans to strings", () => {
      expect(escapeCSVValue(true)).toBe("true");
      expect(escapeCSVValue(false)).toBe("false");
    });

    it("prevents CSV injection for values starting with = + - @", () => {
      // Excel formula injection protection
      expect(escapeCSVValue("=SUM(A1:A10)")).toBe('"\'=SUM(A1:A10)"');
      expect(escapeCSVValue("+SUM(A1:A10)")).toBe('"\'+SUM(A1:A10)"');
      expect(escapeCSVValue("-SUM(A1:A10)")).toBe('"\'-SUM(A1:A10)"');
      expect(escapeCSVValue("@SUM(A1:A10)")).toBe('"\'@SUM(A1:A10)"');
    });

    it("handles empty string", () => {
      expect(escapeCSVValue("")).toBe("");
    });
  });

  describe("exportAsCSV", () => {
    it("exports empty file when data is empty", () => {
      exportAsCSV([], "test.csv");
      expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
      const blob = mockCreateObjectURL.mock.calls[0][0];
      expect(blob.type).toBe("text/csv;charset=utf-8;");
      expect(mockClick).toHaveBeenCalledTimes(1);
    });

    it("exports data to CSV", async () => {
      const data = [
        { id: 1, name: "Alice", note: "VIP, very important" },
        { id: 2, name: 'Bob "The Builder"', note: "Regular" },
      ];
      exportAsCSV(data, "users.csv");
      expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
      const blob = mockCreateObjectURL.mock.calls[0][0];

      const text = await readBlobText(blob);
      expect(text).toBe(
        'id,name,note\n1,Alice,"VIP, very important"\n2,"Bob ""The Builder""",Regular'
      );
    });

    it("handles non-array data by exporting empty file", () => {
      exportAsCSV(null, "test.csv");
      const blob = mockCreateObjectURL.mock.calls[0][0];
      expect(blob.type).toBe("text/csv;charset=utf-8;");
      expect(mockClick).toHaveBeenCalledTimes(1);
    });

    it("handles single-row data", async () => {
      const data = [{ col1: "only row" }];
      exportAsCSV(data, "single.csv");
      const blob = mockCreateObjectURL.mock.calls[0][0];
      const text = await readBlobText(blob);
      expect(text).toBe("col1\nonly row");
    });

    it("handles null and undefined field values", async () => {
      const data = [
        { a: 1, b: null, c: undefined, d: "text" },
      ];
      exportAsCSV(data, "nulls.csv");
      const blob = mockCreateObjectURL.mock.calls[0][0];
      const text = await readBlobText(blob);
      expect(text).toBe("a,b,c,d\n1,,,text");
    });

    it("protects against CSV injection in data values", async () => {
      const data = [
        { formula: "=SUM(A1:A10)", name: "Malicious" },
      ];
      exportAsCSV(data, "injection.csv");
      const blob = mockCreateObjectURL.mock.calls[0][0];
      const text = await readBlobText(blob);
      expect(text).toBe('formula,name\n"\'=SUM(A1:A10)",Malicious');
    });
  });

  describe("exportAsJSON", () => {
    it("exports empty array when data is empty", async () => {
      exportAsJSON([], "test.json");
      expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
      const blob = mockCreateObjectURL.mock.calls[0][0];
      const text = await readBlobText(blob);
      expect(text).toBe("[]");
    });

    it("exports data to JSON", async () => {
      const data = [{ id: 1, name: "Alice" }];
      exportAsJSON(data, "users.json");
      expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
      const blob = mockCreateObjectURL.mock.calls[0][0];

      const text = await readBlobText(blob);
      expect(JSON.parse(text)).toEqual(data);
    });

    it("handles non-array data for JSON export", async () => {
      exportAsJSON(null, "test.json");
      const blob = mockCreateObjectURL.mock.calls[0][0];
      const text = await readBlobText(blob);
      expect(text).toBe("[]");
    });

    it("handles undefined for JSON export", async () => {
      exportAsJSON(undefined, "test.json");
      const blob = mockCreateObjectURL.mock.calls[0][0];
      const text = await readBlobText(blob);
      expect(text).toBe("[]");
    });

    it("handles empty array for JSON export", async () => {
      exportAsJSON([], "test.json");
      const blob = mockCreateObjectURL.mock.calls[0][0];
      const text = await readBlobText(blob);
      expect(text).toBe("[]");
    });

    it("exports multiple objects to JSON", async () => {
      const data = [
        { id: 1, name: "Alice" },
        { id: 2, name: "Bob" },
      ];
      exportAsJSON(data, "users.json");
      const blob = mockCreateObjectURL.mock.calls[0][0];
      const text = await readBlobText(blob);
      expect(JSON.parse(text)).toEqual(data);
    });

    it("exports special characters in JSON (unicode, emoji)", async () => {
      const data = [{ name: "café", icon: "🚀" }];
      exportAsJSON(data, "special.json");
      const blob = mockCreateObjectURL.mock.calls[0][0];
      const text = await readBlobText(blob);
      expect(JSON.parse(text)).toEqual(data);
    });

    it("sets correct content type for JSON blob", () => {
      exportAsJSON([{ a: 1 }], "data.json");
      const blob = mockCreateObjectURL.mock.calls[0][0];
      expect(blob.type).toBe("application/json;charset=utf-8;");
    });
  });
});
