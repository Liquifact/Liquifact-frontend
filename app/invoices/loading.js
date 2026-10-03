// @ts-check
/**
 * @file app/invoices/loading.js
 * Next.js route-level loading UI for the /invoices page.
 *
 * Rendered automatically by the Next.js App Router while the page segment
 * is streaming. Delegates the upload area skeleton to the reusable
 * UploadSkeleton component so both share the same markup and stay in sync.
 *
 * ## Deterministic failure recovery
 *
 * This segment is a pure, side-effect-free presentational component: it
 * never fetches, mutates, or persists anything. That invariant is what
 * makes failure recovery deterministic — there is no partial state to
 * lose and no concurrent execution to race against. To keep it that way
 * while still being observable and recoverable, this file:
 *
 * 1. Guarantees the component is a deterministic function of its props.
 *    It accepts no props, so two renders of the same input always produce
 *    the same output.
 * 2. Surfaces a stable `data-testid` hook so tests and monitoring can
 *    assert the loading boundary is active without inspecting internals.
 * 3. Declares `aria-busy` and `aria-live` so assistive technology and
 *    automation can observe the transient state and recover from it.
 * 4. Does not expose sensitive data: no invoice content, no credentials,
 *    no user-specific identifiers are rendered or logged.
 *
 * Because the component is pure, a failure in any downstream data load
 * cannot corrupt this segment; the App Router will replace it with the
 * page or its error boundary once the segment resolves. Retries are
 * idempotent because re-rendering this file has no observable side effect.
 *
 * @see components/UploadSkeleton.jsx — reusable upload skeleton
 *
 * Compatibility contracts:
 * - The page shell always exposes `data-testid="invoices-loading"` with
 *   `aria-busy="true"` so consumers can detect the loading state by test id
 *   or by ARIA busy state.
 * - The shell always renders a single <header> and a single <main> landmark.
 * - The UploadSkeleton is always rendered with `isBusy=true` and the container
 *   carries the compatibility contract attributes `data-testid="upload-skeleton-boundary"`
 *   and `data-compatibility="invoices-loading-v1"`.
 * - The component must render deterministically for any input (it takes no
 *   props) and must not throw even when UploadSkeleton is unavailable; in
 *   that case it falls back to an inline skeleton that preserves the same
 *   test id and aria-busy contracts.
 */
import UploadSkeleton from "../../components/UploadSkeleton.jsx";

/**
 * Stable test hook for the invoices loading boundary.
 * @type {string}
 */
export const INVOICES_LOADING_TESTID = "invoices-loading";
export const UPLOAD_SKELETON_BOUNDARY_TESTID = "upload-skeleton-boundary";
export const UPLOAD_SKELETON_COMPATIBILITY = "invoices-loading-v1";

/**
 * Safely resolves the reusable upload skeleton. This keeps the loading route
 * deterministic even when the underlying component import is missing or broken.
 *
 * @returns {Function|null}
 */
export function resolveUploadSkeleton() {
  const candidate = UploadSkeleton && typeof UploadSkeleton === "object" ? UploadSkeleton.default : UploadSkeleton;

  if (typeof candidate === "function") {
    return candidate;
  }

  return null;
}

/**
 * Fallback content-shaped placeholder used when the shared UploadSkeleton is not
 * available. The wrapper keeps the compatibility test ids and aria-busy contract
 * even in degraded mode.
 *
 * @param {object} [props]
 * @param {boolean} [props.isBusy=true]
 * @returns {JSX.Element}
 */
export function UploadSkeletonFallback({ isBusy = true, ...restProps } = {}) {
  const safeBusy = isBusy === false ? "false" : "true";

  return (
    <div
      {...restProps}
      aria-busy={safeBusy}
      data-testid={UPLOAD_SKELETON_BOUNDARY_TESTID}
      data-compatibility={UPLOAD_SKELETON_COMPATIBILITY}
      className="w-full rounded-xl border border-slate-800 bg-slate-900/50 p-4"
    >
      <div aria-hidden="true" className="space-y-4">
        <div className="h-3 w-32 rounded bg-slate-700 mb-3 animate-pulse" />
        <div className="flex flex-wrap gap-2 mb-3">
          <div className="h-6 w-20 rounded-full bg-slate-700 animate-pulse" />
          <div className="h-6 w-24 rounded-full bg-slate-700 animate-pulse" />
          <div className="h-6 w-28 rounded-full bg-slate-700 animate-pulse" />
        </div>
        <div className="h-3 w-full rounded bg-slate-800 animate-pulse" />
        <div className="rounded-xl border-2 border-dashed border-slate-700 p-10 text-center animate-pulse">
          <div className="space-y-4">
            <div className="h-10 w-10 mx-auto rounded bg-slate-700" />
            <div className="h-4 w-64 mx-auto rounded bg-slate-700" />
            <div className="h-3 w-32 mx-auto rounded bg-slate-800" />
          </div>
        </div>
        <div className="mt-4 h-12 w-full rounded-xl bg-slate-800 animate-pulse" />
      </div>
      <span className="sr-only">Upload form loading, please wait…</span>
    </div>
  );
}

/**
 * Route-level loading UI for /invoices.
 *
 * Invariants:
 * - Pure and deterministic: no props, no state, no effects, no network.
 * - Always marks the segment as busy and live for assistive technology.
 * - Never renders user or invoice data.
 *
 * @returns {JSX.Element}
 */
export default function InvoicesLoading() {
  const ResolvedUploadSkeleton = resolveUploadSkeleton();
  const Skeleton = ResolvedUploadSkeleton || UploadSkeletonFallback;
  const uploadSkeletonBoundary = ResolvedUploadSkeleton ? (
    <div
      data-testid={UPLOAD_SKELETON_BOUNDARY_TESTID}
      data-compatibility={UPLOAD_SKELETON_COMPATIBILITY}
      aria-busy="true"
      className="w-full"
    >
      <Skeleton isBusy={true} />
    </div>
  ) : (
    <Skeleton isBusy={true} />
  );

  return (
    <div
      className="min-h-screen bg-slate-950 text-slate-100"
      aria-busy="true"
      aria-live="polite"
      data-testid={INVOICES_LOADING_TESTID}
    >
      {/* ---- Header ----- */}
      <header className="border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="inline-block py-3 text-xl font-semibold tracking-tight text-transparent bg-slate-700 rounded w-28 animate-pulse">
          ← LiquiFact
        </div>
        <div className="h-11 w-36 rounded-full bg-slate-800 animate-pulse" />
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* eslint-disable-next-line react/jsx-no-undef */}
        {/* ---- Page title ---- */}
        <div className="h-7 w-28 rounded bg-slate-700 animate-pulse mb-6" />
        {/* ---- Subtitle lines ----- */}
        <div className="h-4 w-full max-w-xl rounded bg-slate-800 animate-pulse mb-2" />
        <div className="h-4 w-2/3 max-w-lg rounded bg-slate-800 animate-pulse mb-8" />

        {/* ---- Reusable upload skeleton ----- */}
        {uploadSkeletonBoundary}
      </main>
    </div>
  );
}
