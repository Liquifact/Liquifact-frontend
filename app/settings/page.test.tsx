import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import SettingsPage from "./page";
import { SETTINGS_STORAGE_KEY, SETTINGS_UPDATED_KEY } from "../../lib/settingsStore";

jest.mock("next/navigation", () => ({
  usePathname: () => "/settings",
}));

jest.mock("../../components/WalletStatusLazy", () => ({
  __esModule: true,
  default: function MockWalletStatusLazy() {
    return <button type="button">Connect Wallet</button>;
  },
}));

/** In-memory localStorage mock matching the pattern used across the test suite. */
function mockLocalStorage(initial: Record<string, string> = {}) {
  const store: Record<string, string> = { ...initial };
  const mock = {
    getItem: jest.fn((k: string) => store[k] ?? null),
    setItem: jest.fn((k: string, v: string) => {
      store[k] = v;
    }),
    removeItem: jest.fn((k: string) => {
      delete store[k];
    }),
    clear: jest.fn(() => {
      Object.keys(store).forEach((k) => delete store[k]);
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: jest.fn((i: number) => Object.keys(store)[i] ?? null),
  };
  Object.defineProperty(window, "localStorage", { value: mock, writable: true });
  return { mock, store };
}

describe("SettingsPage", () => {
  beforeEach(() => {
    mockLocalStorage({});
  });

  it("renders the heading and description from copy.settings", async () => {
    await act(async () => {
      render(<SettingsPage />);
    });
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/settings/i);
    expect(screen.getByText(/display and notification preferences/i)).toBeInTheDocument();
  });

  it("renders the shared navigation including the new Settings link", async () => {
    await act(async () => {
      render(<SettingsPage />);
    });
    expect(screen.getByRole("link", { name: /^settings$/i })).toHaveAttribute("href", "/settings");
    expect(screen.getByRole("link", { name: /^home$/i })).toHaveAttribute("href", "/");
  });

  it("renders no last-updated label when settings have never been changed", async () => {
    await act(async () => {
      render(<SettingsPage />);
    });
    expect(screen.queryByTestId("settings-updated-at")).not.toBeInTheDocument();
  });

  it("defaults to USD currency and notifications enabled", async () => {
    await act(async () => {
      render(<SettingsPage />);
    });
    expect(screen.getByLabelText(/display currency/i)).toHaveValue("USD");
    expect(screen.getByRole("switch", { name: /email notifications/i })).toHaveAttribute(
      "aria-checked",
      "true"
    );
  });

  it('shows "just now" immediately after changing currency, and persists it', async () => {
    const { store } = mockLocalStorage({});
    const fixedNow = new Date("2026-07-26T12:00:00.000Z").getTime();
    jest.spyOn(Date, "now").mockReturnValue(fixedNow);

    await act(async () => {
      render(<SettingsPage />);
    });

    await act(async () => {
      fireEvent.change(screen.getByLabelText(/display currency/i), { target: { value: "EUR" } });
    });

    expect(screen.getByTestId("settings-updated-at")).toHaveTextContent("just now");
    expect(store[SETTINGS_UPDATED_KEY]).toBe(String(fixedNow));
    expect(JSON.parse(store[SETTINGS_STORAGE_KEY])).toMatchObject({ currency: "EUR" });

    (Date.now as jest.Mock).mockRestore();
  });

  it("toggles email notifications and records the change", async () => {
    await act(async () => {
      render(<SettingsPage />);
    });

    const toggle = screen.getByRole("switch", { name: /email notifications/i });
    await act(async () => {
      fireEvent.click(toggle);
    });

    expect(toggle).toHaveAttribute("aria-checked", "false");
    expect(screen.getByTestId("settings-updated-at")).toBeInTheDocument();
  });

  it("shows an accessible absolute-time alternative alongside the relative label", async () => {
    await act(async () => {
      render(<SettingsPage />);
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("switch", { name: /email notifications/i }));
    });

    const label = screen.getByTestId("settings-updated-at");
    expect(label).toHaveAttribute("title", expect.stringContaining("Settings last changed:"));
    expect(label.querySelector(".sr-only")).toHaveTextContent(/Settings last changed/);
  });

  it("reads a previously stored timestamp and settings on mount", async () => {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    mockLocalStorage({
      [SETTINGS_STORAGE_KEY]: JSON.stringify({ currency: "NGN", emailNotifications: false }),
      [SETTINGS_UPDATED_KEY]: String(oneHourAgo),
    });

    await act(async () => {
      render(<SettingsPage />);
    });

    expect(screen.getByLabelText(/display currency/i)).toHaveValue("NGN");
    expect(screen.getByRole("switch", { name: /email notifications/i })).toHaveAttribute(
      "aria-checked",
      "false"
    );
    expect(screen.getByTestId("settings-updated-at")).toHaveTextContent("1 hour ago");
  });

  it("falls back to defaults when stored settings JSON is malformed", async () => {
    mockLocalStorage({ [SETTINGS_STORAGE_KEY]: "{not-json" });

    await act(async () => {
      render(<SettingsPage />);
    });

    expect(screen.getByLabelText(/display currency/i)).toHaveValue("USD");
  });
});