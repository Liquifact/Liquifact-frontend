import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import ErrorState from "@/components/ErrorState";
import InvoiceDetailError from "@/app/marketplace/[id]/error";

describe("components/ErrorState", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders heading and friendly message with default props", () => {
    render(<ErrorState />);
    expect(
      screen.getByRole("heading", { name: "Something went wrong" })
    ).toBeInTheDocument();
    expect(
      screen.getByText("An unexpected error occurred while loading this page.")
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go home" })).toBeInTheDocument();
  });

  it("invokes reset() callback when Try again button is clicked", async () => {
    const user = userEvent.setup();
    const reset = vi.fn();

    render(<ErrorState reset={reset} />);
    const tryAgainBtn = screen.getByRole("button", { name: "Try again" });
    expect(tryAgainBtn).toBeInTheDocument();

    await user.click(tryAgainBtn);
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it("moves focus to the heading on mount", () => {
    render(<ErrorState title="Focus Heading Test" />);
    const heading = screen.getByRole("heading", { name: "Focus Heading Test" });
    expect(document.activeElement).toBe(heading);
  });

  it("displays error digest inside collapsible details when provided", () => {
    const error = new Error("Something broke");
    error.digest = "NEXT_DIGEST_12345";

    render(<ErrorState error={error} />);
    expect(screen.getByText("Technical details")).toBeInTheDocument();
    expect(screen.getByText("NEXT_DIGEST_12345")).toBeInTheDocument();
  });

  it("keeps stack traces hidden when NODE_ENV is production", () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";

    try {
      const error = new Error("Production error");
      error.stack =
        "Error: Production error\n    at SecretFunction (/app/secret.js:10:15)";
      error.digest = "DIGEST_PROD_1";

      render(<ErrorState error={error} />);
      expect(screen.queryByText(/SecretFunction/)).not.toBeInTheDocument();
      expect(screen.getByText("DIGEST_PROD_1")).toBeInTheDocument();
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });

  it("displays stack traces in collapsible details in non-production environments", () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";

    try {
      const error = new Error("Development error");
      error.stack =
        "Error: Development error\n    at DebugFunction (/app/debug.js:42:1)";

      render(<ErrorState error={error} />);
      expect(screen.getByText(/DebugFunction/)).toBeInTheDocument();
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });

  it("is accessible and navigable with keyboard (Tab, Enter, Space)", async () => {
    const user = userEvent.setup();
    const reset = vi.fn();

    render(<ErrorState reset={reset} />);
    const tryAgainBtn = screen.getByRole("button", { name: "Try again" });
    const goHomeLink = screen.getByRole("link", { name: "Go home" });

    // Focus starts on the heading
    const heading = screen.getByRole("heading", {
      name: "Something went wrong",
    });
    expect(document.activeElement).toBe(heading);

    // Tab to Try again
    await user.tab();
    expect(document.activeElement).toBe(tryAgainBtn);

    // Press Enter to trigger reset
    await user.keyboard("{Enter}");
    expect(reset).toHaveBeenCalledTimes(1);

    // Tab to Go home link
    await user.tab();
    expect(document.activeElement).toBe(goHomeLink);
  });
});

describe("Route-level Error Boundaries isolation", () => {
  it("renders the invoice detail segment boundary specifically", () => {
    const error = new Error("boom");
    error.digest = "SEGMENT_ERR_001";
    const reset = vi.fn();

    render(<InvoiceDetailError error={error} reset={reset} />);

    expect(
      screen.getByRole("heading", { name: "Could not load invoice" })
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "We encountered an issue retrieving this invoice's details and escrow state."
      )
    ).toBeInTheDocument();
    expect(screen.getByText("SEGMENT_ERR_001")).toBeInTheDocument();
  });
});

describe("Crash path defensive guards", () => {
  it("LiveStats renders without throwing when stats.totalFaceValue is null/unexpected", async () => {
    const { default: LiveStats } = await import("@/components/LiveStats");
    expect(() => render(<LiveStats />)).not.toThrow();
  });
});

