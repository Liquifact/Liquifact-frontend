/**
 * Shared keyboard shortcut registry and helpers.
 *
 * This module is the single source of truth for every keyboard shortcut that
 * the LiquiFact frontend advertises to users. There are two consumers:
 *
 *   1. Each component that owns a shortcut's behaviour (e.g. InvoiceSearch
 *      owns the `/` focus shortcut) reads the matching key from this module
 *      and uses `createShortcutMatcher` to wire its `keydown` listener.
 *
 *   2. `components/ShortcutHelpDialog.jsx` reads `KEYBOARD_SHORTCUTS` and
 *      renders the discoverable list shown to the user when they press `?`.
 *
 * Adding a new shortcut means:
 *   - Append a new entry to `KEYBOARD_SHORTCUTS`.
 *   - Wire its behaviour in the owning component, importing the matching key
 *     and `createShortcutMatcher` from this module.
 *
 * The dialog will pick up the new entry automatically — no edits to
 * `ShortcutHelpDialog.jsx` required.
 */

export const SEARCH_SHORTCUT_KEY = "/";
export const HELP_SHORTCUT_KEY = "?";

/**
 * The advertised shortcut catalogue. Each entry describes a shortcut from
 * the user's perspective and is rendered in the `?` help dialog.
 *
 * Fields:
 *   - id: stable identifier (use kebab-case; useful for testing and analytics)
 *   - key: the `KeyboardEvent.key` value that triggers the action
 *          (`"/"`, `"?"`, etc.)
 *   - description: human-readable sentence explaining what the shortcut does
 *   - scope: where it applies ("global" lands on every page; "page" is local)
 *
 * Ordering: the array order is the visible order in the `ShortcutHelpDialog`
 * (most-important / most-discoverable first). New global shortcuts should
 * generally be appended at the tail; rarely-used or advanced shortcuts
 * slot in at the end so the common ones stay near the top.
 */
export const KEYBOARD_SHORTCUTS = [
  {
    id: "search-focus",
    key: SEARCH_SHORTCUT_KEY,
    description: "Focus the marketplace search input",
    scope: "global",
  },
  {
    id: "shortcut-help",
    key: HELP_SHORTCUT_KEY,
    description: "Open the keyboard shortcut help dialog",
    scope: "global",
  },
];

/**
 * Returns true when `el` is an editable element (input / textarea /
 * contenteditable). Used by shortcut matchers to avoid hijacking user typing.
 *
 * Mirrors the helper that was previously inlined in
 * `components/InvoiceSearch.shortcut.test.tsx` — both call sites now share
 * this implementation to avoid drift.
 *
 * @param {Element | null | undefined} el
 * @returns {boolean}
 */
export function isEditableElement(el) {
  if (!el || !el.tagName) return false;
  const tag = el.tagName.toLowerCase();
  if (tag === "input" || tag === "textarea") return true;
  // contentEditable elements may live on any tag (div, span, etc.).
  return typeof el.isContentEditable === "boolean" && el.isContentEditable;
}

/**
 * Tiny helper around `document.activeElement` for shortcut matchers. Returns
 * true when the currently-focused element is editable so callers can bail
 * out before mutating `event.preventDefault()`.
 *
 * @returns {boolean}
 */
export function isFocusInsideEditableElement() {
  return isEditableElement(document.activeElement);
}

/**
 * Build a `keydown` event handler that invokes `handler` only when the
 * event matches the given key and the focus is not inside an editable
 * element.
 *
 * Modifiers (`ctrlKey`, `metaKey`, `altKey`) are ignored so that browser
 * shortcuts such as `Ctrl+/` (open the Firefox quick-find bar) keep working.
 * `shiftKey` is allowed because `?` deliberately requires `Shift+/` on
 * US-ANSI keyboards and we want that gesture to count.
 *
 * The returned function is intentionally inert for the `keypress` event —
 * the matcher is designed to be installed on `keydown` so the suppression
 * takes effect before the default action (typing the character) fires.
 *
 * @param {string} key — value to match against `event.key`
 * @param {(event: KeyboardEvent) => void} handler — invoked when matched
 * @returns {(event: KeyboardEvent) => void}
 */
export function createShortcutMatcher(key, handler) {
  return (event) => {
    if (event.key !== key) return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (isFocusInsideEditableElement()) return;
    handler(event);
  };
}
