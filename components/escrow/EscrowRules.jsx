"use client";

import { stroopsToDisplay } from "@/lib/stellar/amount";
import { useT } from "@/lib/i18n/I18nProvider";

function formatDeadline(t, unixSeconds, nowMs = Date.now()) {
  if (unixSeconds === null || unixSeconds === undefined) return t("rules.noDeadline");
  const d = new Date(unixSeconds * 1000);
  const utc = d.toISOString().replace("T", " ").slice(0, 16) + " UTC";
  const diffMs = d.getTime() - nowMs;
  if (diffMs <= 0) return t("rules.passed", { date: utc });
  const days = Math.floor(diffMs / 86400000);
  const hours = Math.round((diffMs % 86400000) / 3600000);
  const rel =
    days > 0
      ? hours > 0 && days < 7
        ? t("rules.inDaysHours", { count: days, hours })
        : t("rules.inDays", { count: days })
      : t("rules.inHours", { hours: Math.max(1, Math.round(diffMs / 3600000)) });
  return t("rules.relative", { date: utc, relative: rel });
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
  const t = useT();
  if (!constraints) return null;
  const c = constraints;
  const fmt = (v) => (v === null || v === undefined ? t("rules.unknown") : `${stroopsToDisplay(v)} ${currency}`);

  const flags = [];
  if (c.paused === true) flags.push({ key: "paused", icon: "⏸", text: t("rules.flag.paused"), tone: "bad" });
  if (c.legalHold === true) flags.push({ key: "legal", icon: "⚖", text: t("rules.flag.legalHold"), tone: "bad" });
  if (c.status !== null && c.status !== undefined && c.status !== 0) {
    flags.push({ key: "status", icon: "🔒", text: t("rules.flag.notOpen"), tone: "bad" });
  }
  if (flags.length === 0) flags.push({ key: "open", icon: "✓", text: t("rules.flag.open"), tone: "ok" });

  return (
    <div className="rules" data-testid="escrow-rules">
      <h4 className="rules-title">{t("rules.title")}</h4>
      <ul className="rules-list">
        <RuleRow label={t("rules.minContribution")} value={c.minContributionFloor ? fmt(c.minContributionFloor) : t("rules.none")} />
        <RuleRow label={t("rules.maxPerInvestor")} value={c.maxPerInvestorCap === null || c.maxPerInvestorCap === undefined ? t("rules.noCap") : fmt(c.maxPerInvestorCap)} />
        <RuleRow label={t("rules.remainingCapacity")} value={fmt(c.remainingCapacity)} />
        <RuleRow label={t("rules.fundingDeadline")} value={formatDeadline(t, c.fundingDeadline)} />
      </ul>
      <ul className="rules-flags" aria-label={t("rules.statusLabel")}>
        {flags.map((f) => (
          <li key={f.key} className={`rules-flag rules-${f.tone}`}>
            <span aria-hidden="true">{f.icon}</span> {f.text}
          </li>
        ))}
      </ul>
      {Array.isArray(c.errors) && c.errors.length > 0 && (
        <p className="rules-partial" role="status">
          {t("rules.partial")}
        </p>
      )}
    </div>
  );
}
