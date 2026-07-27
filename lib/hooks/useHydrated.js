import { useEffect, useState } from "react";

/**
 * Tracks whether the component has completed its first post-mount effect
 * flush.
 *
 * Hooks like `useLocalStorage` intentionally render their default value on
 * the very first pass and only read the real persisted value inside a
 * `useEffect`. A naive consumer that treats "default value" and
 * "confirmed empty" as the same thing will briefly show an incorrect
 * empty state to returning users who do have saved data.
 *
 * @returns {boolean}
 *   false on the initial render,
 *   true after the first post-mount effect.
 */
export function useHydrated() {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // This effect intentionally flips the hydration flag once after mount.
    setIsHydrated(true);
  }, []);

  return isHydrated;
}
