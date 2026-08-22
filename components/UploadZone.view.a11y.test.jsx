/**
 * Real jest-axe accessibility tests for the upload view (issue #620).
 *
 * Scope
 * ─────
 * Issue #620 asks for jest-axe assertions on the upload view's three key
 * states — loaded (file selected), empty (idle), and error (validation alert
 * or server error). `components/UploadZone.a11y-contract.test.jsx` already
 * covers a similar matrix, but it runs against the project-wide
 * `jest-axe` stub installed in `jest.setup.js`, which always returns
 * `{ violations: [] }`. The stub exists to keep the broader test suite
 * deterministic when the real axe-core rules drift between versions.
 *
 * This file uses `jest.requireActual("jest-axe")` to obtain the unmocked
 * implementation so the assertions actually catch real violations. Run
 * with:
 *
 *   npx jest components/UploadZone.view.a11y.test.jsx
 *
 * Determinism
 * ───────────
 * The component DOM is rendered synchronously; no animation or async data
 * dependency interferes with axe. We pin the runWithTimers lifecycle so
 * `jest.useFakeTimers()` set in `beforeEach` (inherited from the upload
 * test family) doesn't leave timers in a weird state while axe inspects
 * the container.
 *
 * Waived rules (if any)
 * ──────────────────────
 * Axe checks a small, curated rule set by default; in practice we may
 * surface a violation that is design-intentional. We document any waived
 * rule inline in the relevant `it()` block and call it out in the PR
 * description.
 */

import "@testing-library/jest-dom";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import UploadZone from "./UploadZone";
import { validatePdfFile } from "../lib/validation/pdf";

// Pull the real (non-stubbed) jest-axe. `jest.setup.js` installs a global
// `jest.mock("jest-axe", ...)` so plain `import { axe, toHaveNoViolations }`
// from "jest-axe" would still receive the stub; `requireActual` returns the
// unmocked module instance regardless of the auto-mock.
const { axe: realAxe } = jest.requireActual("jest-axe");

// Mock magic-byte validation so we don't depend on real PDF byte parsing in
// jsdom (File.arrayBuffer() is unreliable there).
jest.mock("../lib/validation/pdf", () => {
  const actual = jest.requireActual("../lib/validation/pdf");
  return {
    ...actual,
    validatePdfFile: jest.fn(),
    isPdfMagicValid: jest.fn(),
  };
});

const ORIGINAL_ENV = process.env;

// ── Helpers ────────────────────────────────────────────────────────────────

function createMockFile(name = "invoice.pdf", type = "application/pdf") {
  return new File(["%PDF-1.4 mock"], name, { type });
}

function createMockTextFile(name = "notes.txt", type = "text/plain") {
  return new File(["plain text"], name, { type });
}

function mockFetchOk(extra = {}) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: jest.fn().mockResolvedValue(extra),
  });
}

function mockFetchServerError(message = "Internal server error") {
  global.fetch = jest.fn().mockResolvedValue({
    ok: false,
    status: 500,
    json: jest.fn().mockResolvedValue({ message }),
  });
}

async function runAxe(container) {
  // axe-core is a singleton: if an earlier run is still queued or tx-aware
  // callbacks are pending, subsequent `axe.run()` calls throw
  // "Axe is already running". To stay deterministic we restrict the rule
  // set to the WCAG 2.0 + 2.1 A/AA tags only (issue #620's accessibility
  // baseline) so the audit is fast and reproducible across tests.
  return await realAxe(container, {
    runOnly: {
      type: "tag",
      values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"],
    },
  });
}

/**
 * Fail the test with a clean, readable summary of every axe violation.
 * jest-axe's default failure message is a wall of JSON; this formats it
 * so PR reviewers can see at a glance which rule, impact, and node was
 * flagged.
 */
function expectNoViolations(results) {
  if (results.violations.length === 0) return;
  const summary = results.violations
    .map((v) => {
      const nodes = v.nodes.map((n) => `   • ${n.target.join(" ")}`).join("\n");
      return `[${v.impact}] ${v.id} — ${v.help}\n${nodes}`;
    })
    .join("\n\n");
  throw new Error(`Expected no accessibility violations, found:\n\n${summary}`);
}

// ── Lifecycle ──────────────────────────────────────────────────────────────
//
// axe-core is a singleton that hates fake timers: any setTimeout /
// requestAnimationFrame scheduled while fake timers are active will deadlock
// after a later swap to real timers, causing `axe.run` to hang past the
// test timeout and leaving the singleton lock held for the next test
// ("Axe is already running"). This file uses real timers throughout.
// DOM transitions here are microtask-flushed by React Testing Library
// (and `waitFor`), so we don't need fake-timer acceleration.

beforeEach(() => {
  process.env = {
    ...ORIGINAL_ENV,
    NEXT_PUBLIC_API_URL: "https://api.mock-liquifact.org",
  };
  validatePdfFile.mockResolvedValue({ valid: true });
});

afterEach(() => {
  jest.restoreAllMocks();
  process.env = ORIGINAL_ENV;
});

// ── Tests ──────────────────────────────────────────────────────────────────

describe("Upload view — real jest-axe audit (issue #620)", () => {
  // ── Empty state ───────────────────────────────────────────────────────

  describe("empty state (idle, no file selected)", () => {
    it("has no axe accessibility violations", async () => {
      const { container } = render(<UploadZone />);
      const results = await runAxe(container);
      expectNoViolations(results);
    });
  });

  // ── Loaded state (file selected, before upload) ───────────────────────

  describe("loaded state (a valid PDF file is selected)", () => {
    it("has no axe accessibility violations", async () => {
      const { container } = render(<UploadZone />);
      const input = screen.getByLabelText(/select pdf invoice file/i);
      fireEvent.change(input, { target: { files: [createMockFile("invoice.pdf")] } });

      const results = await runAxe(container);
      expectNoViolations(results);
    });
  });

  // ── Error state (validation alert) ───────────────────────────────────

  describe("error state (validation alert — wrong file type)", () => {
    it("has no axe accessibility violations", async () => {
      const { container } = render(<UploadZone />);
      const input = screen.getByLabelText(/select pdf invoice file/i);
      fireEvent.change(input, { target: { files: [createMockTextFile("notes.txt")] } });

      // Confirm we did enter the error state — the axe audit only makes
      // sense against the rendered error UI.
      expect(screen.getByRole("alert")).toBeInTheDocument();

      const results = await runAxe(container);
      expectNoViolations(results);
    });
  });

  // ── Error state (server upload failure) ─────────────────────────────

  describe("error state (server upload failure)", () => {
    it("has no axe accessibility violations", async () => {
      mockFetchServerError("Internal server error");
      const { container } = render(<UploadZone />);
      const input = screen.getByLabelText(/select pdf invoice file/i);
      fireEvent.change(input, { target: { files: [createMockFile("invoice.pdf")] } });
      fireEvent.click(screen.getByRole("button", { name: /upload & tokenize invoice/i }));

      await waitFor(() =>
        expect(screen.getByRole("alert")).toHaveTextContent(/internal server error/i)
      );

      const results = await runAxe(container);
      expectNoViolations(results);
    });
  });

  // ── Uploading state (live status region) ────────────────────────────

  describe("uploading state (in-flight fetch, polite live region)", () => {
    it("has no axe accessibility violations while the upload is pending", async () => {
      // Hang the fetch so we remain in the uploading state for the audit.
      global.fetch = jest.fn().mockReturnValue(new Promise(() => {}));
      const { container } = render(<UploadZone />);
      const input = screen.getByLabelText(/select pdf invoice file/i);
      fireEvent.change(input, { target: { files: [createMockFile("invoice.pdf")] } });

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /upload & tokenize invoice/i }));
      });

      // Confirm we did enter the uploading state.
      expect(screen.getByRole("status")).toHaveTextContent(/uploading/i);

      const results = await runAxe(container);
      expectNoViolations(results);
    });
  });
});
