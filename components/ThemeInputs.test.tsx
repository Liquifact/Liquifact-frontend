import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { axe, toHaveNoViolations } from "jest-axe";
import ThemeInputs, {
  THEME_OPTIONS,
  ACCENT_COLOUR_OPTIONS,
  validateThemeInputs,
} from "./ThemeInputs";

expect.extend(toHaveNoViolations);

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
// Shared helpers
// ---------------------------------------------------------------------------

const DEFAULT_PROPS = {
  initialTheme: "system",
  initialAccentColour: "cyan",
  onSubmit: jest.fn(),
};

function renderComponent(props = {}) {
  return render(<ThemeInputs {...DEFAULT_PROPS} {...props} />);
}

// ---------------------------------------------------------------------------
// Unit: validateThemeInputs
// ---------------------------------------------------------------------------

describe("validateThemeInputs()", () => {
  it("returns null errors for valid theme and accent colour", () => {
    expect(validateThemeInputs("light", "cyan")).toEqual({ theme: null, accentColour: null });
  });

  it("returns null errors for all valid theme options", () => {
    for (const t of THEME_OPTIONS) {
      expect(validateThemeInputs(t, "blue").theme).toBeNull();
    }
  });

  it("returns null errors for all valid accent colour options", () => {
    for (const c of ACCENT_COLOUR_OPTIONS) {
      expect(validateThemeInputs("dark", c).accentColour).toBeNull();
    }
  });

  it("returns error for empty theme string", () => {
    const errors = validateThemeInputs("", "cyan");
    expect(errors.theme).toBe("Please select a valid theme option (light, dark, or system).");
    expect(errors.accentColour).toBeNull();
  });

  it("returns error for invalid theme value", () => {
    const errors = validateThemeInputs("rainbow", "cyan");
    expect(errors.theme).toBe("Please select a valid theme option (light, dark, or system).");
  });

  it("returns error for invalid accent colour", () => {
    const errors = validateThemeInputs("system", "magenta");
    expect(errors.accentColour).toBe("Please select a valid accent colour.");
  });

  it("returns both errors when both values are invalid", () => {
    const errors = validateThemeInputs("neon", "magenta");
    expect(errors.theme).toBeTruthy();
    expect(errors.accentColour).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

describe("ThemeInputs — rendering", () => {
  it("renders both select labels, selects, helper texts, and submit button", () => {
    renderComponent();
    expect(screen.getByLabelText("Theme")).toBeInTheDocument();
    expect(screen.getByLabelText("Accent Colour")).toBeInTheDocument();
    expect(
      screen.getByText("Light, dark, or follow the operating system setting.")
    ).toBeInTheDocument();
    expect(screen.getByText("Accent colour used throughout the interface.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /save theme preferences/i })).toBeInTheDocument();
  });

  it("renders all theme options in the theme select", () => {
    renderComponent();
    const select = screen.getByLabelText("Theme");
    for (const opt of THEME_OPTIONS) {
      expect(
        screen.getByRole("option", { name: opt.charAt(0).toUpperCase() + opt.slice(1) })
      ).toBeInTheDocument();
    }
  });

  it("renders all accent colour options in the accent select", () => {
    renderComponent();
    for (const opt of ACCENT_COLOUR_OPTIONS) {
      expect(
        screen.getByRole("option", { name: opt.charAt(0).toUpperCase() + opt.slice(1) })
      ).toBeInTheDocument();
    }
  });

  it("sets the initial theme select value correctly", () => {
    renderComponent({ initialTheme: "dark" });
    expect(screen.getByLabelText("Theme")).toHaveValue("dark");
  });

  it("sets the initial accent colour select value correctly", () => {
    renderComponent({ initialAccentColour: "purple" });
    expect(screen.getByLabelText("Accent Colour")).toHaveValue("purple");
  });

  it("submit button is disabled when both fields are valid", () => {
    renderComponent();
    expect(screen.getByRole("button", { name: /save theme preferences/i })).not.toBeDisabled();
  });

  it("does not show error initially (before blur)", () => {
    renderComponent();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Validation error display
// ---------------------------------------------------------------------------

describe("ThemeInputs — validation error display", () => {
  it("shows theme error after setting an invalid value and blurring", async () => {
    renderComponent();
    const select = screen.getByLabelText("Theme");
    fireEvent.change(select, { target: { value: "invalid" } });
    fireEvent.blur(select);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/valid theme option/i);
    });
  });

  it("shows accent colour error after setting an invalid value and blurring", async () => {
    renderComponent();
    const select = screen.getByLabelText("Accent Colour");
    fireEvent.change(select, { target: { value: "invalid" } });
    fireEvent.blur(select);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/valid accent colour/i);
    });
  });

  it("blocks submit when theme is invalid", async () => {
    const onSubmit = jest.fn();
    renderComponent({ onSubmit });
    const select = screen.getByLabelText("Theme");
    fireEvent.change(select, { target: { value: "neon" } });
    fireEvent.blur(select);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    const button = screen.getByRole("button", { name: /save theme preferences/i });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("blocks submit when accent colour is invalid", async () => {
    const onSubmit = jest.fn();
    renderComponent({ onSubmit });
    const select = screen.getByLabelText("Accent Colour");
    fireEvent.change(select, { target: { value: "magenta" } });
    fireEvent.blur(select);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    const button = screen.getByRole("button", { name: /save theme preferences/i });
    expect(button).toBeDisabled();
  });

  it("shows both errors on direct form submit with invalid values", async () => {
    const onSubmit = jest.fn();
    renderComponent({ onSubmit });
    const themeSelect = screen.getByLabelText("Theme");
    const accentSelect = screen.getByLabelText("Accent Colour");
    const form = themeSelect.closest("form");

    fireEvent.change(themeSelect, { target: { value: "neon" } });
    fireEvent.change(accentSelect, { target: { value: "magenta" } });
    fireEvent.submit(form!);

    await waitFor(() => {
      const alerts = screen.getAllByRole("alert");
      expect(alerts.length).toBeGreaterThanOrEqual(2);
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Accessibility attributes
// ---------------------------------------------------------------------------

describe("ThemeInputs — accessibility attributes", () => {
  it("both selects have aria-invalid=false when no error", () => {
    renderComponent();
    expect(screen.getByLabelText("Theme")).toHaveAttribute("aria-invalid", "false");
    expect(screen.getByLabelText("Accent Colour")).toHaveAttribute("aria-invalid", "false");
  });

  it("theme select has aria-invalid=true after blur with invalid value", async () => {
    renderComponent();
    const select = screen.getByLabelText("Theme");
    fireEvent.change(select, { target: { value: "neon" } });
    fireEvent.blur(select);

    await waitFor(() => {
      expect(select).toHaveAttribute("aria-invalid", "true");
    });
  });

  it("both selects have aria-describedby pointing to helper text", () => {
    renderComponent();
    const themeSelect = screen.getByLabelText("Theme");
    const accentSelect = screen.getByLabelText("Accent Colour");

    const themeDescribedBy = themeSelect.getAttribute("aria-describedby");
    const accentDescribedBy = accentSelect.getAttribute("aria-describedby");

    expect(themeDescribedBy).toBeTruthy();
    expect(accentDescribedBy).toBeTruthy();

    expect(themeDescribedBy).toContain(screen.getByText(/light, dark, or follow/i).id);
    expect(accentDescribedBy).toContain(screen.getByText(/accent colour used/i).id);
  });

  it("aria-describedby includes error id when error is visible", async () => {
    renderComponent();
    const select = screen.getByLabelText("Theme");
    fireEvent.change(select, { target: { value: "neon" } });
    fireEvent.blur(select);

    await waitFor(() => {
      const alert = screen.getByRole("alert");
      expect(select.getAttribute("aria-describedby")).toContain(alert.id);
    });
  });

  it("error messages have role=alert and aria-live=polite", async () => {
    renderComponent();
    const select = screen.getByLabelText("Theme");
    fireEvent.change(select, { target: { value: "neon" } });
    fireEvent.blur(select);

    await waitFor(() => {
      const alert = screen.getByRole("alert");
      expect(alert).toHaveAttribute("aria-live", "polite");
    });
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe("ThemeInputs — edge cases", () => {
  it("renders without crash when onSubmit is not provided", async () => {
    render(<ThemeInputs />);
    const button = screen.getByRole("button", { name: /save theme preferences/i });
    expect(button).not.toBeDisabled();
    fireEvent.click(button);
  });

  it("renders without crash when disabled prop is true", () => {
    renderComponent({ disabled: true });
    expect(screen.getByLabelText("Theme")).toBeDisabled();
    expect(screen.getByLabelText("Accent Colour")).toBeDisabled();
    expect(screen.getByRole("button", { name: /save theme preferences/i })).toBeDisabled();
  });

  it("accepts valid theme change without showing error", async () => {
    renderComponent();
    const select = screen.getByLabelText("Theme");
    fireEvent.change(select, { target: { value: "light" } });
    fireEvent.blur(select);

    await waitFor(() => {
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
    expect(select).toHaveValue("light");
  });
});

// ---------------------------------------------------------------------------
// Accessibility (jest-axe)
// ---------------------------------------------------------------------------

describe("ThemeInputs — axe accessibility", () => {
  it("has no violations in default state", async () => {
    const { container } = renderComponent();
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("has no violations when an error is shown", async () => {
    const { container } = renderComponent();
    const select = screen.getByLabelText("Theme");
    fireEvent.change(select, { target: { value: "neon" } });
    fireEvent.blur(select);

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("has no violations when disabled", async () => {
    const { container } = renderComponent({ disabled: true });
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
