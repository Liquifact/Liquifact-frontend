"use client";

import { useEffect, useRef, useState } from "react";

/** Default debounce delay in milliseconds for filter/settings changes. */
export const SETTINGS_ANNOUNCE_DELAY_MS = 300;

/**
 * Announces settings-change messages via a polite aria-live region, with
 * optional debouncing for rapid-fire updates (e.g. search input typing).
 *
 * Behaviour:
 * - The live region starts empty on mount — no spurious announcement fires
 *   when the page first renders ("silent on mount" contract).
 * - When `delay` is 0, the announcement is updated synchronously during
 *   render using React's "adjust state during render" pattern so the live
 *   region reflects the latest message in the same render pass, with no
 *   extra effect or timer needed.  This satisfies the
 *   react-hooks/set-state-in-effect lint rule and keeps test assertions that
 *   check the live region immediately after a state change working correctly.
 * - When `delay > 0`, updates are debounced via a useEffect + setTimeout so
 *   rapid successive changes (e.g. typing in a search box) are coalesced
 *   into a single announcement.
 *
 * @param {string} message  - The current status/count text to announce.
 * @param {number} [delay]  - Debounce delay in ms (default 300; 0 = immediate).
 * @returns {string}          Announcement text ready for an aria-live region.
 *
 * @example
 * // Immediate – used when upstream state is already debounced:
 * const announcement = useSettingsAnnouncer(statusMessage, 0);
 *
 * // Debounced – coalesces rapid filter-chip or search-input changes:
 * const announcement = useSettingsAnnouncer(filterMessage);
 *
 * // <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
 * //   {announcement}
 * // </div>
 */
export function useSettingsAnnouncer(message, delay = SETTINGS_ANNOUNCE_DELAY_MS) {
  // Whether the component has completed its initial mount render.
  const hasMounted = useRef(false);

  // ── Immediate mode (delay === 0) ──────────────────────────────────────────
  // Use React's "adjust state during render" pattern: track the previous
  // message in state so we can detect a change and update in the same render
  // pass without going through an effect.  This avoids calling setState inside
  // a useEffect body, which is forbidden by the react-hooks/set-state-in-effect
  // lint rule and can cause cascading renders.
  //
  // Reference: https://react.dev/learn/you-might-not-need-an-effect
  //            #adjusting-some-state-when-a-prop-changes
  const [prevMessage, setPrevMessage] = useState(message);
  const [immediateAnnouncement, setImmediateAnnouncement] = useState("");

  if (delay === 0 && hasMounted.current && message !== prevMessage) {
    setPrevMessage(message);
    setImmediateAnnouncement(message);
  }

  // ── Debounced mode (delay > 0) ────────────────────────────────────────────
  const [debouncedAnnouncement, setDebouncedAnnouncement] = useState("");

  useEffect(() => {
    // Mark mount complete after the first render so subsequent message
    // changes — in either mode — are the only ones that trigger an update.
    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
    }

    // Immediate mode is handled during render above; skip the effect path.
    if (delay === 0) return;

    const timer = setTimeout(() => {
      setDebouncedAnnouncement(message);
    }, delay);

    return () => clearTimeout(timer);
  }, [message, delay]);

  return delay === 0 ? immediateAnnouncement : debouncedAnnouncement;
}
