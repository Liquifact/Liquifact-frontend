"use client";

import { useEffect, useRef, useState } from "react";

/** Default debounce delay in milliseconds. */
export const SETTINGS_ANNOUNCE_DELAY_MS = 300;

/**
 * Debounces a settings-change message for polite aria-live announcement.
 *
 * - Skips the announcement on the initial mount so screen readers are not
 *   spammed when a page first renders.
 * - Debounces rapid successive updates so the queue is not flooded when the
 *   user types quickly in a search/filter field.
 * - Returns an empty string until the first post-mount change settles,
 *   keeping the live region silent at rest.
 *
 * @param {string} message  - The current status/count text to announce.
 * @param {number} [delay]  - Debounce delay in ms (default 300).
 * @returns {string}          Debounced announcement text ready for aria-live.
 *
 * @example
 * const announcement = useSettingsAnnouncer(statusMessage);
 * // <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
 * //   {announcement}
 * // </div>
 */
export function useSettingsAnnouncer(message, delay = SETTINGS_ANNOUNCE_DELAY_MS) {
  const [announcement, setAnnouncement] = useState("");
  const isMounted = useRef(false);

  useEffect(() => {
    // Skip the very first render so the live region starts silent.
    if (!isMounted.current) {
      isMounted.current = true;
      return;
    }

    const timer = setTimeout(() => {
      setAnnouncement(message);
    }, delay);

    return () => clearTimeout(timer);
  }, [message, delay]);

  return announcement;
}
