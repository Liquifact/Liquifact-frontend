import React from "react";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import SettingsPage from "./page";

jest.mock("../../components/NavMenu", () => () => <nav data-testid="nav-menu" />);

jest.mock("../../components/SettingsPanel", () => {
  const actual = jest.requireActual("../../components/SettingsPanel");
  return {
    __esModule: true,
    default: ({ initialTheme, initialCompact }) => (
      <div data-testid="settings-panel" data-theme={initialTheme} data-compact={String(initialCompact)} />
    ),
    readStoredSettings: actual.readStoredSettings,
  };
});

function mockLocalStorage(initial = {}) {
  const store = { ...initial };
  Object.defineProperty(window, "localStorage", {
    writable: true,
    value: {
      getItem: jest.fn((k) => store[k] ?? null),
      setItem: jest.fn((k, v) => { store[k] = v; }),
      removeItem: jest.fn((k) => { delete store[k]; }),
      clear: jest.fn(() => { Object.keys(store).forEach((k) => delete store[k]); }),
      get length() { return Object.keys(store).length; },
      key: jest.fn((i) => Object.keys(store)[i] ?? null),
    },
  });
  return store;
}

describe("SettingsPage", () => {
  beforeEach(() => {
    mockLocalStorage({});
  });

  it("renders the NavMenu", () => {
    render(<SettingsPage />);
    expect(screen.getByTestId("nav-menu")).toBeInTheDocument();
  });

  it("renders the SettingsPanel", () => {
    render(<SettingsPage />);
    expect(screen.getByTestId("settings-panel")).toBeInTheDocument();
  });

  it("renders the page title and description", () => {
    render(<SettingsPage />);
    expect(screen.getByText("Settings")).toBeInTheDocument();
    expect(screen.getByText("Customise your experience on LiquiFact.")).toBeInTheDocument();
  });

  it("passes initialTheme=system when no theme is stored", () => {
    mockLocalStorage({});
    render(<SettingsPage />);
    const panel = screen.getByTestId("settings-panel");
    expect(panel).toHaveAttribute("data-theme", "system");
  });

  it("passes initialTheme from localStorage when a theme is stored", () => {
    mockLocalStorage({ "liquifact-theme": "dark" });
    render(<SettingsPage />);
    const panel = screen.getByTestId("settings-panel");
    expect(panel).toHaveAttribute("data-theme", "dark");
  });

  it("passes initialTheme=system when stored theme is invalid", () => {
    mockLocalStorage({ "liquifact-theme": "neon" });
    render(<SettingsPage />);
    const panel = screen.getByTestId("settings-panel");
    expect(panel).toHaveAttribute("data-theme", "system");
  });

  it("passes initialCompact=false when no settings are stored", () => {
    mockLocalStorage({});
    render(<SettingsPage />);
    const panel = screen.getByTestId("settings-panel");
    expect(panel).toHaveAttribute("data-compact", "false");
  });

  it("passes initialCompact=true when compactRows is stored as true", () => {
    mockLocalStorage({ "liquifact-settings": '{"compactRows":true}' });
    render(<SettingsPage />);
    const panel = screen.getByTestId("settings-panel");
    expect(panel).toHaveAttribute("data-compact", "true");
  });

  it("passes initialCompact=false when compactRows is stored as false", () => {
    mockLocalStorage({ "liquifact-settings": '{"compactRows":false}' });
    render(<SettingsPage />);
    const panel = screen.getByTestId("settings-panel");
    expect(panel).toHaveAttribute("data-compact", "false");
  });

  it("handles malformed settings JSON gracefully", () => {
    mockLocalStorage({ "liquifact-settings": "not-json" });
    render(<SettingsPage />);
    const panel = screen.getByTestId("settings-panel");
    expect(panel).toHaveAttribute("data-compact", "false");
  });
});
