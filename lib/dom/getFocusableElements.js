/**
 * Returns the focusable elements inside `container` in tab order.
 * Excludes elements with `tabindex="-1"` and disabled form controls, and
 * anything hidden via `display: none` ancestors.
 *
 * This mirrors the selector logic already proven inside ShortcutHelpDialog,
 * extracted here so new dialogs (e.g. ThemeOptionsModal) can share the same
 * audited focus-trap behaviour without duplicating it inline.
 *
 * @param {HTMLElement | null} container
 * @returns {HTMLElement[]}
 */
export function getFocusableElements(container) {
  if (!container) return [];
  const selector =
    "a[href], button:not([disabled]), input:not([disabled])," +
    " select:not([disabled]), textarea:not([disabled])," +
    ' [tabindex]:not([tabindex="-1"])';
  return Array.from(container.querySelectorAll(selector)).filter((el) => {
    if (!(el instanceof HTMLElement)) return false;
    if (el.offsetParent === null && el !== document.activeElement) {
      // Hidden via `display: none` ancestors — skip.
      return false;
    }
    return true;
  });
}