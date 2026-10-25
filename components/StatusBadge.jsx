export const STATUS_META = {
  open: { label: "Open", icon: "○", tone: "open" },
  funded: { label: "Funded", icon: "✓", tone: "funded" },
  settled: { label: "Settled", icon: "✓", tone: "settled" },
  withdrawn: { label: "Withdrawn", icon: "↗", tone: "withdrawn" },
  cancelled: { label: "Cancelled", icon: "×", tone: "cancelled" },
  unknown: { label: "Unknown", icon: "?", tone: "unknown" },
};

const CHAIN_META = { label: "On-chain", icon: "⛓", tone: "chain" };
const STATUS_BY_CODE = { 0: "open", 1: "funded", 2: "settled", 3: "withdrawn", 4: "cancelled" };

export default function StatusBadge({ status, kind = "status", live = false }) {
  const normalizedStatus = String(status ?? "").toLowerCase();
  const statusKey = STATUS_BY_CODE[normalizedStatus] || normalizedStatus;
  const meta = kind === "chain" ? CHAIN_META : STATUS_META[statusKey] || STATUS_META.unknown;

  return (
    <span
      className={`badge badge-${meta.tone}`}
      aria-label={`Status: ${meta.label}`}
      aria-live={live ? "polite" : undefined}
      role={live ? "status" : "img"}
    >
      <span className="badge-icon" aria-hidden="true">{meta.icon}</span>
      {meta.label}
    </span>
  );
}
