"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useT } from "@/lib/i18n/I18nProvider";
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
  done: { symbol: "✓", labelKey: "getStarted.status.done", color: "var(--ok)" },
  todo: { symbol: "○", labelKey: "getStarted.status.todo", color: "var(--brand)" },
  blocked: { symbol: "–", labelKey: "getStarted.status.blocked", color: "var(--muted)" },
  "n/a": { symbol: "·", labelKey: "getStarted.status.na", color: "var(--muted)" },
};

function StatusIcon({ status }) {
  const t = useT();
  const { symbol, labelKey, color } = ICON[status] ?? ICON.blocked;
  return (
    <span
      aria-label={t(labelKey)}
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
  const t = useT();
  const descId = `desc-${step.id}`;
  const isDone = step.status === "done" || step.status === "n/a";
  const actionStyle = { fontSize: "0.88rem", padding: "7px 14px" };

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
          {t(step.titleKey)}
        </div>
        <p
          id={descId}
          className="muted"
          style={{ margin: "4px 0 0", fontSize: "0.875rem" }}
        >
          {t(step.descriptionKey)}
        </p>
      </div>

      {step.action && (
        <div style={{ flexShrink: 0 }}>
          {step.action.type === "link" ? (
            <a
              href={step.action.href}
              target="_blank"
              rel="noreferrer noopener"
              className="btn btn-ghost"
              style={actionStyle}
            >
              {t(step.action.labelKey)} ↗
            </a>
          ) : (
            <button
              className="btn btn-ghost"
              style={actionStyle}
              onClick={() => onAction(step)}
              disabled={busy === step.id}
              aria-busy={busy === step.id}
            >
              {busy === step.id ? t("getStarted.working") : t(step.action.labelKey)}
            </button>
          )}
        </div>
      )}
    </li>
  );
}

// ── Main checklist ────────────────────────────────────────────────────────────
export default function OnboardingChecklist() {
  const t = useT();
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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Initial wallet detection on mount
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
        setNotice({ kind: "warn", text: t("getStarted.notice.accessDenied") });
      }
      return;
    }

    if (step.id === "fund") {
      const { publicKey, network } = walletState;
      if (!publicKey) {
        setNotice({ kind: "err", text: t("getStarted.notice.noPublicKey") });
        return;
      }
      if (network !== "testnet") {
        setNotice({ kind: "err", text: t("getStarted.notice.friendbotTestnet") });
        return;
      }
      setBusy("fund");
      try {
        const result = await fundWithFriendbot(publicKey, network);
        if (result.status === "success") {
          setNotice({ kind: "ok", text: t("getStarted.notice.funded") });
          await detectState();
        } else if (result.status === "already_funded") {
          setNotice({ kind: "ok", text: t("getStarted.notice.alreadyFunded") });
          await detectState();
        } else {
          setNotice({ kind: "err", text: t("getStarted.notice.friendbotError", { message: result.message }) });
        }
      } catch {
        setNotice({ kind: "err", text: t("getStarted.notice.friendbotFailed") });
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
        <h2 style={{ fontSize: "1.1rem", margin: 0 }}>{t("getStarted.checklist.title")}</h2>
        <span
          className="muted"
          aria-live="polite"
          aria-atomic="true"
          style={{ fontSize: "0.88rem", fontWeight: 600 }}
        >
          {evaluated ? t("getStarted.progress", { done, total }) : t("getStarted.checking")}
        </span>
      </div>

      {/* Progress bar */}
      <div
        className="progress"
        aria-label={t("getStarted.progressAria", { done, total })}
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
          {t("getStarted.allDonePrefix")}
          <a href="/marketplace">{t("getStarted.allDoneLink")}</a>
          {t("getStarted.allDoneSuffix")}
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
          aria-label={t("getStarted.loading")}
        />
      ) : (
        <ol
          style={{ listStyle: "none", padding: 0, margin: "8px 0 0" }}
          aria-label={t("getStarted.stepsLabel")}
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
        {t("getStarted.footnote")}
      </p>
    </div>
  );
}
