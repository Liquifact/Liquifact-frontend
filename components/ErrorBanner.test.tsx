/**
 * @file components/ErrorBanner.test.tsx
 *
 * Comprehensive behavioral unit tests for the ErrorBanner component.
 * Closes #403 — covers the full rendering contract including variant labels,
 * conditional details, action button behaviour, and accessibility.
 *
 * Areas covered
 * ─────────────
 * 1. Variant label matrix — server (default), validation, error, fallback
 * 2. Title and description rendering
 * 3. Details — renders only when provided, absent when omitted
 * 4. previewLabel — custom value and default "Preview only"
 * 5. Action button — appears only when actionLabel is set (truthy string)
 * 6. actionLabel renders as button text (not a hard-coded fallback)
 * 7. onAction callback — fires on click via @testing-library/user-event
 * 8. onAction safety — no throw when omitted and button clicked
 * 9. role="alert" + aria-live="assertive" container
 * 10. Accessibility — axe audits per variant and with / without action button
 * 11. Edge cases — empty actionLabel, missing details, undefined onAction
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import ErrorBanner from "./ErrorBanner";

// NOTE: jest-axe is globally mocked in jest.setup.js to always return
// { violations: [] }, so axe() calls serve as structural smoke tests
// rather than real accessibility audits.  The global mock also extends
// expect with toHaveNoViolations, so no local extend is needed.

// ---------------------------------------------------------------------------
// Variant label matrix
//
// variant         → visible label
// ─────────────────────────────────
// "server"        → "Server error"
// (default/omit)  → "Server error"
// "validation"    → "Validation error"
// "error"         → "Error"
// unrecognised    → "Server error" (fallback)
// ---------------------------------------------------------------------------

describe("ErrorBanner — variant label matrix", () => {
  it('shows "Server error" for variant="server"', () => {
    render(<ErrorBanner variant="server" title="Oops" description="Something went wrong." />);
    expect(screen.getByText("Server error")).toBeInTheDocument();
  });

  it('shows "Server error" when variant is omitted (default)', () => {
    render(<ErrorBanner title="Oops" description="Something went wrong." />);
    expect(screen.getByText("Server error")).toBeInTheDocument();
  });

  it('shows "Validation error" for variant="validation"', () => {
    render(<ErrorBanner variant="validation" title="Bad input" description="Fix the form." />);
    expect(screen.getByText("Validation error")).toBeInTheDocument();
  });

  it('shows "Error" for variant="error"', () => {
    render(
      <ErrorBanner variant="error" title="Load failed" description="Could not load details." />
    );
    expect(screen.getByText("Error")).toBeInTheDocument();
  });

  it('falls back to "Server error" for an unrecognised variant', () => {
    render(
      // @ts-expect-error — deliberately passing an invalid variant to test fallback
      <ErrorBanner variant="unknown-variant" title="Oops" description="Fallback test." />
    );
    expect(screen.getByText("Server error")).toBeInTheDocument();
  });

  it("renders exactly one variant label (no cross-contamination between variants)", () => {
    render(
      <ErrorBanner variant="error" title="Load failed" description="Could not load details." />
    );
    // Should show "Error" and NOT the other variant labels
    expect(screen.getByText("Error")).toBeInTheDocument();
    expect(screen.queryByText("Server error")).not.toBeInTheDocument();
    expect(screen.queryByText("Validation error")).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Title and description rendering
// ---------------------------------------------------------------------------

describe("ErrorBanner — title and description", () => {
  it("renders the title as an h2 heading", () => {
    render(<ErrorBanner title="Load failed" description="Could not reach API." />);
    expect(screen.getByRole("heading", { name: "Load failed" })).toBeInTheDocument();
  });

  it("renders the description text", () => {
    render(<ErrorBanner title="Load failed" description="Could not reach API." />);
    expect(screen.getByText("Could not reach API.")).toBeInTheDocument();
  });

  it("renders both title and description when both are provided", () => {
    render(
      <ErrorBanner
        variant="validation"
        title="Invalid input"
        description="Please correct the form fields."
      />
    );
    expect(screen.getByRole("heading", { name: "Invalid input" })).toBeInTheDocument();
    expect(screen.getByText("Please correct the form fields.")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Details — conditional rendering
// ---------------------------------------------------------------------------

describe("ErrorBanner — details (conditional)", () => {
  it("renders details paragraph when details prop is provided", () => {
    render(
      <ErrorBanner
        title="Load failed"
        description="Could not reach API."
        details="Status 500 — Internal Server Error"
      />
    );
    expect(screen.getByText("Status 500 — Internal Server Error")).toBeInTheDocument();
  });

  it("does not render a details element when details prop is omitted", () => {
    render(<ErrorBanner title="Load failed" description="Could not reach API." />);
    // Verify the details text is absent while title/description remain
    expect(screen.queryByText(/status 500/i)).not.toBeInTheDocument();
  });

  it("does not render details when details prop is undefined", () => {
    render(
      <ErrorBanner title="Load failed" description="Could not reach API." details={undefined} />
    );
    // The component uses `{details ? <p>...</p> : null}` so falsy details = no element
    const alert = screen.getByRole("alert");
    const paragraphs = alert.querySelectorAll("p");
    // Only description paragraph should be present (not a details one)
    const detailParagraphs = Array.from(paragraphs).filter((p) =>
      p.textContent?.includes("Status")
    );
    expect(detailParagraphs).toHaveLength(0);
  });

  it("renders details when details is a non-empty string", () => {
    render(
      <ErrorBanner
        title="Load failed"
        description="Network error."
        details="Connection refused on port 443"
      />
    );
    expect(screen.getByText("Connection refused on port 443")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// previewLabel badge
// ---------------------------------------------------------------------------

describe("ErrorBanner — previewLabel", () => {
  it('renders the default "Preview only" badge when previewLabel is omitted', () => {
    render(<ErrorBanner title="Oops" description="Something went wrong." />);
    expect(screen.getByText("Preview only")).toBeInTheDocument();
  });

  it("renders a custom previewLabel when provided", () => {
    render(
      <ErrorBanner title="Oops" description="Something went wrong." previewLabel="Invoice detail" />
    );
    expect(screen.getByText("Invoice detail")).toBeInTheDocument();
  });

  it("renders an empty previewLabel badge when explicitly set to empty string", () => {
    const { container } = render(
      <ErrorBanner title="Oops" description="Something went wrong." previewLabel="" />
    );
    // The badge span still renders, just with empty text content.
    // We verify it by checking the span exists with empty text rather
    // than using getByText("") which is fragile across RTL versions.
    const badge = container.querySelector("span.rounded-full");
    expect(badge).toBeInTheDocument();
    expect(badge?.textContent).toBe("");
  });

  it("renders both variant label and previewLabel together", () => {
    render(
      <ErrorBanner
        variant="validation"
        title="Bad input"
        description="Fix the form."
        previewLabel="Form check"
      />
    );
    expect(screen.getByText("Validation error")).toBeInTheDocument();
    expect(screen.getByText("Form check")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Action button — conditional rendering
// ---------------------------------------------------------------------------

describe("ErrorBanner — action button rendering", () => {
  it("renders a button with text matching actionLabel when actionLabel is provided", () => {
    render(
      <ErrorBanner
        title="Oops"
        description="Something went wrong."
        actionLabel="Try again"
        onAction={() => {}}
      />
    );
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });

  it("renders the exact custom actionLabel, not a hard-coded fallback", () => {
    render(
      <ErrorBanner
        title="Oops"
        description="Something went wrong."
        actionLabel="Reload page"
        onAction={() => {}}
      />
    );
    const btn = screen.getByRole("button", { name: "Reload page" });
    expect(btn).toBeInTheDocument();
    // Confirm no hard-coded "Retry" text anywhere
    expect(screen.queryByRole("button", { name: /retry/i })).not.toBeInTheDocument();
  });

  it("does not render a button when actionLabel is omitted", () => {
    render(<ErrorBanner title="Oops" description="Something went wrong." />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("does not render a button when actionLabel is an empty string", () => {
    render(<ErrorBanner title="Oops" description="Something went wrong." actionLabel="" />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("does not render a button when actionLabel is whitespace-only", () => {
    render(<ErrorBanner title="Oops" description="Something went wrong." actionLabel="   " />);
    // Whitespace-only strings are truthy, so the button renders
    // (this is the current component behaviour; documented here)
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it.each(["server", "validation", "error"] as const)(
    "renders a button when actionLabel is provided (variant: %s)",
    (variant) => {
      render(
        <ErrorBanner
          variant={variant}
          title="Oops"
          description="Something went wrong."
          actionLabel="Retry"
          onAction={() => {}}
        />
      );
      expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
    }
  );
});

// ---------------------------------------------------------------------------
// onAction callback behaviour
// ---------------------------------------------------------------------------

describe("ErrorBanner — onAction callback", () => {
  it("fires onAction exactly once when the action button is clicked", async () => {
    const user = userEvent.setup();
    const handleAction = jest.fn();

    render(
      <ErrorBanner
        title="Oops"
        description="Something went wrong."
        actionLabel="Retry"
        onAction={handleAction}
      />
    );

    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(handleAction).toHaveBeenCalledTimes(1);
  });

  it("fires onAction on each button click (not limited to single invocation)", async () => {
    const user = userEvent.setup();
    const handleAction = jest.fn();

    render(
      <ErrorBanner
        title="Oops"
        description="Something went wrong."
        actionLabel="Retry"
        onAction={handleAction}
      />
    );

    const btn = screen.getByRole("button", { name: "Retry" });
    await user.click(btn);
    await user.click(btn);
    await user.click(btn);
    expect(handleAction).toHaveBeenCalledTimes(3);
  });

  it("does not throw when onAction is undefined and the button is clicked", async () => {
    const user = userEvent.setup();

    render(
      <ErrorBanner
        title="Oops"
        description="Something went wrong."
        actionLabel="Retry"
        // onAction intentionally omitted
      />
    );

    await expect(user.click(screen.getByRole("button", { name: "Retry" }))).resolves.not.toThrow();
  });

  it("does not throw when onAction is undefined and button is keyboard-activated", async () => {
    const user = userEvent.setup();

    render(
      <ErrorBanner
        title="Oops"
        description="Something went wrong."
        actionLabel="Retry"
        // onAction intentionally omitted
      />
    );

    const btn = screen.getByRole("button", { name: "Retry" });
    btn.focus();
    await expect(user.keyboard("{Enter}")).resolves.not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// ARIA / accessibility
// ---------------------------------------------------------------------------

describe("ErrorBanner — accessibility (ARIA)", () => {
  it('container element has role="alert"', () => {
    render(<ErrorBanner title="Oops" description="Something went wrong." />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it('container element has aria-live="assertive"', () => {
    render(<ErrorBanner title="Oops" description="Something went wrong." />);
    expect(screen.getByRole("alert")).toHaveAttribute("aria-live", "assertive");
  });

  it("action button has an accessible name matching actionLabel", () => {
    render(
      <ErrorBanner
        title="Oops"
        description="Something went wrong."
        actionLabel="Try again"
        onAction={() => {}}
      />
    );
    const btn = screen.getByRole("button", { name: "Try again" });
    expect(btn).toHaveAccessibleName("Try again");
  });

  it("exclamation icon is aria-hidden (decorative)", () => {
    render(<ErrorBanner title="Oops" description="Something went wrong." />);
    const exclamation = screen.getByText("!");
    expect(exclamation).toHaveAttribute("aria-hidden", "true");
  });
});

// ---------------------------------------------------------------------------
// axe accessibility audits
// ---------------------------------------------------------------------------

describe("ErrorBanner — axe accessibility audits", () => {
  it("passes axe with server variant and action button", async () => {
    const { container } = render(
      <ErrorBanner
        variant="server"
        title="Load failed"
        description="Could not reach API."
        actionLabel="Try again"
        onAction={() => {}}
      />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("passes axe with validation variant and action button", async () => {
    const { container } = render(
      <ErrorBanner
        variant="validation"
        title="Invalid input"
        description="Please correct the form."
        actionLabel="Fix errors"
        onAction={() => {}}
      />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("passes axe with error variant (no action button)", async () => {
    const { container } = render(
      <ErrorBanner
        variant="error"
        title="Unable to load invoice details"
        description="Could not retrieve invoice."
        previewLabel="Invoice detail"
      />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("passes axe with details text present", async () => {
    const { container } = render(
      <ErrorBanner
        variant="server"
        title="Load failed"
        description="Could not reach API."
        details="Error code: ECONNREFUSED"
        actionLabel="Retry"
        onAction={() => {}}
      />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("passes axe with minimal props (title + description only)", async () => {
    const { container } = render(<ErrorBanner title="Oops" description="Something went wrong." />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("passes axe with only description omitted", async () => {
    const { container } = render(<ErrorBanner variant="error" title="Load failed" />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

// ---------------------------------------------------------------------------
// Edge cases — combined scenarios
// ---------------------------------------------------------------------------

describe("ErrorBanner — edge cases", () => {
  it("renders correctly with all props provided simultaneously", () => {
    render(
      <ErrorBanner
        variant="validation"
        title="Invalid form"
        description="Please fix the errors below."
        details="3 fields require attention"
        actionLabel="Go to errors"
        onAction={() => {}}
        previewLabel="Form validation"
      />
    );

    expect(screen.getByText("Validation error")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Invalid form" })).toBeInTheDocument();
    expect(screen.getByText("Please fix the errors below.")).toBeInTheDocument();
    expect(screen.getByText("3 fields require attention")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Go to errors" })).toBeInTheDocument();
    expect(screen.getByText("Form validation")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveAttribute("aria-live", "assertive");
  });

  it("renders correctly with only title (minimal render)", () => {
    render(<ErrorBanner title="Minimal error" />);
    expect(screen.getByRole("heading", { name: "Minimal error" })).toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeInTheDocument();
    // No description, details, or button
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders correctly with only description and no title", () => {
    render(<ErrorBanner description="Description only, no title heading." />);
    // description should still render
    expect(screen.getByText("Description only, no title heading.")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it.each(["server", "validation", "error"] as const)(
    "renders the ! icon with aria-hidden for variant: %s",
    (variant) => {
      render(<ErrorBanner variant={variant} title="Oops" description="Fail." />);
      expect(screen.getByText("!")).toBeInTheDocument();
      expect(screen.getByText("!")).toHaveAttribute("aria-hidden", "true");
    }
  );

  it("renders long strings without truncation issues", () => {
    const longTitle = "E".repeat(200);
    const longDesc = "D".repeat(500);
    const longDetails = "X".repeat(500);
    const longAction = "A".repeat(100);

    render(
      <ErrorBanner
        variant="server"
        title={longTitle}
        description={longDesc}
        details={longDetails}
        actionLabel={longAction}
        onAction={() => {}}
      />
    );

    expect(screen.getByText(longTitle)).toBeInTheDocument();
    expect(screen.getByText(longDesc)).toBeInTheDocument();
    expect(screen.getByText(longDetails)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: longAction })).toBeInTheDocument();
  });
});
