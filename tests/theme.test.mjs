import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { THEME_KEY, THEME_INIT_SCRIPT, readPref, resolveTheme } from "../lib/theme.js";

const store = (v) => ({ getItem: (k) => (k === THEME_KEY ? v : null) });

test("resolveTheme", () => {
  assert.equal(resolveTheme("light", true), "light");
  assert.equal(resolveTheme("dark", false), "dark");
  assert.equal(resolveTheme("system", true), "dark");
  assert.equal(resolveTheme("system", false), "light");
});

test("readPref validates stored value", () => {
  assert.equal(readPref(store("dark")), "dark");
  assert.equal(readPref(store("light")), "light");
  assert.equal(readPref(store("system")), "system");
  assert.equal(readPref(store("banana")), "system");
  assert.equal(readPref(store(null)), "system");
  assert.equal(readPref(null), "system");
  assert.equal(readPref({ getItem() { throw new Error("blocked"); } }), "system");
});

test("pre-paint script agrees with resolveTheme(readPref(...))", () => {
  for (const stored of ["light", "dark", "system", "junk", null]) {
    for (const systemDark of [true, false]) {
      const root = { dataset: {}, style: {} };
      vm.runInNewContext(THEME_INIT_SCRIPT, {
        localStorage: store(stored),
        matchMedia: () => ({ matches: systemDark }),
        document: { documentElement: root },
      });
      assert.equal(root.dataset.theme, resolveTheme(readPref(store(stored)), systemDark));
      assert.equal(root.style.colorScheme, root.dataset.theme);
    }
  }
});

test("pre-paint script does not throw when storage is blocked", () => {
  const root = { dataset: {}, style: {} };
  assert.doesNotThrow(() =>
    vm.runInNewContext(THEME_INIT_SCRIPT, {
      localStorage: { getItem() { throw new Error("blocked"); } },
      matchMedia: () => ({ matches: true }),
      document: { documentElement: root },
    })
  );
});
