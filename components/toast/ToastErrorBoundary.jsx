"use client";

import { Component } from "react";
import ErrorBanner from "../ErrorBanner";
import { reportError } from "../../lib/observability/reportError";
import { copy } from "../../app/copy/en";

/**
 * Isolates the toast notification stack from the rest of the app. If
 * rendering the toast stack throws, this shows an accessible fallback with a
 * retry control instead of letting the error propagate and blank the whole
 * page. Errors are logged through the shared reportError seam, never
 * swallowed silently.
 */
export default class ToastErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    reportError(error, { boundary: "ToastErrorBoundary", componentStack: info?.componentStack });
  }

  reset = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          data-testid="toast-error-boundary"
          className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4 sm:justify-end sm:px-6"
        >
          <div className="pointer-events-auto w-full max-w-md">
            <ErrorBanner
              variant="error"
              title={copy.toastError.title}
              description={copy.toastError.description}
              actionLabel={copy.toastError.actionLabel}
              previewLabel={copy.toastError.previewLabel}
              onAction={this.reset}
            />
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
