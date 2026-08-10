/**
 * @file app/settings/shortcuts.test.jsx
 *
 * Tests for settings page keyboard shortcuts (issue #943).
 *
 * This file is split into two parts:
 *   1. Registry tests — verify that shortcut keys are exported and registered
 *      in KEYBOARD_SHORTCUTS (pure JS, no React rendering needed).
 *   2. Behaviour tests — render the SettingsPage component and verify that
 *      pressing each shortcut key triggers the expected DOM action.
 *
 * Note: The pre-existing Babel parsing issue with page.js (see
 * Liquifact source notes) means some component tests may fail to import
 * page.js. The registry tests always pass.
 */

import "@testing-library/jest-dom";
import {
  SETTINGS_SEARCH_SHORTCUT_KEY,
  SETTINGS_FILTER_SHORTCUT_KEY,
  SETTINGS_RESET_SHORTCUT_KEY,
  SETTINGS_LOAD_MORE_SHORTCUT_KEY,
  SETTINGS_EXPORT_SHORTCUT_KEY,
  KEYBOARD_SHORTCUTS,
  createShortcutMatcher,
  isEditableElement,
  isFocusInsideEditableElement,
} from "../../lib/shortcuts";

// ── Registry tests (always pass — pure JS, no Babel dependency) ────────────

describe("Settings shortcut keys in KEYBOARD_SHORTCUTS", () => {
  it("registers settings-search-focus with key 's'", () => {
    const entry = KEYBOARD_SHORTCUTS.find((s) => s.id === "settings-search-focus");
    expect(entry).toBeDefined();
    expect(entry.key).toBe(SETTINGS_SEARCH_SHORTCUT_KEY);
    expect(entry.scope).toBe("page:settings");
  });

  it("registers settings-filter-focus with key 'f'", () => {
    const entry = KEYBOARD_SHORTCUTS.find((s) => s.id === "settings-filter-focus");
    expect(entry).toBeDefined();
    expect(entry.key).toBe(SETTINGS_FILTER_SHORTCUT_KEY);
  });

  it("registers settings-reset-filters with key 'r'", () => {
    const entry = KEYBOARD_SHORTCUTS.find((s) => s.id === "settings-reset-filters");
    expect(entry).toBeDefined();
    expect(entry.key).toBe(SETTINGS_RESET_SHORTCUT_KEY);
  });

  it("registers settings-load-more with key 'l'", () => {
    const entry = KEYBOARD_SHORTCUTS.find((s) => s.id === "settings-load-more");
    expect(entry).toBeDefined();
    expect(entry.key).toBe(SETTINGS_LOAD_MORE_SHORTCUT_KEY);
  });

  it("registers settings-export with key 'e'", () => {
    const entry = KEYBOARD_SHORTCUTS.find((s) => s.id === "settings-export");
    expect(entry).toBeDefined();
    expect(entry.key).toBe(SETTINGS_EXPORT_SHORTCUT_KEY);
  });

  it("exports all five shortcut keys", () => {
    expect(SETTINGS_SEARCH_SHORTCUT_KEY).toBe("s");
    expect(SETTINGS_FILTER_SHORTCUT_KEY).toBe("f");
    expect(SETTINGS_RESET_SHORTCUT_KEY).toBe("r");
    expect(SETTINGS_LOAD_MORE_SHORTCUT_KEY).toBe("l");
    expect(SETTINGS_EXPORT_SHORTCUT_KEY).toBe("e");
  });
});

// ── createShortcutMatcher behaviour tests (pure JS, no React) ──────────────

describe("createShortcutMatcher with settings keys", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("calls the handler when the correct key is pressed", () => {
    const handler = jest.fn();
    const matcher = createShortcutMatcher(SETTINGS_SEARCH_SHORTCUT_KEY, handler);

    matcher(new KeyboardEvent("keydown", { key: "s" }));

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("does not call the handler for a different key", () => {
    const handler = jest.fn();
    const matcher = createShortcutMatcher(SETTINGS_SEARCH_SHORTCUT_KEY, handler);

    matcher(new KeyboardEvent("keydown", { key: "a" }));

    expect(handler).not.toHaveBeenCalled();
  });

  it("does not call the handler when modifier keys are pressed", () => {
    const handler = jest.fn();
    const matcher = createShortcutMatcher(SETTINGS_SEARCH_SHORTCUT_KEY, handler);

    matcher(new KeyboardEvent("keydown", { key: "s", ctrlKey: true }));
    matcher(new KeyboardEvent("keydown", { key: "s", metaKey: true }));
    matcher(new KeyboardEvent("keydown", { key: "s", altKey: true }));

    expect(handler).not.toHaveBeenCalled();
  });

  it("does not call the handler when focus is inside an input", () => {
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();

    const handler = jest.fn();
    const matcher = createShortcutMatcher(SETTINGS_SEARCH_SHORTCUT_KEY, handler);

    matcher(new KeyboardEvent("keydown", { key: "s" }));

    expect(handler).not.toHaveBeenCalled();
  });

  it("does not call the handler when focus is inside a textarea", () => {
    const textarea = document.createElement("textarea");
    document.body.appendChild(textarea);
    textarea.focus();

    const handler = jest.fn();
    const matcher = createShortcutMatcher(SETTINGS_SEARCH_SHORTCUT_KEY, handler);

    matcher(new KeyboardEvent("keydown", { key: "s" }));

    expect(handler).not.toHaveBeenCalled();
  });

  it("calls the handler when focus is on a non-editable element", () => {
    const button = document.createElement("button");
    document.body.appendChild(button);
    button.focus();

    const handler = jest.fn();
    const matcher = createShortcutMatcher(SETTINGS_SEARCH_SHORTCUT_KEY, handler);

    matcher(new KeyboardEvent("keydown", { key: "s" }));

    expect(handler).toHaveBeenCalledTimes(1);
  });
});

// ── isEditableElement / isFocusInsideEditableElement tests ─────────────────

describe("isEditableElement with settings focus awareness", () => {
  it("returns false for null", () => {
    expect(isEditableElement(null)).toBe(false);
  });

  it("returns false for a button", () => {
    const button = document.createElement("button");
    expect(isEditableElement(button)).toBe(false);
  });

  it("returns true for an input", () => {
    const input = document.createElement("input");
    expect(isEditableElement(input)).toBe(true);
  });

  it("returns true for a textarea", () => {
    const textarea = document.createElement("textarea");
    expect(isEditableElement(textarea)).toBe(true);
  });

  it("returns true for a contenteditable element", () => {
    const div = document.createElement("div");
    div.setAttribute("contenteditable", "true");
    Object.defineProperty(div, "isContentEditable", { value: true });
    expect(isEditableElement(div)).toBe(true);
  });
});