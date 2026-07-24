import "@testing-library/jest-dom";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";
import UploadZone, { FILE_CONSTRAINTS } from "./UploadZone";
import { copy } from "../app/copy/en";
import { validatePdfFile } from "../lib/validation/pdf";

jest.mock("../lib/validation/pdf", () => {
  const actual = jest.requireActual("../lib/validation/pdf");
  return {
    validatePdfFile: jest.fn(),
    sanitizeFilename: actual.sanitizeFilename,
    isPdfMagicValid: jest.fn(),
  };
});

expect.extend(toHaveNoViolations);

function createMockFile(name = "invoice.pdf", type = "application/pdf") {
  return new File(["mock content"], name, { type });
}

function createMockTextFile(name = "test.txt") {
  return new File(["mock content"], name, { type: "text/plain" });
}

function createMockLargeFile(sizeMb = 11) {
  const size = sizeMb * 1024 * 1024;
  return new File([new ArrayBuffer(size)], "large.pdf", { type: "application/pdf" });
}

function createDataTransfer(files) {
  return {
    files,
    types: ["Files"],
  };
}

function mockFetchOk(extra = {}) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: jest.fn().mockResolvedValue(extra),
  });
}

function mockFetchError(status = 500, message = "Server error") {
  global.fetch = jest.fn().mockResolvedValue({
    ok: false,
    status,
    json: jest.fn().mockResolvedValue({ message }),
  });
}

// Store the original environment state
const ORIGINAL_ENV = process.env;

beforeEach(() => {
  jest.useFakeTimers();
  // Inject mock endpoint environment mapping to satisfy API validation layout assertions
  process.env = {
    ...ORIGINAL_ENV,
    NEXT_PUBLIC_API_URL: "https://api.mock-liquifact.org",
  };
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
  process.env = ORIGINAL_ENV;
});

describe("UploadZone", () => {
  beforeEach(() => {
    // Default mock for successful PDF validation
    validatePdfFile.mockResolvedValue({ valid: true });
  });

  it("renders constraint notice and drop zone in idle state", () => {
    render(<UploadZone />);

    expect(screen.getByRole("note", { name: /file upload requirements/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /drop pdf invoice/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /upload & tokenize invoice/i })).toBeDisabled();
  });

  it("shows file info after valid file selection", () => {
    render(<UploadZone />);

    const file = createMockFile();
    const input = screen.getByLabelText(/select pdf invoice file/i);
    fireEvent.change(input, { target: { files: [file] } });

    expect(screen.getByText("invoice.pdf")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /upload & tokenize invoice/i })).toBeEnabled();
  });

  it("shows validation error for non-PDF file", () => {
    render(<UploadZone />);

    const file = createMockTextFile();
    const input = screen.getByLabelText(/select pdf invoice file/i);
    fireEvent.change(input, { target: { files: [file] } });

    expect(screen.getByRole("alert")).toHaveTextContent(/invalid file type/i);
    expect(screen.getByRole("button", { name: /upload & tokenize invoice/i })).toBeDisabled();
  });

  it("shows validation error for oversized file", () => {
    render(<UploadZone />);

    const file = createMockLargeFile();
    const input = screen.getByLabelText(/select pdf invoice file/i);
    fireEvent.change(input, { target: { files: [file] } });

    expect(screen.getByRole("alert")).toHaveTextContent(/exceeds/);
    expect(screen.getByRole("button", { name: /upload & tokenize invoice/i })).toBeDisabled();
  });
  it("rejects file with correct MIME but invalid PDF magic bytes", async () => {
    // Mock the validation to return invalid
    validatePdfFile.mockResolvedValueOnce({
      valid: false,
      reason: "File content does not match PDF format",
    });
    render(<UploadZone />);
    const file = createMockFile("fake.pdf", "application/pdf");
    const input = screen.getByLabelText(/select pdf invoice file/i);
    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(/does not match PDF format/i)
    );
  });

  it("rejects zero-byte files", async () => {
    render(<UploadZone />);
    const emptyFile = new File([], "empty.pdf", { type: "application/pdf" });
    const input = screen.getByLabelText(/select pdf invoice file/i);
    fireEvent.change(input, { target: { files: [emptyFile] } });
    expect(screen.getByRole("alert")).toHaveTextContent(/empty/i);
    expect(screen.getByRole("button", { name: /upload & tokenize invoice/i })).toBeDisabled();
  });

  it("rejects files with non-PDF extension", async () => {
    validatePdfFile.mockResolvedValueOnce({
      valid: false,
      reason: "File extension does not match .pdf",
    });
    render(<UploadZone />);
    const file = createMockFile("document.txt", "application/pdf");
    const input = screen.getByLabelText(/select pdf invoice file/i);
    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/extension/i));
  });

  it("sanitizes filenames with HTML special characters", async () => {
    validatePdfFile.mockResolvedValueOnce({ valid: true });
    render(<UploadZone />);
    const maliciousFile = new File(["%PDF-1.4"], '<script>alert("xss")</script>.pdf', {
      type: "application/pdf",
    });
    const input = screen.getByLabelText(/select pdf invoice file/i);
    fireEvent.change(input, { target: { files: [maliciousFile] } });
    await waitFor(() => {
      const filenameElement = screen.getByText(/<script>/i);
      expect(filenameElement).toBeInTheDocument();
      expect(filenameElement.innerHTML).not.toContain("<script>");
    });
  });

  it("truncates long filenames in display", async () => {
    validatePdfFile.mockResolvedValueOnce({ valid: true });
    render(<UploadZone />);
    const longName = "a".repeat(100) + ".pdf";
    const longFile = new File(["%PDF-1.4"], longName, { type: "application/pdf" });
    const input = screen.getByLabelText(/select pdf invoice file/i);
    fireEvent.change(input, { target: { files: [longFile] } });
    await waitFor(() => {
      const displayedText = screen.getByText(/\.\.\.$/);
      expect(displayedText).toBeInTheDocument();
      expect(displayedText.textContent.length).toBeLessThanOrEqual(50);
    });
  });

  it("progresses through uploading, tokenizing, and success on submit", async () => {
    mockFetchOk();
    render(<UploadZone />);

    const file = createMockFile();
    const input = screen.getByLabelText(/select pdf invoice file/i);
    fireEvent.change(input, { target: { files: [file] } });

    const submitBtn = screen.getByRole("button", {
      name: /upload & tokenize invoice/i,
    });
    fireEvent.click(submitBtn);

    expect(screen.getByRole("status")).toHaveTextContent(/uploading invoice/i);
    expect(submitBtn).toBeDisabled();

    await act(async () => {
      await Promise.resolve();
      jest.runAllTimers();
    });

    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(/queued for tokenization/i)
    );
    expect(submitBtn).toBeEnabled();
  });

  it("renders determinate progress bar when progress prop is provided", async () => {
    global.fetch = jest.fn().mockReturnValue(new Promise(() => {})); // stay in uploading
    const { rerender } = render(<UploadZone progress={45.5} />);

    const file = createMockFile();
    fireEvent.change(screen.getByLabelText(/select pdf invoice file/i), {
      target: { files: [file] },
    });

    fireEvent.click(screen.getByRole("button", { name: /upload & tokenize invoice/i }));

    const progressbar = screen.getByRole("progressbar");
    expect(progressbar).toBeInTheDocument();
    expect(progressbar).toHaveAttribute("aria-valuenow", "46");
    expect(progressbar).toHaveAttribute("aria-valuemin", "0");
    expect(progressbar).toHaveAttribute("aria-valuemax", "100");
    expect(screen.getByText("46%")).toBeInTheDocument();

    // Verify indeterminate fallback
    rerender(<UploadZone progress={undefined} />);
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  it("shows tokenizing status between upload and success when server returns tokenizationDelay", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ tokenizationDelay: 1000 }),
    });

    render(<UploadZone />);

    const file = createMockFile();
    fireEvent.change(screen.getByLabelText(/select pdf invoice file/i), {
      target: { files: [file] },
    });
    fireEvent.click(screen.getByRole("button", { name: /upload & tokenize invoice/i }));

    expect(screen.getByRole("status")).toHaveTextContent(/uploading invoice/i);

    await act(async () => {
      await Promise.resolve();
    });

    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(/pending tokenization/i)
    );

    await act(async () => {
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(/queued for tokenization/i)
    );
  });

  it('uses role="status" with aria-live for progress announcements', async () => {
    mockFetchOk();
    render(<UploadZone />);

    const file = createMockFile();
    const input = screen.getByLabelText(/select pdf invoice file/i);
    fireEvent.change(input, { target: { files: [file] } });

    fireEvent.click(screen.getByRole("button", { name: /upload & tokenize invoice/i }));

    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(status).toHaveTextContent(/uploading invoice/i);

    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(/queued for tokenization/i)
    );
  });

  it("prevents double-submission during processing", async () => {
    global.fetch = jest.fn().mockReturnValue(new Promise(() => {}));
    render(<UploadZone />);

    const file = createMockFile();
    const input = screen.getByLabelText(/select pdf invoice file/i);
    fireEvent.change(input, { target: { files: [file] } });

    const submitBtn = screen.getByRole("button", {
      name: /upload & tokenize invoice/i,
    });
    fireEvent.click(submitBtn);
    fireEvent.click(submitBtn);

    expect(screen.getAllByRole("status")).toHaveLength(1);
    expect(screen.getByRole("status")).toHaveTextContent(/uploading invoice/i);
  });

  it("opens file dialog on Enter key on the drop zone", () => {
    render(<UploadZone />);

    const dropZone = screen.getByRole("button", { name: /drop pdf invoice/i });
    const input = screen.getByLabelText(/select pdf invoice file/i);
    const clickSpy = jest.spyOn(input, "click").mockImplementation(() => {});

    fireEvent.keyDown(dropZone, { key: "Enter", code: "Enter" });

    expect(clickSpy).toHaveBeenCalledTimes(1);
    clickSpy.mockRestore();
  });

  it("opens file dialog on Space key on the drop zone", () => {
    render(<UploadZone />);

    const dropZone = screen.getByRole("button", { name: /drop pdf invoice/i });
    const input = screen.getByLabelText(/select pdf invoice file/i);
    const clickSpy = jest.spyOn(input, "click").mockImplementation(() => {});

    fireEvent.keyDown(dropZone, { key: " ", code: "Space" });

    expect(clickSpy).toHaveBeenCalledTimes(1);
    clickSpy.mockRestore();
  });

  it("resets to idle when a new valid file is selected after an error", () => {
    render(<UploadZone />);

    const input = screen.getByLabelText(/select pdf invoice file/i);

    fireEvent.change(input, { target: { files: [createMockTextFile()] } });
    expect(screen.getByRole("alert")).toBeInTheDocument();

    fireEvent.change(input, { target: { files: [createMockFile()] } });

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByText("invoice.pdf")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /upload & tokenize invoice/i })).toBeEnabled();
  });

  it('shows validation error role="alert" with aria-live="assertive"', () => {
    render(<UploadZone />);

    const file = createMockTextFile();
    const input = screen.getByLabelText(/select pdf invoice file/i);
    fireEvent.change(input, { target: { files: [file] } });

    const alert = screen.getByRole("alert");
    expect(alert).toHaveAttribute("aria-live", "assertive");
  });

  it("shows error and resets to idle when upload fails with server error", async () => {
    mockFetchError(500, "Internal server error");
    render(<UploadZone />);

    const file = createMockFile();
    fireEvent.change(screen.getByLabelText(/select pdf invoice file/i), {
      target: { files: [file] },
    });
    fireEvent.click(screen.getByRole("button", { name: /upload & tokenize invoice/i }));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(/internal server error/i)
    );
    expect(screen.getByRole("button", { name: /upload & tokenize invoice/i })).toBeEnabled();
  });

  it("shows error and resets to idle when fetch throws (network failure)", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("Network error"));
    render(<UploadZone />);

    const file = createMockFile();
    fireEvent.change(screen.getByLabelText(/select pdf invoice file/i), {
      target: { files: [file] },
    });
    fireEvent.click(screen.getByRole("button", { name: /upload & tokenize invoice/i }));

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/network error/i));
    expect(screen.getByRole("button", { name: /upload & tokenize invoice/i })).toBeEnabled();
  });

  it("sends a POST request to /invoices with the file as FormData", async () => {
    mockFetchOk();
    render(<UploadZone />);

    const file = createMockFile();
    fireEvent.change(screen.getByLabelText(/select pdf invoice file/i), {
      target: { files: [file] },
    });
    fireEvent.click(screen.getByRole("button", { name: /upload & tokenize invoice/i }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toMatch(/\/invoices$/);
    expect(options.method).toBe("POST");
    expect(options.body).toBeInstanceOf(FormData);
    expect(options.body.get("invoice")).toBe(file);
  });

  describe("GROUP 1: Drag-and-drop", () => {
    it("changes border/highlight state on drag over", () => {
      render(<UploadZone />);

      const dropZone = screen.getByRole("button", { name: /drop pdf invoice/i });

      expect(dropZone).toHaveClass("border-slate-700", "bg-slate-900/40");

      fireEvent.dragOver(dropZone);

      expect(dropZone).toHaveClass("border-cyan-400", "bg-cyan-500/10");

      fireEvent.dragLeave(dropZone);

      expect(dropZone).toHaveClass("border-slate-700", "bg-slate-900/40");
    });

    it("accepts valid PDF file on drop", () => {
      render(<UploadZone />);

      const dropZone = screen.getByRole("button", { name: /drop pdf invoice/i });
      const file = createMockFile("invoice.pdf", "application/pdf");
      const dataTransfer = createDataTransfer([file]);

      fireEvent.drop(dropZone, { dataTransfer });

      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(screen.getByText("invoice.pdf")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /upload & tokenize invoice/i })).toBeEnabled();
    });

    it('rejects invalid file type on drop with role="alert" error', () => {
      render(<UploadZone />);

      const dropZone = screen.getByRole("button", { name: /drop pdf invoice/i });
      const file = createMockTextFile("document.txt");
      const dataTransfer = createDataTransfer([file]);

      fireEvent.drop(dropZone, { dataTransfer });

      const alert = screen.getByRole("alert");
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveTextContent(/invalid file type/i);
      expect(screen.queryByText("document.txt")).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: /upload & tokenize invoice/i })).toBeDisabled();
    });

    it('rejects oversized file on drop with role="alert" error', () => {
      render(<UploadZone />);

      const dropZone = screen.getByRole("button", { name: /drop pdf invoice/i });
      const file = createMockLargeFile(11);
      const dataTransfer = createDataTransfer([file]);

      fireEvent.drop(dropZone, { dataTransfer });

      const alert = screen.getByRole("alert");
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveTextContent(/exceeds/i);
      expect(screen.queryByText("large.pdf")).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: /upload & tokenize invoice/i })).toBeDisabled();
    });

    it("clears drag-over state after drop", () => {
      render(<UploadZone />);

      const dropZone = screen.getByRole("button", { name: /drop pdf invoice/i });
      const file = createMockFile();
      const dataTransfer = createDataTransfer([file]);

      fireEvent.dragOver(dropZone);
      expect(dropZone).toHaveClass("border-cyan-400", "bg-cyan-500/10");

      fireEvent.drop(dropZone, { dataTransfer });

      expect(dropZone).not.toHaveClass("border-cyan-400", "bg-cyan-500/10");
    });
  });

  describe("GROUP 2: Keyboard activation (existing tests validated)", () => {
    it("opens file dialog on Enter key on the drop zone (re-verify)", () => {
      render(<UploadZone />);

      const dropZone = screen.getByRole("button", { name: /drop pdf invoice/i });
      const input = screen.getByLabelText(/select pdf invoice file/i);
      const clickSpy = jest.spyOn(input, "click").mockImplementation(() => {});

      fireEvent.keyDown(dropZone, { key: "Enter", code: "Enter" });

      expect(clickSpy).toHaveBeenCalledTimes(1);
      clickSpy.mockRestore();
    });

    it("opens file dialog on Space key on the drop zone (re-verify)", () => {
      render(<UploadZone />);

      const dropZone = screen.getByRole("button", { name: /drop pdf invoice/i });
      const input = screen.getByLabelText(/select pdf invoice file/i);
      const clickSpy = jest.spyOn(input, "click").mockImplementation(() => {});

      fireEvent.keyDown(dropZone, { key: " ", code: "Space" });

      expect(clickSpy).toHaveBeenCalledTimes(1);
      clickSpy.mockRestore();
    });

    it("does NOT open file dialog on other keys (Tab, Escape)", () => {
      render(<UploadZone />);

      const dropZone = screen.getByRole("button", { name: /drop pdf invoice/i });
      const input = screen.getByLabelText(/select pdf invoice file/i);
      const clickSpy = jest.spyOn(input, "click").mockImplementation(() => {});

      fireEvent.keyDown(dropZone, { key: "Tab", code: "Tab" });
      expect(clickSpy).not.toHaveBeenCalled();

      fireEvent.keyDown(dropZone, { key: "Escape", code: "Escape" });
      expect(clickSpy).not.toHaveBeenCalled();

      clickSpy.mockRestore();
    });
  });

  describe("GROUP 3: Submit state machine / double-submit guard (existing tests validated)", () => {
    it("disables submit button during uploading state", async () => {
      global.fetch = jest.fn().mockReturnValue(new Promise(() => {}));
      render(<UploadZone />);

      const file = createMockFile();
      fireEvent.change(screen.getByLabelText(/select pdf invoice file/i), {
        target: { files: [file] },
      });

      const submitBtn = screen.getByRole("button", {
        name: /upload & tokenize invoice/i,
      });

      fireEvent.click(submitBtn);

      expect(submitBtn).toBeDisabled();
      expect(submitBtn).toHaveAttribute("aria-disabled", "true");
    });

    it('verifies uploading → tokenizing → success role="status" copy', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ tokenizationDelay: 50 }),
      });

      render(<UploadZone />);

      const file = createMockFile();
      fireEvent.change(screen.getByLabelText(/select pdf invoice file/i), {
        target: { files: [file] },
      });

      fireEvent.click(screen.getByRole("button", { name: /upload & tokenize invoice/i }));

      const statusUploading = screen.getByRole("status");
      expect(statusUploading).toHaveTextContent(copy.uploadZone.statusUploading);

      await waitFor(() =>
        expect(screen.getByRole("status")).toHaveTextContent(copy.uploadZone.statusTokenizing)
      );

      await act(async () => {
        jest.advanceTimersByTime(50);
      });

      await waitFor(() =>
        expect(screen.getByRole("status")).toHaveTextContent(copy.uploadZone.statusSuccess)
      );
    });

    it("confirms double-submit guard — handler called exactly once", async () => {
      mockFetchOk();
      render(<UploadZone />);

      const file = createMockFile();
      fireEvent.change(screen.getByLabelText(/select pdf invoice file/i), {
        target: { files: [file] },
      });

      const submitBtn = screen.getByRole("button", {
        name: /upload & tokenize invoice/i,
      });

      fireEvent.click(submitBtn);
      fireEvent.click(submitBtn);

      await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe("GROUP 4: Reset / Upload another invoice flow", () => {
    it("shows 'Upload another invoice' button in success state", async () => {
      mockFetchOk();
      render(<UploadZone />);

      const file = createMockFile();
      fireEvent.change(screen.getByLabelText(/select pdf invoice file/i), {
        target: { files: [file] },
      });
      fireEvent.click(screen.getByRole("button", { name: /upload & tokenize invoice/i }));

      await act(async () => {
        await Promise.resolve();
        jest.runAllTimers();
      });

      await waitFor(() =>
        expect(screen.getByRole("status")).toHaveTextContent(copy.uploadZone.statusSuccess)
      );

      expect(
        screen.getByRole("button", { name: copy.uploadZone.resetAriaLabel })
      ).toBeInTheDocument();
    });

    it("clears file, error, and status back to idle after reset", async () => {
      mockFetchOk();
      render(<UploadZone />);

      const file = createMockFile();
      fireEvent.change(screen.getByLabelText(/select pdf invoice file/i), {
        target: { files: [file] },
      });
      fireEvent.click(screen.getByRole("button", { name: /upload & tokenize invoice/i }));

      await act(async () => {
        await Promise.resolve();
        jest.runAllTimers();
      });

      await waitFor(() =>
        expect(screen.getByRole("status")).toHaveTextContent(copy.uploadZone.statusSuccess)
      );

      // Click the "Upload another invoice" reset button
      fireEvent.click(screen.getByRole("button", { name: copy.uploadZone.resetAriaLabel }));

      // Success status message should be gone
      expect(screen.queryByRole("status")).not.toBeInTheDocument();

      // The file name should no longer be displayed
      expect(screen.queryByText("invoice.pdf")).not.toBeInTheDocument();

      // The submit button should be disabled again (no file selected)
      expect(screen.getByRole("button", { name: /upload & tokenize invoice/i })).toBeDisabled();

      // The dropzone should show the idle prompt
      expect(screen.getByText(copy.uploadZone.dragDropPrompt)).toBeInTheDocument();
    });

    it("reset clears stale error", async () => {
      render(<UploadZone />);

      // Trigger an error first
      const file = createMockTextFile();
      const input = screen.getByLabelText(/select pdf invoice file/i);
      fireEvent.change(input, { target: { files: [file] } });

      expect(screen.getByRole("alert")).toHaveTextContent(/invalid file type/i);

      // Reach success state, then reset should clear everything
      mockFetchOk();
      const validFile = createMockFile();
      fireEvent.change(input, { target: { files: [validFile] } });
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: /upload & tokenize invoice/i }));

      await act(async () => {
        await Promise.resolve();
        jest.runAllTimers();
      });

      await waitFor(() =>
        expect(screen.getByRole("status")).toHaveTextContent(copy.uploadZone.statusSuccess)
      );

      // Click reset
      fireEvent.click(screen.getByRole("button", { name: copy.uploadZone.resetAriaLabel }));

      // No error should be present
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();

      // Now select an invalid file to ensure errors still work after reset
      fireEvent.change(input, { target: { files: [file] } });
      expect(screen.getByRole("alert")).toHaveTextContent(/invalid file type/i);
    });

    it("re-upload after reset works correctly", async () => {
      mockFetchOk();
      render(<UploadZone />);

      // First upload cycle
      const file = createMockFile();
      const input = screen.getByLabelText(/select pdf invoice file/i);
      fireEvent.change(input, { target: { files: [file] } });
      fireEvent.click(screen.getByRole("button", { name: /upload & tokenize invoice/i }));

      await act(async () => {
        await Promise.resolve();
        jest.runAllTimers();
      });

      await waitFor(() =>
        expect(screen.getByRole("status")).toHaveTextContent(copy.uploadZone.statusSuccess)
      );

      // Reset
      fireEvent.click(screen.getByRole("button", { name: copy.uploadZone.resetAriaLabel }));

      // Verify idle state restored
      expect(screen.queryByRole("status")).not.toBeInTheDocument();

      // Select another file and submit again using the same fetch mock
      // (mockFetchOk is NOT called again so the call counter is preserved)
      const file2 = createMockFile("invoice2.pdf");
      fireEvent.change(input, { target: { files: [file2] } });

      expect(screen.getByText("invoice2.pdf")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /upload & tokenize invoice/i })).toBeEnabled();

      fireEvent.click(screen.getByRole("button", { name: /upload & tokenize invoice/i }));

      await act(async () => {
        await Promise.resolve();
        jest.runAllTimers();
      });

      await waitFor(() =>
        expect(screen.getByRole("status")).toHaveTextContent(copy.uploadZone.statusSuccess)
      );

      // Verify the second upload completed
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it("focuses the dropzone after reset", async () => {
      mockFetchOk();
      render(<UploadZone />);

      const file = createMockFile();
      fireEvent.change(screen.getByLabelText(/select pdf invoice file/i), {
        target: { files: [file] },
      });
      fireEvent.click(screen.getByRole("button", { name: /upload & tokenize invoice/i }));

      await act(async () => {
        await Promise.resolve();
        jest.runAllTimers();
      });

      await waitFor(() =>
        expect(screen.getByRole("status")).toHaveTextContent(copy.uploadZone.statusSuccess)
      );

      const dropzone = screen.getByRole("button", { name: copy.uploadZone.dropZoneLabel });

      // Click the "Upload another invoice" reset button
      fireEvent.click(screen.getByRole("button", { name: copy.uploadZone.resetAriaLabel }));

      // After reset, focus should be on the dropzone
      expect(document.activeElement).toBe(dropzone);
    });
  });

  describe("GROUP 5: Accessibility", () => {
    // Extended timeout thresholds to isolate sequential execution threads
    it("passes axe accessibility check in idle state", async () => {
      const { container } = render(<UploadZone />);
      jest.useRealTimers();
      const results = await axe(container);
      jest.useFakeTimers();
      expect(results).toHaveNoViolations();
    }, 15000);

    it("passes axe accessibility check after file is selected", async () => {
      const { container } = render(<UploadZone />);

      const file = createMockFile();
      fireEvent.change(screen.getByLabelText(/select pdf invoice file/i), {
        target: { files: [file] },
      });

      jest.useRealTimers();
      const results = await axe(container);
      jest.useFakeTimers();
      expect(results).toHaveNoViolations();
    }, 15000);

    it("passes axe accessibility check after file validation error", async () => {
      const { container } = render(<UploadZone />);

      const file = createMockTextFile();
      fireEvent.change(screen.getByLabelText(/select pdf invoice file/i), {
        target: { files: [file] },
      });

      jest.useRealTimers();
      const results = await axe(container);
      jest.useFakeTimers();
      expect(results).toHaveNoViolations();
    }, 15000);
  });
});
