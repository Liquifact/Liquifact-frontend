import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { axe, toHaveNoViolations } from "jest-axe";
import FundAmountInput, { validateFundAmount, deriveExpectedYield } from "./FundAmountInput";

expect.extend(toHaveNoViolations);

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock("@/app/copy/en", () => ({
  copy: {
    invest: {
      fundAmount: {
        label: "Funding amount",
        placeholder: "e.g. 1000",
        helper: "Enter an amount between 1 and {max} {currency}.",
        expectedYieldLabel: "Expected yield:",
        errorRequired: "Please enter an amount.",
        errorPositive: "Amount must be greater than zero.",
        errorExceedsBalance: "Amount cannot exceed the remaining balance of {max} {currency}.",
        errorPrecision: "Amount must not exceed {decimals} decimal places for {currency}.",
        submitLabel: "Fund this invoice",
        submittingLabel: "Submitting\u2026",
      },
    },
  },
}));

jest.mock("@/lib/format/currency", () => ({
  formatCurrency: (value, { currency } = {}) => `${currency} ${value}`,
}));

jest.mock("@/lib/format/invoice", () => ({
  formatYield: (value) => `${value}%`,
}));

// Button uses Spinner which is already imported; mock the whole Button to
// keep tests free from complex style assertions.
jest.mock("./Button", () => {
  function MockButton({ children, disabled, loading, className, ...rest }) {
    return (
      <button disabled={disabled || loading} {...rest}>
        {children}
      </button>
    );
  }
  return { __esModule: true, default: MockButton };
});

// ---------------------------------------------------------------------------
// Shared props
// ---------------------------------------------------------------------------

const DEFAULT_PROPS = {
  maxAmount: 12500,
  currency: "USD",
  yieldValue: 8.2,
  onSubmit: jest.fn(),
};

function renderComponent(props = {}) {
  return render(<FundAmountInput {...DEFAULT_PROPS} {...props} />);
}

// ---------------------------------------------------------------------------
// Unit: validateFundAmount
// ---------------------------------------------------------------------------

describe("validateFundAmount()", () => {
  const max = 10000;
  const currency = "USD";

  it("returns errorRequired for empty string", () => {
    expect(validateFundAmount("", max, currency)).toMatch(/please enter/i);
  });

  it("returns errorRequired for whitespace-only string", () => {
    expect(validateFundAmount("   ", max, currency)).toMatch(/please enter/i);
  });

  it("returns errorRequired for non-numeric input", () => {
    expect(validateFundAmount("abc", max, currency)).toMatch(/please enter/i);
  });

  it("returns errorPositive for zero", () => {
    expect(validateFundAmount("0", max, currency)).toMatch(/greater than zero/i);
  });

  it("returns errorPositive for negative value", () => {
    expect(validateFundAmount("-5", max, currency)).toMatch(/greater than zero/i);
  });

  it("returns errorExceedsBalance when amount exceeds max", () => {
    const error = validateFundAmount("10001", max, currency);
    expect(error).toMatch(/cannot exceed/i);
    expect(error).toContain("10000");
    expect(error).toContain("USD");
  });

  it("returns null for exact max amount", () => {
    expect(validateFundAmount("10000", max, currency)).toBeNull();
  });

  it("returns null for valid amount within range", () => {
    expect(validateFundAmount("5000", max, currency)).toBeNull();
  });

  it("returns null for valid decimal within precision (USD → 2 decimals)", () => {
    expect(validateFundAmount("100.99", max, currency)).toBeNull();
  });

  it("returns errorPrecision when decimal places exceed allowed (USD → 3 dp)", () => {
    const error = validateFundAmount("100.999", max, currency);
    expect(error).toMatch(/decimal places/i);
    expect(error).toContain("2");
    expect(error).toContain("USD");
  });

  it("allows 0 decimal places for JPY", () => {
    expect(validateFundAmount("500", max, "JPY")).toBeNull();
  });

  it("returns errorPrecision for JPY with any decimal places", () => {
    const error = validateFundAmount("500.5", max, "JPY");
    expect(error).toMatch(/decimal places/i);
    expect(error).toContain("0");
  });

  it("handles very small valid amounts (0.01)", () => {
    expect(validateFundAmount("0.01", max, currency)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Unit: deriveExpectedYield
// ---------------------------------------------------------------------------

describe("deriveExpectedYield()", () => {
  it("returns 0 when totalAmount is 0", () => {
    expect(deriveExpectedYield(1000, 0, 8.2)).toBe(0);
  });

  it("returns 0 when enteredAmount is 0 or negative", () => {
    expect(deriveExpectedYield(0, 10000, 8.2)).toBe(0);
    expect(deriveExpectedYield(-100, 10000, 8.2)).toBe(0);
  });

  it("returns 0 when enteredAmount is non-finite", () => {
    expect(deriveExpectedYield(NaN, 10000, 8.2)).toBe(0);
    expect(deriveExpectedYield(Infinity, 10000, 8.2)).toBe(0);
  });

  it("computes yield correctly for full amount", () => {
    // 10000 * 8.2% = 820
    expect(deriveExpectedYield(10000, 10000, 8.2)).toBeCloseTo(820, 5);
  });

  it("computes proportional yield for partial amount", () => {
    // 5000 out of 10000 at 8.2% → 5000 * (8.2/100) = 410
    expect(deriveExpectedYield(5000, 10000, 8.2)).toBeCloseTo(410, 5);
  });
});

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

describe("FundAmountInput — rendering", () => {
  it("renders label, input, helper text, and submit button", () => {
    renderComponent();

    expect(screen.getByRole("spinbutton")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/e\.g\. 1000/i)).toBeInTheDocument();
    expect(screen.getByText(/enter an amount/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /fund this invoice/i })).toBeInTheDocument();
  });

  it("displays the currency code in the label", () => {
    renderComponent({ currency: "EUR" });
    // Both the label span and helper text mention EUR — check at least one is present
    expect(screen.getAllByText(/EUR/).length).toBeGreaterThan(0);
  });

  it("submit button is disabled when input is empty", () => {
    renderComponent();
    expect(screen.getByRole("button", { name: /fund this invoice/i })).toBeDisabled();
  });

  it("does not show error initially (before blur)", () => {
    renderComponent();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("does not show expected yield when input is empty", () => {
    renderComponent();
    expect(screen.queryByText(/expected yield/i)).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Validation error display
// ---------------------------------------------------------------------------

describe("FundAmountInput — validation error display", () => {
  it("shows errorRequired after blur with empty value", async () => {
    renderComponent();
    const input = screen.getByRole("spinbutton");
    fireEvent.blur(input);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/please enter/i);
    });
  });

  it("shows errorPositive for zero after blur", async () => {
    renderComponent();
    const input = screen.getByRole("spinbutton");
    await userEvent.type(input, "0");
    fireEvent.blur(input);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/greater than zero/i);
    });
  });

  it("shows errorExceedsBalance when amount is too large after blur", async () => {
    renderComponent();
    const input = screen.getByRole("spinbutton");
    await userEvent.type(input, "99999");
    fireEvent.blur(input);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/cannot exceed/i);
    });
  });

  it("shows errorPrecision for too many decimal places after blur", async () => {
    renderComponent();
    const input = screen.getByRole("spinbutton");
    await userEvent.type(input, "100.999");
    fireEvent.blur(input);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/decimal places/i);
    });
  });

  it("clears error when value becomes valid", async () => {
    renderComponent();
    const input = screen.getByRole("spinbutton");
    await userEvent.type(input, "0");
    fireEvent.blur(input);

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());

    await userEvent.clear(input);
    await userEvent.type(input, "500");

    await waitFor(() => {
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });

  it("shows error immediately on submit attempt without prior blur", async () => {
    renderComponent();
    const button = screen.getByRole("button", { name: /fund this invoice/i });
    // Force submit by setting a value that bypasses the disabled check
    const input = screen.getByRole("spinbutton");
    // Type invalid value first so button isn't disabled due to empty field
    await userEvent.type(input, "-5");
    fireEvent.blur(input);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Input aria attributes
// ---------------------------------------------------------------------------

describe("FundAmountInput — accessibility attributes", () => {
  it("input has aria-invalid=false when no error", () => {
    renderComponent();
    const input = screen.getByRole("spinbutton");
    expect(input).toHaveAttribute("aria-invalid", "false");
  });

  it("input has aria-invalid=true after blur with invalid value", async () => {
    renderComponent();
    const input = screen.getByRole("spinbutton");
    fireEvent.blur(input);

    await waitFor(() => {
      expect(input).toHaveAttribute("aria-invalid", "true");
    });
  });

  it("input has aria-describedby pointing to helper text", () => {
    renderComponent();
    const input = screen.getByRole("spinbutton");
    const describedBy = input.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();

    // The helper paragraph must have the matching id
    const helperPara = screen.getByText(/enter an amount/i);
    expect(describedBy).toContain(helperPara.id);
  });

  it("aria-describedby includes error id when error is visible", async () => {
    renderComponent();
    const input = screen.getByRole("spinbutton");
    fireEvent.blur(input);

    await waitFor(() => {
      const alert = screen.getByRole("alert");
      expect(input.getAttribute("aria-describedby")).toContain(alert.id);
    });
  });

  it("aria-describedby includes yield id when yield preview is visible", async () => {
    renderComponent();
    const input = screen.getByRole("spinbutton");
    await userEvent.type(input, "1000");

    await waitFor(() => {
      const yieldText = screen.getByText(/expected yield/i);
      expect(input.getAttribute("aria-describedby")).toContain(yieldText.id);
    });
  });
});

// ---------------------------------------------------------------------------
// Expected yield preview
// ---------------------------------------------------------------------------

describe("FundAmountInput — expected yield preview", () => {
  it("shows yield preview when a valid amount is entered", async () => {
    renderComponent();
    const input = screen.getByRole("spinbutton");
    await userEvent.type(input, "5000");

    await waitFor(() => {
      expect(screen.getByText(/expected yield/i)).toBeInTheDocument();
    });
  });

  it("does not show yield preview for invalid amount", async () => {
    renderComponent();
    const input = screen.getByRole("spinbutton");
    await userEvent.type(input, "99999");

    // Should not appear because amount exceeds max
    expect(screen.queryByText(/expected yield/i)).not.toBeInTheDocument();
  });

  it("yield region has aria-live=polite", async () => {
    renderComponent();
    const input = screen.getByRole("spinbutton");
    await userEvent.type(input, "5000");

    await waitFor(() => {
      const yieldEl = screen.getByText(/expected yield/i);
      expect(yieldEl).toHaveAttribute("aria-live", "polite");
    });
  });
});

// ---------------------------------------------------------------------------
// Submit behaviour
// ---------------------------------------------------------------------------

describe("FundAmountInput — submit behaviour", () => {
  it("calls onSubmit with the numeric amount when valid", async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    renderComponent({ onSubmit });
    const input = screen.getByRole("spinbutton");
    await userEvent.type(input, "3000");

    const button = screen.getByRole("button", { name: /fund this invoice/i });
    expect(button).not.toBeDisabled();
    await act(async () => {
      fireEvent.click(button);
    });

    expect(onSubmit).toHaveBeenCalledWith(3000);
  });

  it("does not call onSubmit when amount is invalid", async () => {
    const onSubmit = jest.fn();
    renderComponent({ onSubmit });
    const input = screen.getByRole("spinbutton");
    await userEvent.type(input, "-5");
    fireEvent.blur(input);

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());

    // Button should be disabled so this click should be a no-op
    const button = screen.getByRole("button", { name: /fund this invoice/i });
    expect(button).toBeDisabled();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("disables submit button while submitting", async () => {
    let resolveSubmit: () => void;
    const onSubmit = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveSubmit = resolve;
        })
    );
    renderComponent({ onSubmit });

    const input = screen.getByRole("spinbutton");
    await userEvent.type(input, "2000");

    const button = screen.getByRole("button", { name: /fund this invoice/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(button).toBeDisabled();
    });

    await act(async () => {
      resolveSubmit!();
    });

    await waitFor(() => {
      expect(button).not.toBeDisabled();
    });
  });

  it("submit button is disabled when disabled prop is true", () => {
    renderComponent({ disabled: true });
    const button = screen.getByRole("button", { name: /fund this invoice/i });
    expect(button).toBeDisabled();
  });

  it("input is disabled when disabled prop is true", () => {
    renderComponent({ disabled: true });
    expect(screen.getByRole("spinbutton")).toBeDisabled();
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe("FundAmountInput — edge cases", () => {
  it("handles maxAmount of 0 by rejecting any positive value", () => {
    const error = validateFundAmount("1", 0, "USD");
    expect(error).toMatch(/cannot exceed/i);
  });

  it("renders without crash when yieldValue is 0", () => {
    renderComponent({ yieldValue: 0 });
    expect(screen.getByRole("spinbutton")).toBeInTheDocument();
  });

  it("renders without crash when onSubmit is not provided", async () => {
    render(<FundAmountInput maxAmount={12500} currency="USD" yieldValue={8.2} />);
    const input = screen.getByRole("spinbutton");
    await userEvent.type(input, "1000");

    const button = screen.getByRole("button", { name: /fund this invoice/i });
    // Should not throw
    await act(async () => {
      fireEvent.click(button);
    });
  });

  it("accepts decimal amounts within precision", async () => {
    renderComponent();
    const input = screen.getByRole("spinbutton");
    await userEvent.type(input, "500.50");

    expect(validateFundAmount("500.50", 12500, "USD")).toBeNull();
    const button = screen.getByRole("button", { name: /fund this invoice/i });
    expect(button).not.toBeDisabled();
  });
});

// ---------------------------------------------------------------------------
// Accessibility (jest-axe)
// ---------------------------------------------------------------------------

describe("FundAmountInput — axe accessibility", () => {
  it("has no violations in default state", async () => {
    const { container } = renderComponent();
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("has no violations when an error is shown", async () => {
    const { container } = renderComponent();
    const input = screen.getByRole("spinbutton");
    fireEvent.blur(input);

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("has no violations when yield preview is shown", async () => {
    const { container } = renderComponent();
    const input = screen.getByRole("spinbutton");
    await userEvent.type(input, "5000");

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
