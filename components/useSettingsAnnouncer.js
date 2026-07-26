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
 *   render using React's "adjust state during render" pattern
 *   (https://react.dev/learn/you-might-not-need-an-effect
 *   #adjusting-some-state-when-a-prop-changes).  This satisfies both the
 *   react-hooks/set-state-in-effect and react-hooks/refs lint rules while
 *   ensuring the live region reflects the new message in the same render pass.
 * - When `delay > 0`, updates are debounced via a useEffect + setTimeout so
 *   rapid successive changes (e.g. typing in a search box) are coalesced
 *   into a single announcement. The ref that guards the first-render skip is
 *   only read inside the effect body, never during render, satisfying the
 *   react-hooks/refs lint rule.
 *
 * @param {string} message  - The current status/count text to announce.
 * @param {number} [delay]  - Debounce delay in ms (default 300; 0 = immediate).
 * @returns {string}          Announcement text ready for an aria-live region.
 *
 * @example
 * // Immediate — upstream state is already debounced (e.g. search debounce):
 * const announcement = useSettingsAnnouncer(statusMessage, 0);
 *
 * // Debounced — coalesces rapid filter-chip or input changes:
 * const announcement = useSettingsAnnouncer(filterMessage);
 *
 * // <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
 * //   {announcement}
 * // </div>
 */
export function useSettingsAnnouncer(message, delay = SETTINGS_ANNOUNCE_DELAY_MS) {
  // ── Immediate mode (delay === 0) ──────────────────────────────────────────
  // Track the previous message value in state so we can detect a change and
  // update the announcement during the same render pass — the React-sanctioned
  // "adjust state during render" pattern. Mount is implicitly silent because
  // `prevMessage` and `message` start equal; the first render therefore never
  // enters the if-branch and `immediateAnnouncement` stays "".
  const [prevMessage, setPrevMessage] = useState(message);
  const [immediateAnnouncement, setImmediateAnnouncement] = useState("");

  if (delay === 0 && message !== prevMessage) {
    setPrevMessage(message);
    setImmediateAnnouncement(message);
  }

  // ── Debounced mode (delay > 0) ────────────────────────────────────────────
  // The ref is only ever read inside the effect body (never during render) so
  // it satisfies the react-hooks/refs lint rule. setState is called inside a
  // setTimeout callback (never directly in the effect body) so it satisfies
  // the react-hooks/set-state-in-effect lint rule.
  const hasMountedDebounce = useRef(false);
  const [debouncedAnnouncement, setDebouncedAnnouncement] = useState("");

  useEffect(() => {
    if (delay === 0) return;

    // Skip the initial mount so the live region starts silent.
    if (!hasMountedDebounce.current) {
      hasMountedDebounce.current = true;
      return;
    }

    const timer = setTimeout(() => {
      setDebouncedAnnouncement(message);
    }, delay);

    return () => clearTimeout(timer);
  }, [message, delay]);

  return delay === 0 ? immediateAnnouncement : debouncedAnnouncement;
}
