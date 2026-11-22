"use client";

import { useT } from "../lib/i18n/I18nProvider.jsx";

export const STATUS_META = {
  open: { label: "Open", labelKey: "status.open", icon: "○", tone: "open" },
  funded: { label: "Funded", labelKey: "status.funded", icon: "✓", tone: "funded" },
  settled: { label: "Settled", labelKey: "status.settled", icon: "✓", tone: "settled" },
  withdrawn: { label: "Withdrawn", labelKey: "status.withdrawn", icon: "↗", tone: "withdrawn" },
  cancelled: { label: "Cancelled", labelKey: "status.cancelled", icon: "×", tone: "cancelled" },
  unknown: { label: "Unknown", labelKey: "status.unknown", icon: "?", tone: "unknown" },
};

const CHAIN_META = { label: "On-chain", labelKey: "status.onChain", icon: "⛓", tone: "chain" };
const STATUS_BY_CODE = { 0: "open", 1: "funded", 2: "settled", 3: "withdrawn", 4: "cancelled" };

export default function StatusBadge({ status, kind = "status", live = false, label }) {
  const t = useT();
  const normalizedStatus = String(status ?? "").toLowerCase();
  const statusKey = STATUS_BY_CODE[normalizedStatus] || normalizedStatus;
  const meta = kind === "chain" ? CHAIN_META : STATUS_META[statusKey] || STATUS_META.unknown;
  const translatedLabel = t(meta.labelKey);
  const text = label ?? (translatedLabel !== meta.labelKey ? translatedLabel : meta.label);
  const translatedPrefix = t("status.prefix");
  const prefix = translatedPrefix !== "status.prefix" ? translatedPrefix : "Status";

  return (
    <span
      className={`badge badge-${meta.tone}`}
      aria-label={`${prefix}: ${text}`}
      aria-live={live ? "polite" : undefined}
      role={live ? "status" : "img"}
    >
      <span className="badge-icon" aria-hidden="true">{meta.icon}</span>
      {text}
    </span>
  );
}
