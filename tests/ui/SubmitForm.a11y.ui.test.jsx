/**
 * tests/ui/SubmitForm.a11y.ui.test.jsx
 *
 * Axe accessibility checks for the SubmitForm stepper in three states:
 *   1. default        — step 1 (Invoice details), no errors
 *   2. stepper-step2  — step 2 (Financing terms), no errors
 *   3. validation-error — step 1 with validation errors visible (aria-invalid,
 *                         role="alert" error spans)
 *
 * Mocks: createInvoice, next/link, next/navigation.
 * No network traffic is made.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { axe } from "./axe.js";
import SubmitForm from "@/app/submit/SubmitForm.jsx";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("next/link", () => ({
  default: ({ href, children, className, style, ...rest }) =>
    React.createElement("a", { href, className, style, ...rest }, children),
}));

// SubmitForm uses window.history.pushState and window.location.search directly;
// no next/navigation hooks are called, so no router mock is needed.

vi.mock("@/lib/api", () => ({
  createInvoice: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Wrap the form in a minimal page scaffold so landmark rules pass.
 * SubmitForm renders a <section> with a container inside; wrapping in <main>
 * gives axe the required landmark context.
 */
function renderForm() {
  return render(
    <main id="main">
      <SubmitForm />
    </main>,
  );
}

beforeEach(() => {
  // Clear any sessionStorage draft left by a previous test.
  try {
    window.sessionStorage.clear();
  } catch {
    // ignore
  }
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("SubmitForm a11y", () => {
  it("has no axe violations on step 1 (default state)", async () => {
    const { container } = renderForm();

    // Step 1 heading is rendered synchronously.
    expect(screen.getByRole("heading", { name: /Step 1 of 3/i })).toBeInTheDocument();

    expect(await axe(container)).toHaveNoViolations();
  });

  it("has no axe violations on step 2 (financing terms)", async () => {
    const user = userEvent.setup();
    const { container } = renderForm();

    // Fill required step-1 fields and advance.
    await user.type(screen.getByLabelText(/Company name/i), "Acme Ltd");
    await user.type(screen.getByLabelText(/Debtor/i), "Globex Corp");
    await user.type(screen.getByLabelText(/Amount/i), "25000");
    await user.click(screen.getByRole("button", { name: /Next/i }));

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: /Step 2 of 3/i })).toBeInTheDocument(),
    );

    expect(await axe(container)).toHaveNoViolations();
  });

  it("has no axe violations when validation errors are displayed (step 1)", async () => {
    const user = userEvent.setup();
    const { container } = renderForm();

    // Click Next without filling anything — triggers required-field errors.
    await user.click(screen.getByRole("button", { name: /Next/i }));

    // Errors should now be visible (role="alert" spans).
    await waitFor(() =>
      expect(container.querySelector('[role="alert"]')).toBeTruthy(),
    );

    expect(await axe(container)).toHaveNoViolations();
  });
});
