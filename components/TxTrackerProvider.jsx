"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { getDefaultStore } from "@/lib/stellar/txStore.js";
import { pollTransaction, RESULT } from "@/lib/stellar/pollTx.js";
import { getRpcServer } from "@/lib/stellar/rpc.js";

const TxTrackerContext = createContext(null);

/**
 * Provider for transaction tracking. Mount at app root.
 * Resumes polling for any PENDING transactions on mount.
 */
export function TxTrackerProvider({ children }) {
  const [pendingCount, setPendingCount] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const storeRef = useRef(null);
  const pollingRef = useRef(new Map()); // hash -> AbortController

  // Initialize store (client-side only)
  useEffect(() => {
    storeRef.current = getDefaultStore();
    refreshFromStore();
  }, []);

  function refreshFromStore() {
    const store = storeRef.current;
    if (!store) return;
    const list = store.list();
    setTransactions(list);
    setPendingCount(store.getPendingCount());
  }

  /**
   * Start polling a transaction.
   * @param {string} hash
   * @param {Object} meta - { label, invoiceId }
   */
  const track = useCallback(async (hash, meta = {}) => {
    const store = storeRef.current;
    if (!store) return;

    // Add to store
    store.add({ hash, label: meta.label || "Transaction", invoiceId: meta.invoiceId || null });
    refreshFromStore();

    // Start polling
    const controller = new AbortController();
    pollingRef.current.set(hash, controller);

    try {
      const rpc = getRpcServer();
      const result = await pollTransaction(rpc, hash, { signal: controller.signal });

      let finalStatus;
      if (result === RESULT.SUCCESS) finalStatus = "SUCCESS";
      else if (result === RESULT.FAILED) finalStatus = "FAILED";
      else finalStatus = "UNKNOWN";

      store.update(hash, { status: finalStatus });
    } catch (e) {
      if (e.name === "AbortError") return; // Clean abort, don't update status
      store.update(hash, { status: "FAILED", error: e.message });
    } finally {
      pollingRef.current.delete(hash);
      refreshFromStore();
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      for (const controller of pollingRef.current.values()) {
        controller.abort();
      }
      pollingRef.current.clear();
    };
  }, []);

  const value = {
    track,
    transactions,
    pendingCount,
    refresh: refreshFromStore,
  };

  return (
    <TxTrackerContext.Provider value={value}>
      {children}
    </TxTrackerContext.Provider>
  );
}

/**
 * Hook to access the transaction tracker.
 * Must be used within TxTrackerProvider.
 */
export function useTxTracker() {
  const ctx = useContext(TxTrackerContext);
  if (!ctx) {
    throw new Error("useTxTracker must be used within a TxTrackerProvider");
  }
  return ctx;
}