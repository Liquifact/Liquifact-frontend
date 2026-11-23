"use client";

import { useT } from "@/lib/i18n/I18nProvider";
import { dueStatus } from "@/lib/dueStatus";

const META = {
  overdue: { icon: "⚠", tone: "overdue" },
  "due-soon": { icon: "⏳", tone: "due-soon" },
  ok: { icon: "◷", tone: "due-ok" },
};

/** Text + icon key for a non-closed due status. */
export function dueStatusLabelKey(status) {
  if (status.kind === "overdue") return "invoice.dueStatus.overdue";
  if (status.kind === "due-soon" && status.days === 0) return "invoice.dueStatus.today";
  if (status.kind === "due-soon") return "invoice.dueStatus.soon";
  return "invoice.dueStatus.ok";
}

/**
 * Due-date countdown badge. Renders nothing for closed invoices or when the
 * due date is missing. The state is conveyed by text and an icon, with color
 * as a secondary cue only.
 */
export default function DueStatusBadge({ invoice, nowMs }) {
  const t = useT();
  const status = dueStatus(invoice, nowMs);
  if (!status || status.kind === "closed") return null;
  const meta = META[status.kind];
  const text = t(dueStatusLabelKey(status), { count: status.days });
  return (
    <span className={`badge badge-${meta.tone}`} data-due-status={status.kind}>
      <span className="badge-icon" aria-hidden="true">{meta.icon}</span>
      {text}
    </span>
  );
}
