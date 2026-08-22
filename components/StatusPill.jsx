/**
 * @file components/StatusPill.jsx
 *
 * Renders an invoice-status pill (the small coloured badge shown on cards and
 * the detail page).  This component is the **only** place in the codebase that
 * is allowed to format invoice statuses for display — every other rendering
 * site (`InvoiceCard`, the `app/invest/[id]` detail page) imports this
 * component rather than reproducing the mapping inline.
 *
 * Contract
 * ────────
 * • The canonical status vocabulary lives in `lib/types/invoice.js`
 *   (`INVOICE_STATUSES`) and is paired with presentation metadata in
 *   `STATUS_PILL_MAP`.  This component reads those two exports and is the
 *   sole render-time consumer.
 *
 * • **Unknown / nullish / empty `status` ALWAYS resolves to the neutral
 *   `Unknown` pill** (`STATUS_PILL_MAP.Unknown`).  The component never
 *   throws, never renders the raw input, and never renders an empty pill.
 *
 * • Status is conveyed by **text**, not by colour alone.  The visible label
 *   is also exposed verbatim via `aria-label` so a screen reader announces
 *   the same word for every colour tone.
 *
 * • The pill is purely presentational — it is a `<span>`, not a `<button>`,
 *   and never accepts click handlers or keyboard focus.
 *
 * • `data-status` on the rendered `<span>` carries the canonical key (one of
 *   the `INVOICE_STATUSES` values or `"Unknown"`).  Tests and the
 *   `InvoiceCard` aria-label rely on this attribute.  The values are the
 *   four `INVOICE_STATUSES` members **plus** a literal `"Unknown"` fallback;
 *   that means `data-status` is intentionally allowed to be `"Unknown"` even
 *   though `"Unknown"` is not a member of the `InvoiceStatus` union — test
 *   selectors and any querying code must accept it as a possible value.
 */

import { resolveStatusPill } from "@/lib/types/invoice";

/**
 * @param {object}  props
 * @param {unknown} props.status    - Any invoice status value.  Strings not in
 *                                    `INVOICE_STATUSES` (and all nullish /
 *                                    non-string inputs) fall back to the
 *                                    neutral `Unknown` pill.
 * @param {string}  [props.className] - Optional extra Tailwind classes
 *                                       appended to the tone classes.  Use
 *                                       sparingly — layout-spacing classes
 *                                       only; never override tone colours.
 * @returns {JSX.Element}
 */
export default function StatusPill({ status, className = "" }) {
  const { key, label, tone } = resolveStatusPill(status);

  return (
    <span
      data-status={key}
      role="status"
      aria-label={`Status: ${label}`}
      className={[
        // Base shape — same on every status tone so layout/size never shift.
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        tone,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {label}
    </span>
  );
}
