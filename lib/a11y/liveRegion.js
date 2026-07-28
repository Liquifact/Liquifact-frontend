/**
 * @file lib/a11y/liveRegion.js
 *
 * Lightweight, framework-agnostic utility that manages a single polite
 * `aria-live` region in the DOM and exposes an `announce(message)` helper
 * with built-in debouncing so rapid-fire wallet results collapse into one
 * screen-reader utterance.
 *
 * The region is created lazily on the first call to `announce` and is never
 * removed — it lives for the lifetime of the page, exactly like a
 * `<div aria-live="polite" role="status" class="sr-only">`.
 */

const REGION_ID = "a11y-wallet-live-region";
const DEBOUNCE_MS = 300;

let timerId = null;

/**
 * Lazily create (or retrieve) the singleton polite live region.
 *
 * @returns {HTMLDivElement}
 */
export function ensureLiveRegion() {
  if (typeof document === "undefined") {
    // SSR / non-browser environments — return a no-op stub so callers
    // never need to guard against missing DOM.
    return null;
  }

  let region = document.getElementById(REGION_ID);
  if (region) return region;

  region = document.createElement("div");
  region.id = REGION_ID;
  region.setAttribute("role", "status");
  region.setAttribute("aria-live", "polite");
  region.setAttribute("aria-atomic", "true");
  region.className = "sr-only";
  document.body.appendChild(region);
  return region;
}

/**
 * Announce a message to screen readers via the polite live region.
 *
 * Calls are debounced — if `announce` is invoked rapidly the region is
 * updated only after `DEBOUNCE_MS` of inactivity, so only the last
 * message in a burst is spoken.
 *
 * @param {string} message - Text to announce.
 */
export function announce(message) {
  if (timerId !== null) {
    clearTimeout(timerId);
  }

  timerId = setTimeout(() => {
    timerId = null;
    const region = ensureLiveRegion();
    if (region) {
      region.textContent = message;
    }
  }, DEBOUNCE_MS);
}

/**
 * Reset the debounce timer — useful in tests.
 */
export function resetAnnouncer() {
  if (timerId !== null) {
    clearTimeout(timerId);
    timerId = null;
  }
}

export { DEBOUNCE_MS };
