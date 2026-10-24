"use client";

import { stroopsToDisplay } from "@/lib/stellar/amount";

function formatDeadline(unixSeconds, nowMs = Date.now()) {
  if (unixSeconds === null || unixSeconds === undefined) return "No deadline";
  const d = new Date(unixSeconds * 1000);
  const utc = d.toISOString().replace("T", " ").slice(0, 16) + " UTC";
  const diffMs = d.getTime() - nowMs;
  if (diffMs <= 0) return `${utc} (passed)`;
  const days = Math.floor(diffMs / 86400000);
  const hours = Math.round((diffMs % 86400000) / 3600000);
  const rel = days > 0 ? `in ${days} day${days === 1 ? "" : "s"}${hours > 0 && days < 7 ? ` ${hours}h` : ""}` : `in ${Math.max(1, Math.round(diffMs / 3600000))}h`;
  return `${utc} (${rel})`;
}

function RuleRow({ label, value, tone }) {
  return (
    <li className={`rules-row${tone ? ` rules-${tone}` : ""}`}>
      <span className="k">{label}</span>
      <span className="rules-value">{value}</span>
    </li>
  );
}

/**
 * Compact "Escrow rules" list for one on-chain invoice: the funding
 * constraints read from the escrow contract, with status flags.
 * @param {object} props
 * @param {object} props.constraints - result of loadConstraints
 * @param {string} [props.currency] - asset code for amount display
 */
export default function EscrowRules({ constraints, currency = "XLM" }) {
  if (!constraints) return null;
  const c = constraints;
  const fmt = (v) => (v === null || v === undefined ? "Unknown" : `${stroopsToDisplay(v)} ${currency}`);

  const flags = [];
  if (c.paused === true) flags.push({ key: "paused", icon: "⏸", text: "Paused", tone: "bad" });
  if (c.legalHold === true) flags.push({ key: "legal", icon: "⚖", text: "Legal hold", tone: "bad" });
  if (c.status !== null && c.status !== undefined && c.status !== 0) {
    flags.push({ key: "status", icon: "🔒", text: "Not open", tone: "bad" });
  }
  if (flags.length === 0) flags.push({ key: "open", icon: "✓", text: "Open for funding", tone: "ok" });

  return (
    <div className="rules" data-testid="escrow-rules">
      <h4 className="rules-title">Escrow rules</h4>
      <ul className="rules-list">
        <RuleRow label="Min contribution" value={c.minContributionFloor ? fmt(c.minContributionFloor) : "None"} />
        <RuleRow label="Max per investor" value={c.maxPerInvestorCap === null || c.maxPerInvestorCap === undefined ? "No cap" : fmt(c.maxPerInvestorCap)} />
        <RuleRow label="Remaining capacity" value={fmt(c.remainingCapacity)} />
        <RuleRow label="Funding deadline" value={formatDeadline(c.fundingDeadline)} />
      </ul>
      <ul className="rules-flags" aria-label="Escrow status">
        {flags.map((f) => (
          <li key={f.key} className={`rules-flag rules-${f.tone}`}>
            <span aria-hidden="true">{f.icon}</span> {f.text}
          </li>
        ))}
      </ul>
      {Array.isArray(c.errors) && c.errors.length > 0 && (
        <p className="rules-partial" role="status">
          Some rules could not be read; funding falls back to basic checks.
        </p>
      )}
    </div>
  );
}
