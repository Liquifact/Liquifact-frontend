/**
 * ErrorBanner — actionLabel rendering and variant label matrix
 *
 * Covers:
 *  - Button renders the exact text supplied via `actionLabel` (not a hard-coded string).
 *  - Button is hidden when `actionLabel` is omitted.
 *  - `onAction` callback is invoked when the button is clicked.
 *  - Variant label matrix: server, validation, error, unknown/fallback.
 *  - Accessibility: button has an accessible name derived from `actionLabel`.
 *  - `previewLabel`, `title`, `description`, `details` render correctly.
 *  - ARIA: role="alert" and aria-live="assertive" are always present.
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ErrorBanner from "./ErrorBanner";

// ── helpers ─────────────────────────────────────────────────────────────────

function renderBanner(props: React.ComponentProps<typeof ErrorBanner> = {}) {
  return render(
    <ErrorBanner
      title="Something went wrong"
      description="Please try again."
      {...props}
    />,
  );
}

// ── actionLabel rendering ────────────────────────────────────────────────────

describe("actionLabel prop", () => {
  it("renders the exact actionLabel text in the button", () => {
    renderBanner({ actionLabel: "Try again" });
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });

  it("does NOT hard-code 'Retry' — custom label is used", () => {
    renderBanner({ actionLabel: "Reload page" });
    expect(screen.getByRole("button", { name: "Reload page" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Retry" })).not.toBeInTheDocument();
  });

  it("renders a button for any non-empty actionLabel string", () => {
    renderBanner({ actionLabel: "Dismiss" });
    expect(screen.getByRole("button", { name: "Dismiss" })).toBeInTheDocument();
  });

  it("hides the action button when actionLabel is omitted", () => {
    renderBanner();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("hides the action button when actionLabel is an empty string", () => {
    renderBanner({ actionLabel: "" });
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("button has an accessible name equal to actionLabel", () => {
    renderBanner({ actionLabel: "Try again" });
    const btn = screen.getByRole("button");
    expect(btn).toHaveAccessibleName("Try again");
  });
});

// ── onAction callback ────────────────────────────────────────────────────────

describe("onAction callback", () => {
  it("invokes onAction when the button is clicked", async () => {
    const user = userEvent.setup();
    const onAction = jest.fn();
    renderBanner({ actionLabel: "Try again", onAction });

    await user.click(screen.getByRole("button", { name: "Try again" }));

    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it("does not throw when onAction is omitted and button is clicked", async () => {
    const user = userEvent.setup();
    renderBanner({ actionLabel: "Try again" });

    await expect(
      user.click(screen.getByRole("button", { name: "Try again" })),
    ).resolves.not.toThrow();
  });
});

// ── variant label matrix ─────────────────────────────────────────────────────

describe("variant label matrix", () => {
  const cases: Array<[string | undefined, string]> = [
    ["server", "Server error"],
    ["validation", "Validation error"],
    ["error", "Error"],
  ];

  it.each(cases)(
    'variant="%s" renders label "%s"',
    (variant, expectedLabel) => {
      renderBanner({ variant: variant as string });
      expect(screen.getByText(expectedLabel)).toBeInTheDocument();
    },
  );

  it('defaults to "Server error" when variant is omitted', () => {
    renderBanner();
    expect(screen.getByText("Server error")).toBeInTheDocument();
  });

  it('falls back to "Server error" for an unknown variant string', () => {
    renderBanner({ variant: "network" as never });
    expect(screen.getByText("Server error")).toBeInTheDocument();
  });

  it('variant="error" does NOT show "Server error"', () => {
    renderBanner({ variant: "error" });
    expect(screen.queryByText("Server error")).not.toBeInTheDocument();
    expect(screen.getByText("Error")).toBeInTheDocument();
  });

  it('variant="validation" does NOT show "Server error"', () => {
    renderBanner({ variant: "validation" });
    expect(screen.queryByText("Server error")).not.toBeInTheDocument();
    expect(screen.getByText("Validation error")).toBeInTheDocument();
  });
});

// ── previewLabel ─────────────────────────────────────────────────────────────

describe("previewLabel prop", () => {
  it('defaults to "Preview only"', () => {
    renderBanner();
    expect(screen.getByText("Preview only")).toBeInTheDocument();
  });

  it("renders a custom previewLabel", () => {
    renderBanner({ previewLabel: "Invoice detail" });
    expect(screen.getByText("Invoice detail")).toBeInTheDocument();
  });
});

// ── title / description / details ────────────────────────────────────────────

describe("content props", () => {
  it("renders the title", () => {
    renderBanner({ title: "Unable to load invoice details" });
    expect(
      screen.getByRole("heading", { name: "Unable to load invoice details" }),
    ).toBeInTheDocument();
  });

  it("renders the description", () => {
    renderBanner({ description: "The server returned a 500 error." });
    expect(screen.getByText("The server returned a 500 error.")).toBeInTheDocument();
  });

  it("renders details when provided", () => {
    renderBanner({ details: "Request ID: abc-123" });
    expect(screen.getByText("Request ID: abc-123")).toBeInTheDocument();
  });

  it("omits the details paragraph when details is not provided", () => {
    renderBanner();
    // The only paragraphs should be variantLabel and description; nothing else extra
    expect(screen.queryByText(/Request ID/)).not.toBeInTheDocument();
  });
});

// ── ARIA / accessibility ─────────────────────────────────────────────────────

describe("ARIA attributes", () => {
  it('has role="alert"', () => {
    renderBanner();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it('has aria-live="assertive"', () => {
    renderBanner();
    expect(screen.getByRole("alert")).toHaveAttribute("aria-live", "assertive");
  });
});

// ── combined: typical usage patterns matching real callers ───────────────────

describe("real-caller usage patterns", () => {
  it('app/invest/page.js pattern: no variant + actionLabel="Try again"', () => {
    renderBanner({
      title: "Could not load invoices",
      description: "An unexpected error occurred.",
      actionLabel: "Try again",
      onAction: jest.fn(),
    });
    expect(screen.getByText("Server error")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });

  it('app/invest/[id]/page.js pattern: variant="error", no actionLabel', () => {
    renderBanner({
      variant: "error",
      title: "Unable to load invoice details",
      description: "Unable to load invoice details right now.",
      previewLabel: "Invoice detail",
    });
    expect(screen.getByText("Error")).toBeInTheDocument();
    expect(screen.queryByText("Server error")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("app/error.js pattern: variant=server, custom actionLabel and onAction", async () => {
    const user = userEvent.setup();
    const reset = jest.fn();
    renderBanner({
      variant: "server",
      title: "Something went wrong",
      description: "An unexpected error occurred.",
      actionLabel: "Try again",
      previewLabel: "Error boundary",
      onAction: reset,
    });
    expect(screen.getByText("Server error")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it("components/InvoiceList.jsx pattern: no variant, no actionLabel", () => {
    renderBanner({
      title: "Unable to load invoices",
      description: "Something went wrong.",
      previewLabel: "Invoice list status",
    });
    expect(screen.getByText("Server error")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
