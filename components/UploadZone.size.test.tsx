import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import UploadZone, { FILE_CONSTRAINTS } from "./UploadZone";

// Mock the fetch API
globalThis.fetch = jest.fn();

// Mock magic-byte validation: jsdom's File.arrayBuffer() is unreliable.
jest.mock("../lib/validation/pdf", () => ({
  ...jest.requireActual("../lib/validation/pdf"),
  isPdfMagicValid: jest.fn(),
  validatePdfFile: jest.fn().mockResolvedValue({ valid: true }),
  sanitizeFilename: jest.fn((name) => name),
}));

// Import the mocked isPdfMagicValid for test setup
const { isPdfMagicValid } = jest.requireMock("../lib/validation/pdf");

// Mock the copy to avoid dependency on the actual copy file in this test
jest.mock("../app/copy/en", () => ({
  copy: {
    uploadZone: {
      requirementsTitle: "Requirements",
      badgePdfOnly: "PDF Only",
      badgeMaxSize: "Max {maxSizeMb} MB",
      badgeOneFile: "One File",
      requirementsBody: "Must be PDF documents up to {maxSizeMb} MB.",
      dropZoneLabel: "Drop zone",
      fileInputLabel: "File input",
      changeFile: "Change file",
      dragDropPrompt: "Drag and drop",
      browsePrompt: "Browse",
      statusUploading: "Uploading...",
      statusTokenizing: "Tokenizing...",
      statusSuccess: "Success!",
      submitUploading: "Uploading...",
      submitTokenizing: "Tokenizing...",
      submitIdle: "Submit",
      spinnerLabel: "Loading",
      resetAction: "Upload another invoice",
      resetAriaLabel: "Upload another invoice",
      errorNoFile: "No file selected.",
      errorEmpty: "The selected file is empty.",
      errorInvalidType: "Only PDF files are allowed.",
      errorInvalidPdf: "The file is not a valid PDF.",
      errorOversize: "File is {sizeMb} MB — exceeds the {maxSizeMb} MB limit.",
      errorReadFailed: "Could not read the file. Please try again.",
      errorUploadFailed: "Upload failed. Please try again.",
      errorUploadStatus: "Upload failed with status {status}.",
    },
  },
}));

describe("UploadZone Size Validation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (isPdfMagicValid as jest.Mock).mockResolvedValue(true);
    (globalThis.fetch as jest.Mock).mockClear();
  });

  it("allows file upload if size is within FILE_CONSTRAINTS.maxSizeBytes", async () => {
    const user = userEvent.setup();
    render(<UploadZone onUploadSuccess={jest.fn()} />);

    const validFile = new File(["%PDF-1.4\n dummy content"], "invoice.pdf", {
      type: "application/pdf",
    });

    // Simulate valid file selection using the input element directly
    const input = document.getElementById("invoice-file-input") as HTMLInputElement;
    await user.upload(input, validFile);

    const submitBtn = screen.getByRole("button", { name: "Submit" });
    await waitFor(() => expect(submitBtn).not.toBeDisabled());

    // Submit
    (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ tokenizationDelay: 0 }),
    });

    await user.click(submitBtn);

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    });
  });

  it("rejects file selection if size exceeds FILE_CONSTRAINTS.maxSizeBytes (handleFile guard)", async () => {
    const user = userEvent.setup();
    render(<UploadZone onUploadSuccess={jest.fn()} />);

    // Create an oversized file
    const oversizedFile = new File([""], "oversized.pdf", { type: "application/pdf" });
    Object.defineProperty(oversizedFile, "size", { value: FILE_CONSTRAINTS.maxSizeBytes + 1 });

    const input = document.getElementById("invoice-file-input") as HTMLInputElement;
    await user.upload(input, oversizedFile);

    // The UI validation triggers an alert
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/exceeds the 10 MB limit/i);

    const submitBtn = screen.getByRole("button", { name: "Submit" });
    expect(submitBtn).toBeDisabled();

    // Try to force submit form programmatically to trigger handleSubmit guard
    fireEvent.submit(
      screen.getByRole("button", { name: "Submit" }).closest("form") as HTMLFormElement
    );

    // Verify fetch is never called
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});
