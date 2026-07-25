import { sanitizeFilename } from "./pdf";

describe("PDF Validation Helper", () => {
  describe("sanitizeFilename", () => {
    it("returns empty string for undefined filename", () => {
      const result = sanitizeFilename(undefined);
      expect(result).toBe("");
    });

    it("returns empty string for null filename", () => {
      const result = sanitizeFilename(null);
      expect(result).toBe("");
    });

    it("escapes HTML special characters", () => {
      const maliciousFilename = '<script>alert("xss")</script>.pdf';
      const result = sanitizeFilename(maliciousFilename, 100);
      // Check that HTML special characters are escaped
      expect(result).not.toContain("<script>");
      expect(result).not.toContain("</script>");
      expect(result).toContain("&lt;script&gt;");
      expect(result).toContain("&lt;/script&gt;");
    });

    it("escapes ampersand character", () => {
      const filename = "Company & Co.pdf";
      const result = sanitizeFilename(filename);
      expect(result).toBe("Company &amp; Co.pdf");
    });

    it("escapes single quote character", () => {
      const filename = "O'Reilly Invoice.pdf";
      const result = sanitizeFilename(filename);
      expect(result).toBe("O&#39;Reilly Invoice.pdf");
    });

    it("truncates long filenames to default 50 characters", () => {
      const longFilename = "a".repeat(60) + ".pdf";
      const result = sanitizeFilename(longFilename);
      expect(result.length).toBe(50);
      expect(result).toBe("a".repeat(47) + "...");
    });

    it("truncates long filenames to custom maxLength", () => {
      const longFilename = "a".repeat(100) + ".pdf";
      const result = sanitizeFilename(longFilename, 30);
      expect(result.length).toBe(30);
      expect(result).toBe("a".repeat(27) + "...");
    });

    it("does not truncate short filenames", () => {
      const shortFilename = "invoice.pdf";
      const result = sanitizeFilename(shortFilename);
      expect(result).toBe("invoice.pdf");
    });

    it("handles filenames exactly at maxLength", () => {
      const exactLengthFilename = "a".repeat(50);
      const result = sanitizeFilename(exactLengthFilename);
      expect(result).toBe("a".repeat(50));
    });

    it("handles filenames one character over maxLength", () => {
      const overLengthFilename = "a".repeat(51);
      const result = sanitizeFilename(overLengthFilename);
      expect(result.length).toBe(50);
      expect(result).toBe("a".repeat(47) + "...");
    });

    it("preserves special characters that are safe for display", () => {
      const safeFilename = "Invoice_2024-06-28_$1,000.pdf";
      const result = sanitizeFilename(safeFilename);
      expect(result).toBe("Invoice_2024-06-28_$1,000.pdf");
    });
  });
});
