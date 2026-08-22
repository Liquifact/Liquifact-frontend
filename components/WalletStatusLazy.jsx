"use client";

import dynamic from "next/dynamic";
import WalletErrorBoundary from "./WalletErrorBoundary";

/**
 * Static placeholder that mirrors WalletStatus dimensions.
 *
 * WalletStatus renders a flex row with:
 *   - status dot (w-2 h-2)
 *   - text/address column (flex-col, variable width)
 *   - button (rounded-full px-4 py-3)
 *
 * The placeholder uses a single block with the same approximate
 * outer dimensions to prevent CLS while the chunk downloads.
 *
 * Why these dimensions?
 *   - The button is px-4 py-3 (~40px tall, ~120-160px wide depending on text)
 *   - The dot + text adds ~200px more width
 *   - Total estimated width: ~320px, height: ~48px
 *
 * We use a conservative fixed size that matches the typical
 * rendered footprint of WalletStatus.
 */
function WalletStatusPlaceholder() {
  return (
    <div
      data-testid="wallet-status-placeholder"
      aria-hidden="true"
      className="flex items-center gap-4 h-12 w-80 animate-pulse rounded-full bg-slate-800/50"
      // The aria-hidden placeholder is purely visual. The real WalletStatus
      // mounts an accessible live region (role="status" aria-live="polite")
      // once the chunk loads.
    />
  );
}

/**
 * Lazy-loaded WalletStatus.
 *
 * Why ssr: false?
 * WalletStatus is a client component that will soon import the Stellar/Freighter
 * SDK, which accesses `window` and browser APIs during initialization.
 * Rendering it on the server would cause "window is not defined" errors and
 * ship unnecessary wallet code in the SSR bundle.
 *
 * Why a placeholder?
 * next/dynamic with a loading component renders the placeholder on the
 * server and during the initial client paint. Because the placeholder has
 * the same outer box model as WalletStatus, no cumulative layout shift
 * occurs when the real component hydrates.
 */
const LazyWalletStatus = dynamic(() => import("./WalletStatus"), {
  ssr: false,
  loading: WalletStatusPlaceholder,
});

/**
 * Guarded, lazy-loaded wallet UI — the export every caller (NavMenu desktop
 * and mobile slots) uses.
 *
 * The boundary lives here rather than at each call site so all placements are
 * protected automatically: an unexpected render error inside WalletStatus (or
 * inside the lazily-loaded chunk) now degrades to an accessible fallback with
 * a Retry action instead of blanking the whole page.
 */
export default function WalletStatusLazy() {
  return (
    <WalletErrorBoundary>
      <LazyWalletStatus />
    </WalletErrorBoundary>
  );
}

export { LazyWalletStatus, WalletStatusPlaceholder };
