/**
 * @file lib/hooks/useNetworkStatus.js
 *
 * SSR-safe hook that tracks the browser's online/offline status by
 * subscribing to the `online` and `offline` events on `window`.
 *
 * Contract
 * ────────
 * • The initial render returns `true` (assumes online).  The hook NEVER
 *   reads `navigator.onLine` during render — this keeps React hydration
 *   safe in a Next.js app router context.
 * • The actual read of `navigator.onLine` happens inside `useEffect`,
 *   after mount on the client.
 * • Event listeners are registered on `window` and cleaned up on unmount
 *   so no stale handlers leak across navigations or hot-reloads.
 * • Changing tabs and then returning does not produce a false re-connection
 *   event because `focus` is not subscribed — only the standard `online`/
 *   `offline` events from the browser's network-status API are used.
 * • The returned value is a plain boolean — callers that need to detect
 *   the online→offline or offline→online transition should track the
 *   previous value themselves (e.g. via `useRef`).
 */

import { useEffect, useState } from "react";

/**
 * @returns {boolean} `true` when the browser believes it has a network
 *   connection, `false` otherwise.  Always `true` during SSR.
 */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(() =>
    typeof window !== "undefined" ? navigator.onLine : true
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return isOnline;
}
