/**
 * ErrorBanner — actionLabel and variant label tests (#419)
 *
 * Covers:
 *   1. Variant label matrix (server, validation, error, unknown/fallback)
 *   2. actionLabel rendered correctly as button text
 *   3. No action button when actionLabel is omitted
 *   4. onAction callback wired to the action button
 *   5. Accessible name of the action button equals actionLabel
 *   6. previewLabel badge rendered
 *   7. title / description / details rendered unchanged
 *   8. role="alert" + aria-live="assertive" present
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import ErrorBanner from "./ErrorBanner";

// ---------------------------------------------------------------------------
// Variant label matrix
// ---------------------------------------------------------------------------

describe("variant label", () => {
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

  it("does not show any other variant label when variant=error", () => {
    render(
      <ErrorBanner variant="error" title="Load failed" description="Could not load details." />
    );
    expect(screen.queryByText("Server error")).not.toBeInTheDocument();
    expect(screen.queryByText("Validation error")).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// actionLabel rendering
// ---------------------------------------------------------------------------

describe("actionLabel", () => {
  it("renders a button whose text equals the actionLabel prop", () => {
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

  it("renders the exact custom actionLabel text, not a hard-coded fallback", () => {
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
    // Confirm the old hard-coded text is absent
    expect(screen.queryByRole("button", { name: /retry/i })).not.toBeInTheDocument();
  });

  it("hides the action button when actionLabel is omitted", () => {
    render(<ErrorBanner title="Oops" description="Something went wrong." />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("hides the action button when actionLabel is an empty string", () => {
    render(<ErrorBanner title="Oops" description="Something went wrong." actionLabel="" />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// onAction callback
// ---------------------------------------------------------------------------

describe("onAction callback", () => {
  it("fires onAction when the action button is clicked", async () => {
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
});

// ---------------------------------------------------------------------------
// Content rendering
// ---------------------------------------------------------------------------

describe("content rendering", () => {
  it("renders the title", () => {
    render(<ErrorBanner title="Load failed" description="Could not reach API." />);
    expect(screen.getByRole("heading", { name: "Load failed" })).toBeInTheDocument();
  });

  it("renders the description", () => {
    render(<ErrorBanner title="Load failed" description="Could not reach API." />);
    expect(screen.getByText("Could not reach API.")).toBeInTheDocument();
  });

  it("renders details when provided", () => {
    render(
      <ErrorBanner title="Load failed" description="Could not reach API." details="Status 500" />
    );
    expect(screen.getByText("Status 500")).toBeInTheDocument();
  });

  it("omits the details paragraph when details prop is absent", () => {
    render(<ErrorBanner title="Load failed" description="Could not reach API." />);
    expect(screen.queryByText(/status/i)).not.toBeInTheDocument();
  });

  it("renders the previewLabel badge", () => {
    render(<ErrorBanner title="Oops" description="Fail." previewLabel="Invoice detail" />);
    expect(screen.getByText("Invoice detail")).toBeInTheDocument();
  });

  it('renders the default "Preview only" badge when previewLabel is omitted', () => {
    render(<ErrorBanner title="Oops" description="Fail." />);
    expect(screen.getByText("Preview only")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// ARIA / accessibility
// ---------------------------------------------------------------------------

describe("accessibility", () => {
  it('has role="alert"', () => {
    render(<ErrorBanner title="Oops" description="Something went wrong." />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it('has aria-live="assertive" on the alert container', () => {
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

  it("passes axe accessibility audit with action button (server variant)", async () => {
    const { container } = render(
      <ErrorBanner
        variant="server"
        title="Load failed"
        description="Could not reach API."
        actionLabel="Try again"
        onAction={() => {}}
      />
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it("passes axe accessibility audit with validation variant", async () => {
    const { container } = render(
      <ErrorBanner
        variant="validation"
        title="Invalid input"
        description="Please correct the form."
        actionLabel="Fix errors"
        onAction={() => {}}
      />
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it("passes axe accessibility audit with error variant", async () => {
    const { container } = render(
      <ErrorBanner
        variant="error"
        title="Unable to load invoice details"
        description="Could not retrieve invoice."
        previewLabel="Invoice detail"
      />
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
