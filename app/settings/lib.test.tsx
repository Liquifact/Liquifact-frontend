/**
 * @file app/settings/lib.test.tsx
 *
 * Focused compatibility-contract tests for `app/settings/lib.js` (issue #1229).
 *
 * These pin the public surface that other modules and tests rely on:
 *   - `MOCK_SETTINGS` is a frozen, non-empty, well-formed fixture array.
 *   - `loadMockSettings` always resolves to an array and never rejects, for
 *     valid, invalid, malformed-signal, aborted, and production inputs.
 *   - `getCategoryList` returns a stable `["all", ...]` list of string
 *     categories for valid, empty, and malformed input.
 *   - `getSettingById` is total (never throws) and type-guarded.
 *   - `getCategories` stays a working back-compat alias.
 */

import {
  MOCK_SETTINGS,
  SETTINGS_CATEGORIES,
  loadMockSettings,
  getCategoryList,
  getCategories,
  getSettingById,
} from "./lib";

describe("MOCK_SETTINGS fixture contract", () => {
  it("is a non-empty array", () => {
    expect(Array.isArray(MOCK_SETTINGS)).toBe(true);
    expect(MOCK_SETTINGS.length).toBeGreaterThan(0);
  });

  it("is frozen, and so are its rows (single source of truth)", () => {
    expect(Object.isFrozen(MOCK_SETTINGS)).toBe(true);
    for (const row of MOCK_SETTINGS) {
      expect(Object.isFrozen(row)).toBe(true);
    }
  });

  it("rejects in-place mutation of the array and its rows", () => {
    expect(() => {
      "use strict";
      (MOCK_SETTINGS as any).push({
        id: "injected",
        category: "display",
        label: "x",
        type: "toggle",
        value: "v",
        description: "d",
      });
    }).toThrow();

    expect(() => {
      "use strict";
      (MOCK_SETTINGS[0] as any).value = "tampered";
    }).toThrow();

    expect(MOCK_SETTINGS[0].value).not.toBe("tampered");
  });

  it("uses unique ids", () => {
    const ids = new Set(MOCK_SETTINGS.map((s: any) => s.id));
    expect(ids.size).toBe(MOCK_SETTINGS.length);
  });

  it("gives every row the documented string fields", () => {
    for (const row of MOCK_SETTINGS as any[]) {
      expect(typeof row.id).toBe("string");
      expect(typeof row.category).toBe("string");
      expect(typeof row.label).toBe("string");
      expect(typeof row.type).toBe("string");
      expect(typeof row.value).toBe("string");
      expect(typeof row.description).toBe("string");
    }
  });

  it("only uses categories declared in SETTINGS_CATEGORIES", () => {
    for (const row of MOCK_SETTINGS as any[]) {
      expect(SETTINGS_CATEGORIES).toContain(row.category);
    }
  });
});

describe("loadMockSettings", () => {
  beforeEach(() => {
    delete (window as any).__TEST_MOCK_SETTINGS__;
  });

  afterEach(() => {
    delete (window as any).__TEST_MOCK_SETTINGS__;
  });

  it("resolves with MOCK_SETTINGS when no override is present", async () => {
    await expect(loadMockSettings()).resolves.toBe(MOCK_SETTINGS);
  });

  it("honours an array test override by reference", async () => {
    const override = [
      { id: "x", category: "display", label: "x", type: "toggle", value: "v", description: "d" },
    ];
    (window as any).__TEST_MOCK_SETTINGS__ = override;
    await expect(loadMockSettings()).resolves.toBe(override);
  });

  it("honours an empty-array override (clears the fixture)", async () => {
    const override: any[] = [];
    (window as any).__TEST_MOCK_SETTINGS__ = override;
    await expect(loadMockSettings()).resolves.toBe(override);
  });

  it("ignores a non-array override so the result is always an array", async () => {
    (window as any).__TEST_MOCK_SETTINGS__ = { unexpected: "shape" };
    const result = await loadMockSettings();
    expect(Array.isArray(result)).toBe(true);
    expect(result).toBe(MOCK_SETTINGS);
  });

  it("ignores the test override in production builds", async () => {
    const original = process.env.NODE_ENV;
    (window as any).__TEST_MOCK_SETTINGS__ = [{ id: "prod-should-ignore" }];
    process.env.NODE_ENV = "production";
    try {
      await expect(loadMockSettings()).resolves.toBe(MOCK_SETTINGS);
    } finally {
      process.env.NODE_ENV = original;
    }
  });

  it("resolves to an empty array for a pre-aborted signal", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(loadMockSettings({ signal: controller.signal })).resolves.toEqual([]);
  });

  it("resolves to an empty array when aborted mid-flight", async () => {
    const controller = new AbortController();
    const promise = loadMockSettings({ signal: controller.signal });
    controller.abort();
    await expect(promise).resolves.toEqual([]);
  });

  it("lets an aborted signal win over the test override", async () => {
    (window as any).__TEST_MOCK_SETTINGS__ = [{ id: "override" }];
    const controller = new AbortController();
    controller.abort();
    await expect(loadMockSettings({ signal: controller.signal })).resolves.toEqual([]);
  });

  it("tolerates a malformed signal instead of throwing", async () => {
    await expect(loadMockSettings({ signal: {} })).resolves.toBe(MOCK_SETTINGS);
    await expect(loadMockSettings({ signal: 123 })).resolves.toBe(MOCK_SETTINGS);
  });

  it("tolerates null / non-object options", async () => {
    await expect(loadMockSettings(null)).resolves.toBe(MOCK_SETTINGS);
    await expect((loadMockSettings as any)(undefined)).resolves.toBe(MOCK_SETTINGS);
  });

  it("never rejects for any of the adverse option shapes", async () => {
    const inputs: any[] = [undefined, null, {}, { signal: null }, { signal: {} }, { signal: "n" }];
    for (const input of inputs) {
      await expect((loadMockSettings as any)(input)).resolves.toBeDefined();
    }
  });
});

describe("getCategoryList", () => {
  it("prepends 'all' and returns distinct categories sorted", () => {
    const out = getCategoryList(MOCK_SETTINGS);
    expect(out[0]).toBe("all");
    const tail = out.slice(1);
    expect(tail).toEqual([...tail].sort());
    expect(new Set(tail).size).toBe(tail.length);
  });

  it("returns just ['all'] for non-array input", () => {
    expect(getCategoryList(null)).toEqual(["all"]);
    expect(getCategoryList(undefined)).toEqual(["all"]);
    expect(getCategoryList("display")).toEqual(["all"]);
  });

  it("returns just ['all'] for an empty list", () => {
    expect(getCategoryList([])).toEqual(["all"]);
  });

  it("ignores malformed rows: missing, null, numeric, and empty-string categories", () => {
    const malformed = [
      { category: "display" },
      { category: "display" },
      {},
      null,
      { category: null },
      { category: 7 },
      { category: "" },
    ];
    expect(getCategoryList(malformed)).toEqual(["all", "display"]);
  });

  it("is deterministic across repeated calls", () => {
    expect(getCategoryList(MOCK_SETTINGS)).toEqual(getCategoryList(MOCK_SETTINGS));
  });

  it("exposes getCategories as a back-compat alias", () => {
    expect(getCategories).toBe(getCategoryList);
    expect(getCategories(MOCK_SETTINGS)).toEqual(getCategoryList(MOCK_SETTINGS));
  });
});

describe("getSettingById", () => {
  it("returns a known row by id", () => {
    const row = getSettingById("pref-001");
    expect(row).toBeDefined();
    expect(row.id).toBe("pref-001");
  });

  it("returns undefined for an unknown id", () => {
    expect(getSettingById("does-not-exist")).toBeUndefined();
  });

  it.each([undefined, null, 123, {}, [], true])(
    "returns undefined (never throws) for non-string id %p",
    (id) => {
      expect(() => getSettingById(id as any)).not.toThrow();
      expect(getSettingById(id as any)).toBeUndefined();
    }
  );

  it("returns the frozen fixture row (callers cannot mutate the source)", () => {
    expect(Object.isFrozen(getSettingById("pref-001"))).toBe(true);
  });
});
