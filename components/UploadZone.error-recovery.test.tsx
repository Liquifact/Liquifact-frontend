/**
 * @file components/UploadZone.error-recovery.test.tsx
 *
 * Interaction tests for the UploadZone component's error-recovery flows.
 *
 * Scenarios covered
 * ─────────────────
 * 1. Upload fails → error state is shown
 * 2. User retries (re-submits with same file) → upload recovers to success state
 * 3. User "dismisses" the error by selecting a new valid file → error clears,
 *    component returns to idle with the new file ready
 * 4. Retry fails again → error state is shown again with the new message
 *
 * All network calls are mocked via jest.fn(); no real HTTP requests are made.
 */

import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import UploadZone from "./UploadZone";
import { copy } from "../app/copy/en";
import { validatePdfFile } from "../lib/validation/pdf";

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

jest.mock("../lib/validation/pdf", () => {
  const actual = jest.requireActual("../lib/validation/pdf");
  return {
    validatePdfFile: jest.fn(),
    sanitizeFilename: actual.sanitizeFilename,
    isPdfMagicValid: jest.fn(),
  };
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createPdfFile(name = "invoice.pdf") {
  return new File(["mock content"], name, { type: "application/pdf" });
}

/** Make global.fetch resolve with a successful upload response. */
function mockFetchOk() {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: jest.fn().mockResolvedValue({}),
  });
}

/**
 * Make global.fetch resolve with a server error response.
 * @param message - The error message returned by the server.
 */
function mockFetchError(message = "Internal server error") {
  global.fetch = jest.fn().mockResolvedValue({
    ok: false,
    status: 500,
    json: jest.fn().mockResolvedValue({ message }),
  });
}

/** Select a file via the hidden file input. */
function selectFile(file: File) {
  const input = screen.getByLabelText(/select pdf invoice file/i);
  fireEvent.change(input, { target: { files: [file] } });
}

/** Click the submit button to start an upload. */
function clickSubmit() {
  fireEvent.click(screen.getByRole("button", { name: /upload & tokenize invoice/i }));
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

const ORIGINAL_ENV = process.env;

beforeEach(() => {
  jest.useFakeTimers();
  process.env = {
    ...ORIGINAL_ENV,
    NEXT_PUBLIC_API_URL: "https://api.mock-liquifact.org",
  };
  // Default: PDF validation passes
  (validatePdfFile as jest.Mock).mockResolvedValue({ valid: true });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
  process.env = ORIGINAL_ENV;
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("UploadZone — error-recovery flows", () => {
  // -------------------------------------------------------------------------
  // Scenario 1 — Upload fails → error state is shown
  // -------------------------------------------------------------------------
  it("shows error state when upload fails with a server error", async () => {
    mockFetchError("Payment required");
    render(<UploadZone />);

    selectFile(createPdfFile());
    clickSubmit();

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(screen.getByRole("alert")).toHaveTextContent(/payment required/i);

    // Status should be back to idle — submit button re-enabled with the file still selected
    expect(screen.getByRole("button", { name: /upload & tokenize invoice/i })).toBeEnabled();

    // No processing status indicators remain
    expect(screen.queryByText(copy.uploadZone.statusUploading)).not.toBeInTheDocument();
  });

  it("shows error state when upload fails with a network-level rejection", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("Failed to fetch"));
    render(<UploadZone />);

    selectFile(createPdfFile());
    clickSubmit();

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(screen.getByRole("alert")).toHaveTextContent(/failed to fetch/i);

    expect(screen.getByRole("button", { name: /upload & tokenize invoice/i })).toBeEnabled();
  });

  // -------------------------------------------------------------------------
  // Scenario 2 — User clicks retry → upload retries and recovers to success
  // -------------------------------------------------------------------------
  it("recovers to success state when user retries after a failed upload", async () => {
    // First attempt fails
    mockFetchError("Service unavailable");
    render(<UploadZone />);

    selectFile(createPdfFile());
    clickSubmit();

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(screen.getByRole("alert")).toHaveTextContent(/service unavailable/i);

    // Retry: second attempt succeeds
    mockFetchOk();
    clickSubmit();

    // Error is cleared immediately when retry begins
    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());

    // Flush microtasks and timers so upload completes
    await act(async () => {
      await Promise.resolve();
      jest.runAllTimers();
    });

    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(copy.uploadZone.statusSuccess)
    );

    // mockFetchOk() replaced global.fetch with a fresh spy — one call on this spy
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("clears the uploading status and re-enables submit during retry before fetch resolves", async () => {
    // First attempt fails
    mockFetchError();
    render(<UploadZone />);

    selectFile(createPdfFile());
    clickSubmit();

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());

    // Retry: keep fetch pending so we can inspect the mid-flight state
    global.fetch = jest.fn().mockReturnValue(new Promise(() => {}));
    clickSubmit();

    // Should be back in the "uploading" state — submit button disabled again
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(copy.uploadZone.statusUploading)
    );
    expect(screen.getByRole("button", { name: /upload & tokenize invoice/i })).toBeDisabled();

    // Error alert should be gone while upload is in progress
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Scenario 3 — User "dismisses" error by selecting a new valid file
  // -------------------------------------------------------------------------
  it("clears the error and returns to idle when the user selects a new valid file after failure", async () => {
    mockFetchError("Gateway timeout");
    render(<UploadZone />);

    selectFile(createPdfFile("first.pdf"));
    clickSubmit();

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(screen.getByRole("alert")).toHaveTextContent(/gateway timeout/i);

    // "Dismiss" by selecting a new file — this clears the error
    selectFile(createPdfFile("second.pdf"));

    // Error is gone
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    // New file is displayed — component is in idle with file ready
    expect(screen.getByText("second.pdf")).toBeInTheDocument();

    // Submit button is enabled (file is ready, status is idle)
    expect(screen.getByRole("button", { name: /upload & tokenize invoice/i })).toBeEnabled();
  });

  it("dismissing the error and then uploading the new file succeeds", async () => {
    // Fail the first upload
    mockFetchError("Bad gateway");
    render(<UploadZone />);

    selectFile(createPdfFile("first.pdf"));
    clickSubmit();

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());

    // Dismiss by selecting a new valid file
    selectFile(createPdfFile("second.pdf"));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    // Upload the new file successfully
    mockFetchOk();
    clickSubmit();

    await act(async () => {
      await Promise.resolve();
      jest.runAllTimers();
    });

    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(copy.uploadZone.statusSuccess)
    );

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Scenario 4 — Retry fails again → error state shown again correctly
  // -------------------------------------------------------------------------
  it("shows the error state again when a retry also fails", async () => {
    // First attempt fails
    mockFetchError("Connection refused");
    render(<UploadZone />);

    selectFile(createPdfFile());
    clickSubmit();

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(screen.getByRole("alert")).toHaveTextContent(/connection refused/i);

    // Retry also fails — with a different error message
    mockFetchError("Still unavailable");
    clickSubmit();

    // Alert disappears during the in-flight retry…
    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());

    // …and reappears with the new failure message once the retry settles
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(screen.getByRole("alert")).toHaveTextContent(/still unavailable/i);

    // Submit button is re-enabled so the user can try again
    expect(screen.getByRole("button", { name: /upload & tokenize invoice/i })).toBeEnabled();
  });

  it("shows error again on a second retry failure with the correct message", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("Network error on first try"));
    render(<UploadZone />);

    selectFile(createPdfFile());
    clickSubmit();

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(/network error on first try/i)
    );

    // Second attempt: different error
    global.fetch = jest.fn().mockRejectedValue(new Error("Network error on second try"));
    clickSubmit();

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(/network error on second try/i)
    );

    // Third: also fails
    global.fetch = jest.fn().mockRejectedValue(new Error("Network error on third try"));
    clickSubmit();

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(/network error on third try/i)
    );

    expect(screen.getByRole("button", { name: /upload & tokenize invoice/i })).toBeEnabled();
  });

  // -------------------------------------------------------------------------
  // Scenario 4 (additional): error role and aria-live are correct on retry failure
  // -------------------------------------------------------------------------
  it("error alert retains correct role and aria-live attributes after a retry failure", async () => {
    mockFetchError("First failure");
    render(<UploadZone />);

    selectFile(createPdfFile());
    clickSubmit();

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());

    // Retry — also fails
    mockFetchError("Second failure");
    clickSubmit();

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/second failure/i));

    const alert = screen.getByRole("alert");
    expect(alert).toHaveAttribute("aria-live", "assertive");
  });
});
