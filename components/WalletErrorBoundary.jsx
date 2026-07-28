"use client";

import React from "react";
import ErrorBanner from "./ErrorBanner";
import { reportError } from "../lib/observability/reportError";
import { copy } from "../app/copy/en";

/**
 * Error boundary guarding the wallet section of the header.
 *
 * Why a class component?
 * React only exposes error-boundary lifecycles (`getDerivedStateFromError` /
 * `componentDidCatch`) to class components — there is no hook equivalent.
 *
 * Behaviour:
 *   - Normal render: children pass straight through, no extra DOM wrapper
 *     semantics that would disturb the header layout.
 *   - Child throws during render: the error is forwarded to the existing
 *     {@link reportError} observability seam (never swallowed silently) and an
 *     accessible fallback is rendered in place of the wallet UI. The fallback
 *     is {@link ErrorBanner}, which carries `role="alert"` and
 *     `aria-live="assertive"` so assistive tech announces it immediately.
 *   - Retry: clears the error state *and* bumps `resetKey`, which is used as
 *     the `key` of the children wrapper. Changing the key forces React to
 *     discard the old (broken) subtree and mount a fresh one, so a child whose
 *     failure came from stale internal state gets a genuine second chance
 *     rather than being re-rendered from the same instance.
 *   - If the retried render throws again, the boundary catches it once more
 *     and reports it again — repeated failures stay visible in telemetry.
 *
 * @param {object} props
 * @param {React.ReactNode} props.children - The wallet UI to guard.
 * @param {Function} [props.onReset] - Optional callback fired on retry, before
 *   the subtree is re-mounted. Useful for clearing caches owned by the caller.
 */
export default class WalletErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    /** @type {{ hasError: boolean, resetKey: number }} */
    this.state = { hasError: false, resetKey: 0 };
    this.handleRetry = this.handleRetry.bind(this);
  }

  /**
   * Render-phase hook: swap to the fallback UI on the next render pass.
   * Kept side-effect free — logging happens in componentDidCatch.
   */
  static getDerivedStateFromError() {
    return { hasError: true };
  }

  /**
   * Commit-phase hook: forward the error to the observability sink.
   * @param {Error} error
   * @param {{ componentStack?: string }} errorInfo
   */
  componentDidCatch(error, errorInfo) {
    reportError(error, {
      boundary: "WalletErrorBoundary",
      componentStack: errorInfo?.componentStack,
    });
  }

  handleRetry() {
    this.props.onReset?.();
    // Bumping resetKey remounts the children so the retry is a real re-attempt.
    this.setState((prev) => ({ hasError: false, resetKey: prev.resetKey + 1 }));
  }

  render() {
    if (this.state.hasError) {
      return (
        <div data-testid="wallet-error-fallback" className="w-full max-w-sm">
          <ErrorBanner
            variant="error"
            title={copy.wallet.errorTitle}
            description={copy.wallet.errorDescription}
            actionLabel={copy.wallet.errorActionLabel}
            previewLabel={copy.wallet.errorPreviewLabel}
            onAction={this.handleRetry}
          />
        </div>
      );
    }

    // Fragment keyed by resetKey: no extra DOM node, but retry still remounts.
    return <React.Fragment key={this.state.resetKey}>{this.props.children}</React.Fragment>;
  }
}
