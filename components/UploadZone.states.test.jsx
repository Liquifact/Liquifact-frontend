/**
 * Focused state-machine and interaction tests for UploadZone.
 *
 * Goal (Issue #561): cover loading, empty, error, and success states plus the
 * primary interaction, with assertions on accessible names and roles.
 * Tests in this file complement — without replacing — components/UploadZone.test.jsx,
 * which already covers many individual scenarios.  Here we focus on:
 *   1. Each of the four states in isolation.
 *   2. State exclusivity — at any time, only the role appropriate to the
 *      current state should be exposed to assistive technologies.
 *   3. The primary interaction — file selection → form submit — driven via
 *      the rendered component using React Testing Library.
 *   4. Accessible names and roles for the major controls.
 *
 * No source behaviour is changed.  One observed defect is noted inline
 * (not fixed) per the issue's "Do not change behaviour unless a defect is
 * found (note it)." guardrail.
 */

import "@testing-library/jest-dom";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import UploadZone from "./UploadZone";
import { validatePdfFile } from "../lib/validation/pdf";

jest.mock("../lib/validation/pdf", () => {
  const actual = jest.requireActual("../lib/validation/pdf");
  return {
    validatePdfFile: jest.fn(),
    sanitizeFilename: actual.sanitizeFilename,
    isPdfMagicValid: jest.fn(),
  };
});

const ORIGINAL_ENV = process.env;

// ── Helpers ──────────────────────────────────────────────────────────────

function createMockFile(name = "invoice.pdf", type = "application/pdf") {
  return new File(["%PDF-1.4 mock"], name, { type });
}

function createMockTextFile(name = "notes.txt", type = "text/plain") {
  return new File(["plain text body"], name, { type });
}

function createDataTransfer(files) {
  return { files, types: ["Files"] };
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

function selectFile(file) {
  fireEvent.change(screen.getByLabelText(/select pdf invoice file/i), {
    target: { files: [file] },
  });
}

/**
 * Cross-cutting helper used by the state-exclusity and full-cycle tests.
 * Asserts that the only ARIA live/region role(s) exposed by the rendered
 * component belong to `allowedRoles`. Tracks `status`, `alert`, and
 * `progressbar` because those are the three roles the upload component
 * uses to announce its state machine to assistive technologies.
 */
function expectOnly(queryableAccessibleRegions, allowedRoles) {
  if (!allowedRoles.includes("status")) {
    expect(queryableAccessibleRegions.queryByRole("status")).toBeNull();
  } else {
    expect(queryableAccessibleRegions.queryByRole("status")).not.toBeNull();
  }
  if (!allowedRoles.includes("alert")) {
    expect(queryableAccessibleRegions.queryByRole("alert")).toBeNull();
  } else {
    expect(queryableAccessibleRegions.queryByRole("alert")).not.toBeNull();
  }
  if (!allowedRoles.includes("progressbar")) {
    expect(queryableAccessibleRegions.queryByRole("progressbar")).toBeNull();
  } else {
    expect(queryableAccessibleRegions.queryByRole("progressbar")).not.toBeNull();
  }
}

// ── Lifecycle ────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.useFakeTimers();
  process.env = {
    ...ORIGINAL_ENV,
    NEXT_PUBLIC_API_URL: "https://api.mock-liquifact.org",
  };
  // Default to valid PDF magic bytes; individual tests may override.
  validatePdfFile.mockResolvedValue({ valid: true });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
  process.env = ORIGINAL_ENV;
});

// ── Tests ────────────────────────────────────────────────────────────────

describe("UploadZone — states & interactions", () => {
  // ── 1. Empty (idle) state ──────────────────────────────────────────────

  describe("Empty state — no file selected", () => {
    it("renders the requirements notice with role=note and accessible name", () => {
      render(<UploadZone />);
      expect(screen.getByRole("note", { name: /file upload requirements/i })).toBeInTheDocument();
    });

    it("renders the drop zone with role=button and accessible name", () => {
      render(<UploadZone />);
      const dropZone = screen.getByRole("button", { name: /drop pdf invoice/i });
      expect(dropZone).toHaveAttribute("tabindex", "0");
    });

    it("does NOT expose any status, alert, or progressbar regions", () => {
      render(<UploadZone />);
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    });

    it("disables the submit button with matching aria-disabled", () => {
      render(<UploadZone />);
      const submit = screen.getByRole("button", { name: /upload & tokenize invoice/i });
      expect(submit).toBeDisabled();
      expect(submit).toHaveAttribute("aria-disabled", "true");
    });

    it("exposes the file input with an accessible name", () => {
      render(<UploadZone />);
      const input = screen.getByLabelText(/select pdf invoice file/i);
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute("type", "file");
      expect(input).toHaveAttribute("accept", ".pdf");
    });
  });

  // ── 2. Loading state (uploading + tokenizing) ──────────────────────────

  describe("Loading state — uploading", () => {
    it("exposes a polite live region with role=status", async () => {
      // Hold the fetch open so we remain in the uploading state.
      global.fetch = jest.fn().mockReturnValue(new Promise(() => {}));
      render(<UploadZone />);
      selectFile(createMockFile());
      fireEvent.click(screen.getByRole("button", { name: /upload & tokenize invoice/i }));

      const status = screen.getByRole("status");
      expect(status).toHaveAttribute("aria-live", "polite");
      expect(status).toHaveTextContent(/uploading invoice/i);
    });

    it("exposes at least one spinner image with accessible name 'Loading'", async () => {
      // While uploading the spinner renders in BOTH the status region (no
      // progress prop) and inside the submit button — so we assert at least
      // one is present rather than matching a single element.
      global.fetch = jest.fn().mockReturnValue(new Promise(() => {}));
      render(<UploadZone />);
      selectFile(createMockFile());
      fireEvent.click(screen.getByRole("button", { name: /upload & tokenize invoice/i }));

      expect(screen.getAllByRole("img", { name: /loading/i }).length).toBeGreaterThanOrEqual(1);
    });

    it("disables submit button and announces aria-disabled while uploading", async () => {
      global.fetch = jest.fn().mockReturnValue(new Promise(() => {}));
      render(<UploadZone />);
      selectFile(createMockFile());
      fireEvent.click(screen.getByRole("button", { name: /upload & tokenize invoice/i }));

      const submit = screen.getByRole("button", { name: /uploading invoice/i });
      expect(submit).toBeDisabled();
      expect(submit).toHaveAttribute("aria-disabled", "true");
    });

    it("does NOT expose an alert region while uploading", async () => {
      global.fetch = jest.fn().mockReturnValue(new Promise(() => {}));
      render(<UploadZone />);
      selectFile(createMockFile());
      fireEvent.click(screen.getByRole("button", { name: /upload & tokenize invoice/i }));

      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("renders an indeterminate (no progressbar) indicator when progress is undefined", async () => {
      global.fetch = jest.fn().mockReturnValue(new Promise(() => {}));
      render(<UploadZone />);
      selectFile(createMockFile());
      fireEvent.click(screen.getByRole("button", { name: /upload & tokenize invoice/i }));

      expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    });

    it("renders a determinate progressbar with aria-* when progress prop is provided", async () => {
      global.fetch = jest.fn().mockReturnValue(new Promise(() => {}));
      render(<UploadZone progress={42} />);
      selectFile(createMockFile());
      fireEvent.click(screen.getByRole("button", { name: /upload & tokenize invoice/i }));

      const prog = screen.getByRole("progressbar");
      expect(prog).toHaveAttribute("aria-valuenow", "42");
      expect(prog).toHaveAttribute("aria-valuemin", "0");
      expect(prog).toHaveAttribute("aria-valuemax", "100");
    });
  });

  describe("Loading state — tokenizing", () => {
    it("shows the 'pending tokenization' status when server returns tokenizationDelay", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ tokenizationDelay: 1000 }),
      });

      render(<UploadZone />);
      selectFile(createMockFile());
      fireEvent.click(screen.getByRole("button", { name: /upload & tokenize invoice/i }));

      // The fetch resolves immediately and enters tokenizing state.
      await waitFor(() =>
        expect(screen.getByRole("status")).toHaveTextContent(/pending tokenization/i)
      );

      // Polite live region preserved into tokenizing state.
      expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");

      // Spinner is still present (rendered both inside the status region
      // and inside the submit button during tokenizing).
      expect(screen.getAllByRole("img", { name: /loading/i }).length).toBeGreaterThanOrEqual(1);

      // Submit button's accessible name flips to "Tokenizing invoice..." and
      // the button is disabled.
      const submit = screen.getByRole("button", { name: /tokenizing invoice/i });
      expect(submit).toBeDisabled();
      expect(submit).toHaveAttribute("aria-disabled", "true");

      // No error/alert region.
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });

  // ── 3. Error state ─────────────────────────────────────────────────────

  describe("Error state", () => {
    it("exposes a single assertive live region with role=alert on validation error", () => {
      render(<UploadZone />);
      selectFile(createMockTextFile());

      const alert = screen.getByRole("alert");
      expect(alert).toHaveAttribute("aria-live", "assertive");
      expect(alert).toHaveTextContent(/invalid file type/i);
    });

    it("does NOT expose status or progressbar regions during a validation error", () => {
      render(<UploadZone />);
      selectFile(createMockTextFile());

      expect(screen.queryByRole("status")).not.toBeInTheDocument();
      expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    });

    it("keeps the submit button disabled while a validation error is shown", () => {
      render(<UploadZone />);
      selectFile(createMockTextFile());

      const submit = screen.getByRole("button", { name: /upload & tokenize invoice/i });
      expect(submit).toBeDisabled();
      expect(submit).toHaveAttribute("aria-disabled", "true");
    });

    it("resets the error and submit becomes available after a valid file is selected (recovery)", () => {
      render(<UploadZone />);

      selectFile(createMockTextFile());
      expect(screen.getByRole("alert")).toBeInTheDocument();

      selectFile(createMockFile());
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: /upload & tokenize invoice/i })).toBeEnabled();
    });

    it("surfaces a server upload error and re-enables the submit button for retry", async () => {
      mockFetchError(500, "Internal failure");
      render(<UploadZone />);

      selectFile(createMockFile());
      fireEvent.click(screen.getByRole("button", { name: /upload & tokenize invoice/i }));

      await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/internal failure/i));
      // The component recovers to idle so the user can retry the upload.
      expect(screen.getByRole("button", { name: /upload & tokenize invoice/i })).toBeEnabled();
      // And no status/progressbar leaks from the previous attempt.
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
      expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    });

    it("surfaces a network failure with role=alert (no status region)", async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error("Network unreachable"));
      render(<UploadZone />);

      selectFile(createMockFile());
      fireEvent.click(screen.getByRole("button", { name: /upload & tokenize invoice/i }));

      await waitFor(() =>
        expect(screen.getByRole("alert")).toHaveTextContent(/network unreachable/i)
      );
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });

    it("after an error, selecting a new valid file does NOT keep the alert visible", async () => {
      mockFetchError(500, "Boom");
      render(<UploadZone />);
      selectFile(createMockFile());
      fireEvent.click(screen.getByRole("button", { name: /upload & tokenize invoice/i }));

      await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());

      selectFile(createMockFile("another.pdf"));
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });

  // ── 4. Success state ───────────────────────────────────────────────────

  describe("Success state", () => {
    it("exposes a polite live region with the success message", async () => {
      mockFetchOk();
      render(<UploadZone />);
      selectFile(createMockFile());
      fireEvent.click(screen.getByRole("button", { name: /upload & tokenize invoice/i }));

      await waitFor(() =>
        expect(screen.getByRole("status")).toHaveTextContent(/queued for tokenization/i)
      );
      expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
    });

    it("does NOT expose an alert or progressbar region after success", async () => {
      mockFetchOk();
      render(<UploadZone />);
      selectFile(createMockFile());
      fireEvent.click(screen.getByRole("button", { name: /upload & tokenize invoice/i }));

      await waitFor(() =>
        expect(screen.getByRole("status")).toHaveTextContent(/queued for tokenization/i)
      );
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    });

    it("invokes onUploadSuccess exactly once with invoice-shaped metadata", async () => {
      mockFetchOk();
      const onUploadSuccess = jest.fn();
      render(<UploadZone onUploadSuccess={onUploadSuccess} />);

      selectFile(createMockFile("acme.pdf"));
      fireEvent.click(screen.getByRole("button", { name: /upload & tokenize invoice/i }));

      await waitFor(() => expect(onUploadSuccess).toHaveBeenCalledTimes(1));
      const payload = onUploadSuccess.mock.calls[0][0];
      expect(payload).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          issuer: "acme.pdf",
          amount: "Pending",
          currency: "USD",
          dueDate: "Pending",
          yield: "Pending",
          status: "Pending tokenization",
        })
      );
    });

    // Note (potential defect): after success, the submit button's `disabled`
    // and `aria-disabled` states are derived solely from `!file || isProcessing`.
    // Once the upload completes (status === "success"), `isProcessing` is false,
    // so the submit button is rendered as enabled — yet clicking it is a no-op
    // because handleSubmit guards with `status !== "idle"`. The button is
    // therefore visually actionable but functionally inert. This may be a
    // UX/a11y defect; it is NOT being fixed in this PR per the issue
    // guideline "Do not change behaviour unless a defect is found (note it)."
    it("documents current behavior: submit button is rendered enabled after success", async () => {
      mockFetchOk();
      render(<UploadZone />);
      selectFile(createMockFile());
      fireEvent.click(screen.getByRole("button", { name: /upload & tokenize invoice/i }));

      await waitFor(() =>
        expect(screen.getByRole("status")).toHaveTextContent(/queued for tokenization/i)
      );
      const submit = screen.getByRole("button", { name: /upload & tokenize invoice/i });
      expect(submit).toBeEnabled(); // Documents the current (questionable) state.
    });
  });

  // ── 5. State exclusivity (cross-cutting) ──────────────────────────────

  describe("State exclusivity", () => {
    it("idle: no status, no alert, no progressbar", () => {
      render(<UploadZone />);
      expectOnly(screen, []);
    });

    it("loading (uploading): exactly one status, no alert, no progressbar", async () => {
      global.fetch = jest.fn().mockReturnValue(new Promise(() => {}));
      render(<UploadZone />);
      selectFile(createMockFile());
      fireEvent.click(screen.getByRole("button", { name: /upload & tokenize invoice/i }));

      expectOnly(screen, ["status"]);
      // And exactly one of them.
      expect(screen.queryAllByRole("status")).toHaveLength(1);
    });

    it("error (validation): exactly one alert, no status, no progressbar", () => {
      render(<UploadZone />);
      selectFile(createMockTextFile());
      expectOnly(screen, ["alert"]);
      expect(screen.queryAllByRole("alert")).toHaveLength(1);
    });

    it("success: exactly one status, no alert, no progressbar", async () => {
      mockFetchOk();
      render(<UploadZone />);
      selectFile(createMockFile());
      fireEvent.click(screen.getByRole("button", { name: /upload & tokenize invoice/i }));

      await waitFor(() =>
        expect(screen.getByRole("status")).toHaveTextContent(/queued for tokenization/i)
      );
      expectOnly(screen, ["status"]);
      expect(screen.queryAllByRole("status")).toHaveLength(1);
    });
  });

  // ── 6. Primary interaction — submit button ─────────────────────────────

  describe("Primary interaction — submit", () => {
    it("does not call fetch when the submit button is pressed in the empty state", async () => {
      const fetchSpy = jest.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
      global.fetch = fetchSpy;
      render(<UploadZone />);

      const submit = screen.getByRole("button", { name: /upload & tokenize invoice/i });
      expect(submit).toBeDisabled();
      fireEvent.click(submit);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("calls fetch once with a POST to /invoices and a FormData body containing the file", async () => {
      mockFetchOk();
      render(<UploadZone />);
      const file = createMockFile();
      selectFile(file);
      fireEvent.click(screen.getByRole("button", { name: /upload & tokenize invoice/i }));

      await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
      const [url, options] = global.fetch.mock.calls[0];
      expect(url).toMatch(/\/invoices$/);
      expect(options.method).toBe("POST");
      expect(options.body).toBeInstanceOf(FormData);
      expect(options.body.get("invoice")).toBe(file);
    });

    it("preserves state exclusivity across the full idle→uploading→success cycle", async () => {
      // Use a manually-controllable promise so we can hold the component in
      // the uploading state, assert exclusivity, then resolve to drive it
      // through tokenizing into success within a single render.
      let resolveFetch;
      global.fetch = jest.fn().mockReturnValue(
        new Promise((resolve) => {
          resolveFetch = resolve;
        })
      );

      render(<UploadZone />);
      expectOnly(screen, []); // idle

      selectFile(createMockFile());
      fireEvent.click(screen.getByRole("button", { name: /upload & tokenize invoice/i }));
      expectOnly(screen, ["status"]); // uploading — exclusivity OK

      // Resolve the in-flight fetch so handleSubmit advances state.
      await act(async () => {
        resolveFetch({
          ok: true,
          json: jest.fn().mockResolvedValue({}),
        });
        await Promise.resolve();
      });

      await waitFor(() => expectOnly(screen, ["status"])); // success — still exclusive
      expect(screen.getByRole("status")).toHaveTextContent(/queued for tokenization/i);
    });
  });

  // ── 7. Primary interaction — keyboard ─────────────────────────────────

  describe("Primary interaction — keyboard activation", () => {
    it("opens the native file dialog when the drop zone receives Enter", () => {
      render(<UploadZone />);
      const dropZone = screen.getByRole("button", { name: /drop pdf invoice/i });
      const input = screen.getByLabelText(/select pdf invoice file/i);
      const clickSpy = jest.spyOn(input, "click").mockImplementation(() => {});

      fireEvent.keyDown(dropZone, { key: "Enter", code: "Enter" });
      expect(clickSpy).toHaveBeenCalledTimes(1);

      clickSpy.mockRestore();
    });

    it("opens the native file dialog when the drop zone receives Space", () => {
      render(<UploadZone />);
      const dropZone = screen.getByRole("button", { name: /drop pdf invoice/i });
      const input = screen.getByLabelText(/select pdf invoice file/i);
      const clickSpy = jest.spyOn(input, "click").mockImplementation(() => {});

      fireEvent.keyDown(dropZone, { key: " ", code: "Space" });
      expect(clickSpy).toHaveBeenCalledTimes(1);

      clickSpy.mockRestore();
    });

    it("does NOT open the file dialog on Tab or Escape", () => {
      render(<UploadZone />);
      const dropZone = screen.getByRole("button", { name: /drop pdf invoice/i });
      const input = screen.getByLabelText(/select pdf invoice file/i);
      const clickSpy = jest.spyOn(input, "click").mockImplementation(() => {});

      fireEvent.keyDown(dropZone, { key: "Tab", code: "Tab" });
      fireEvent.keyDown(dropZone, { key: "Escape", code: "Escape" });

      expect(clickSpy).not.toHaveBeenCalled();
      clickSpy.mockRestore();
    });

    it("opens the native file dialog when the drop zone is clicked (mouse/pointer)", () => {
      render(<UploadZone />);
      const dropZone = screen.getByRole("button", { name: /drop pdf invoice/i });
      const input = screen.getByLabelText(/select pdf invoice file/i);
      const clickSpy = jest.spyOn(input, "click").mockImplementation(() => {});

      fireEvent.click(dropZone);
      expect(clickSpy).toHaveBeenCalled();

      clickSpy.mockRestore();
    });
  });

  // ── 8. Primary interaction — drag-and-drop ────────────────────────────

  describe("Primary interaction — drag and drop", () => {
    it("accepts a valid PDF file via drop and enables submit", () => {
      render(<UploadZone />);
      const dropZone = screen.getByRole("button", { name: /drop pdf invoice/i });

      fireEvent.drop(dropZone, {
        dataTransfer: createDataTransfer([createMockFile("invoice.pdf")]),
      });

      expect(screen.getByText("invoice.pdf")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /upload & tokenize invoice/i })).toBeEnabled();
    });

    it("rejects and surfaces an alert for an invalid file type via drop", () => {
      render(<UploadZone />);
      const dropZone = screen.getByRole("button", { name: /drop pdf invoice/i });

      fireEvent.drop(dropZone, {
        dataTransfer: createDataTransfer([createMockTextFile("notes.txt")]),
      });

      const alert = screen.getByRole("alert");
      expect(alert).toHaveAttribute("aria-live", "assertive");
      expect(alert).toHaveTextContent(/invalid file type/i);
      // Submit stays disabled — error state preserves primary interaction guard.
      expect(screen.getByRole("button", { name: /upload & tokenize invoice/i })).toBeDisabled();
    });
  });

  // ── 9. Coverage-gap branches (push toward ≥95% coverage) ──────────────
  //
  // These exercise small branches of `handleFile`'s async catch and the
  // non-200 `errorUploadStatus` template that the main
  // UploadZone.test.jsx does not currently cover. They are intentionally
  // narrow (one assertion each) so they surface real branch misses without
  // bloating the test suite.
  //
  // Note: `validate(f)`'s `if (!f)` branch (which surfaces `errorNoFile`)
  // is defensive code that the public API never reaches — both
  // `handleChange` and `handleDrop` short-circuit with `if (f) handleFile(f)`
  // before any null/undefined file would land in `validate()`. We
  // therefore do not test for that branch; doing so would be a no-op that
  // silently passes and falsely advertise coverage. See
  // components/UploadZone.jsx lines around `validate()`.

  describe("Coverage-gap branches", () => {
    it("surfaces errorReadFailed when validatePdfFile rejects", async () => {
      // Force the async validatePdfFile helper to throw — exercises the
      // catch (e) branch of handleFile.
      validatePdfFile.mockRejectedValueOnce(new Error("boom"));
      render(<UploadZone />);
      selectFile(createMockFile());
      await waitFor(() =>
        expect(screen.getByRole("alert")).toHaveTextContent(/unable to read file/i)
      );
      // Idle is recovered: submit stays disabled because the file was cleared.
      expect(screen.getByRole("button", { name: /upload & tokenize invoice/i })).toBeDisabled();
    });

    it("formats non-200 server response into the errorUploadStatus template", async () => {
      // 502 with empty message body → expect "{status}" template branch.
      mockFetchError(502, "");
      render(<UploadZone />);
      selectFile(createMockFile());
      fireEvent.click(screen.getByRole("button", { name: /upload & tokenize invoice/i }));
      await waitFor(() =>
        expect(screen.getByRole("alert")).toHaveTextContent(/upload failed \(502\)/i)
      );
    });
  });
});
