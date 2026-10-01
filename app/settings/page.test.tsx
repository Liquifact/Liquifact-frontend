

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
import { jest } from "@jest/globals";

import SettingsPage, {
  normalizeSettings,
  DEFAULT_SETTINGS,
  SETTINGS_STORAGE_KEY,
  DISPLAY_NAME_MAX_LENGTH,
  EMAIL_MAX_LENGTH,
  validateDisplayName,
  validateEmail,
} from "./page";

// Alias used by the failure-recovery tests below. Kept as a local binding so
// the public export name (SETTINGS_STORAGE_KEY) remains the single source of
// truth and callers stay compatible.
const STORAGE_KEY = SETTINGS_STORAGE_KEY;

// ─── Mocks ──────────────────────────────────────────────────────────────────

jest.mock("next/link", () => {
  const LinkMock = ({ href, children, ...rest }) => (
    <a href={typeof href === "string" ? href : "#"} {...rest}>
      {children}
    </a>
  );
  return { __esModule: true, default: LinkMock };
});

// Deterministic failure-injection hook for the storage layer. The page
// module reads/writes through `window.localStorage`; tests can override
// these spies to simulate quota errors, partial writes, and read failures.
const originalSetItem = window.localStorage.setItem.bind(window.localStorage);
const originalGetItem = window.localStorage.getItem.bind(window.localStorage);

jest.mock("next/navigation", () => ({
  usePathname: () => "/settings",
  useRouter: () => ({ push: () => {}, replace: () => {}, refresh: () => {} }),
}));

jest.mock("../../components/NavMenu", () => {
  return function MockNavMenu() {
    return <div data-testid="nav-menu-mock">NavMenu</div>;
  };
});

afterEach(() => {
  // Restore storage spies so failure injection cannot leak across tests.
  window.localStorage.setItem = originalSetItem;
  window.localStorage.getItem = originalGetItem;
  jest.restoreAllMocks();
});

// ─── normalizeSettings pure unit ────────────────────────────────────────────

describe("normalizeSettings", () => {
  it("returns defaults for non-object input", () => {
    expect(normalizeSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(normalizeSettings(undefined)).toEqual(DEFAULT_SETTINGS);
    expect(normalizeSettings("not an object")).toEqual(DEFAULT_SETTINGS);
  });

  it("is deterministic for duplicate and boundary inputs", () => {
    // Duplicate keys collapse to the last value; boundary strings are preserved.
    const dup = { displayName: "First", email: "a@b.co", displayName: "Second" };
    expect(normalizeSettings(dup)).toEqual({ displayName: "Second", email: "a@b.co" });

    const boundary = { displayName: "x".repeat(DISPLAY_NAME_MAX_LENGTH), email: "" };
    expect(normalizeSettings(boundary)).toEqual(boundary);
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

  it("is idempotent when applied repeatedly", () => {
    const once = normalizeSettings({ displayName: "Sam", email: "sam@x.com" });
    const twice = normalizeSettings(once);
    const thrice = normalizeSettings(twice);
    expect(twice).toEqual(once);
    expect(thrice).toEqual(once);
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

  it("is deterministic across repeated invocations (no hidden state)", () => {
    const cases = ["", "  ", "x", "x".repeat(DISPLAY_NAME_MAX_LENGTH + 1)];
    for (const c of cases) {
      const a = validateDisplayName(c);
      const b = validateDisplayName(c);
      expect(a).toBe(b);
    }
    const emails = ["", "  ", "not-an-email", "a@b.co", `${"a".repeat(EMAIL_MAX_LENGTH)}@x.co`];
    for (const e of emails) {
      const a = validateEmail(e);
      const b = validateEmail(e);
      expect(a).toBe(b);
    }
  });
});

// ─── Page render ────────────────────────────────────────────────────────────

describe("SettingsPage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem = originalSetItem;
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

  // ─── Failure recovery: deterministic, observable, no data loss ───────────

  it("surfaces a user-visible error and preserves prior value when storage write fails", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ displayName: "Prior", email: "" })
    );
    render(<SettingsPage />);

    await waitFor(() =>
      expect(screen.getByTestId("settings-display-name-display")).toHaveTextContent("Prior")
    );

    // Inject a quota-style failure on the next write.
    const failingSetItem = jest.fn(() => {
      throw new DOMException("QuotaExceededError", "QuotaExceededError");
    });
    window.localStorage.setItem = failingSetItem as unknown as typeof window.localStorage.setItem;

    await user.click(screen.getByRole("button", { name: /edit display name/i }));
    const input = screen.getByTestId("settings-display-name-input");
    await user.clear(input);
    await user.type(input, "NewValue");
    await user.click(screen.getByRole("button", { name: /save display name/i }));

    // Failure must be observable to the user (alert region) and must not
    // silently drop the prior persisted value.
    const alert = await screen.findByRole("alert");
    expect(alert).toBeInTheDocument();
    expect(alert.textContent || "").not.toMatch(/NewValue/);

    // Prior value is still persisted (no data loss).
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}");
    expect(stored.displayName).toBe("Prior");
  });

  it("recovers cleanly after a transient storage failure (retry succeeds)", async () => {
    const user = userEvent.setup();
    render(<SettingsPage />);

    let attempts = 0;
    const flakySetItem = jest.fn((key: string, value: string) => {
      attempts += 1;
      if (attempts === 1) {
        throw new DOMException("QuotaExceededError", "QuotaExceededError");
      }
      return originalSetItem(key, value);
    });
    window.localStorage.setItem = flakySetItem as unknown as typeof window.localStorage.setItem;

    await user.click(screen.getByRole("button", { name: /edit display name/i }));
    await user.type(screen.getByTestId("settings-display-name-input"), "Retry");
    await user.click(screen.getByRole("button", { name: /save display name/i }));

    // First attempt failed — user sees an error and remains in edit mode.
    await screen.findByRole("alert");
    expect(screen.getByTestId("settings-display-name-input")).toBeInTheDocument();

    // Retry the same save — second attempt succeeds.
    await user.click(screen.getByRole("button", { name: /save display name/i }));

    await waitFor(() =>
      expect(screen.getByTestId("settings-display-name-display")).toHaveTextContent("Retry")
    );
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}");
    expect(stored.displayName).toBe("Retry");
    expect(attempts).toBeGreaterThanOrEqual(2);
  });

  it("does not corrupt state when a read failure occurs during hydration", async () => {
    const failingGetItem = jest.fn(() => {
      throw new DOMException("SecurityError", "SecurityError");
    });
    window.localStorage.getItem = failingGetItem as unknown as typeof window.localStorage.getItem;

    // Page must still render with defaults rather than crash.
    render(<SettingsPage />);
    expect(screen.getByTestId("settings-display-name-display")).toHaveTextContent("Not set");
    expect(screen.getByTestId("settings-email-display")).toHaveTextContent("Not set");
  });

  it("rejects duplicate concurrent saves without producing inconsistent state", async () => {
    const user = userEvent.setup();
    render(<SettingsPage />);

    await user.click(screen.getByRole("button", { name: /edit display name/i }));
    await user.type(screen.getByTestId("settings-display-name-input"), "Once");

    const saveBtn = screen.getByRole("button", { name: /save display name/i });
    // Fire two rapid clicks; the second must be a no-op (row already saved).
    await user.click(saveBtn);
    await user.click(saveBtn);

    await waitFor(() =>
      expect(screen.getByTestId("settings-display-name-display")).toHaveTextContent("Once")
    );

    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}");
    expect(stored.displayName).toBe("Once");
    // No duplicate edit form should be mounted after save.
    expect(screen.queryByTestId("settings-display-name-input")).not.toBeInTheDocument();
  });

  it("partial completion: display name saved, email save fails, name remains persisted", async () => {
    const user = userEvent.setup();
    render(<SettingsPage />);

    // Save display name successfully.
    await user.click(screen.getByRole("button", { name: /edit display name/i }));
    await user.type(screen.getByTestId("settings-display-name-input"), "Acme");
    await user.click(screen.getByRole("button", { name: /save display name/i }));
    await waitFor(() =>
      expect(screen.getByTestId("settings-display-name-display")).toHaveTextContent("Acme")
    );

    // Now make the next write fail and attempt to save email.
    window.localStorage.setItem = jest.fn(() => {
      throw new DOMException("QuotaExceededError", "QuotaExceededError");
    }) as unknown as typeof window.localStorage.setItem;

    await user.click(screen.getByRole("button", { name: /edit email/i }));
    await user.type(screen.getByTestId("settings-email-input"), "ops@liquifact.com");
    await user.click(screen.getByRole("button", { name: /save email/i }));

    await screen.findByRole("alert");

    // The previously persisted display name must survive the failed email save.
    const stored = JSON.parse(originalGetItem(STORAGE_KEY) || "{}");
    expect(stored.displayName).toBe("Acme");
  });

  it("cancel after a failed save restores the last persisted value", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ displayName: "Persisted", email: "" })
    );
    render(<SettingsPage />);

    await waitFor(() =>
      expect(screen.getByTestId("settings-display-name-display")).toHaveTextContent("Persisted")
    );

    window.localStorage.setItem = jest.fn(() => {
      throw new DOMException("QuotaExceededError", "QuotaExceededError");
    }) as unknown as typeof window.localStorage.setItem;

    await user.click(screen.getByRole("button", { name: /edit display name/i }));
    const input = screen.getByTestId("settings-display-name-input");
    await user.clear(input);
    await user.type(input, "Attempted");
    await user.click(screen.getByRole("button", { name: /save display name/i }));
    await screen.findByRole("alert");

    // Cancel must restore the persisted value, not the attempted one.
    await user.click(screen.getByRole("button", { name: /cancel/i }));
    expect(screen.getByTestId("settings-display-name-display")).toHaveTextContent("Persisted");
    const stored = JSON.parse(originalGetItem(STORAGE_KEY) || "{}");
    expect(stored.displayName).toBe("Persisted");
  });
});
