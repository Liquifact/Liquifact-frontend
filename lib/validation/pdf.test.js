import { sanitizeFilename, validatePdfFile } from "./pdf";

const constraints = {
  mimeType: "application/pdf",
  maxSizeMb: 10,
  maxSizeBytes: 10 * 1024 * 1024,
};

function pdfFile(name = "invoice.pdf", type = "application/pdf") {
  return new File(["%PDF-1.7\nbody"], name, { type });
}

describe("validatePdfFile", () => {
  it("accepts a PDF with matching extension, MIME type, and magic bytes", async () => {
    await expect(validatePdfFile(pdfFile(), constraints)).resolves.toBeNull();
  });

  it("rejects zero-byte files", async () => {
    const file = new File([], "invoice.pdf", { type: "application/pdf" });

    await expect(validatePdfFile(file, constraints)).resolves.toMatch(/empty/i);
  });

  it("rejects missing PDF extensions", async () => {
    await expect(
      validatePdfFile(pdfFile("invoice.txt"), constraints),
    ).resolves.toMatch(/extension/i);
  });

  it("rejects spoofed MIME types", async () => {
    await expect(
      validatePdfFile(pdfFile("invoice.pdf", "text/plain"), constraints),
    ).resolves.toMatch(/invalid file type/i);
  });

  it("rejects files whose extension and bytes disagree", async () => {
    const file = new File(["not a pdf"], "invoice.pdf", {
      type: "application/pdf",
    });

    await expect(validatePdfFile(file, constraints)).resolves.toMatch(
      /does not look like a pdf/i,
    );
  });

  it("rejects oversized files before reading content", async () => {
    const file = new File([new ArrayBuffer(constraints.maxSizeBytes + 1)], "large.pdf", {
      type: "application/pdf",
    });

    await expect(validatePdfFile(file, constraints)).resolves.toMatch(/exceeds/i);
  });
});

describe("sanitizeFilename", () => {
  it("removes path separators and unsafe filename characters", () => {
    expect(sanitizeFilename("..\\bad|?.pdf")).toBe("bad__.pdf");
  });

  it("caps long rendered names while preserving the pdf extension", () => {
    const safeName = sanitizeFilename(`${"a".repeat(120)}.pdf`);

    expect(safeName).toHaveLength(80);
    expect(safeName.endsWith(".pdf")).toBe(true);
    expect(safeName).toContain("...");
  });
});
