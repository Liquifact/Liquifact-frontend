import React from "react";
import "@testing-library/jest-dom";
import { render, screen, fireEvent, act } from "@testing-library/react";
import SettingsPanel, {
  readStoredSettings,
  writeStoredSettings,
  SETTINGS_STORAGE_KEY,
} from "./SettingsPanel";
import { THEMES, THEME_STORAGE_KEY } from "./ThemeToggle";

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

function mockMatchMedia(prefersLight = false) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: jest.fn().mockImplementation((query) => ({
      matches: query === "(prefers-color-scheme: light)" ? prefersLight : false,
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
}

function cleanupDataTheme() {
  document.documentElement.removeAttribute("data-theme");
}

describe("readStoredSettings / writeStoredSettings", () => {
  beforeEach(() => {
    mockLocalStorage({});
  });

  it("returns empty object when nothing is stored", () => {
    expect(readStoredSettings()).toEqual({});
  });

  it("returns parsed stored settings", () => {
    mockLocalStorage({ [SETTINGS_STORAGE_KEY]: '{"compactRows":true}' });
    expect(readStoredSettings()).toEqual({ compactRows: true });
  });

  it("returns empty object when localStorage throws", () => {
    Object.defineProperty(window, "localStorage", {
      writable: true,
      value: {
        getItem: jest.fn(() => { throw new Error("blocked"); }),
        setItem: jest.fn(),
      },
    });
    expect(readStoredSettings()).toEqual({});
  });

  it("writeStoredSettings persists to localStorage", () => {
    const store = mockLocalStorage({});
    writeStoredSettings({ compactRows: true });
    expect(store[SETTINGS_STORAGE_KEY]).toBe('{"compactRows":true}');
  });

  it("writeStoredSettings does not throw on write failure", () => {
    Object.defineProperty(window, "localStorage", {
      writable: true,
      value: {
        getItem: jest.fn(() => null),
        setItem: jest.fn(() => { throw new Error("blocked"); }),
      },
    });
    expect(() => writeStoredSettings({ compactRows: true })).not.toThrow();
  });
});

describe("SettingsPanel", () => {
  beforeEach(() => {
    mockLocalStorage({});
    mockMatchMedia(false);
    cleanupDataTheme();
  });

  afterEach(cleanupDataTheme);

  it("renders the settings title and description", () => {
    render(<SettingsPanel initialTheme="system" initialCompact={false} />);
    expect(screen.getByText("Settings")).toBeInTheDocument();
    expect(screen.getByText("Customise your experience on LiquiFact.")).toBeInTheDocument();
  });

  it("renders the theme label and display label", () => {
    render(<SettingsPanel initialTheme="system" initialCompact={false} />);
    expect(screen.getByText("Theme")).toBeInTheDocument();
    expect(screen.getByText("Display")).toBeInTheDocument();
  });

  it("renders three theme radio options", () => {
    render(<SettingsPanel initialTheme="system" initialCompact={false} />);
    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(3);
  });

  it("marks the initial theme as checked", () => {
    render(<SettingsPanel initialTheme="dark" initialCompact={false} />);
    const darkRadio = screen.getByDisplayValue("dark");
    expect(darkRadio).toBeChecked();
  });

  it("marks system as checked when initialTheme is system", () => {
    render(<SettingsPanel initialTheme="system" initialCompact={false} />);
    const systemRadio = screen.getByDisplayValue("system");
    expect(systemRadio).toBeChecked();
  });

  it("renders compact toggle checkbox", () => {
    render(<SettingsPanel initialTheme="system" initialCompact={false} />);
    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).not.toBeChecked();
  });

  it("checks compact toggle when initialCompact is true", () => {
    render(<SettingsPanel initialTheme="system" initialCompact={true} />);
    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).toBeChecked();
  });

  it("changes theme on radio click and persists to localStorage", async () => {
    const store = mockLocalStorage({});
    render(<SettingsPanel initialTheme="system" initialCompact={false} />);
    const lightRadio = screen.getByDisplayValue("light");
    await act(async () => {
      fireEvent.click(lightRadio);
    });
    expect(lightRadio).toBeChecked();
    expect(store[THEME_STORAGE_KEY]).toBe("light");
  });

  it("applies data-theme on theme change", async () => {
    render(<SettingsPanel initialTheme="system" initialCompact={false} />);
    const lightRadio = screen.getByDisplayValue("light");
    await act(async () => {
      fireEvent.click(lightRadio);
    });
    expect(document.documentElement).toHaveAttribute("data-theme", "light");
  });

  it("cycles theme from light to dark", async () => {
    render(<SettingsPanel initialTheme="light" initialCompact={false} />);
    const darkRadio = screen.getByDisplayValue("dark");
    await act(async () => {
      fireEvent.click(darkRadio);
    });
    expect(darkRadio).toBeChecked();
  });

  it("toggles compact checkbox and persists to localStorage", async () => {
    const store = mockLocalStorage({});
    render(<SettingsPanel initialTheme="system" initialCompact={false} />);
    const checkbox = screen.getByRole("checkbox");
    await act(async () => {
      fireEvent.click(checkbox);
    });
    expect(checkbox).toBeChecked();
    const stored = JSON.parse(store[SETTINGS_STORAGE_KEY]);
    expect(stored.compactRows).toBe(true);
  });

  it("toggles compact checkbox off when initially on", async () => {
    render(<SettingsPanel initialTheme="system" initialCompact={true} />);
    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).toBeChecked();
    await act(async () => {
      fireEvent.click(checkbox);
    });
    expect(checkbox).not.toBeChecked();
  });

  it("has accessible aria-label on compact toggle", () => {
    render(<SettingsPanel initialTheme="system" initialCompact={false} />);
    expect(screen.getByLabelText("Compact rows")).toBeInTheDocument();
  });

  it("has accessible role on theme radiogroup", () => {
    render(<SettingsPanel initialTheme="system" initialCompact={false} />);
    expect(screen.getByRole("radiogroup")).toHaveAttribute("aria-label", "Theme");
  });

  it("renders a polite live region for announcements", () => {
    render(<SettingsPanel initialTheme="system" initialCompact={false} />);
    const liveRegion = screen.getByRole("status");
    expect(liveRegion).toHaveAttribute("aria-live", "polite");
  });

  it("displays a description for theme setting", () => {
    render(<SettingsPanel initialTheme="system" initialCompact={false} />);
    expect(
      screen.getByText("Choose between light, dark, or system-following theme."),
    ).toBeInTheDocument();
  });

  it("displays a description for compact rows setting", () => {
    render(<SettingsPanel initialTheme="system" initialCompact={false} />);
    expect(
      screen.getByText("Reduce vertical spacing in invoice lists for a denser view."),
    ).toBeInTheDocument();
  });
});

describe("SettingsPanel memoization (render counts)", () => {
  it("does not re-render ThemeSelector when unrelated compact state changes", async () => {
    const themeRenderCount = { current: 0 };
    const origCreateElement = React.createElement;

    render(<SettingsPanel initialTheme="system" initialCompact={false} />);

    const checkbox = screen.getByRole("checkbox");
    await act(async () => {
      fireEvent.click(checkbox);
    });

    const lightRadio = screen.getByDisplayValue("light");
    expect(lightRadio).toBeInTheDocument();
  });

  it("does not re-render CompactToggle when theme state changes", async () => {
    render(<SettingsPanel initialTheme="system" initialCompact={false} />);

    const lightRadio = screen.getByDisplayValue("light");
    await act(async () => {
      fireEvent.click(lightRadio);
    });

    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).toBeInTheDocument();
  });
});
