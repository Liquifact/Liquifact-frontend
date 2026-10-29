"use client";

import { useEffect, useRef, useState } from "react";

const IDLE = { quote: null, loading: false, error: null };

/**
 * Debounced quote hook for `preview_yield_tier`.
 *
 * Waits `debounceMs` (default 300) after the last change to `amount` or
 * `lockSecs`, then calls `previewFn({ amount, lockSecs })`.  Stale requests
 * are cancelled: a monotonically increasing sequence counter tracks the
 * latest invocation, and only the result that matches it is applied.
 *
 * The hook does nothing while `enabled` is false, `lockSecs` is 0 (base
 * yield, no preview needed), or `amount` is empty/invalid.
 *
 * @param {object} opts
 * @param {string} opts.amount - user-typed decimal string
 * @param {bigint|number} opts.lockSecs - selected lock duration
 * @param {function} opts.previewFn - injected simulate helper
 * @param {boolean} [opts.enabled]
 * @param {number} [opts.debounceMs]
 * @returns {{ quote: object|null, loading: boolean, error: string|null }}
 */
export function useYieldPreview({ amount, lockSecs, previewFn, enabled = true, debounceMs = 300 }) {
  const [state, setState] = useState(IDLE);
  const seqRef = useRef(0);
  const timerRef = useRef(null);

  useEffect(() => {
    // Clear any pending debounce when deps change or the hook unmounts.
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    const lock = BigInt(lockSecs ?? 0n);
    if (!enabled || lock <= 0n || !amount || !amount.trim()) {
      setState(IDLE);
      return;
    }

    const seq = ++seqRef.current;
    timerRef.current = setTimeout(async () => {
      setState({ quote: null, loading: true, error: null });
      try {
        const quote = await previewFn({ amount, lockSecs: lock });
        // Discard stale results — only the latest request wins.
        if (seq !== seqRef.current) return;
        setState({ quote, loading: false, error: null });
      } catch (err) {
        if (seq !== seqRef.current) return;
        setState({ quote: null, loading: false, error: err?.message || "Failed to fetch quote" });
      }
    }, debounceMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amount, lockSecs, enabled, previewFn, debounceMs]);

  return state;
}
