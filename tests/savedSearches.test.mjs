import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  ERRORS,
  MAX_NAME_LENGTH,
  MAX_SAVED_SEARCHES,
  STORAGE_KEY,
  STORE_VERSION,
  canonicalQuery,
  listSavedSearches,
  normalizeName,
  removeSearch,
  renameSearch,
  saveSearch,
} from "../lib/savedSearches.js";
import { DEFAULTS } from "../lib/marketplaceQuery.js";

function memoryStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, String(v)),
    removeItem: (k) => data.delete(k),
    raw: () => data.get(STORAGE_KEY),
  };
}

const withRaw = (value) => memoryStorage({ [STORAGE_KEY]: value });

describe("normalizeName", () => {
  test("trims, collapses whitespace and caps the length", () => {
    assert.equal(normalizeName("  High   yield \n USDC  "), "High yield USDC");
    assert.equal(normalizeName("x".repeat(100)).length, MAX_NAME_LENGTH);
    assert.equal(normalizeName("   "), "");
    assert.equal(normalizeName(42), "");
    assert.equal(normalizeName(null), "");
  });
});

describe("canonicalQuery", () => {
  test("re-validates through parseQuery and drops pagination and view", () => {
    assert.equal(canonicalQuery("status=open&sort=yield_desc&page=4&view=table"), "status=open&sort=yield_desc");
    assert.equal(canonicalQuery("?status=bogus&minYield=123&currency=usdc"), "currency=USDC");
    assert.equal(canonicalQuery(new URLSearchParams("minYield=700")), "minYield=700");
  });

  test("accepts a filter state object", () => {
    assert.equal(canonicalQuery({ ...DEFAULTS, status: "funded", page: 3 }), "status=funded");
    assert.equal(canonicalQuery({}), "");
  });
});

describe("save / list", () => {
  test("persists presets in a versioned envelope and reads them back", () => {
    const storage = memoryStorage();
    const res = saveSearch("  Open USDC ", "status=open&currency=USDC", { storage, now: 1000 });
    assert.equal(res.ok, true);
    assert.equal(res.item.name, "Open USDC");
    assert.equal(res.item.query, "status=open&currency=USDC");

    const stored = JSON.parse(storage.raw());
    assert.equal(stored.version, STORE_VERSION);
    assert.equal(stored.items.length, 1);

    const list = listSavedSearches({ storage });
    assert.deepEqual(list, [{ id: res.item.id, name: "Open USDC", query: "status=open&currency=USDC", createdAt: 1000 }]);
  });

  test("rejects empty names", () => {
    const storage = memoryStorage();
    assert.deepEqual(saveSearch("   ", "status=open", { storage }), { ok: false, error: ERRORS.EMPTY_NAME, items: [] });
    assert.equal(storage.raw(), undefined);
  });

  test("names are unique case-insensitively unless overwrite is requested", () => {
    const storage = memoryStorage();
    const first = saveSearch("Weekly", "status=open", { storage });
    const dup = saveSearch("weekly", "status=funded", { storage });
    assert.equal(dup.ok, false);
    assert.equal(dup.error, ERRORS.DUPLICATE);
    assert.equal(listSavedSearches({ storage })[0].query, "status=open");

    const over = saveSearch("WEEKLY", "status=funded", { storage, overwrite: true });
    assert.equal(over.ok, true);
    assert.equal(over.item.id, first.item.id);
    const list = listSavedSearches({ storage });
    assert.equal(list.length, 1);
    assert.equal(list[0].query, "status=funded");
    assert.equal(list[0].name, "WEEKLY");
  });

  test(`caps the store at ${MAX_SAVED_SEARCHES} entries`, () => {
    const storage = memoryStorage();
    for (let i = 0; i < MAX_SAVED_SEARCHES; i++) {
      assert.equal(saveSearch(`Preset ${i}`, "status=open", { storage }).ok, true);
    }
    const over = saveSearch("One too many", "status=open", { storage });
    assert.equal(over.ok, false);
    assert.equal(over.error, ERRORS.LIMIT);
    assert.equal(listSavedSearches({ storage }).length, MAX_SAVED_SEARCHES);
    // Overwriting an existing name is still allowed at the cap.
    assert.equal(saveSearch("Preset 3", "status=funded", { storage, overwrite: true }).ok, true);
  });

  test("reports storage write failures without throwing", () => {
    const storage = {
      getItem: () => null,
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
    };
    const res = saveSearch("Name", "status=open", { storage });
    assert.equal(res.ok, false);
    assert.equal(res.error, ERRORS.STORAGE);
  });

  test("works as an empty list when storage is unavailable", () => {
    assert.deepEqual(listSavedSearches({ storage: null }), []);
    assert.equal(saveSearch("Name", "", { storage: null }).error, ERRORS.STORAGE);
  });
});

describe("corrupt storage is ignored safely", () => {
  test("invalid JSON, wrong shapes and unknown versions read as empty", () => {
    for (const raw of ["{not json", "null", "42", '"str"', "[]", '{"items":[]}', '{"version":99,"items":[{"id":"a","name":"n","query":""}]}', '{"version":1,"items":"nope"}']) {
      assert.deepEqual(listSavedSearches({ storage: withRaw(raw) }), [], raw);
    }
  });

  test("a throwing getItem reads as empty", () => {
    const storage = {
      getItem: () => {
        throw new Error("SecurityError");
      },
    };
    assert.deepEqual(listSavedSearches({ storage }), []);
  });

  test("malformed entries are dropped and queries re-validated", () => {
    const items = [
      { id: "a", name: "Good", query: "status=open&page=7", createdAt: 1 },
      { id: "b", name: "", query: "status=open" },
      { id: "c", name: "No query" },
      { name: "No id", query: "" },
      null,
      ["array"],
      { id: "d", name: "good", query: "status=funded" }, // duplicate name
      { id: "a", name: "Same id", query: "" }, // duplicate id
      { id: "e", name: "Hostile", query: "status=<script>&sort=drop_table&currency=$$$" },
    ];
    const list = listSavedSearches({ storage: withRaw(JSON.stringify({ version: 1, items })) });
    assert.deepEqual(
      list.map(({ id, name, query }) => ({ id, name, query })),
      [
        { id: "a", name: "Good", query: "status=open" },
        { id: "e", name: "Hostile", query: "" },
      ],
    );
  });

  test("an over-long stored list is truncated to the cap", () => {
    const items = Array.from({ length: 25 }, (_, i) => ({ id: `id${i}`, name: `P${i}`, query: "" }));
    const list = listSavedSearches({ storage: withRaw(JSON.stringify({ version: 1, items })) });
    assert.equal(list.length, MAX_SAVED_SEARCHES);
  });

  test("saving over corrupt data replaces it with a valid store", () => {
    const storage = withRaw("{corrupt");
    assert.equal(saveSearch("Fresh", "status=open", { storage }).ok, true);
    assert.equal(JSON.parse(storage.raw()).items.length, 1);
  });
});

describe("remove / rename", () => {
  test("removes by id", () => {
    const storage = memoryStorage();
    const a = saveSearch("A", "status=open", { storage }).item;
    const b = saveSearch("B", "status=funded", { storage }).item;
    const res = removeSearch(a.id, { storage });
    assert.equal(res.ok, true);
    assert.deepEqual(listSavedSearches({ storage }).map((i) => i.id), [b.id]);
    assert.equal(removeSearch("missing", { storage }).error, ERRORS.NOT_FOUND);
  });

  test("renames with the same name rules", () => {
    const storage = memoryStorage();
    const a = saveSearch("A", "status=open", { storage }).item;
    saveSearch("B", "status=funded", { storage });

    assert.equal(renameSearch(a.id, "  Alpha  ", { storage }).item.name, "Alpha");
    assert.equal(renameSearch(a.id, "alpha", { storage }).ok, true); // own name, new case
    assert.equal(renameSearch(a.id, "b", { storage }).error, ERRORS.DUPLICATE);
    assert.equal(renameSearch(a.id, " ", { storage }).error, ERRORS.EMPTY_NAME);
    assert.equal(renameSearch("missing", "Z", { storage }).error, ERRORS.NOT_FOUND);
    assert.deepEqual(listSavedSearches({ storage }).map((i) => i.name), ["alpha", "B"]);
  });
});
