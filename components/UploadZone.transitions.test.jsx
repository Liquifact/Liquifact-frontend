/**
 * @file components/UploadZone.transitions.test.jsx
 *
 * Comprehensive upload state transition tests (Issue #51).
 *
 * Coverage
 * ─────────
 * - Correct UI for each state: idle, uploading, tokenizing, success, error.
 * - Deterministic, mutually-exclusive live-region roles at every state.
 * - All transition paths:
 *     idle → uploading → success
 *     idle → uploading → tokenizing → success
 *     idle → uploading → error
 *     idle → error (validation)
 *     error → idle (new valid file)
 *     success → idle (reset)
 *     error → uploading → success (retry)
 *     success → idle → success (re-upload)
 */

import "@testing-library/jest-dom";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import UploadZone from "./UploadZone";
import { copy } from "../app/copy/en";
import { validatePdfFile } from "../lib/validation/pdf";

// ── Module mocks ──────────────────────────────────────────────────────────

// Prevent the liveRegion singleton from appending a persistent role=status
// div to document.body, which would pollute role queries across tests.
jest.mock("../lib/a11y/liveRegion", () => ({
  announce: jest.fn(),
  ensureLiveRegion: jest.fn(),
  resetAnnouncer: jest.fn(),
}));

jest.mock("../lib/validation/pdf", () => {
  const actual = jest.requireActual("../lib/validation/pdf");
  return {
    validatePdfFile: jest.fn(),
    sanitizeFilename: actual.sanitizeFilename,
    isPdfMagicValid: jest.fn(),
  };
});

// ── Helpers ───────────────────────────────────────────────────────────────

function makePdf(name = "invoice.pdf") {
  return new File(["%PDF-1.4 body"], name, { type: "application/pdf" });
}

function makeText(name = "notes.txt") {
  return new File(["plain text"], name, { type: "text/plain" });
}

function makeEmpty(name = "empty.pdf") {
  return new File([], name, { type: "application/pdf" });
}

function selectFile(file) {
  fireEvent.change(screen.getByLabelText(/select pdf invoice file/i), {
    target: { files: [file] },
  });
}

function clickSubmit() {
  fireEvent.click(screen.getByRole("button", { name: /upload & tokenize invoice/i }));
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

function mockFetchPending() {
  global.fetch = jest.fn().mockReturnValue(new Promise(() => {}));
}

// ── Lifecycle ─────────────────────────────────────────────────────────────

const ORIGINAL_ENV = process.env;

beforeEach(() => {
  jest.useFakeTimers();
  process.env = { ...ORIGINAL_ENV, NEXT_PUBLIC_API_URL: "https://api.test.liquifact.org" };
  validatePdfFile.mockResolvedValue({ valid: true });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
  process.env = ORIGINAL_ENV;
});

// ── Tests ─────────────────────────────────────────────────────────────────

describe("UploadZone — state transitions (Issue #51)", () => {

  // ── 1. Idle state ────────────────────────────────────────────────────────

  describe("1. Idle state", () => {
    it("renders drop zone and requirements panel", () => {
      render(<UploadZone />);
      expect(screen.getByRole("button", { name: /drop pdf invoice/i })).toBeInTheDocument();
      expect(screen.getByRole("note", { name: /file upload requirements/i })).toBeInTheDocument();
    });

    it("submit button is disabled with aria-disabled=true", () => {
      render(<UploadZone />);
      const btn = screen.getByRole("button", { name: /upload & tokenize invoice/i });
      expect(btn).toBeDisabled();
      expect(btn).toHaveAttribute("aria-disabled", "true");
    });

    it("exposes no live-region roles (status / alert / progressbar)", () => {
      render(<UploadZone />);
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    });

    it("file input accepts only .pdf", () => {
      render(<UploadZone />);
      expect(screen.getByLabelText(/select pdf invoice file/i)).toHaveAttribute("accept", ".pdf");
    });

    it("selecting a valid file enables submit", () => {
      render(<UploadZone />);
      selectFile(makePdf());
      expect(screen.getByRole("button", { name: /upload & tokenize invoice/i })).toBeEnabled();
    });

    it("shows drag-drop prompt text in idle", () => {
      render(<UploadZone />);
      expect(screen.getByText(copy.uploadZone.dragDropPrompt)).toBeInTheDocument();
    });
  });

  // ── 2. Error state ───────────────────────────────────────────────────────

  describe("2. Error state — validation", () => {
    it("wrong MIME type → role=alert with aria-live=assertive", () => {
      render(<UploadZone />);
      selectFile(makeText());
      const alert = screen.getByRole("alert");
      expect(alert).toHaveAttribute("aria-live", "assertive");
      expect(alert).toHaveTextContent(/invalid file type/i);
    });

    it("wrong MIME type → only alert region; no status or progressbar", () => {
      render(<UploadZone />);
      selectFile(makeText());
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
      expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    });

    it("wrong MIME type → submit stays disabled", () => {
      render(<UploadZone />);
      selectFile(makeText());
      expect(screen.getByRole("button", { name: /upload & tokenize invoice/i })).toBeDisabled();
    });

    it("zero-byte file → alert mentions empty", () => {
      render(<UploadZone />);
      selectFile(makeEmpty());
      expect(screen.getByRole("alert")).toHaveTextContent(/empty/i);
    });

    it("oversized file → alert mentions size limit", () => {
      const big = new File([new ArrayBuffer(11 * 1024 * 1024)], "big.pdf", { type: "application/pdf" });
      render(<UploadZone />);
      selectFile(big);
      expect(screen.getByRole("alert")).toHaveTextContent(/exceeds/i);
    });

    it("invalid PDF magic bytes → alert with validation reason", async () => {
      validatePdfFile.mockResolvedValueOnce({ valid: false, reason: "File content does not match PDF format" });
      render(<UploadZone />);
      selectFile(makePdf("fake.pdf"));
      await waitFor(() =>
        expect(screen.getByRole("alert")).toHaveTextContent(/does not match pdf format/i)
      );
    });

    it("validatePdfFile throws → alert with 'unable to read file'", async () => {
      validatePdfFile.mockRejectedValueOnce(new Error("read error"));
      render(<UploadZone />);
      selectFile(makePdf());
      await waitFor(() =>
        expect(screen.getByRole("alert")).toHaveTextContent(/unable to read file/i)
      );
    });
  });

  describe("2b. Error state — upload failure", () => {
    it("server 500 → alert with server message, submit re-enabled", async () => {
      mockFetchError(500, "Internal failure");
      render(<UploadZone />);
      selectFile(makePdf());
      clickSubmit();
      await waitFor(() =>
        expect(screen.getByRole("alert")).toHaveTextContent(/internal failure/i)
      );
      expect(screen.getByRole("button", { name: /upload & tokenize invoice/i })).toBeEnabled();
    });

    it("server 502 with empty body → alert uses status-code template", async () => {
      mockFetchError(502, "");
      render(<UploadZone />);
      selectFile(makePdf());
      clickSubmit();
      await waitFor(() =>
        expect(screen.getByRole("alert")).toHaveTextContent(/upload failed \(502\)/i)
      );
    });

    it("network rejection → alert, no status region", async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error("Network unreachable"));
      render(<UploadZone />);
      selectFile(makePdf());
      clickSubmit();
      await waitFor(() =>
        expect(screen.getByRole("alert")).toHaveTextContent(/network unreachable/i)
      );
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });

    it("server error → only alert region; no status or progressbar", async () => {
      mockFetchError(500, "Boom");
      render(<UploadZone />);
      selectFile(makePdf());
      clickSubmit();
      await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
      expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    });
  });

  // ── 3. Loading state — uploading ─────────────────────────────────────────

  describe("3. Loading state — uploading", () => {
    it("shows role=status with aria-live=polite and uploading text", () => {
      mockFetchPending();
      render(<UploadZone />);
      selectFile(makePdf());
      clickSubmit();
      const status = screen.getByRole("status");
      expect(status).toHaveAttribute("aria-live", "polite");
      expect(status).toHaveTextContent(/uploading invoice/i);
    });

    it("only status region present; no alert or progressbar (no progress prop)", () => {
      mockFetchPending();
      render(<UploadZone />);
      selectFile(makePdf());
      clickSubmit();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    });

    it("submit button is disabled while uploading", () => {
      mockFetchPending();
      render(<UploadZone />);
      selectFile(makePdf());
      clickSubmit();
      expect(screen.getByRole("button", { name: /uploading invoice/i })).toBeDisabled();
    });

    it("determinate progressbar with correct aria attrs when progress prop provided", () => {
      mockFetchPending();
      render(<UploadZone progress={55} />);
      selectFile(makePdf());
      clickSubmit();
      const bar = screen.getByRole("progressbar");
      expect(bar).toHaveAttribute("aria-valuenow", "55");
      expect(bar).toHaveAttribute("aria-valuemin", "0");
      expect(bar).toHaveAttribute("aria-valuemax", "100");
    });

    it("renders sr-only percentage text for screen readers when progress provided", () => {
      mockFetchPending();
      render(<UploadZone progress={55} />);
      selectFile(makePdf());
      clickSubmit();
      expect(screen.getByText(/55% uploaded/i)).toBeInTheDocument();
    });

    it("no progressbar when progress prop absent (indeterminate spinner)", () => {
      mockFetchPending();
      render(<UploadZone />);
      selectFile(makePdf());
      clickSubmit();
      expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
      expect(screen.getAllByRole("img", { name: /loading/i }).length).toBeGreaterThanOrEqual(1);
    });

    it("double-submit guard: fetch called only once even when submit clicked twice", () => {
      mockFetchPending();
      render(<UploadZone />);
      selectFile(makePdf());
      // First click triggers upload and changes the button label to "Uploading invoice..."
      clickSubmit();
      // Second click: button is now disabled and its name has changed, so we
      // locate it by its stable element ID rather than accessible name.
      const btn = document.getElementById("invoice-upload-btn");
      fireEvent.click(btn);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  // ── 4. Loading state — tokenizing ────────────────────────────────────────

  describe("4. Loading state — tokenizing", () => {
    it("shows 'Pending tokenization' in status region after fetch resolves with delay", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ tokenizationDelay: 1000 }),
      });
      render(<UploadZone />);
      selectFile(makePdf());
      clickSubmit();
      await waitFor(() =>
        expect(screen.getByRole("status")).toHaveTextContent(/pending tokenization/i)
      );
    });

    it("no alert or progressbar during tokenizing", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ tokenizationDelay: 1000 }),
      });
      render(<UploadZone />);
      selectFile(makePdf());
      clickSubmit();
      await waitFor(() =>
        expect(screen.getByRole("status")).toHaveTextContent(/pending tokenization/i)
      );
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    });

    it("submit button is disabled during tokenizing", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ tokenizationDelay: 1000 }),
      });
      render(<UploadZone />);
      selectFile(makePdf());
      clickSubmit();
      await waitFor(() =>
        expect(screen.getByRole("status")).toHaveTextContent(/pending tokenization/i)
      );
      expect(screen.getByRole("button", { name: /tokenizing invoice/i })).toBeDisabled();
    });

    it("reset button is visible during tokenizing", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ tokenizationDelay: 1000 }),
      });
      render(<UploadZone />);
      selectFile(makePdf());
      clickSubmit();
      await waitFor(() =>
        expect(screen.getByRole("button", { name: copy.uploadZone.resetAriaLabel })).toBeInTheDocument()
      );
    });
  });

  // ── 5. Success state ─────────────────────────────────────────────────────

  describe("5. Success state", () => {
    it("shows role=status with success message and aria-live=polite", async () => {
      mockFetchOk();
      render(<UploadZone />);
      selectFile(makePdf());
      clickSubmit();
      await waitFor(() =>
        expect(screen.getByRole("status")).toHaveTextContent(/queued for tokenization/i)
      );
      expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
    });

    it("no alert or progressbar in success state", async () => {
      mockFetchOk();
      render(<UploadZone />);
      selectFile(makePdf());
      clickSubmit();
      await waitFor(() =>
        expect(screen.getByRole("status")).toHaveTextContent(/queued for tokenization/i)
      );
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    });

    it("submit button is disabled in success state", async () => {
      mockFetchOk();
      render(<UploadZone />);
      selectFile(makePdf());
      clickSubmit();
      await waitFor(() =>
        expect(screen.getByRole("status")).toHaveTextContent(/queued for tokenization/i)
      );
      const btn = screen.getByRole("button", { name: /upload & tokenize invoice/i });
      expect(btn).toBeDisabled();
      expect(btn).toHaveAttribute("aria-disabled", "true");
    });

    it("reset button appears in success state", async () => {
      mockFetchOk();
      render(<UploadZone />);
      selectFile(makePdf());
      clickSubmit();
      await waitFor(() =>
        expect(screen.getByRole("button", { name: copy.uploadZone.resetAriaLabel })).toBeInTheDocument()
      );
    });

    it("onUploadSuccess callback called once with invoice-shaped payload", async () => {
      mockFetchOk();
      const cb = jest.fn();
      render(<UploadZone onUploadSuccess={cb} />);
      selectFile(makePdf("acme.pdf"));
      clickSubmit();
      await waitFor(() => expect(cb).toHaveBeenCalledTimes(1));
      expect(cb.mock.calls[0][0]).toMatchObject({
        id: expect.any(String),
        issuer: "acme.pdf",
        amount: "Pending",
        currency: "USD",
        status: "Pending tokenization",
      });
    });
  });

  // ── 6. State exclusivity ─────────────────────────────────────────────────

  describe("6. State exclusivity — only one live-region type at a time", () => {
    it("idle: no status, alert, or progressbar", () => {
      render(<UploadZone />);
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    });

    it("uploading: exactly one status, no alert, no progressbar", () => {
      mockFetchPending();
      render(<UploadZone />);
      selectFile(makePdf());
      clickSubmit();
      expect(screen.getAllByRole("status")).toHaveLength(1);
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    });

    it("error (validation): exactly one alert, no status, no progressbar", () => {
      render(<UploadZone />);
      selectFile(makeText());
      expect(screen.getAllByRole("alert")).toHaveLength(1);
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
      expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    });

    it("success: exactly one status, no alert, no progressbar", async () => {
      mockFetchOk();
      render(<UploadZone />);
      selectFile(makePdf());
      clickSubmit();
      await waitFor(() =>
        expect(screen.getByRole("status")).toHaveTextContent(/queued for tokenization/i)
      );
      expect(screen.getAllByRole("status")).toHaveLength(1);
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    });

    it("uploading with progress: one status + one progressbar, no alert", () => {
      mockFetchPending();
      render(<UploadZone progress={30} />);
      selectFile(makePdf());
      clickSubmit();
      expect(screen.getAllByRole("status")).toHaveLength(1);
      expect(screen.getAllByRole("progressbar")).toHaveLength(1);
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });

  // ── 7. Full transition cycles ────────────────────────────────────────────

  describe("7. Transition cycles", () => {
    it("idle → uploading → success (no tokenizationDelay)", async () => {
      mockFetchOk();
      render(<UploadZone />);

      expect(screen.queryByRole("status")).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: /upload & tokenize invoice/i })).toBeDisabled();

      selectFile(makePdf());
      expect(screen.getByRole("button", { name: /upload & tokenize invoice/i })).toBeEnabled();

      clickSubmit();
      expect(screen.getByRole("status")).toHaveTextContent(/uploading invoice/i);

      await act(async () => {
        await Promise.resolve();
        jest.runAllTimers();
      });
      await waitFor(() =>
        expect(screen.getByRole("status")).toHaveTextContent(/queued for tokenization/i)
      );
    });

    it("idle → uploading → tokenizing → success (with tokenizationDelay)", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ tokenizationDelay: 500 }),
      });
      render(<UploadZone />);
      selectFile(makePdf());
      clickSubmit();

      expect(screen.getByRole("status")).toHaveTextContent(/uploading invoice/i);

      await act(async () => { await Promise.resolve(); });
      await waitFor(() =>
        expect(screen.getByRole("status")).toHaveTextContent(/pending tokenization/i)
      );

      await act(async () => { jest.advanceTimersByTime(500); });
      await waitFor(() =>
        expect(screen.getByRole("status")).toHaveTextContent(/queued for tokenization/i)
      );
    });

    it("idle → uploading → error → idle (select new file clears error)", async () => {
      mockFetchError(500, "Upstream error");
      render(<UploadZone />);
      selectFile(makePdf());
      clickSubmit();
      await waitFor(() =>
        expect(screen.getByRole("alert")).toHaveTextContent(/upstream error/i)
      );

      selectFile(makePdf("second.pdf"));
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(screen.getByText("second.pdf")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /upload & tokenize invoice/i })).toBeEnabled();
    });

    it("idle → error (validation) → idle (valid file replaces error)", () => {
      render(<UploadZone />);
      selectFile(makeText());
      expect(screen.getByRole("alert")).toBeInTheDocument();

      selectFile(makePdf());
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: /upload & tokenize invoice/i })).toBeEnabled();
    });

    it("success → idle: reset button restores empty state", async () => {
      mockFetchOk();
      render(<UploadZone />);
      selectFile(makePdf());
      clickSubmit();
      await act(async () => {
        await Promise.resolve();
        jest.runAllTimers();
      });
      await waitFor(() =>
        expect(screen.getByRole("status")).toHaveTextContent(/queued for tokenization/i)
      );

      fireEvent.click(screen.getByRole("button", { name: copy.uploadZone.resetAriaLabel }));

      expect(screen.queryByRole("status")).not.toBeInTheDocument();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: /upload & tokenize invoice/i })).toBeDisabled();
      expect(screen.getByText(copy.uploadZone.dragDropPrompt)).toBeInTheDocument();
    });

    it("reset moves focus to the dropzone", async () => {
      mockFetchOk();
      render(<UploadZone />);
      selectFile(makePdf());
      clickSubmit();
      await act(async () => {
        await Promise.resolve();
        jest.runAllTimers();
      });
      await waitFor(() =>
        expect(screen.getByRole("status")).toHaveTextContent(/queued for tokenization/i)
      );

      const dropzone = screen.getByRole("button", { name: copy.uploadZone.dropZoneLabel });
      fireEvent.click(screen.getByRole("button", { name: copy.uploadZone.resetAriaLabel }));
      expect(document.activeElement).toBe(dropzone);
    });

    it("error → retry → success", async () => {
      mockFetchError(500, "Temporary failure");
      render(<UploadZone />);
      selectFile(makePdf());
      clickSubmit();
      await waitFor(() =>
        expect(screen.getByRole("alert")).toHaveTextContent(/temporary failure/i)
      );

      mockFetchOk();
      clickSubmit();
      await act(async () => {
        await Promise.resolve();
        jest.runAllTimers();
      });
      await waitFor(() =>
        expect(screen.getByRole("status")).toHaveTextContent(/queued for tokenization/i)
      );
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("success → reset → second upload succeeds (full re-upload cycle)", async () => {
      mockFetchOk();
      render(<UploadZone />);
      selectFile(makePdf("first.pdf"));
      clickSubmit();
      await act(async () => {
        await Promise.resolve();
        jest.runAllTimers();
      });
      await waitFor(() =>
        expect(screen.getByRole("status")).toHaveTextContent(/queued for tokenization/i)
      );

      fireEvent.click(screen.getByRole("button", { name: copy.uploadZone.resetAriaLabel }));
      expect(screen.queryByRole("status")).not.toBeInTheDocument();

      selectFile(makePdf("second.pdf"));
      clickSubmit();
      await act(async () => {
        await Promise.resolve();
        jest.runAllTimers();
      });
      await waitFor(() =>
        expect(screen.getByRole("status")).toHaveTextContent(/queued for tokenization/i)
      );
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  // ── 8. Drag-and-drop ─────────────────────────────────────────────────────

  describe("8. Drag-and-drop", () => {
    it("valid PDF dropped → file shown, submit enabled, no alert", () => {
      render(<UploadZone />);
      const zone = screen.getByRole("button", { name: /drop pdf invoice/i });
      fireEvent.drop(zone, { dataTransfer: { files: [makePdf("dropped.pdf")], types: ["Files"] } });
      expect(screen.getByText("dropped.pdf")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /upload & tokenize invoice/i })).toBeEnabled();
    });

    it("invalid file dropped → alert shown, submit disabled", () => {
      render(<UploadZone />);
      const zone = screen.getByRole("button", { name: /drop pdf invoice/i });
      fireEvent.drop(zone, { dataTransfer: { files: [makeText()], types: ["Files"] } });
      expect(screen.getByRole("alert")).toHaveTextContent(/invalid file type/i);
      expect(screen.getByRole("button", { name: /upload & tokenize invoice/i })).toBeDisabled();
    });
  });

});
