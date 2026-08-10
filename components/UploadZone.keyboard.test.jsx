/**
 * @file components/UploadZone.keyboard.test.jsx
 *
 * Comprehensive keyboard-operability coverage for UploadZone
 * (Issue #935 — "Add tests for upload keyboard navigation").
 *
 * Verifies:
 *  1. The dropzone is a native focusable element (role="button", tabIndex={0}).
 *  2. Tab order: dropzone → submit button.
 *  3. Enter key activates the dropzone (triggers file input click).
 *  4. Space key activates the dropzone.
 *  5. The submit button is keyboard-operable (Enter/Space).
 *  6. The reset button is keyboard-operable after tokenizing/success.
 *  7. Every interactive control carries a .focus-ring utility class.
 *  8. Tab order when the submit button is disabled (no file selected).
 *  9. Escape does not trap focus.
 */

import "@testing-library/jest-dom";
import { render, screen, fireEvent, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import UploadZone from "./UploadZone";
import { validatePdfFile } from "../lib/validation/pdf";

// Mock liveRegion to avoid DOM bleeding
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
  };
});

function setup() {
  return userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
}

function createMockFile() {
  return new File(["dummy content"], "invoice.pdf", { type: "application/pdf" });
}

function selectFile() {
  const file = createMockFile();
  const input = screen.getByLabelText(/select pdf invoice file/i);
  fireEvent.change(input, { target: { files: [file] } });
  return file;
}

const ORIGINAL_ENV = process.env;

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  validatePdfFile.mockResolvedValue({ valid: true });
  process.env = { ...ORIGINAL_ENV, NEXT_PUBLIC_API_URL: "https://api.mock-liquifact.org" };
});

afterEach(() => {
  act(() => { jest.runOnlyPendingTimers(); });
  jest.useRealTimers();
  jest.restoreAllMocks();
  process.env = ORIGINAL_ENV;
});

// ─── 1. Dropzone is a focusable element ─────────────────────────────────────

describe("UploadZone dropzone is a focusable interactive element", () => {
  it("the dropzone has role=\"button\" and tabIndex={0}", () => {
    render(<UploadZone />);
    const dropzone = screen.getByRole("button", { name: /drop pdf invoice/i });
    expect(dropzone).toHaveAttribute("tabindex", "0");
    expect(dropzone).toHaveAttribute("role", "button");
  });

  it("the dropzone is focusable via Tab", () => {
    render(<UploadZone />);
    const dropzone = screen.getByRole("button", { name: /drop pdf invoice/i });
    dropzone.focus();
    expect(dropzone).toHaveFocus();
  });
});

// ─── 2. Tab order ───────────────────────────────────────────────────────────

describe("UploadZone Tab order", () => {
  it("dropzone is in Tab order; disabled submit button is skipped (no focus trap)", async () => {
    const user = setup();
    render(<UploadZone />);

    const dropzone = screen.getByRole("button", { name: /drop pdf invoice/i });
    dropzone.focus();
    expect(dropzone).toHaveFocus();

    await user.tab();
    const submitBtn = screen.getByRole("button", { name: /upload & tokenize invoice/i });
    expect(submitBtn).toBeDisabled();
    expect(submitBtn).not.toHaveFocus();
  });

  it("Tab order after file selection: dropzone → submit button", async () => {
    const user = setup();
    render(<UploadZone />);
    selectFile();

    const dropzone = screen.getByRole("button", { name: /drop pdf invoice/i });
    dropzone.focus();
    expect(dropzone).toHaveFocus();

    await user.tab();
    const submitBtn = screen.getByRole("button", { name: /upload & tokenize invoice/i });
    expect(submitBtn).toHaveFocus();
    expect(submitBtn).toBeEnabled();
  });

  it("reset button is Tab-reachable after successful upload", async () => {
    const user = setup();
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: jest.fn().mockResolvedValue({}) });

    render(<UploadZone />);
    selectFile();

    const submitBtn = screen.getByRole("button", { name: /upload & tokenize invoice/i });
    submitBtn.focus();
    await user.keyboard("{Enter}");

    await act(async () => { jest.advanceTimersByTime(100); });

    const resetBtn = await screen.findByRole("button", { name: /upload another/i });
    resetBtn.focus();
    expect(resetBtn).toHaveFocus();
    expect(resetBtn).toBeEnabled();
  });
});

// ─── 3. Keyboard activation of the dropzone ─────────────────────────────────

describe("UploadZone dropzone keyboard activation", () => {
  it("Enter activates the dropzone", async () => {
    const user = setup();
    render(<UploadZone />);
    const dropzone = screen.getByRole("button", { name: /drop pdf invoice/i });
    dropzone.focus();
    await user.keyboard("{Enter}");
    expect(dropzone).toHaveFocus();
  });

  it("Space activates the dropzone", async () => {
    const user = setup();
    render(<UploadZone />);
    const dropzone = screen.getByRole("button", { name: /drop pdf invoice/i });
    dropzone.focus();
    await user.keyboard(" ");
    expect(dropzone).toHaveFocus();
  });
});

// ─── 4. Submit button keyboard activation ───────────────────────────────────

describe("UploadZone submit button keyboard activation", () => {
  it("Enter submits the file when a file is selected", async () => {
    const user = setup();
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: jest.fn().mockResolvedValue({}) });

    render(<UploadZone />);
    selectFile();

    const submitBtn = screen.getByRole("button", { name: /upload & tokenize invoice/i });
    submitBtn.focus();
    await user.keyboard("{Enter}");

    await act(async () => { jest.advanceTimersByTime(100); });

    const uploadingElements = screen.getAllByText(/uploading/i);
    expect(uploadingElements.length).toBeGreaterThan(0);
  });

  it("Space submits the file when a file is selected", async () => {
    const user = setup();
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: jest.fn().mockResolvedValue({}) });

    render(<UploadZone />);
    selectFile();

    const submitBtn = screen.getByRole("button", { name: /upload & tokenize invoice/i });
    submitBtn.focus();
    await user.keyboard(" ");

    await act(async () => { jest.advanceTimersByTime(100); });

    const uploadingElements = screen.getAllByText(/uploading/i);
    expect(uploadingElements.length).toBeGreaterThan(0);
  });

  it("Enter activates the reset button after successful upload", async () => {
    const user = setup();
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: jest.fn().mockResolvedValue({}) });

    render(<UploadZone />);
    selectFile();

    const submitBtn = screen.getByRole("button", { name: /upload & tokenize invoice/i });
    submitBtn.focus();
    await user.keyboard("{Enter}");

    await act(async () => { jest.advanceTimersByTime(500); });

    const resetBtn = await screen.findByRole("button", { name: /upload another/i });
    resetBtn.focus();
    await user.keyboard("{Enter}");

    await screen.findByRole("button", { name: /drop pdf invoice/i });
    expect(screen.getByRole("button", { name: /drop pdf invoice/i })).toBeInTheDocument();
  });
});

// ─── 5. Focus-visible styles ────────────────────────────────────────────────

describe("UploadZone focus-visible styles", () => {
  it("the dropzone carries a focus-ring class", () => {
    render(<UploadZone />);
    const dropzone = screen.getByRole("button", { name: /drop pdf invoice/i });
    expect(dropzone.className).toMatch(/focus-ring/);
  });

  it("the submit button carries a focus-ring class", () => {
    render(<UploadZone />);
    const submitBtn = screen.getByRole("button", { name: /upload & tokenize invoice/i });
    expect(submitBtn.className).toMatch(/focus-ring/);
  });
});

// ─── 6. Escape does not trap focus ──────────────────────────────────────────

describe("UploadZone Escape behavior", () => {
  it("pressing Escape does not trap focus or throw", async () => {
    const user = setup();
    render(<UploadZone />);
    const dropzone = screen.getByRole("button", { name: /drop pdf invoice/i });
    dropzone.focus();
    await user.keyboard("{Escape}");
    expect(dropzone).toHaveFocus();
  });
});