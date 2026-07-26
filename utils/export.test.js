import { escapeCSVValue, convertToCSV, exportAsCSV, exportAsJSON } from "./export";

describe("export utilities", () => {
  describe("escapeCSVValue", () => {
    it("handles null and undefined", () => {
      expect(escapeCSVValue(null)).toBe("");
      expect(escapeCSVValue(undefined)).toBe("");
    });

    it("returns plain strings unmodified", () => {
      expect(escapeCSVValue("hello world")).toBe("hello world");
      expect(escapeCSVValue(123)).toBe("123");
    });

    it("escapes strings with commas by wrapping in quotes", () => {
      expect(escapeCSVValue("hello, world")).toBe('"hello, world"');
    });

    it("escapes strings with newlines by wrapping in quotes", () => {
      expect(escapeCSVValue("hello\nworld")).toBe('"hello\nworld"');
    });

    it("escapes strings with double quotes by doubling them and wrapping in quotes", () => {
      expect(escapeCSVValue('hello "world"')).toBe('"hello ""world"""');
    });

    it("handles complex cases with commas, quotes and newlines", () => {
      expect(escapeCSVValue('line1,\n"line2"')).toBe('"line1,\n""line2"""');
    });
  });

  describe("convertToCSV", () => {
    it("returns empty string for empty data", () => {
      expect(convertToCSV([])).toBe("");
      expect(convertToCSV(null)).toBe("");
    });

    it("converts simple objects to CSV", () => {
      const data = [
        { id: 1, name: "Alice" },
        { id: 2, name: "Bob" },
      ];
      const expected = "id,name\n1,Alice\n2,Bob";
      expect(convertToCSV(data)).toBe(expected);
    });

    it("escapes values properly in the CSV", () => {
      const data = [
        { name: 'Alice, "The Great"', notes: "Line 1\nLine 2" },
      ];
      const expected = 'name,notes\n"Alice, ""The Great""",\"Line 1\nLine 2\"';
      expect(convertToCSV(data)).toBe(expected);
    });
  });

  describe("export functions (with mock URL API)", () => {
    let mockCreateObjectURL;
    let mockRevokeObjectURL;
    let mockAppendChild;
    let mockRemoveChild;
    let mockClick;
    let mockAnchor;

    beforeEach(() => {
      mockCreateObjectURL = jest.fn().mockReturnValue("blob:test-url");
      mockRevokeObjectURL = jest.fn();
      global.URL.createObjectURL = mockCreateObjectURL;
      global.URL.revokeObjectURL = mockRevokeObjectURL;

      mockClick = jest.fn();
      mockAnchor = {
        href: "",
        download: "",
        click: mockClick,
      };

      jest.spyOn(document, "createElement").mockImplementation((tag) => {
        if (tag === "a") return mockAnchor;
        return document.createElement(tag);
      });

      mockAppendChild = jest.spyOn(document.body, "appendChild").mockImplementation(() => {});
      mockRemoveChild = jest.spyOn(document.body, "removeChild").mockImplementation(() => {});
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it("exportAsCSV creates a blob and triggers download", async () => {
      const data = [{ id: 1 }];
      exportAsCSV(data, "test.csv");

      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(mockAnchor.href).toBe("blob:test-url");
      expect(mockAnchor.download).toBe("test.csv");
      expect(mockAppendChild).toHaveBeenCalledWith(mockAnchor);
      expect(mockClick).toHaveBeenCalled();
      expect(mockRemoveChild).toHaveBeenCalledWith(mockAnchor);
      expect(mockRevokeObjectURL).toHaveBeenCalledWith("blob:test-url");
    });

    it("exportAsJSON creates a blob and triggers download", async () => {
      const data = [{ id: 1 }];
      exportAsJSON(data, "test.json");

      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(mockAnchor.href).toBe("blob:test-url");
      expect(mockAnchor.download).toBe("test.json");
      expect(mockAppendChild).toHaveBeenCalledWith(mockAnchor);
      expect(mockClick).toHaveBeenCalled();
      expect(mockRemoveChild).toHaveBeenCalledWith(mockAnchor);
      expect(mockRevokeObjectURL).toHaveBeenCalledWith("blob:test-url");
    });
  });
});
