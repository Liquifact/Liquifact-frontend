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
    mockAppendChild = jest.spyOn(document.body, "appendChild").mockImplementation(() => {});
    mockRemoveChild = jest.spyOn(document.body, "removeChild").mockImplementation(() => {});

    jest.spyOn(document, "createElement").mockImplementation((tagName) => {
      if (tagName === "a") {
        return {
          click: mockClick,
          href: "",
          download: "",
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
  });
});
