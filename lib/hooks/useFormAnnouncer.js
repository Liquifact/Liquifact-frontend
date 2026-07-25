import { useCallback, useEffect, useRef, useState } from "react";

/**
 * useFormAnnouncer
 *
 * Returns a tuple of [announcement, announce] where:
 *   - `announcement` is the debounced string to render inside an aria-live region
 *   - `announce(message)` queues a new message (no-ops if called before mount settles)
 *
 * Behaviour
 * ---------
 * - **No announce on mount**: the first call to `announce` that happens synchronously
 *   during the initial render / effect setup is suppressed so screen readers do not
 *   speak stale or empty strings on page load.
 * - **Debounce**: rapid successive calls are collapsed — only the last message in a
 *   burst is surfaced.  Default delay is 300 ms.
 * - **aria-live "polite"**: callers should render the returned `announcement` inside
 *   an element with `aria-live="polite"` so announcements queue behind any speech
 *   already in progress.
 *
 * @param {number} [delay=300] - Debounce delay in milliseconds.
 * @returns {[string, (msg: string) => void]}
 */
export function useFormAnnouncer(delay = 300) {
  const [announcement, setAnnouncement] = useState("");

  // After the component mounts we flip this flag so the first programmatic
  // announce() call is allowed through.  Any announce() fired synchronously
  // during render or in the mount effect before this flag is set gets dropped.
  const mountedRef = useRef(false);
  const timerRef = useRef(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearTimeout(timerRef.current);
    };
  }, []);

  const announce = useCallback(
    (message) => {
      if (!mountedRef.current) return;

      clearTimeout(timerRef.current);

      timerRef.current = setTimeout(() => {
        if (mountedRef.current) {
          setAnnouncement(message);
        }
      }, delay);
    },
    [delay],
  );

  return [announcement, announce];
}
