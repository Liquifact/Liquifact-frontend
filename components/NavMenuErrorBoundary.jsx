"use client";

import { Component } from "react";
import ErrorBanner from "./ErrorBanner";
import { reportError } from "../lib/observability/reportError";
import { copy } from "../app/copy/en";

/**
 * NavMenuErrorBoundary — guards the primary site navigation.
 *
 * React error boundaries must be class components (there is no hook
 * equivalent of `getDerivedStateFromError` / `componentDidCatch`).
 *
 * Before this boundary existed, an unexpected render error inside NavMenu
 * had nothing above it to catch it, so React unmounted the whole tree and
 * the page went blank. This isolates that failure to the nav region and
 * gives the user a way to recover without a full page reload.
 *
 * On catch:
 *  - Logs the error through the existing `reportError` observability seam
 *    (console sink by default, swappable for Sentry/Datadog). The error is
 *    never swallowed silently.
 *  - Renders an accessible fallback (via {@link ErrorBanner}, which uses
 *    `role="alert"` / `aria-live="assertive"`) with a "Retry" action.
 *
 * Retry clears the error state so React attempts to render `children`
 * again on the next render. If the failure was transient, this recovers
 * in place. If the child throws again, the boundary re-catches and shows
 * the fallback again — retry is safe to click repeatedly.
 */
export default class NavMenuErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    reportError(error, {
      boundary: "NavMenuErrorBoundary",
      componentStack: errorInfo?.componentStack,
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div data-testid="nav-error-boundary">
          <ErrorBanner
            variant="error"
            title={copy.nav.errorTitle}
            description={copy.nav.errorDescription}
            actionLabel={copy.nav.errorActionLabel}
            onAction={this.handleRetry}
            previewLabel={copy.error.previewLabel}
          />
        </div>
      );
    }

    return this.props.children;
  }
}
