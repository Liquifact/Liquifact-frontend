"use client";

import { useEffect, useRef, useState } from "react";

export const QUOTE_DEBOUNCE_MS = 300;

/**
 * Debounced contract quote for preview_yield_tier.
 *
 * @param {object} params
 * @param {boolean} params.enabled  Hook is idle until true.
 * @param {bigint|number|string} params.amountStroops i128 amount to quote.
 * @param {number} params.lockSecs  Selected lock length.
 * @param {(args:{amountStroops:any, lockSecs:number, signal:AbortSignal}) => Promise<{effectiveYieldBps:number, matchedLockSecs:number}>} params.fetchQuote
 * @returns {{status:"idle"|"loading"|"quote"|"error", quote:object|null, error:string|null}}
 */
export function useYieldQuote({ enabled, amountStroops, lockSecs, fetchQuote }) {
  const [state, setState] = useState({ status: "idle", quote: null, error: null });
  const fetchRef = useRef(fetchQuote);
  fetchRef.current = fetchQuote;

  useEffect(() => {
    if (!enabled || !amountStroops || BigInt(amountStroops) <= 0n || lockSecs == null) {
      setState({ status: "idle", quote: null, error: null });
      return undefined;
    }

    const controller = new AbortController();
    let live = true;
    setState((s) => ({ ...s, status: "loading" }));

    const timer = setTimeout(async () => {
      try {
        const quote = await fetchRef.current({ amountStroops, lockSecs, signal: controller.signal });
        if (!live || controller.signal.aborted) return; // stale response — drop it
        setState({ status: "quote", quote, error: null });
      } catch (err) {
        if (!live || controller.signal.aborted || err?.name === "AbortError") return;
        setState({ status: "error", quote: null, error: err?.message || "Quote failed." });
      }
    }, QUOTE_DEBOUNCE_MS);

    return () => {
      live = false;
      clearTimeout(timer);
      controller.abort(); // cancel stale in-flight request
    };
  }, [enabled, amountStroops, lockSecs]);

  return state;
}
