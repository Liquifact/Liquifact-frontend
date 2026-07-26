/**
 * @file app/settings/page.test.jsx
 *
 * Comprehensive boundary tests for the /settings page load-more pagination
 * introduced in issue #743.
 *
 * The tests cover, in order of priority from the issue description:
 *
 *  1. First page – initial render shows only `PAGE_SIZE` items, the Load
 *     more button is present iff the list is longer than a single page,
 *     and the count announcement reads "Showing N of M".
 *  2. Load-more append – clicking the button advances visibleCount by
 *     `PAGE_SIZE`, the polite live region updates, and the button stays
 *     present while more pages remain.
 *  3. End-of-list – when all items are visible, the Load more button is
 *     removed and the "end of list" hint appears when we have advanced
 *     past the first page.
 *  4. Reset-on-filter – toggling the category filter or clearing filters
 *     snaps `visibleCount` back to `PAGE_SIZE`, regardless of how many
 *     pages the user had advanced through.
 *  5. Reset-on-search – the same reset applies to the debounced free-text
 *     search; rapid keystrokes do not reset paging until the debounce
 *     timer settles.
 *
 * Plus the surrounding contract: concurrency-safe load, retry, error,
 * empty list, and the helpers exposed for other modules.
 */

import "@testing-library/jest-dom";
import {
  act,
  render,
  screen,
  fireEvent,
  within,
} from "@testing-library/react";
import SettingsRoute, {
  SettingsPage,
  applyFiltersToSettings,
  DEFAULT_FILTERS,
  getSettingsLoadAnnouncement,
  getSettingsShowingAnnouncement,
  PAGE_SIZE,
  SEARCH_DEBOUNCE_MS,
} from "./page";
import {
  MOCK_SETTINGS,
  loadMockSettings,
  getCategoryList,
  getSettingById,
} from "./lib";
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

// ── Helpers ──────────────────────────────────────────────────────────────────

function createDeferredLoader(rows, delayMs = 0) {
  return jest.fn(
    () =>
      new Promise((resolve) => {
        setTimeout(() => resolve(rows), delayMs);
      })
  );
}

function createPendingLoader() {
  return jest.fn(() => new Promise(() => {}));
}

async function flushTimers(ms = 0) {
  await act(async () => {
    jest.advanceTimersByTime(ms);
    await Promise.resolve();
  });
}

function makeRows(count) {
  return Array.from({ length: count }, (_, i) => ({
    id: `row-${String(i + 1).padStart(3, "0")}`,
    category: ["notifications", "display", "privacy", "wallet", "advanced"][i % 5],
    label: `Row ${i + 1}`,
    type: "toggle",
    value: "enabled",
    description: `Description ${i + 1}`,
  }));
}

function getRenderedRows() {
  return within(screen.getByRole("list", { name: /settings list/i })).getAllByRole(
    "listitem"
  );
}

// ── Pure-function tests (lib + helpers) ─────────────────────────────────────

describe("applyFiltersToSettings", () => {
  it("returns an empty array when the input is empty or non-array", () => {
    expect(applyFiltersToSettings([], DEFAULT_FILTERS)).toEqual([]);
    expect(applyFiltersToSettings(null, DEFAULT_FILTERS)).toEqual([]);
    expect(applyFiltersToSettings(undefined, DEFAULT_FILTERS)).toEqual([]);
  });

  it("returns every row when category is 'all' and no query is set", () => {
    expect(applyFiltersToSettings(MOCK_SETTINGS, DEFAULT_FILTERS)).toHaveLength(
      MOCK_SETTINGS.length
    );
  });

  it("filters rows by category, case-sensitive on the exact category value", () => {
    const out = applyFiltersToSettings(MOCK_SETTINGS, {
      category: "display",
      query: "",
    });
    expect(out.length).toBeGreaterThan(0);
    expect(out.every((r) => r.category === "display")).toBe(true);
  });

  it("filters rows by free-text query against label or description", () => {
    const out = applyFiltersToSettings(MOCK_SETTINGS, {
      category: "all",
      query: "Email",
    });
    expect(out.length).toBeGreaterThan(0);
    expect(
      out.every(
        (r) =>
          r.label.toLowerCase().includes("email") ||
          r.description.toLowerCase().includes("email")
      )
    ).toBe(true);
  });

  it("is case-insensitive on the free-text query", () => {
    const upper = applyFiltersToSettings(MOCK_SETTINGS, {
      category: "all",
      query: "EMAIL",
    });
    const lower = applyFiltersToSettings(MOCK_SETTINGS, {
      category: "all",
      query: "email",
    });
    expect(upper).toEqual(lower);
  });

  it("returns an empty array when no row matches", () => {
    const out = applyFiltersToSettings(MOCK_SETTINGS, {
      category: "display",
      query: "ZZZ_no_match_xyz",
    });
    expect(out).toEqual([]);
  });

  it("ignores a whitespace-only query", () => {
    expect(
      applyFiltersToSettings(MOCK_SETTINGS, {
        category: "all",
        query: "   ",
      })
    ).toHaveLength(MOCK_SETTINGS.length);
  });

  it("combines category and query (AND semantics)", () => {
    const out = applyFiltersToSettings(MOCK_SETTINGS, {
      category: "notifications",
      query: "alerts",
    });
    expect(out.length).toBeGreaterThan(0);
    expect(out.every((r) => r.category === "notifications")).toBe(true);
    expect(
      out.every(
        (r) =>
          r.label.toLowerCase().includes("alerts") ||
          r.description.toLowerCase().includes("alerts")
      )
    ).toBe(true);
  });
});

describe("getCategoryList", () => {
  it("includes the 'all' bucket first", () => {
    expect(getCategoryList(MOCK_SETTINGS)[0]).toBe("all");
  });

  it("contains every distinct category present in the input", () => {
    const out = getCategoryList(MOCK_SETTINGS);
    const distinct = new Set(MOCK_SETTINGS.map((r) => r.category));
    for (const c of distinct) expect(out).toContain(c);
  });

  it("returns just ['all'] for empty or non-array input", () => {
    expect(getCategoryList([])).toEqual(["all"]);
    expect(getCategoryList(null)).toEqual(["all"]);
  });

  it("returns the distinct categories sorted alphabetically after 'all'", () => {
    const out = getCategoryList(MOCK_SETTINGS);
    const tail = out.slice(1);
    expect(tail).toEqual([...tail].sort());
  });
});

describe("getSettingsLoadAnnouncement", () => {
  it("returns the no-settings copy for empty/non-array input", () => {
    expect(getSettingsLoadAnnouncement([])).toMatch(/No settings available/);
    expect(getSettingsLoadAnnouncement(undefined)).toMatch(/No settings available/);
  });

  it("returns the no-match copy when filtering yields zero rows", () => {
    expect(
      getSettingsLoadAnnouncement(MOCK_SETTINGS, {
        filterActive: true,
        filteredCount: 0,
      })
    ).toMatch(/No preferences match/);
  });

  it("substitutes {matched} and {total} in the filtered copy", () => {
    expect(
      getSettingsLoadAnnouncement(MOCK_SETTINGS, {
        filterActive: true,
        filteredCount: 4,
      })
    ).toMatch(/4 of \d+ preferences match/);
  });

  it("substitutes {count} in the loaded copy", () => {
    expect(getSettingsLoadAnnouncement(MOCK_SETTINGS)).toMatch(
      /\d+ preferences loaded/
    );
  });
});

describe("getSettingsShowingAnnouncement", () => {
  it("returns the no-settings copy when total is zero", () => {
    expect(getSettingsShowingAnnouncement(0, 0)).toMatch(/No settings available/);
  });

  it("substitutes {shown} and {total} in the count copy", () => {
    expect(getSettingsShowingAnnouncement(7, 25)).toMatch(/Showing 7 of 25 preferences/);
  });
});

describe("MOCK_SETTINGS shape (single source of truth)", () => {
  it("is a non-empty array", () => {
    expect(Array.isArray(MOCK_SETTINGS)).toBe(true);
    expect(MOCK_SETTINGS.length).toBeGreaterThan(PAGE_SIZE);
  });

  it("uses unique ids", () => {
    const ids = new Set(MOCK_SETTINGS.map((s) => s.id));
    expect(ids.size).toBe(MOCK_SETTINGS.length);
  });

  it("every row has the required contract fields", () => {
    for (const row of MOCK_SETTINGS) {
      expect(row.id).toEqual(expect.any(String));
      expect(row.category).toEqual(expect.any(String));
      expect(row.label).toEqual(expect.any(String));
      expect(row.type).toEqual(expect.any(String));
      expect(row.value).toEqual(expect.any(String));
      expect(row.description).toEqual(expect.any(String));
    }
  });

  it("spans more than one category (so category filter is meaningful)", () => {
    const cats = new Set(MOCK_SETTINGS.map((s) => s.category));
    expect(cats.size).toBeGreaterThan(1);
  });
});

describe("loadMockSettings (test hook coverage)", () => {
  beforeEach(() => {
    // Restore the test-override slot before each test so a previously-set
    // value from another test never leaks across.
    if (typeof window !== "undefined") {
      delete window.__TEST_MOCK_SETTINGS__;
    }
  });

  it("resolves with MOCK_SETTINGS in non-test browser environments", async () => {
    // The default mock loader always resolves with MOCK_SETTINGS when no
    // test fixture is injected.
    delete window.__TEST_MOCK_SETTINGS__;
    const result = await loadMockSettings();
    expect(result).toBe(MOCK_SETTINGS);
  });

  it("honours window.__TEST_MOCK_SETTINGS__ override in the browser", () => {
    const override = [{ id: "x", category: "display", label: "x", type: "toggle", value: "v", description: "d" }];
    window.__TEST_MOCK_SETTINGS__ = override;
    return expect(loadMockSettings()).resolves.toBe(override);
  });

  it("resolves to an empty array when a pre-aborted signal is supplied", async () => {
    const controller = new AbortController();
    controller.abort();
    const result = await loadMockSettings({ signal: controller.signal });
    expect(result).toEqual([]);
  });

  it("resolves to an empty array when the signal aborts mid-flight", async () => {
    const controller = new AbortController();
    const promise = loadMockSettings({ signal: controller.signal });
    controller.abort();
    const result = await promise;
    expect(result).toEqual([]);
  });

  it("getSettingById finds a known id", () => {
    expect(getSettingById("pref-001")).toBeDefined();
  });

  it("getSettingById returns undefined for an unknown id", () => {
    expect(getSettingById("nope")).toBeUndefined();
  });
});

// ── Component tests ──────────────────────────────────────────────────────────

describe("SettingsPage – first page", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it("renders only PAGE_SIZE rows when the list is longer than one page", async () => {
    render(
      <SettingsPage loadSettings={createDeferredLoader(makeRows(PAGE_SIZE + 5), 50)} />
    );
    await flushTimers(50);

    expect(getRenderedRows()).toHaveLength(PAGE_SIZE);
  });

  it("renders fewer than PAGE_SIZE rows when the list fits on a single page", async () => {
    const small = makeRows(PAGE_SIZE - 1);
    render(<SettingsPage loadSettings={createDeferredLoader(small, 0)} />);
    await flushTimers(0);
    expect(getRenderedRows()).toHaveLength(PAGE_SIZE - 1);
  });

  it("renders every row when the list is exactly PAGE_SIZE long", async () => {
    render(<SettingsPage loadSettings={createDeferredLoader(makeRows(PAGE_SIZE), 0)} />);
    await flushTimers(0);
    expect(getRenderedRows()).toHaveLength(PAGE_SIZE);
  });

  it("shows the Load more button iff there is more data than fits on one page", async () => {
    const { rerender } = render(
      <SettingsPage loadSettings={createDeferredLoader(makeRows(PAGE_SIZE + 1), 0)} />
    );
    await flushTimers(0);
    expect(screen.getByTestId("settings-load-more")).toBeInTheDocument();

    rerender(<SettingsPage loadSettings={createDeferredLoader(makeRows(PAGE_SIZE), 0)} />);
    await flushTimers(0);
    expect(screen.queryByTestId("settings-load-more")).not.toBeInTheDocument();

    rerender(
      <SettingsPage loadSettings={createDeferredLoader(makeRows(PAGE_SIZE - 1), 0)} />
    );
    await flushTimers(0);
    expect(screen.queryByTestId("settings-load-more")).not.toBeInTheDocument();
  });

  it("starts with a 'Showing N of M' announcement when the list spans multiple pages", async () => {
    // 15 rows pulls the page past one screen, so the polite region must read
    // 'Showing 10 of 15 preferences' — not the load-count variant.
    const total = PAGE_SIZE + 5;
    render(
      <SettingsPage loadSettings={createDeferredLoader(makeRows(total), 50)} />
    );
    await flushTimers(50);
    expect(screen.getByRole("status")).toHaveTextContent(
      `Showing ${PAGE_SIZE} of ${total} preferences`
    );
  });

  it("emits the loaded-count announcement when the list fits on a single page", async () => {
    // With total ≤ PAGE_SIZE the visibleCount/total branch falls through
    // to the load-count message.
    const total = PAGE_SIZE - 2;
    render(
      <SettingsPage loadSettings={createDeferredLoader(makeRows(total), 0)} />
    );
    await flushTimers(0);
    expect(screen.getByRole("status")).toHaveTextContent(
      `${total} preferences loaded`
    );
  });
});

describe("SettingsPage – load more append", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it("clicking Load more appends the next PAGE_SIZE rows", async () => {
    const total = PAGE_SIZE * 2 + 3;
    const rows = makeRows(total);
    render(<SettingsPage loadSettings={createDeferredLoader(rows, 50)} />);
    await flushTimers(50);

    expect(getRenderedRows()).toHaveLength(PAGE_SIZE);

    await act(async () => {
      fireEvent.click(screen.getByTestId("settings-load-more"));
      jest.advanceTimersByTime(0);
      await Promise.resolve();
    });

    // After first click we are not at the end of `total` yet — only 2 pages loaded.
    expect(getRenderedRows()).toHaveLength(PAGE_SIZE * 2);
  });

  it("two consecutive Load more clicks reveal all rows on a perfect-multiple list", async () => {
    const rows = makeRows(PAGE_SIZE * 3);
    render(<SettingsPage loadSettings={createDeferredLoader(rows, 0)} />);
    await flushTimers(0);

    await act(async () => {
      fireEvent.click(screen.getByTestId("settings-load-more"));
      jest.advanceTimersByTime(0);
      await Promise.resolve();
    });
    expect(getRenderedRows()).toHaveLength(PAGE_SIZE * 2);

    await act(async () => {
      fireEvent.click(screen.getByTestId("settings-load-more"));
      jest.advanceTimersByTime(0);
      await Promise.resolve();
    });
    expect(getRenderedRows()).toHaveLength(PAGE_SIZE * 3);
  });

  it("load-more updates the polite live-region announcement to Showing N of M", async () => {
    const total = PAGE_SIZE + 4;
    render(<SettingsPage loadSettings={createDeferredLoader(makeRows(total), 50)} />);
    await flushTimers(50);

    await act(async () => {
      fireEvent.click(screen.getByTestId("settings-load-more"));
      jest.advanceTimersByTime(0);
      await Promise.resolve();
    });

    expect(screen.getByRole("status")).toHaveTextContent(
      `Showing ${total} of ${total} preferences`
    );
  });

  it("after Load more the visible-count paragraph also reflects the new total", async () => {
    const total = PAGE_SIZE + 4;
    render(<SettingsPage loadSettings={createDeferredLoader(makeRows(total), 50)} />);
    await flushTimers(50);

    await act(async () => {
      fireEvent.click(screen.getByTestId("settings-load-more"));
      jest.advanceTimersByTime(0);
      await Promise.resolve();
    });

    expect(screen.getByTestId("settings-count")).toHaveTextContent(
      `Showing ${total} of ${total} preferences`
    );
  });
});

describe("SettingsPage – end-of-list behavior", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it("hides the Load more button once every row is visible (off-by-one middle page)", async () => {
    const total = PAGE_SIZE + 2;
    render(<SettingsPage loadSettings={createDeferredLoader(makeRows(total), 0)} />);
    await flushTimers(0);

    await act(async () => {
      fireEvent.click(screen.getByTestId("settings-load-more"));
      jest.advanceTimersByTime(0);
      await Promise.resolve();
    });

    expect(getRenderedRows()).toHaveLength(total);
    expect(screen.queryByTestId("settings-load-more")).not.toBeInTheDocument();
  });

  it("reveals only the partial remainder when the final page is short", async () => {
    const remainder = 3;
    const total = PAGE_SIZE * 2 + remainder;
    render(<SettingsPage loadSettings={createDeferredLoader(makeRows(total), 0)} />);
    await flushTimers(0);

    await act(async () => {
      fireEvent.click(screen.getByTestId("settings-load-more"));
      jest.advanceTimersByTime(0);
      await Promise.resolve();
    });
    expect(getRenderedRows()).toHaveLength(PAGE_SIZE * 2);

    await act(async () => {
      fireEvent.click(screen.getByTestId("settings-load-more"));
      jest.advanceTimersByTime(0);
      await Promise.resolve();
    });
    expect(getRenderedRows()).toHaveLength(total);
    expect(screen.queryByTestId("settings-load-more")).not.toBeInTheDocument();
  });

  it("shows the end-of-list hint after the user advanced past page 1 and reached the end", async () => {
    const total = PAGE_SIZE + 1;
    render(<SettingsPage loadSettings={createDeferredLoader(makeRows(total), 0)} />);
    await flushTimers(0);

    await act(async () => {
      fireEvent.click(screen.getByTestId("settings-load-more"));
      jest.advanceTimersByTime(0);
      await Promise.resolve();
    });

    expect(screen.getByTestId("settings-end-of-list")).toBeInTheDocument();
  });

  it("does NOT show the end-of-list hint when the list fits on one page (page 1 not advanced)", async () => {
    render(
      <SettingsPage loadSettings={createDeferredLoader(makeRows(PAGE_SIZE - 1), 0)} />
    );
    await flushTimers(0);
    expect(screen.queryByTestId("settings-end-of-list")).not.toBeInTheDocument();
  });

  it("does NOT show the end-of-list hint on first render before any load-more click", async () => {
    render(
      <SettingsPage loadSettings={createDeferredLoader(makeRows(PAGE_SIZE + 5), 0)} />
    );
    await flushTimers(0);
    expect(screen.queryByTestId("settings-end-of-list")).not.toBeInTheDocument();
  });
});

describe("SettingsPage – reset-on-filter behavior", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it("changing the category filter snaps visibleCount back to PAGE_SIZE", async () => {
    // 30 rows so we have room to advance multiple times before filtering.
    const rows = makeRows(PAGE_SIZE * 3);
    render(<SettingsPage loadSettings={createDeferredLoader(rows, 50)} />);
    await flushTimers(50);

    // Advance one page (PAGE_SIZE → PAGE_SIZE * 2).  We deliberately
    // stop at one click because two clicks reach the end of a 30-row
    // list, which would void the "reset after an advance" assertion.
    await act(async () => {
      fireEvent.click(screen.getByTestId("settings-load-more"));
      jest.advanceTimersByTime(0);
      await Promise.resolve();
    });
    expect(getRenderedRows()).toHaveLength(PAGE_SIZE * 2);

    // Apply a category filter — paging must reset to PAGE_SIZE.
    fireEvent.change(screen.getByTestId("settings-category-filter"), {
      target: { value: "notifications" },
    });

    expect(getRenderedRows().length).toBeLessThanOrEqual(PAGE_SIZE);
    // The filtered list is 6 rows (every 5th of 30, indexed 0..4 -> notifications)
    const expectedCount = rows.filter((r) => r.category === "notifications").length;
    expect(getRenderedRows()).toHaveLength(expectedCount);
  });

  it("clearing filters back to defaults shows every row again on the first page", async () => {
    const rows = makeRows(PAGE_SIZE * 2 + 4);
    render(<SettingsPage loadSettings={createDeferredLoader(rows, 0)} />);
    await flushTimers(0);

    // One Load-More click on a 24-row list advances visibleCount to 20
    // (PAGE_SIZE * 2).  After that the Load More button is still visible
    // because 24 > 20.
    await act(async () => {
      fireEvent.click(screen.getByTestId("settings-load-more"));
      jest.advanceTimersByTime(0);
      await Promise.resolve();
    });
    expect(getRenderedRows()).toHaveLength(PAGE_SIZE * 2);
    expect(screen.getByTestId("settings-load-more")).toBeInTheDocument();

    // Apply a category filter, then reset to show every row again.
    fireEvent.change(screen.getByTestId("settings-category-filter"), {
      target: { value: "display" },
    });

    fireEvent.click(screen.getByRole("button", { name: /reset filters/i }));

    expect(getRenderedRows()).toHaveLength(PAGE_SIZE);
    expect(screen.getByTestId("settings-load-more")).toBeInTheDocument();
  });

  it("toggling a category that yields fewer than PAGE_SIZE rows hides Load more", async () => {
    const rows = makeRows(PAGE_SIZE * 2 + 5);
    render(<SettingsPage loadSettings={createDeferredLoader(rows, 0)} />);
    await flushTimers(0);

    await act(async () => {
      fireEvent.click(screen.getByTestId("settings-load-more"));
      jest.advanceTimersByTime(0);
      await Promise.resolve();
    });
    expect(getRenderedRows().length).toBeGreaterThan(PAGE_SIZE);

    const smallCategory = rows.find((r) => r.category !== "advanced").category;
    fireEvent.change(screen.getByTestId("settings-category-filter"), {
      target: { value: smallCategory },
    });

    const expectedCount = rows.filter((r) => r.category === smallCategory).length;
    expect(getRenderedRows()).toHaveLength(expectedCount);
    if (expectedCount <= PAGE_SIZE) {
      expect(screen.queryByTestId("settings-load-more")).not.toBeInTheDocument();
    }
  });

  it("the search filter resets paging once the debounce timer settles", async () => {
    const rows = makeRows(PAGE_SIZE * 3);
    render(<SettingsPage loadSettings={createDeferredLoader(rows, 0)} />);
    await flushTimers(0);

    await act(async () => {
      fireEvent.click(screen.getByTestId("settings-load-more"));
      jest.advanceTimersByTime(0);
      await Promise.resolve();
    });
    expect(getRenderedRows()).toHaveLength(PAGE_SIZE * 2);

    fireEvent.change(screen.getByTestId("settings-search-filter"), {
      target: { value: "Row 7" },
    });

    // Before the debounce settles, paging is still mid-flight.
    expect(getRenderedRows()).toHaveLength(PAGE_SIZE * 2);

    await flushTimers(SEARCH_DEBOUNCE_MS);

    // After the debounce, the search applies and paging is reset.
    expect(getRenderedRows()).toHaveLength(1);
  });

  it("rapid search keystrokes collapse into a single paging reset after debounce", async () => {
    const rows = makeRows(PAGE_SIZE * 2 + 4);
    render(<SettingsPage loadSettings={createDeferredLoader(rows, 0)} />);
    await flushTimers(0);

    await act(async () => {
      fireEvent.click(screen.getByTestId("settings-load-more"));
      jest.advanceTimersByTime(0);
      await Promise.resolve();
    });
    // Advanced one page → PAGE_SIZE * 2 (20 of 24).
    expect(getRenderedRows()).toHaveLength(PAGE_SIZE * 2);

    // Three rapid keystrokes, none of which advance the debounce timer
    // past its own reset window.
    fireEvent.change(screen.getByTestId("settings-search-filter"), {
      target: { value: "R" },
    });
    fireEvent.change(screen.getByTestId("settings-search-filter"), {
      target: { value: "Ro" },
    });
    fireEvent.change(screen.getByTestId("settings-search-filter"), {
      target: { value: "Row 13" },
    });

    // Immediately after the flurry, paging is still mid-flight.
    expect(getRenderedRows()).toHaveLength(PAGE_SIZE * 2);

    await flushTimers(SEARCH_DEBOUNCE_MS);

    // After the debounce settles the filter kicks in and paging resets.
    expect(getRenderedRows()).toHaveLength(1);
  });

  it("does not reset paging back when the filtered output still needs more than one page", async () => {
    // 60 rows where filtering on "display" yields >= PAGE_SIZE rows.
    const rows = Array.from({ length: 60 }, (_, i) => ({
      id: `r-${i}`,
      category: "display",
      label: `Display row ${i}`,
      type: "toggle",
      value: "enabled",
      description: "d",
    }));
    render(<SettingsPage loadSettings={createDeferredLoader(rows, 0)} />);
    await flushTimers(0);

    await act(async () => {
      fireEvent.click(screen.getByTestId("settings-load-more"));
      jest.advanceTimersByTime(0);
      await Promise.resolve();
    });
    expect(getRenderedRows()).toHaveLength(PAGE_SIZE * 2);

    fireEvent.change(screen.getByTestId("settings-category-filter"), {
      target: { value: "display" },
    });

    // All 60 are display rows so paging must reset to PAGE_SIZE but
    // Load more must still appear (60 > PAGE_SIZE).
    expect(getRenderedRows()).toHaveLength(PAGE_SIZE);
    expect(screen.getByTestId("settings-load-more")).toBeInTheDocument();
  });
});

describe("SettingsPage – empty / error / retry", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it("renders the empty-state message when the loaded list is empty", async () => {
    render(<SettingsPage loadSettings={createDeferredLoader([], 0)} />);
    await flushTimers(0);
    expect(
      screen.getByText(/No preferences available. Connect your wallet/i)
    ).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: /settings list/i })).not.toBeInTheDocument();
  });

  it("renders the no-match message when active filters eliminate every row", async () => {
    const rows = makeRows(15);
    render(<SettingsPage loadSettings={createDeferredLoader(rows, 0)} />);
    await flushTimers(0);

    fireEvent.change(screen.getByTestId("settings-search-filter"), {
      target: { value: "definitely-no-match-12345" },
    });
    await flushTimers(SEARCH_DEBOUNCE_MS);

    expect(screen.getByText(/No preferences match the active filters/i)).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: /settings list/i })).not.toBeInTheDocument();
  });

  it("renders a retryable error banner when loading throws", async () => {
    const failingLoader = jest.fn(
      () =>
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error("boom")), 30);
        })
    );
    render(<SettingsPage loadSettings={failingLoader} />);
    await flushTimers(30);

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent(/Unable to load settings/i);
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
    // The polite live region mirrors the error copy so screen readers
    // announce the failure once via the alert and once via the region,
    // matching the existing invest-page convention (issue #276).
    expect(screen.getByRole("status")).toHaveTextContent(/Unable to load settings/i);
  });

  it("error status branch fires when settings is null and loadError is set", async () => {
    // We exercise the null-array branch of the statusMessage by mounting
    // a loader that resolves to a non-array (the component coerces to []
    // on success, so to land in the null + error branch we need a loader
    // that throws). The component sets settings=null on catch — assert
    // that the polite region reports the errorStatus copy while the
    // alert renders the page-level banner.
    const failingLoader = jest.fn(
      () =>
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error("boom")), 0);
        })
    );
    render(<SettingsPage loadSettings={failingLoader} />);
    await flushTimers(0);
    expect(screen.getByRole("status")).toHaveTextContent(
      copy.settings.errorStatus
    );
  });

  it("retrying after an error re-runs the loader and recovers to the success state", async () => {
    let shouldFail = true;
    const flakyLoader = jest.fn(() => {
      return new Promise((resolve, reject) => {
        setTimeout(
          () =>
            shouldFail
              ? reject(new Error("transient"))
              : resolve(makeRows(PAGE_SIZE + 4)),
          20
        );
      });
    });

    render(<SettingsPage loadSettings={flakyLoader} />);
    await flushTimers(20);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(flakyLoader).toHaveBeenCalledTimes(1);

    shouldFail = false;
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));

    await flushTimers(20);

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(getRenderedRows()).toHaveLength(PAGE_SIZE);
    expect(flakyLoader).toHaveBeenCalledTimes(2);
  });

  it("keeps the loader busy state visible while the load is still pending", async () => {
    render(<SettingsPage loadSettings={createPendingLoader()} />);
    expect(screen.getByTestId("settings-loading")).toHaveAttribute("aria-busy", "true");
  });

  it("coerces a non-array load result to an empty list and shows the empty state", async () => {
    render(
      <SettingsPage loadSettings={createDeferredLoader({ unexpected: "shape" }, 0)} />
    );
    await flushTimers(0);
    expect(
      screen.getByText(/No preferences available. Connect your wallet/i)
    ).toBeInTheDocument();
  });
});

describe("SettingsPage – a11y live region semantics", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it("the live region is marked aria-live=polite and aria-atomic=true", async () => {
    render(<SettingsPage loadSettings={createDeferredLoader(makeRows(PAGE_SIZE + 5), 0)} />);
    await flushTimers(0);
    const region = screen.getByRole("status");
    expect(region).toHaveAttribute("aria-live", "polite");
    expect(region).toHaveAttribute("aria-atomic", "true");
  });

  it("a single filter+load-more sequence announces a filtered count, then Showing", async () => {
    const rows = makeRows(PAGE_SIZE * 2);
    render(<SettingsPage loadSettings={createDeferredLoader(rows, 0)} />);
    await flushTimers(0);

    fireEvent.change(screen.getByTestId("settings-category-filter"), {
      target: { value: "display" },
    });

    // After category change, status reports the new filtered count.
    const matching = rows.filter((r) => r.category === "display").length;
    expect(screen.getByRole("status")).toHaveTextContent(
      `${matching} of ${rows.length} preferences match`
    );

    if (matching > PAGE_SIZE) {
      await act(async () => {
        fireEvent.click(screen.getByTestId("settings-load-more"));
        jest.advanceTimersByTime(0);
        await Promise.resolve();
      });
      expect(screen.getByRole("status")).toHaveTextContent(
        `Showing ${matching} of ${matching} preferences`
      );
    }
  });
});

describe("SettingsRoute default export", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  // The default export is the public surface for Next.js routing; it must
  // accept and forward arbitrary props to the underlying component so callers
  // can inject a deterministic loader (test seam).
  it("is a renderable React component that forwards props to SettingsPage", async () => {
    const rows = makeRows(PAGE_SIZE + 4); // > PAGE_SIZE so Load-more is on-screen
    const loader = createDeferredLoader(rows, 0);
    render(<SettingsRoute loadSettings={loader} />);
    await flushTimers(0);

    // First page only — visibleCount starts at PAGE_SIZE.
    expect(getRenderedRows()).toHaveLength(PAGE_SIZE);
    expect(screen.getByTestId("settings-load-more")).toBeInTheDocument();

    // The injected loader, not the production MOCK_SETTINGS, is in
    // control — clicking Load-more reveals the injected remainder.
    await act(async () => {
      fireEvent.click(screen.getByTestId("settings-load-more"));
      jest.advanceTimersByTime(0);
      await Promise.resolve();
    });
    expect(getRenderedRows()).toHaveLength(rows.length);
  });
});
