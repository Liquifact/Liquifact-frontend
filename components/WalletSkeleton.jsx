/**
 * @file components/WalletSkeleton.jsx
 *
 * Content-shaped loading skeleton for WalletStatus.
 *
 * Mirrors the exact flex layout of the real WalletStatus component so that
 * the page does not shift when the skeleton is replaced by live content:
 *
 *   [status dot] [text column: address line / helper line] [button pill]
 *
 * Dimensions are derived from the actual WalletStatus markup:
 *   - Status dot: h-2 w-2 rounded-full
 *   - Text column: two lines (address ~100px, helper ~160px)
 *   - Button pill: h-9 w-32 rounded-full (matches Button's default pill shape)
 *
 * Accessibility:
 *   - The outer wrapper carries aria-hidden="true" so screen readers skip the
 *     decorative pulse shapes and go straight to the real WalletStatus once it
 *     mounts.
 *   - aria-busy="true" on the wrapper signals to AT that this region is
 *     updating, matching the InvoiceListSkeleton pattern.
 *   - A visually hidden sr-only span provides a human-readable loading message
 *     for AT that do not honour aria-hidden on their parent.
 *
 * Motion:
 *   - animate-pulse is used for the shimmer.  The global
 *     `@media (prefers-reduced-motion: reduce)` rule in app/globals.css
 *     disables animate-pulse automatically, leaving shapes visible but static.
 */

import { copy } from "../app/copy/en";

/**
 * WalletSkeleton — placeholder rendered while WalletProvider is hydrating.
 *
 * @param {object}  [props]
 * @param {string}  [props.className]  Optional extra classes on the wrapper.
 * @param {string}  [props["data-testid"]]  Test id override (defaults to "wallet-skeleton").
 */
export default function WalletSkeleton({ className = "", "data-testid": testId = "wallet-skeleton", ...rest }) {
  return (
    <div
      data-testid={testId}
      aria-hidden="true"
      aria-busy="true"
      className={`flex items-center gap-4 ${className}`.trim()}
      {...rest}
    >
      {/* ── Left cluster: status dot + text column ── */}
      <div className="flex items-center gap-3">
        {/* Status dot — h-2 w-2, matches the live indicator */}
        <div className="h-2 w-2 rounded-full bg-slate-700 animate-pulse" />

        {/* Text column — two lines mimicking address + helper text */}
        <div className="flex flex-col gap-1.5">
          {/* Address / primary line (~100px) */}
          <div className="h-3 w-24 rounded bg-slate-700 animate-pulse" />
          {/* Helper / secondary line (~160px) */}
          <div className="h-2.5 w-40 rounded bg-slate-800 animate-pulse" />
        </div>
      </div>

      {/* ── Right: action button pill ── */}
      <div className="h-9 w-32 rounded-full bg-slate-700 animate-pulse" />

      {/* Screen-reader-only loading label (still announced when aria-hidden
          is not honoured, e.g. some older AT).  Kept outside the aria-hidden
          subtree so it is always reachable if needed. */}
      <span className="sr-only">{copy.wallet.skeletonLabel}</span>
    </div>
  );
}
