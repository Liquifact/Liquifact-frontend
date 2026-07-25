"use client";

import { useEffect, useRef, useState } from "react";

/** Default debounce delay in milliseconds for filter/settings changes. */
export const SETTINGS_ANNOUNCE_DELAY_MS = 300;

/**
 * Announces settings-change messages via a polite aria-live region, with
 * optional debouncing for rapid-fire updates (e.g. search input typing).
 *
 * Behaviour:
 * - When `delay` is 0 (or falsy), the message is reflected immediately —
 *   useful for load-completion and error messages that must not be held back.
 * - When `delay > 0`, updates are debounced so that rapid successive changes
 *   (e.g. the user typing in a search box) are coalesced into one announcement.
 * - The live region starts empty on mount in both modes so the page load does
 *   not trigger a spurious announcement.
 *
 * @param {string} message  - The current status/count text to announce.
 * @param {number} [delay]  - Debounce delay in ms (default 300; 0 = immediate).
 * @returns {string}          Announcement text ready for an aria-live region.
 *
 * @example
 * const announcement = useSettingsAnnouncer(statusMessage, filterActive ? undefined : 0);
 * // <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
 * //   {announcement}
 * // </div>
 */
export function useSettingsAnnouncer(message, delay = SETTINGS_ANNOUNCE_DELAY_MS) {
  const [announcement, setAnnouncement] = useState("");
  const isMounted = useRef(false);

  useEffect(() => {
    // Skip the very first render so the live region starts silent on mount.
    if (!isMounted.current) {
      isMounted.current = true;
      return;
    }

    // Immediate mode — no timer, reflect the message in the same render cycle.
    if (!delay) {
      setAnnouncement(message);
      return;
    }

    // Debounced mode — coalesce rapid updates before announcing.
    const timer = setTimeout(() => {
      setAnnouncement(message);
    }, delay);

    return () => clearTimeout(timer);
  }, [message, delay]);

  return announcement;
}
