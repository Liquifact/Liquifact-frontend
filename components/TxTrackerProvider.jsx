"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { getDefaultStore } from "@/lib/stellar/txStore.js";
import { pollTransaction, RESULT } from "@/lib/stellar/pollTx.js";
import { getRpcServer } from "@/lib/stellar/rpc.js";
import { LOCAL_DATA_CHANGED_EVENT } from "@/lib/localData";

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
    if (pollingRef.current.has(hash)) return;

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
      if (finalStatus) store.update(hash, { status: finalStatus });
    } catch (e) {
      if (e.name === "AbortError") return; // Clean abort, don't update status
      console.error("Transaction polling failed; leaving transaction pending.", e);
    } finally {
      pollingRef.current.delete(hash);
      refreshFromStore();
    }
  }, []);

  // Initialize from persistent storage and resume every pending poll.
  useEffect(() => {
    storeRef.current = getDefaultStore();
    refreshFromStore();
    for (const tx of storeRef.current.getPending()) {
      void track(tx.hash, tx);
    }
    const sync = (event) => {
      if (event.detail?.keys?.includes("liquifact-txs") || event.key === "liquifact-txs") refreshFromStore();
    };
    window.addEventListener("storage", sync);
    window.addEventListener(LOCAL_DATA_CHANGED_EVENT, sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(LOCAL_DATA_CHANGED_EVENT, sync);
    };
  }, [track]);

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
    hasPendingFor: (invoiceId) => storeRef.current?.hasPendingFor(invoiceId) ?? false,
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
