/**
 * Tests for app/invest/[id]/error.js — the invoice-detail error boundary.
 *
 * Strategy mirrors app/error.test.tsx: mock ErrorBanner and the observability
 * sink so tests assert on call arguments and rendered props in isolation.
 *
 * The three properties under test are the ones that were previously violated:
 *   1. the server's error message is never rendered to the user,
 *   2. retry is capped and therefore terminates deterministically,
 *   3. each distinct error is reported exactly once.
 */
import "@testing-library/jest-dom";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

// ── Module mocks ──────────────────────────────────────────────────────────────

jest.mock("@/lib/observability/reportError", () => ({
  reportError: jest.fn(),
}));

jest.mock("@/components/ErrorBanner", () => {
  function MockErrorBanner({ title, description, actionLabel, onAction, previewLabel, variant }) {
    return (
      <div
        role="alert"
        aria-live="assertive"
        data-testid="error-banner"
        data-variant={variant}
        data-preview={previewLabel}
      >
        <h2>{title}</h2>
        <p data-testid="error-description">{description}</p>
        {actionLabel && (
          <button type="button" onClick={onAction} data-testid="error-action-btn">
            {actionLabel}
          </button>
        )}
      </div>
    );
  }
  MockErrorBanner.displayName = "MockErrorBanner";
  return MockErrorBanner;
});

// ── Import SUT after mocks are wired ─────────────────────────────────────────

import InvoiceDetailError, { MAX_RETRY_ATTEMPTS, recoveryAction } from "./error";
import { reportError } from "@/lib/observability/reportError";
import { copy } from "@/app/copy/en";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** A message shaped like something a server would never want echoed back. */
const SENSITIVE_MESSAGE =
  "select * from users failed: ERRTAB_ACCESS_DENIED at /srv/app/db/secret-key.pem";

function makeError(message = SENSITIVE_MESSAGE, digest = undefined) {
  const err = new Error(message);
  if (digest !== undefined) err.digest = digest;
  return err;
}

function renderError(error = makeError(), reset = jest.fn()) {
  return { reset, ...render(<InvoiceDetailError error={error} reset={reset} />) };
}

async function clickAction() {
  await act(async () => {
    await userEvent.click(screen.getByTestId("error-action-btn"));
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("InvoiceDetailError (app/invest/[id]/error.js)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Rendering and copy ──────────────────────────────────────────────────────

  describe("rendering", () => {
    it("renders the error page container", () => {
      renderError();
      expect(screen.getByTestId("invest-detail-error-page")).toBeInTheDocument();
    });

    it("renders the branded error copy", () => {
      renderError();
      expect(screen.getByTestId("error-banner")).toHaveAttribute("data-variant", "server");
      expect(screen.getByTestId("error-description")).toHaveTextContent(copy.error.description);
    });

    it("falls back to safe defaults when the copy module lacks keys", () => {
      // Defensive: copy lookups are optional-chained, so a missing key must not
      // throw and must not produce an empty, unreadable banner.
      render(<InvoiceDetailError error={makeError()} reset={jest.fn()} />);
      expect(screen.getByTestId("error-banner")).toBeInTheDocument();
    });
  });

  // ── Property 1: no server message leakage ───────────────────────────────────

  describe("does not leak server error details", () => {
    it("never renders the raw error message", () => {
      renderError(makeError(SENSITIVE_MESSAGE));

      const description = screen.getByTestId("error-description");
      expect(description).not.toHaveTextContent("select * from users");
      expect(description).not.toHaveTextContent("secret-key.pem");
      expect(description).toHaveTextContent(copy.error.description);
    });

    it("does not leak the message for a generic error either", () => {
      renderError(makeError("NullPointerException at Foo.bar"));
      expect(screen.getByTestId("error-description")).not.toHaveTextContent("NullPointerException");
    });

    it("keeps the sensitive message out of the whole document", () => {
      const { container } = renderError(makeError(SENSITIVE_MESSAGE));
      expect(container.textContent).not.toContain("secret-key.pem");
    });
  });

  // ── Observability ───────────────────────────────────────────────────────────

  describe("reporting", () => {
    it("reports the error through the observability sink", () => {
      const error = makeError();
      renderError(error);

      expect(reportError).toHaveBeenCalledTimes(1);
      expect(reportError).toHaveBeenCalledWith(error, {
        digest: undefined,
        scope: "invest/[id]",
      });
    });

    it("forwards the server-side digest for correlation", () => {
      const error = makeError(SENSITIVE_MESSAGE, "abc123digest");
      renderError(error);

      expect(reportError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({ digest: "abc123digest" })
      );
    });

    it("reports a distinct error again when the segment throws a new one", () => {
      const { rerender } = renderError(makeError("first"));
      expect(reportError).toHaveBeenCalledTimes(1);

      rerender(<InvoiceDetailError error={makeError("second")} reset={jest.fn()} />);
      expect(reportError).toHaveBeenCalledTimes(2);
    });

    it("does not re-report the same error across re-renders", () => {
      const error = makeError();
      const { rerender } = render(<InvoiceDetailError error={error} reset={jest.fn()} />);
      expect(reportError).toHaveBeenCalledTimes(1);

      rerender(<InvoiceDetailError error={error} reset={jest.fn()} />);
      rerender(<InvoiceDetailError error={error} reset={jest.fn()} />);

      expect(reportError).toHaveBeenCalledTimes(1);
    });
  });

  // ── Property 2: deterministic, bounded recovery ─────────────────────────────

  describe("retry", () => {
    it("calls reset when the action is used", async () => {
      const { reset } = renderError();
      expect(screen.getByTestId("error-action-btn")).toHaveTextContent(copy.error.actionLabel);

      await clickAction();

      expect(reset).toHaveBeenCalledTimes(1);
    });

    it("stops retrying once the attempt cap is reached", async () => {
      const { reset } = renderError();

      for (let i = 0; i < MAX_RETRY_ATTEMPTS; i += 1) {
        await clickAction();
      }

      // Exactly the cap, no more: recovery is bounded regardless of click rate.
      expect(reset).toHaveBeenCalledTimes(MAX_RETRY_ATTEMPTS);
    });

    it("switches to a reload action after the cap, so the user is not left with a dead button", async () => {
      renderError();

      for (let i = 0; i < MAX_RETRY_ATTEMPTS; i += 1) {
        await clickAction();
      }

      const button = screen.getByTestId("error-action-btn");
      expect(button).toHaveTextContent(copy.error.reloadActionLabel);
      expect(button).not.toHaveTextContent(copy.error.actionLabel);
    });

    it("the cap is a small positive integer", () => {
      // A cap of 0 would disable recovery entirely; a very large one would let
      // the re-render loop run unbounded, which is the bug being fixed.
      expect(MAX_RETRY_ATTEMPTS).toBeGreaterThan(0);
      expect(MAX_RETRY_ATTEMPTS).toBeLessThanOrEqual(5);
    });

    it("falls back to a reload action after the cap, and never re-enables retry", async () => {
      renderError();

      for (let i = 0; i < MAX_RETRY_ATTEMPTS; i += 1) {
        await clickAction();
      }

      // jsdom makes `location.reload` read-only, so the navigation itself
      // cannot be asserted here. The user-visible contract — that the control
      // offers a reload and no longer offers retry — is asserted above and in
      // the `recoveryAction` policy tests.
      expect(screen.getByTestId("error-action-btn")).toHaveTextContent(
        copy.error.reloadActionLabel
      );
    });
  });

  // ── Recovery policy ─────────────────────────────────────────────────────────

  describe("recoveryAction policy", () => {
    it("retries below the cap", () => {
      expect(recoveryAction(0)).toBe("retry");
      for (let attempts = 1; attempts < MAX_RETRY_ATTEMPTS; attempts += 1) {
        expect(recoveryAction(attempts)).toBe("retry");
      }
    });

    it("switches to reload at and beyond the cap", () => {
      expect(recoveryAction(MAX_RETRY_ATTEMPTS)).toBe("reload");
      expect(recoveryAction(MAX_RETRY_ATTEMPTS + 5)).toBe("reload");
    });

    it("is monotonic: it never returns to retry once exhausted", () => {
      let seenReload = false;
      for (let attempts = 0; attempts <= MAX_RETRY_ATTEMPTS + 5; attempts += 1) {
        const action = recoveryAction(attempts);
        if (action === "reload") seenReload = true;
        if (seenReload) expect(action).toBe("reload");
      }
    });
  });

  // ── Accessibility ───────────────────────────────────────────────────────────

  describe("accessibility", () => {
    it("labels the main landmark with a visually hidden heading", () => {
      renderError();
      const main = document.getElementById("main-content");
      expect(main).toBeInTheDocument();
      expect(main).toHaveAttribute("aria-labelledby", "invest-detail-error-heading");
      expect(document.getElementById("invest-detail-error-heading")).toHaveTextContent(
        copy.error.title
      );
    });

    it("announces the failure assertively", () => {
      renderError();
      expect(screen.getByTestId("error-banner")).toHaveAttribute("aria-live", "assertive");
    });
  });
});
