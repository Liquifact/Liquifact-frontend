/**
 * @file app/settings/page.keyboard.test.jsx
 *
 * Keyboard-navigation tests for the /settings page, matching the pattern
 * established by app/page.keyboard.test.jsx (dashboard keyboard nav).
 *
 * Covers:
 *  1. Tab order through density toggle, export buttons, filters, and
 *     the settings list (copy buttons).
 *  2. Arrow keys do not move focus on standard buttons/links.
 *  3. Enter activates the focused element.
 *  4. Escape closes the inline edit row.
 */

import "@testing-library/jest-dom";
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import SettingsRoute, { SettingsPage, PAGE_SIZE } from "./page";
import { MOCK_SETTINGS, loadMockSettings } from "./lib";
import { copy } from "../copy/en";

jest.mock("next/link", () => {
  function MockLink({ href, children, ...props }) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  }
  return { __esModule: true, default: MockLink };
});

jest.mock("@/components/NavMenu", () => {
  function MockNavMenu() {
    return <nav aria-label="site navigation" />;
  }
  return { __esModule: true, default: MockNavMenu };
});

const mockToastSuccess = jest.fn();
const mockToastError = jest.fn();
jest.mock("@/components/ToastProvider", () => ({
  useToast: () => ({ success: mockToastSuccess, error: mockToastError }),
}));

jest.mock("@/components/CopyButton", () => {
  const actual = jest.requireActual("@/components/CopyButton");
  return {
    __esModule: true,
    default: actual.default,
    copyToClipboard: jest.fn(() => Promise.resolve()),
  };
});
import { copyToClipboard } from "@/components/CopyButton";

const setupUser = () =>
  userEvent.setup({
    advanceTimers: jest.advanceTimersByTime,
  });

function createDeferredLoader(rows, delayMs = 0) {
  return jest.fn(
    () =>
      new Promise((resolve) => {
        setTimeout(() => resolve(rows), delayMs);
      })
  );
}

async function flushTimers(ms = 0) {
  await act(async () => {
    jest.advanceTimersByTime(ms);
    await Promise.resolve();
  });
}

/** jsdom does not implement URL.createObjectURL — mock it to avoid
 *  errors when the export buttons trigger triggerDownload. */
beforeAll(() => {
  global.URL.createObjectURL = jest.fn(() => "blob:mock");
  global.URL.revokeObjectURL = jest.fn();
});

afterAll(() => {
  delete global.URL.createObjectURL;
  delete global.URL.revokeObjectURL;
});

describe("settings keyboard navigation", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    copyToClipboard.mockReset();
    copyToClipboard.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it("follows a logical forward and reverse tab order through the settings page", async () => {
    const user = setupUser();
    const loader = createDeferredLoader(MOCK_SETTINGS, 0);
    render(<SettingsPage loadSettings={loader} />);

    // Wait for settings to load (settings are loaded with 0 delay)
    await flushTimers(0);

    // The settings page renders a density section with two toggle buttons
    const densitySection = screen.getByTestId("settings-density-section");
    const densityButtons = within(densitySection).getAllByRole("button");
    // DensityToggle renders two buttons: Compact and Comfortable
    expect(densityButtons.length).toBeGreaterThanOrEqual(2);
    const compactBtn = densityButtons[0];
    const comfortableBtn = densityButtons[1];

    // Export buttons
    const exportCSVBtn = screen.getByTestId("export-csv-btn");
    const exportJSONBtn = screen.getByTestId("export-json-btn");

    // Focus the first density button and tab forward
    compactBtn.focus();
    expect(compactBtn).toHaveFocus();

    // Tab should move to the comfortable button
    await user.tab();
    expect(comfortableBtn).toHaveFocus();

    // Tab should move to the Export CSV button
    await user.tab();
    expect(exportCSVBtn).toHaveFocus();

    // Tab should move to the Export JSON button
    await user.tab();
    expect(exportJSONBtn).toHaveFocus();

    // Tab should move to the category filter select
    const categorySelect = screen.getByTestId("settings-category-filter");
    await user.tab();
    expect(categorySelect).toHaveFocus();

    // Tab should move to the search input
    const searchInput = screen.getByTestId("settings-search-filter");
    await user.tab();
    expect(searchInput).toHaveFocus();

    // Tab reverse: Shift+Tab moves back to the category select
    await user.tab({ shift: true });
    expect(categorySelect).toHaveFocus();

    // Shift+Tab moves back to the Export JSON button
    await user.tab({ shift: true });
    expect(exportJSONBtn).toHaveFocus();

    // Shift+Tab moves back to the Export CSV button
    await user.tab({ shift: true });
    expect(exportCSVBtn).toHaveFocus();

    // Shift+Tab moves back to the comfortable button
    await user.tab({ shift: true });
    expect(comfortableBtn).toHaveFocus();

    // Shift+Tab moves back to the compact button
    await user.tab({ shift: true });
    expect(compactBtn).toHaveFocus();
  });

  it("keeps focus stable when arrow keys are pressed on standard settings buttons", async () => {
    const user = setupUser();
    const loader = createDeferredLoader(MOCK_SETTINGS, 0);
    render(<SettingsPage loadSettings={loader} />);
    await flushTimers(0);

    const exportCSVBtn = screen.getByTestId("export-csv-btn");
    const activationSpy = jest.fn();

    exportCSVBtn.addEventListener("click", activationSpy);
    exportCSVBtn.focus();

    // Press all arrow keys — focus should remain on the button
    await user.keyboard("{ArrowRight}{ArrowDown}{ArrowLeft}{ArrowUp}");

    expect(exportCSVBtn).toHaveFocus();
    expect(activationSpy).not.toHaveBeenCalled();
  });

  it("activates the Export CSV button with Enter", async () => {
    const user = setupUser();
    const loader = createDeferredLoader(MOCK_SETTINGS, 0);
    render(<SettingsPage loadSettings={loader} />);
    await flushTimers(0);

    const exportCSVBtn = screen.getByTestId("export-csv-btn");
    exportCSVBtn.focus();
    await user.keyboard("{Enter}");

    // After Enter, the export announcement should be visible
    expect(
      screen.getByText(copy.settings.exportAnnounceCSV)
    ).toBeInTheDocument();
  });

  it("activates the Export JSON button with Enter", async () => {
    const user = setupUser();
    const loader = createDeferredLoader(MOCK_SETTINGS, 0);
    render(<SettingsPage loadSettings={loader} />);
    await flushTimers(0);

    const exportJSONBtn = screen.getByTestId("export-json-btn");
    exportJSONBtn.focus();
    await user.keyboard("{Enter}");

    expect(
      screen.getByText(copy.settings.exportAnnounceJSON)
    ).toBeInTheDocument();
  });

  it("opens and closes the inline edit row with Enter and Escape", async () => {
    const user = setupUser();
    const loader = createDeferredLoader(MOCK_SETTINGS, 0);
    render(<SettingsPage loadSettings={loader} />);
    await flushTimers(0);

    // The first setting item has a "wallet" category, so it renders an "Edit" button
    // Wait for the settings list items to render
    const settingsList = screen.getByRole("list", { name: "Settings list" });
    const listItems = within(settingsList).getAllByRole("listitem");
    expect(listItems.length).toBeGreaterThanOrEqual(1);

    // Find the first setting item that has an "Edit" button (wallet category items)
    // or a copy button
    const firstItem = listItems[0];
    const editButton = within(firstItem).queryByRole("button", { name: /edit/i });
    const copyButton = within(firstItem).queryByRole("button", { name: /copy/i });

    // Test keyboard interaction with the copy button (present on all items)
    if (copyButton) {
      copyButton.focus();
      expect(copyButton).toHaveFocus();

      // Copy button should activate with Enter
      await user.keyboard("{Enter}");
      expect(copyToClipboard).toHaveBeenCalledTimes(1);
    }

    // If there's an Edit button, test Enter to enter edit mode and Escape to exit
    if (editButton) {
      editButton.focus();
      await user.keyboard("{Enter}");

      // After Enter, the edit input should appear
      const editInput = within(firstItem).queryByRole("textbox");
      expect(editInput).toBeInTheDocument();
      expect(editInput).toHaveFocus();

      // Escape should cancel editing and restore focus
      await user.keyboard("{Escape}");
      expect(editButton).toHaveFocus();
    }
  });

  it("follows tab order through the settings list items to the load-more button", async () => {
    const user = setupUser();
    const loader = createDeferredLoader(MOCK_SETTINGS, 0);
    render(<SettingsPage loadSettings={loader} />);
    await flushTimers(0);

    // After the search input, Tab should reach the first list item's copy button
    const searchInput = screen.getByTestId("settings-search-filter");
    searchInput.focus();

    // Tab through each list item's copy button
    const settingsList = screen.getByRole("list", { name: "Settings list" });
    const listItems = within(settingsList).getAllByRole("listitem");

    for (const item of listItems) {
      const copyBtn = within(item).queryByRole("button", { name: /copy/i });
      if (copyBtn) {
        await user.tab();
        expect(copyBtn).toHaveFocus();
      }
    }

    // After the last copy button, Tab should reach the Load more button
    const loadMoreBtn = screen.getByTestId("settings-load-more");
    await user.tab();
    expect(loadMoreBtn).toHaveFocus();
  });

  it("does not move focus when arrow keys are pressed on the density toggle", async () => {
    const user = setupUser();
    const loader = createDeferredLoader(MOCK_SETTINGS, 0);
    render(<SettingsPage loadSettings={loader} />);
    await flushTimers(0);

    const densitySection = screen.getByTestId("settings-density-section");
    const densityButtons = within(densitySection).getAllByRole("button");
    const compactBtn = densityButtons[0];
    const activationSpy = jest.fn();

    compactBtn.addEventListener("click", activationSpy);
    compactBtn.focus();

    await user.keyboard("{ArrowRight}{ArrowDown}{ArrowLeft}{ArrowUp}");

    // Arrow keys should not trigger a click on the density button
    // (aria-pressed buttons are activated by Space, not arrow keys)
    expect(compactBtn).toHaveFocus();
    expect(activationSpy).not.toHaveBeenCalled();
  });
});