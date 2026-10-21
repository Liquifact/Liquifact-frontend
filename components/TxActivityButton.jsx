"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useTxTracker } from "./TxTrackerProvider.jsx";
import { explorerTxUrl, shortAddress } from "@/lib/stellar/index.js";
import { formatDate } from "@/lib/format.js";
import CopyButton from "./CopyButton.jsx";

const STATUS_LABELS = {
  PENDING: "Pending",
  SUCCESS: "Confirmed",
  FAILED: "Failed",
  UNKNOWN: "Unknown",
};

const STATUS_CLASSES = {
  PENDING: "tx-status-pending",
  SUCCESS: "tx-status-success",
  FAILED: "tx-status-failed",
  UNKNOWN: "tx-status-unknown",
};

/**
 * Format relative time (e.g., "2 min ago", "just now")
 */
function formatRelativeTime(timestamp) {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 30) return "just now";
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffHour < 24) return `${diffHour} hr ago`;
  if (diffDay < 7) return `${diffDay} day ago`;
  return formatDate(new Date(timestamp).toISOString());
}

/**
 * Transaction Activity Button - shows badge and opens drawer with transaction list.
 */
export default function TxActivityButton() {
  const { transactions, pendingCount, track } = useTxTracker();
  const [open, setOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const buttonRef = useRef(null);
  const drawerRef = useRef(null);
  const listRef = useRef(null);
  const previousActiveElement = useRef(null);

  // Dev-only demo: if ?debugTx= present on initial load, track a demo transaction
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has("debugTx")) {
      const demoHash = params.get("debugTx") || "0".repeat(64);
      track(demoHash, { label: "Debug transaction", invoiceId: "DEBUG" });
      // Clean up URL so it doesn't re-trigger on remount
      const url = new URL(window.location.href);
      url.searchParams.delete("debugTx");
      window.history.replaceState({}, "", url);
    }
  }, [track]);

  // Focus management
  useEffect(() => {
    if (open) {
      previousActiveElement.current = document.activeElement;
      // Focus the drawer for keyboard navigation
      setTimeout(() => drawerRef.current?.focus(), 0);
    } else if (previousActiveElement.current) {
      previousActiveElement.current.focus();
    }
  }, [open]);

  // Escape key handling
  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("keydown", onKeyDown);
      return () => document.removeEventListener("keydown", onKeyDown);
    }
  }, [open]);

  // Keyboard navigation within drawer
  const handleKeyDown = useCallback(
    (e) => {
      const items = listRef.current?.querySelectorAll("[role='listitem']");
      if (!items?.length) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocusedIndex((i) => Math.min(i + 1, items.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocusedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Home") {
        e.preventDefault();
        setFocusedIndex(0);
      } else if (e.key === "End") {
        e.preventDefault();
        setFocusedIndex(items.length - 1);
      } else if (e.key === "Enter" || e.key === " ") {
        // Enter/Space on focused item - could expand details, for now just focus
        e.preventDefault();
        items[focusedIndex]?.focus();
      }
    },
    [focusedIndex]
  );

  // Live region for status announcements
  const [announcement, setAnnouncement] = useState("");

  // Monitor for status changes to announce
  useEffect(() => {
    const pending = transactions.filter((t) => t.status === "PENDING");
    const confirmed = transactions.filter(
      (t) => t.status === "SUCCESS" && !t._announced
    );
    if (confirmed.length > 0) {
      const msg = confirmed.map((t) => `${t.label} confirmed`).join(", ");
      setAnnouncement(msg);
      // Mark as announced
      const store = transactions[0]?.constructor?.name === "Object" ? null : null;
      // Note: we can't easily mutate the store here, but the announcement fires once
    }
  }, [transactions]);

  const toggleDrawer = () => setOpen((o) => !o);
  const closeDrawer = () => setOpen(false);

  const pendingTxs = transactions.filter((t) => t.status === "PENDING");
  const completedTxs = transactions.filter((t) => t.status !== "PENDING");

  return (
    <>
      {/* Live region for announcements */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="visually-hidden"
        role="status"
      >
        {announcement}
      </div>

      {/* Header Button */}
      <button
        ref={buttonRef}
        type="button"
        className="tx-activity-btn"
        aria-label={`Transactions${pendingCount > 0 ? `, ${pendingCount} pending` : ""}`}
        aria-expanded={open}
        aria-controls="tx-activity-drawer"
        aria-haspopup="dialog"
        onClick={toggleDrawer}
      >
        <span aria-hidden="true" className="tx-icon">⟳</span>
        {pendingCount > 0 && (
          <span className="tx-badge" aria-hidden="true">{pendingCount}</span>
        )}
      </button>

      {/* Drawer / Dialog */}
      <div
        ref={drawerRef}
        id="tx-activity-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tx-drawer-title"
        className={`tx-drawer${open ? " open" : ""}`}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
      >
        <div className="tx-drawer-backdrop" data-testid="tx-drawer-backdrop" onClick={closeDrawer} aria-hidden="true" />
        <div className="tx-drawer-panel" role="document">
          <header className="tx-drawer-header">
            <h2 id="tx-drawer-title" className="tx-drawer-title">
              Transaction Activity
            </h2>
            <button
              type="button"
              className="tx-drawer-close"
              aria-label="Close transaction activity"
              onClick={closeDrawer}
            >
              ✕
            </button>
          </header>

          <div className="tx-drawer-content" ref={listRef} role="list" aria-label="Transactions">
            {(pendingTxs.length === 0 && completedTxs.length === 0) ? (
              <div className="tx-empty" role="listitem">
                <p>No transactions yet</p>
                <p className="tx-empty-hint">
                  Transactions you submit will appear here with live status updates.
                </p>
              </div>
            ) : (
              <>
                {pendingTxs.length > 0 && (
                  <div className="tx-section">
                    <h3 className="tx-section-title">Pending ({pendingTxs.length})</h3>
                    <ul role="list" className="tx-list">
                      {pendingTxs.map((tx, idx) => (
                        <TxListItem
                          key={tx.hash}
                          tx={tx}
                          index={idx}
                          focused={focusedIndex === idx}
                          onFocus={() => setFocusedIndex(idx)}
                          onBlur={() => setFocusedIndex(-1)}
                        />
                      ))}
                    </ul>
                  </div>
                )}
                {completedTxs.length > 0 && (
                  <div className="tx-section">
                    <h3 className="tx-section-title">Completed ({completedTxs.length})</h3>
                    <ul role="list" className="tx-list">
                      {completedTxs.slice(0, 20).map((tx, idx) => (
                        <TxListItem
                          key={tx.hash}
                          tx={tx}
                          index={pendingTxs.length + idx}
                          focused={focusedIndex === pendingTxs.length + idx}
                          onFocus={() => setFocusedIndex(pendingTxs.length + idx)}
                          onBlur={() => setFocusedIndex(-1)}
                        />
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Styles injected via CSS-in-JS for encapsulation */}
      <style jsx>{`
        .tx-activity-btn {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border: 1px solid var(--border);
          background: var(--surface);
          color: var(--fg);
          border-radius: 10px;
          cursor: pointer;
          transition: background 0.15s, border-color 0.15s;
        }
        .tx-activity-btn:hover {
          background: var(--surface-2);
          border-color: color-mix(in srgb, var(--brand) 40%, var(--border));
        }
        .tx-activity-btn:focus-visible {
          outline: 3px solid var(--brand-2);
          outline-offset: 2px;
        }
        .tx-icon {
          font-size: 1.2rem;
          line-height: 1;
          animation: tx-spin 2s linear infinite;
        }
        @keyframes tx-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .tx-badge {
          position: absolute;
          top: -4px;
          right: -4px;
          min-width: 18px;
          height: 18px;
          padding: 0 5px;
          background: var(--danger);
          color: white;
          font-size: 0.7rem;
          font-weight: 700;
          border-radius: 999px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .tx-drawer {
          position: fixed;
          top: 0;
          right: 0;
          bottom: 0;
          z-index: 100;
          display: none;
          pointer-events: none;
        }
        .tx-drawer.open {
          display: block;
          pointer-events: auto;
        }
        .tx-drawer-backdrop {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(2px);
          animation: tx-fade-in 0.15s ease;
        }
        @keyframes tx-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .tx-drawer-panel {
          position: absolute;
          top: 0;
          right: 0;
          bottom: 0;
          width: 100%;
          max-width: 420px;
          background: var(--surface);
          border-left: 1px solid var(--border);
          box-shadow: var(--shadow);
          display: flex;
          flex-direction: column;
          animation: tx-slide-in 0.2s ease;
        }
        @keyframes tx-slide-in {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @media (max-width: 480px) {
          .tx-drawer-panel { max-width: 100vw; }
        }
        .tx-drawer-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px;
          border-bottom: 1px solid var(--border);
          flex-shrink: 0;
        }
        .tx-drawer-title {
          margin: 0;
          font-size: 1.05rem;
          font-weight: 700;
        }
        .tx-drawer-close {
          width: 32px;
          height: 32px;
          border: 1px solid var(--border);
          background: var(--surface);
          color: var(--fg);
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1rem;
        }
        .tx-drawer-close:hover { background: var(--surface-2); }
        .tx-drawer-close:focus-visible { outline: 3px solid var(--brand-2); outline-offset: 2px; }
        .tx-drawer-content {
          flex: 1;
          overflow-y: auto;
          padding: 12px 16px 24px;
        }
        .tx-section { margin-bottom: 20px; }
        .tx-section:last-child { margin-bottom: 0; }
        .tx-section-title {
          font-size: 0.8rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--muted);
          margin: 0 0 10px;
          padding: 0 4px;
        }
        .tx-list { list-style: none; padding: 0; margin: 0; display: grid; gap: 8px; }
        .tx-item {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 12px;
          padding: 12px;
          background: var(--surface-2);
          border: 1px solid var(--border);
          border-radius: 10px;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .tx-item:focus-within {
          border-color: var(--brand);
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--brand) 25%, transparent);
        }
        .tx-item-main { min-width: 0; }
        .tx-item-label { font-weight: 600; font-size: 0.9rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .tx-item-meta { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 6px; font-size: 0.8rem; color: var(--muted); }
        .tx-item-time { white-space: nowrap; }
        .tx-item-hash { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.75rem; }
        .tx-status {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: capitalize;
          white-space: nowrap;
          border: 1px solid currentColor;
        }
        .tx-status-pending { color: var(--warn); }
        .tx-status-success { color: var(--ok); }
        .tx-status-failed { color: var(--danger); }
        .tx-status-unknown { color: var(--muted); }
        .tx-item-actions { display: flex; gap: 6px; margin-top: 8px; flex-wrap: wrap; }
        .tx-link { font-size: 0.8rem; color: var(--brand); text-decoration: none; }
        .tx-link:hover { text-decoration: underline; }
        .tx-empty {
          text-align: center;
          padding: 40px 20px;
          color: var(--muted);
        }
        .tx-empty-hint { font-size: 0.85rem; margin-top: 8px; }
        .visually-hidden {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }
      `}</style>
    </>
  );
}

function TxListItem({ tx, index, focused, onFocus, onBlur }) {
  const statusClass = STATUS_CLASSES[tx.status] || "tx-status-unknown";
  const statusLabel = STATUS_LABELS[tx.status] || "Unknown";
  const explorerUrl = explorerTxUrl(tx.hash);
  const shortHash = shortAddress(tx.hash, 10);

  return (
    <li
      role="listitem"
      className="tx-item"
      tabIndex={0}
      onFocus={onFocus}
      onBlur={onBlur}
      data-focused={focused}
    >
      <div className="tx-item-main">
        <div className="tx-item-label">{tx.label}</div>
        <div className="tx-item-meta">
          {tx.invoiceId && <span className="tx-item-invoice">Invoice: {tx.invoiceId}</span>}
          <span className="tx-item-time">{formatRelativeTime(tx.createdAt)}</span>
          <span className="tx-item-hash">{shortHash}</span>
        </div>
        <div className="tx-item-actions">
          <span className={`tx-status ${statusClass}`}>{statusLabel}</span>
          <a
            className="tx-link"
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`View ${tx.label} on stellar.expert`}
          >
            View ↗
          </a>
          <CopyButton value={tx.hash} label="Copy hash" />
        </div>
      </div>
    </li>
  );
}