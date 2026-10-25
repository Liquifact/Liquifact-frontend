"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { countProgress, evaluate } from "@/lib/onboarding";
import { fundWithFriendbot } from "@/lib/stellar/friendbot";
import {
  getNetworkName,
  getPublicKey,
  hasFreighter,
  isConnected,
  requestAccess,
} from "@/lib/stellar/freighter";
import { getAccountState } from "@/lib/stellar/horizon";
import { CONFIGURED_NETWORK } from "@/lib/stellar/networks";

// ── Status icons ──────────────────────────────────────────────────────────────
const ICON = {
  done: { symbol: "✓", label: "Complete", color: "var(--ok)" },
  todo: { symbol: "○", label: "To do", color: "var(--brand)" },
  blocked: { symbol: "–", label: "Blocked", color: "var(--muted)" },
  "n/a": { symbol: "·", label: "Not applicable", color: "var(--muted)" },
};

function StatusIcon({ status }) {
  const { symbol, label, color } = ICON[status] ?? ICON.blocked;
  return (
    <span
      aria-label={label}
      style={{
        color,
        fontWeight: 700,
        fontSize: "1.1rem",
        width: 24,
        flexShrink: 0,
        textAlign: "center",
        lineHeight: 1,
      }}
    >
      {symbol}
    </span>
  );
}

// ── Individual step ───────────────────────────────────────────────────────────
function ChecklistStep({ step, onAction, busy }) {
  const descId = `desc-${step.id}`;
  const isDone = step.status === "done" || step.status === "n/a";

  return (
    <li
      aria-describedby={descId}
      style={{
        display: "flex",
        gap: 14,
        alignItems: "flex-start",
        padding: "16px 0",
        borderBottom: "1px solid var(--border)",
        opacity: step.status === "blocked" ? 0.5 : 1,
      }}
    >
      <StatusIcon status={step.status} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontWeight: 600,
            fontSize: "0.97rem",
            textDecoration: isDone ? "line-through" : "none",
            color: isDone ? "var(--muted)" : "var(--fg)",
          }}
        >
          {step.title}
        </div>
        <p
          id={descId}
          className="muted"
          style={{ margin: "4px 0 0", fontSize: "0.875rem" }}
        >
          {step.description}
        </p>
      </div>

      {step.action && (
        <div style={{ flexShrink: 0 }}>
          <button
            className="btn btn-ghost"
            style={{ fontSize: "0.88rem", padding: "7px 14px" }}
            onClick={() => onAction(step)}
            disabled={busy === step.id}
            aria-busy={busy === step.id}
          >
            {busy === step.id ? "Working…" : step.action}
          </button>
        </div>
      )}

      {/* Install Freighter: always show external link */}
      {step.id === "install" && step.status !== "done" && (
        <div style={{ flexShrink: 0 }}>
          <a
            href="https://freighter.app"
            target="_blank"
            rel="noreferrer noopener"
            className="btn btn-ghost"
            style={{ fontSize: "0.88rem", padding: "7px 14px" }}
          >
            Get Freighter ↗
          </a>
        </div>
      )}
    </li>
  );
}

// ── Main checklist ────────────────────────────────────────────────────────────
export default function OnboardingChecklist() {
  const [walletState, setWalletState] = useState({
    hasExtension: false,
    connected: false,
    networkOk: false,
    accountExists: false,
    xlmBalance: 0,
    trustlines: [],
    network: CONFIGURED_NETWORK,
    publicKey: null,
  });

  const [busy, setBusy] = useState(null); // step.id currently loading
  const [notice, setNotice] = useState(null); // { kind: "ok"|"err"|"warn", text }
  const [evaluated, setEvaluated] = useState(false);
  const abortRef = useRef(null);

  // ── Detection ───────────────────────────────────────────────────────────
  const detectState = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    const ext = hasFreighter();
    const conn = ext ? await isConnected() : false;
    const networkName = conn ? await getNetworkName() : null;
    const pubkey = conn ? await getPublicKey() : null;
    const configuredNet = CONFIGURED_NETWORK;
    const netOk =
      networkName !== null &&
      (networkName === configuredNet ||
        // Freighter may return "futurenet" aliases; be lenient for testnet
        (configuredNet === "testnet" && networkName.includes("test")));

    let accountExists = false;
    let xlmBalance = 0;
    let trustlines = [];

    if (pubkey && netOk && !ac.signal.aborted) {
      const accountNet = networkName ?? configuredNet;
      const state = await getAccountState(pubkey, accountNet);
      if (!ac.signal.aborted) {
        accountExists = state.exists;
        xlmBalance = state.xlmBalance;
        trustlines = state.trustlines;
      }
    }

    if (!ac.signal.aborted) {
      setWalletState({
        hasExtension: ext,
        connected: conn,
        networkOk: netOk,
        accountExists,
        xlmBalance,
        trustlines,
        network: networkName ?? configuredNet,
        publicKey: pubkey,
      });
      setEvaluated(true);
    }
  }, []);

  // Initial detection + re-detect on window focus
  useEffect(() => {
    detectState();
    const onFocus = () => detectState();
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      if (abortRef.current) abortRef.current.abort();
    };
  }, [detectState]);

  // ── Action handlers ─────────────────────────────────────────────────────
  async function handleAction(step) {
    setNotice(null);

    if (step.id === "connect") {
      setBusy("connect");
      const key = await requestAccess();
      setBusy(null);
      if (key) {
        await detectState();
      } else {
        setNotice({ kind: "warn", text: "Wallet access was not granted. Try again in Freighter." });
      }
      return;
    }

    if (step.id === "fund") {
      const { publicKey, network } = walletState;
      if (!publicKey) {
        setNotice({ kind: "err", text: "No public key found. Connect your wallet first." });
        return;
      }
      if (network !== "testnet") {
        setNotice({ kind: "err", text: "Friendbot is only available on testnet." });
        return;
      }
      setBusy("fund");
      try {
        const result = await fundWithFriendbot(publicKey, network);
        if (result.status === "success" || result.status === "already_funded") {
          setNotice({ kind: "ok", text: result.message });
          await detectState();
        } else {
          setNotice({ kind: "err", text: result.message });
        }
      } catch (err) {
        setNotice({ kind: "err", text: err.message || "Friendbot request failed." });
      } finally {
        setBusy(null);
      }
      return;
    }
  }

  // ── Derived state ────────────────────────────────────────────────────────
  const steps = evaluate(walletState);
  const { done, total } = countProgress(steps);
  const allDone = done === total;

  return (
    <div className="card" style={{ marginTop: 32 }}>
      {/* Progress header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 4,
        }}
      >
        <h2 style={{ fontSize: "1.1rem", margin: 0 }}>Setup checklist</h2>
        <span
          className="muted"
          aria-live="polite"
          aria-atomic="true"
          style={{ fontSize: "0.88rem", fontWeight: 600 }}
        >
          {evaluated ? `${done} of ${total} complete` : "Checking…"}
        </span>
      </div>

      {/* Progress bar */}
      <div
        className="progress"
        aria-label={`${done} of ${total} steps complete`}
        style={{ marginBottom: 8 }}
      >
        <span
          style={{
            width: total > 0 ? `${(done / total) * 100}%` : "0%",
            transition: "width 0.3s ease",
          }}
        />
      </div>

      {/* All-done banner */}
      {allDone && evaluated && (
        <div
          className="notice notice-ok"
          role="status"
          aria-live="polite"
          style={{ marginTop: 12, marginBottom: 4 }}
        >
          🎉 You&apos;re all set! Head to the{" "}
          <a href="/marketplace">marketplace</a> to fund your first invoice.
        </div>
      )}

      {/* Action notice (aria-live region) */}
      {notice && (
        <div
          className={`notice notice-${notice.kind}`}
          role="status"
          aria-live="polite"
          style={{ marginTop: 12 }}
        >
          {notice.text}
        </div>
      )}

      {/* Skeleton while first evaluation is pending */}
      {!evaluated ? (
        <div
          className="skeleton"
          style={{ minHeight: 260, marginTop: 16, borderRadius: 10 }}
          aria-label="Loading checklist…"
        />
      ) : (
        <ol
          style={{ listStyle: "none", padding: 0, margin: "8px 0 0" }}
          aria-label="Onboarding steps"
        >
          {steps.map((step) => (
            <ChecklistStep
              key={step.id}
              step={step}
              onAction={handleAction}
              busy={busy}
            />
          ))}
        </ol>
      )}

      <p
        className="muted"
        style={{ fontSize: "0.82rem", marginTop: 16, marginBottom: 0 }}
      >
        This page re-checks your wallet status every time you return to the
        tab. Switch networks or connect your wallet in Freighter and come back.
      </p>
    </div>
  );
}
