/**
 * @file theme-export.test.jsx
 *
 * Tests for the CSV / JSON export controls on the Settings page.
 *
 * Strategy: We mock `utils/export` at the module level so no DOM manipulation
 * (appendChild / removeChild / createElement) is needed. This avoids corrupting
 * jsdom's container and lets us inspect Blob payloads directly through the mock.
 *
 * Coverage targets
 * ─────────────────
 * • Export buttons are rendered and accessible
 * • CSV export triggers a download with the correct MIME type
 * • JSON export triggers a download with the correct MIME type
 * • Exports respect the active filter (only filtered rows are exported)
 * • Empty-view guard: no download when no settings match the current filter
 * • Safe escaping of special CSV characters (commas, quotes, newlines)
 * • Accessible live-region announcement after each export action
 */

import React from "react";
import { render, screen, waitFor, fireEvent, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SettingsPage } from "./page";

// ── Module-level mock for utils/export ───────────────────────────────────────
// Mocking at the module level avoids touching document.createElement /
// appendChild / removeChild, which would corrupt jsdom's React container.

const mockExportAsCSV = jest.fn();
const mockExportAsJSON = jest.fn();

jest.mock("@/utils/export", () => ({
  exportAsCSV: (...args) => mockExportAsCSV(...args),
  exportAsJSON: (...args) => mockExportAsJSON(...args),
  escapeCSVValue: jest.requireActual("@/utils/export").escapeCSVValue,
  triggerDownload: jest.fn(),
}));

// ── Fixture ───────────────────────────────────────────────────────────────────

const FIXTURE_SETTINGS = [
  {
    id: "t-001",
    category: "display",
    label: "Theme",
    type: "select",
    value: "dark",
    description: "Light or dark theme.",
  },
  {
    id: "t-002",
    category: "display",
    label: 'Label with "quotes"',
    type: "toggle",
    value: "enabled",
    description: "Has commas, quotes",
  },
  {
    id: "t-003",
    category: "wallet",
    label: "Default network",
    type: "select",
    value: "public",
    description: "Stellar network.",
  },
];

const loadFixture = () => Promise.resolve(FIXTURE_SETTINGS);

// ── Setup / teardown ──────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("Settings page — theme export controls", () => {
  it("renders both export buttons with accessible labels", async () => {
    render(<SettingsPage loadSettings={loadFixture} />);
    await waitFor(() => expect(screen.queryByTestId("settings-loading")).toBeNull());

    const csvBtn = screen.getByTestId("export-csv-btn");
    const jsonBtn = screen.getByTestId("export-json-btn");

    expect(csvBtn).toBeInTheDocument();
    expect(jsonBtn).toBeInTheDocument();

    expect(csvBtn).toHaveAttribute("aria-label", "Export the current settings view as a CSV file");
    expect(jsonBtn).toHaveAttribute(
      "aria-label",
      "Export the current settings view as a JSON file"
    );
  });

  it("export buttons are keyboard-focusable", async () => {
    render(<SettingsPage loadSettings={loadFixture} />);
    await waitFor(() => expect(screen.queryByTestId("settings-loading")).toBeNull());

    const csvBtn = screen.getByTestId("export-csv-btn");
    csvBtn.focus();
    expect(document.activeElement).toBe(csvBtn);

    const jsonBtn = screen.getByTestId("export-json-btn");
    jsonBtn.focus();
    expect(document.activeElement).toBe(jsonBtn);
  });

  describe("CSV export", () => {
    it("calls exportAsCSV when the CSV button is clicked", async () => {
      render(<SettingsPage loadSettings={loadFixture} />);
      await waitFor(() => expect(screen.queryByTestId("settings-loading")).toBeNull());

      fireEvent.click(screen.getByTestId("export-csv-btn"));

      expect(mockExportAsCSV).toHaveBeenCalledTimes(1);
    });

    it("uses settings-export.csv as filename", async () => {
      render(<SettingsPage loadSettings={loadFixture} />);
      await waitFor(() => expect(screen.queryByTestId("settings-loading")).toBeNull());

      fireEvent.click(screen.getByTestId("export-csv-btn"));

      expect(mockExportAsCSV).toHaveBeenCalledWith(expect.any(Array), "settings-export.csv");
    });

    it("passes all fixture rows when no filter is active (unfiltered)", async () => {
      render(<SettingsPage loadSettings={loadFixture} />);
      await waitFor(() => expect(screen.queryByTestId("settings-loading")).toBeNull());

      fireEvent.click(screen.getByTestId("export-csv-btn"));

      const [rows] = mockExportAsCSV.mock.calls[0];
      expect(rows).toHaveLength(3);
      expect(rows.map((r) => r.id)).toEqual(["t-001", "t-002", "t-003"]);
    });

    it("announces the export to assistive technology", async () => {
      render(<SettingsPage loadSettings={loadFixture} />);
      await waitFor(() => expect(screen.queryByTestId("settings-loading")).toBeNull());

      fireEvent.click(screen.getByTestId("export-csv-btn"));

      await waitFor(() => {
        const region = screen.getByTestId("export-announce");
        expect(region).toHaveTextContent("Settings exported as CSV.");
      });
    });
  });

  describe("JSON export", () => {
    it("calls exportAsJSON when the JSON button is clicked", async () => {
      render(<SettingsPage loadSettings={loadFixture} />);
      await waitFor(() => expect(screen.queryByTestId("settings-loading")).toBeNull());

      fireEvent.click(screen.getByTestId("export-json-btn"));

      expect(mockExportAsJSON).toHaveBeenCalledTimes(1);
    });

    it("uses settings-export.json as filename", async () => {
      render(<SettingsPage loadSettings={loadFixture} />);
      await waitFor(() => expect(screen.queryByTestId("settings-loading")).toBeNull());

      fireEvent.click(screen.getByTestId("export-json-btn"));

      expect(mockExportAsJSON).toHaveBeenCalledWith(expect.any(Array), "settings-export.json");
    });

    it("passes all fixture rows when no filter is active (unfiltered)", async () => {
      render(<SettingsPage loadSettings={loadFixture} />);
      await waitFor(() => expect(screen.queryByTestId("settings-loading")).toBeNull());

      fireEvent.click(screen.getByTestId("export-json-btn"));

      const [rows] = mockExportAsJSON.mock.calls[0];
      expect(rows).toHaveLength(3);
      expect(rows[0]).toMatchObject({ id: "t-001", category: "display" });
    });

    it("announces the export to assistive technology", async () => {
      render(<SettingsPage loadSettings={loadFixture} />);
      await waitFor(() => expect(screen.queryByTestId("settings-loading")).toBeNull());

      fireEvent.click(screen.getByTestId("export-json-btn"));

      await waitFor(() => {
        const region = screen.getByTestId("export-announce");
        expect(region).toHaveTextContent("Settings exported as JSON.");
      });
    });
  });

  describe("filter-respect — only filtered rows are exported", () => {
    it("CSV export includes only rows that match the active category filter", async () => {
      render(<SettingsPage loadSettings={loadFixture} />);
      await waitFor(() => expect(screen.queryByTestId("settings-loading")).toBeNull());

      // Select the "display" category filter
      const categorySelect = screen.getByTestId("settings-category-filter");
      await userEvent.selectOptions(categorySelect, "display");

      fireEvent.click(screen.getByTestId("export-csv-btn"));

      const [rows] = mockExportAsCSV.mock.calls[0];
      const ids = rows.map((r) => r.id);
      expect(ids).toContain("t-001");
      expect(ids).toContain("t-002");
      expect(ids).not.toContain("t-003");
    });

    it("JSON export includes only rows that match the active category filter", async () => {
      render(<SettingsPage loadSettings={loadFixture} />);
      await waitFor(() => expect(screen.queryByTestId("settings-loading")).toBeNull());

      const categorySelect = screen.getByTestId("settings-category-filter");
      await userEvent.selectOptions(categorySelect, "wallet");

      fireEvent.click(screen.getByTestId("export-json-btn"));

      const [rows] = mockExportAsJSON.mock.calls[0];
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ id: "t-003", category: "wallet" });
    });

    it("CSV export includes only rows matching the search query", async () => {
      render(<SettingsPage loadSettings={loadFixture} />);
      await waitFor(() => expect(screen.queryByTestId("settings-loading")).toBeNull());

      const searchInput = screen.getByTestId("settings-search-filter");
      await userEvent.type(searchInput, "network");

      // Wait for debounce to settle
      await new Promise((r) => setTimeout(r, 300));

      fireEvent.click(screen.getByTestId("export-csv-btn"));

      const [rows] = mockExportAsCSV.mock.calls[0];
      const ids = rows.map((r) => r.id);
      // Only "Default network" (t-003) matches "network"
      expect(ids).toContain("t-003");
      expect(ids).not.toContain("t-001");
    });
  });

  describe("empty view — no download triggered", () => {
    it("does not call exportAsCSV when no rows match the filter", async () => {
      render(<SettingsPage loadSettings={loadFixture} />);
      await waitFor(() => expect(screen.queryByTestId("settings-loading")).toBeNull());

      // Type a query that matches nothing
      const searchInput = screen.getByTestId("settings-search-filter");
      await userEvent.type(searchInput, "zzz-no-match-zzz");

      // Wait for debounce to fire so filteredSettings is empty
      await new Promise((r) => setTimeout(r, 300));

      fireEvent.click(screen.getByTestId("export-csv-btn"));

      expect(mockExportAsCSV).not.toHaveBeenCalled();
    });

    it("does not call exportAsJSON when no rows match the filter", async () => {
      render(<SettingsPage loadSettings={loadFixture} />);
      await waitFor(() => expect(screen.queryByTestId("settings-loading")).toBeNull());

      const searchInput = screen.getByTestId("settings-search-filter");
      await userEvent.type(searchInput, "zzz-no-match-zzz");
      await new Promise((r) => setTimeout(r, 300));

      fireEvent.click(screen.getByTestId("export-json-btn"));

      expect(mockExportAsJSON).not.toHaveBeenCalled();
    });

    it("announces 'no settings to export' when the filter view is empty", async () => {
      render(<SettingsPage loadSettings={loadFixture} />);
      await waitFor(() => expect(screen.queryByTestId("settings-loading")).toBeNull());

      const searchInput = screen.getByTestId("settings-search-filter");
      await userEvent.type(searchInput, "zzz-no-match-zzz");
      await new Promise((r) => setTimeout(r, 300));

      fireEvent.click(screen.getByTestId("export-json-btn"));

      await waitFor(() => {
        const region = screen.getByTestId("export-announce");
        expect(region).toHaveTextContent(
          "No settings to export — adjust filters or wait for settings to load."
        );
      });
    });

    it("does not trigger a download when settings have not loaded yet", async () => {
      // Loader that never resolves → settings stays null
      const neverResolves = () => new Promise(() => {});
      render(<SettingsPage loadSettings={neverResolves} />);

      // Loading skeleton should be visible
      expect(screen.getByTestId("settings-loading")).toBeInTheDocument();

      // Export buttons are present even while loading (they guard internally)
      fireEvent.click(screen.getByTestId("export-csv-btn"));

      expect(mockExportAsCSV).not.toHaveBeenCalled();
    });
  });

  describe("export group accessibility", () => {
    it("export buttons are grouped with an accessible group label", async () => {
      render(<SettingsPage loadSettings={loadFixture} />);
      await waitFor(() => expect(screen.queryByTestId("settings-loading")).toBeNull());

      const group = screen.getByRole("group", { name: "Export settings" });
      expect(group).toBeInTheDocument();
    });
  });
});

// ── CSV escaping unit tests (using the real escapeCSVValue) ──────────────────
// These test the escaping logic independently of the Settings page.

import { escapeCSVValue } from "@/utils/export";

describe("CSV escaping — escapeCSVValue (docs: safe escaping contract)", () => {
  it("returns empty string for null", () => {
    expect(escapeCSVValue(null)).toBe("");
  });

  it("returns empty string for undefined", () => {
    expect(escapeCSVValue(undefined)).toBe("");
  });

  it("returns plain strings unmodified", () => {
    expect(escapeCSVValue("hello")).toBe("hello");
    expect(escapeCSVValue("123")).toBe("123");
  });

  it("wraps values containing commas in double-quotes", () => {
    expect(escapeCSVValue("hello, world")).toBe('"hello, world"');
  });

  it("doubles inner quotes and wraps the value", () => {
    expect(escapeCSVValue('Label with "quotes"')).toBe('"Label with ""quotes"""');
  });

  it("wraps values containing newlines", () => {
    expect(escapeCSVValue("line1\nline2")).toBe('"line1\nline2"');
  });

  it("wraps values containing carriage returns", () => {
    expect(escapeCSVValue("line1\rline2")).toBe('"line1\rline2"');
  });

  it("coerces numbers to strings", () => {
    expect(escapeCSVValue(42)).toBe("42");
  });
});
