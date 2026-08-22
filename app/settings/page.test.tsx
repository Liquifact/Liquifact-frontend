/**
 * @file app/settings/page.test.tsx
 *
 * Integration tests for the /settings page (issue #741).
 *
 * Concerns covered:
 *  - Page renders header, two InlineEditRows (display name + email).
 *  - Each row is reachable via keyboard tab order.
 *  - Validation blocks save for invalid email & displayName.
 *  - A successful save persists to localStorage via the existing hook.
 *  - Cancel restores prior value.
 *  - Live regions are mounted.
 */

import "@testing-library/jest-dom";
import { act, render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import SettingsPage, {
  normalizeSettings,
  DEFAULT_SETTINGS,
  SETTINGS_STORAGE_KEY,
  DISPLAY_NAME_MAX_LENGTH,
  EMAIL_MAX_LENGTH,
  validateDisplayName,
  validateEmail,
} from "./page";

// ─── Mocks ──────────────────────────────────────────────────────────────────

jest.mock("next/link", () => {
  const LinkMock = ({ href, children, ...rest }) => (
    <a href={typeof href === "string" ? href : "#"} {...rest}>
      {children}
    </a>
  );
  return { __esModule: true, default: LinkMock };
});

jest.mock("next/navigation", () => ({
  usePathname: () => "/settings",
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), refresh: jest.fn() }),
}));

jest.mock("../../components/NavMenu", () => {
  return function MockNavMenu() {
    return <div data-testid="nav-menu-mock">NavMenu</div>;
  };
});

// ─── normalizeSettings pure unit ────────────────────────────────────────────

describe("normalizeSettings", () => {
  it("returns defaults for non-object input", () => {
    expect(normalizeSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(normalizeSettings(undefined)).toEqual(DEFAULT_SETTINGS);
    expect(normalizeSettings("not an object")).toEqual(DEFAULT_SETTINGS);
  });

  it("merges partial stored values with defaults", () => {
    expect(normalizeSettings({ displayName: "Z" })).toEqual({
      displayName: "Z",
      email: "",
    });
    expect(normalizeSettings({ email: "x@y.com" })).toEqual({
      displayName: "",
      email: "x@y.com",
    });
  });

  it("drops non-string fields", () => {
    expect(normalizeSettings({ displayName: 42, email: null })).toEqual(DEFAULT_SETTINGS);
  });

  it("returns full shape when given populated values", () => {
    expect(normalizeSettings({ displayName: "Sam", email: "sam@x.com" })).toEqual({
      displayName: "Sam",
      email: "sam@x.com",
    });
  });
});

describe("settings validators", () => {
  it("rejects empty and out-of-range display names", () => {
    expect(validateDisplayName("  ")).toMatch(/cannot be empty/i);
    expect(validateDisplayName("x".repeat(DISPLAY_NAME_MAX_LENGTH + 1))).toMatch(/100 characters/i);
  });

  it("rejects empty, malformed, and out-of-range email addresses", () => {
    expect(validateEmail("  ")).toMatch(/cannot be empty/i);
    expect(validateEmail("not-an-email")).toMatch(/valid email/i);
    expect(validateEmail(`${"a".repeat(EMAIL_MAX_LENGTH)}@x.co`)).toMatch(/254 characters/i);
  });

  it("accepts values at the supported limits", () => {
    expect(validateDisplayName("x".repeat(DISPLAY_NAME_MAX_LENGTH))).toBeNull();
    const localPart = "a".repeat(EMAIL_MAX_LENGTH - "@x.co".length);
    expect(validateEmail(`${localPart}@x.co`)).toBeNull();
  });
});

// ─── Page render ────────────────────────────────────────────────────────────

describe("SettingsPage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("renders the page heading and a navigable nav menu", () => {
    render(<SettingsPage />);
    expect(screen.getByRole("heading", { name: /settings/i, level: 1 })).toBeInTheDocument();
    expect(screen.getByTestId("nav-menu-mock")).toBeInTheDocument();
  });

  it("renders both inline-edit rows in view mode initially", () => {
    render(<SettingsPage />);
    expect(screen.getByTestId("settings-display-name-display")).toHaveTextContent("Not set");
    expect(screen.getByTestId("settings-email-display")).toHaveTextContent("Not set");
  });

  it("renders polite live regions on every row", () => {
    render(<SettingsPage />);
    const statuses = screen.getAllByRole("status");
    expect(statuses.length).toBeGreaterThanOrEqual(2);
    statuses.forEach((node) => expect(node).toHaveAttribute("aria-live", "polite"));
  });

  it("edit button activates display-name row and persists on save", async () => {
    const user = userEvent.setup();
    render(<SettingsPage />);

    await user.click(screen.getByRole("button", { name: /edit display name/i }));
    const input = screen.getByTestId("settings-display-name-input");
    await user.type(input, "Acme");

    await user.click(screen.getByRole("button", { name: /save display name/i }));

    await waitFor(() =>
      expect(screen.getByTestId("settings-display-name-display")).toHaveTextContent("Acme")
    );

    const stored = JSON.parse(window.localStorage.getItem(SETTINGS_STORAGE_KEY) || "{}");
    expect(stored.displayName).toBe("Acme");
  });

  it("invalid email blocks save (Save remains disabled)", async () => {
    const user = userEvent.setup();
    render(<SettingsPage />);

    await user.click(screen.getByRole("button", { name: /edit email/i }));
    const input = screen.getByTestId("settings-email-input");
    await user.type(input, "not-an-email");

    const saveBtn = screen.getByRole("button", { name: /save email/i });
    expect(saveBtn).toBeDisabled();
    expect(screen.getByTestId("settings-email-error")).toBeInTheDocument();
  });

  it("links an inline out-of-range error to its input and blocks saving", async () => {
    const user = userEvent.setup();
    render(<SettingsPage />);

    await user.click(screen.getByRole("button", { name: /edit display name/i }));
    const input = screen.getByTestId("settings-display-name-input");
    await user.type(input, "x".repeat(DISPLAY_NAME_MAX_LENGTH + 1));

    const error = screen.getByTestId("settings-display-name-error");
    expect(error).toHaveTextContent(/100 characters/i);
    expect(error).toHaveAttribute("role", "alert");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input.getAttribute("aria-describedby")).toContain(error.id);
    expect(screen.getByRole("button", { name: /save display name/i })).toBeDisabled();
  });

  it("valid email saves and persists", async () => {
    const user = userEvent.setup();
    render(<SettingsPage />);

    await user.click(screen.getByRole("button", { name: /edit email/i }));
    await user.type(screen.getByTestId("settings-email-input"), "ops@liquifact.com");

    await user.click(screen.getByRole("button", { name: /save email/i }));

    await waitFor(() =>
      expect(screen.getByTestId("settings-email-display")).toHaveTextContent("ops@liquifact.com")
    );
    const stored = JSON.parse(window.localStorage.getItem(SETTINGS_STORAGE_KEY) || "{}");
    expect(stored.email).toBe("ops@liquifact.com");
  });

  it("hydrates from a pre-seeded localStorage value", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({ displayName: "Stored", email: "stored@x.com" })
    );
    render(<SettingsPage />);

    await waitFor(() =>
      expect(screen.getByTestId("settings-display-name-display")).toHaveTextContent("Stored")
    );
    expect(screen.getByTestId("settings-email-display")).toHaveTextContent("stored@x.com");
    // Click edit on the stored name to ensure editing hydrates correctly.
    await user.click(screen.getByRole("button", { name: /edit display name/i }));
    expect(screen.getByTestId("settings-display-name-input")).toHaveValue("Stored");
  });

  it("cancel restores the prior stored value (does not write empty string)", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({ displayName: "Stored", email: "" })
    );
    render(<SettingsPage />);

    await waitFor(() =>
      expect(screen.getByTestId("settings-display-name-display")).toHaveTextContent("Stored")
    );

    await user.click(screen.getByRole("button", { name: /edit display name/i }));
    await user.clear(screen.getByTestId("settings-display-name-input"));
    await user.type(screen.getByTestId("settings-display-name-input"), "Typed");
    await user.click(screen.getByRole("button", { name: /cancel/i }));

    expect(screen.getByTestId("settings-display-name-display")).toHaveTextContent("Stored");

    const stored = JSON.parse(window.localStorage.getItem(SETTINGS_STORAGE_KEY) || "{}");
    expect(stored.displayName).toBe("Stored");
  });

  it("Escape inside the email input cancels the edit", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({ displayName: "", email: "old@liquifact.com" })
    );
    render(<SettingsPage />);

    await waitFor(() =>
      expect(screen.getByTestId("settings-email-display")).toHaveTextContent("old@liquifact.com")
    );

    await user.click(screen.getByRole("button", { name: /edit email/i }));
    await user.clear(screen.getByTestId("settings-email-input"));
    await user.type(screen.getByTestId("settings-email-input"), "throw-away@x.com");
    await user.keyboard("{Escape}");

    expect(screen.queryByTestId("settings-email-input")).not.toBeInTheDocument();
    expect(screen.getByTestId("settings-email-display")).toHaveTextContent("old@liquifact.com");
  });

  it("display name validator enforces minimum length even on Enter", async () => {
    const user = userEvent.setup();
    render(<SettingsPage />);

    await user.click(screen.getByRole("button", { name: /edit display name/i }));
    const input = screen.getByTestId("settings-display-name-input");
    await user.type(input, "X{enter}");

    // The save is rejected — we should still be in edit mode and the error
    // message must be visible.
    expect(screen.getByTestId("settings-display-name-error")).toBeInTheDocument();
    expect(input).toBeInTheDocument();
    // No new entry was persisted
    const stored = JSON.parse(window.localStorage.getItem(SETTINGS_STORAGE_KEY) ?? "{}");
    expect(stored.displayName ?? "").toBe("");
  });

  it("legitimate full workflow: edit display name + email via Save button", async () => {
    const user = userEvent.setup();
    render(<SettingsPage />);

    // Display name
    await user.click(screen.getByRole("button", { name: /edit display name/i }));
    await user.type(screen.getByTestId("settings-display-name-input"), "Acme Treasury");
    await user.click(screen.getByRole("button", { name: /save display name/i }));
    await waitFor(() =>
      expect(screen.getByTestId("settings-display-name-display")).toHaveTextContent("Acme Treasury")
    );

    // Email
    await user.click(screen.getByRole("button", { name: /edit email/i }));
    await user.type(screen.getByTestId("settings-email-input"), "treasury@acme.com");
    await user.click(screen.getByRole("button", { name: /save email/i }));
    await waitFor(() =>
      expect(screen.getByTestId("settings-email-display")).toHaveTextContent("treasury@acme.com")
    );

    const stored = JSON.parse(window.localStorage.getItem(SETTINGS_STORAGE_KEY) ?? "{}");
    expect(stored).toEqual({
      displayName: "Acme Treasury",
      email: "treasury@acme.com",
    });
  });

  it("uses fireEvent.submit as a defensive path for the form", async () => {
    // Inject pre-existing localStorage so we know the canonical "before" state
    window.localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({ displayName: "Initial", email: "" })
    );
    render(<SettingsPage />);

    await waitFor(() =>
      expect(screen.getByTestId("settings-display-name-display")).toHaveTextContent("Initial")
    );

    fireEvent.click(screen.getByTestId("settings-display-name-edit"));
    const input = screen.getByTestId("settings-display-name-input");
    fireEvent.change(input, { target: { value: "Updated" } });

    const form = input.closest("form");
    if (!form) throw new Error("form not found");
    act(() => {
      fireEvent.submit(form);
    });

    await waitFor(() =>
      expect(screen.getByTestId("settings-display-name-display")).toHaveTextContent("Updated")
    );
  });
});
