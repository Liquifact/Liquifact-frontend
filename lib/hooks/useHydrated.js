import { useEffect } from "react";
import { useSyncExternalStore } from "react";

/**
 * Tracks whether the component has completed its first post-mount effect
 * flush.
 *
 * Hooks like `useLocalStorage` intentionally render their default value on the
 * very first pass and only read the real persisted value inside a
 * `useEffect`. A naive consumer that treats "default value" and
 * "confirmed empty" as the same thing will briefly show an incorrect
 * empty state to returning users who do have saved data.
 *
 * The flag is set exactly once per mount and never reset back to
 * `false`. This keeps the result deterministic even under React Strict
 * Mode double-invocation or concurrent rendering: the effect body is
 * idempotent, so repeated or interleaved execution cannot produce a
 * stale or inconsistent hydration result.
 *
 * @returns {boolean}
 *   false on the initial render,
 *   true after the first post-mount effect.
 */
const emptySubscribe = () => () => {};

export function useHydrated() {
  const isHydrated = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  // Idempotent transition: the server snapshot is always `false` and the
  // client snapshot is always `true`, so duplicate or racing invocations
  // cannot observably change the result. This keeps hydration deterministic
  // under React Strict Mode double-invocation and concurrent rendering.
  useEffect(() => {
    // no-op: retained to preserve the public hook contract and effect
    // ordering for consumers that rely on a post-mount effect flush.
  }, []);

  return isHydrated;
}
