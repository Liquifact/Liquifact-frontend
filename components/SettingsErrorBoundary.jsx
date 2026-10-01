"use client";

import { Component } from "react";
import ErrorBanner from "./ErrorBanner";
import { reportError } from "../lib/observability/reportError";
import { copy } from "../app/copy/en";

// NOTE: This file is a .jsx module and must be parsed by a JSX-aware toolchain
// (Babel/SWC/Jest transform). `node --check` cannot parse JSX.

/**
 * SettingsErrorBoundary — guards the settings section against unexpected render errors.
 *
 * React error boundaries must be class components (as React does not support
 * hook equivalents for `getDerivedStateFromError` or `componentDidCatch`).
 *
 * Prevents runtime errors in the settings UI from blanking the entire page.
 *
 * Behavior:
 * 1. On catch:
 *    - Logs the error through `reportError` observability seam.
 *    - Renders an accessible fallback UI using `ErrorBanner` (`role="alert"`, `aria-live="assertive"`).
 * 2. On retry:
 *    - Clears the error state, allowing React to attempt rendering the children subtree again.
 *    - Optionally invokes custom `onRetry` callback if provided.
 *
 * Deterministic recovery invariants:
 * - Retry is idompotent: the boundary always resets to a clean error state and
 *   attempts a fresh render of the children subtree.
 * - Retry attempts are counted and exposed via `onRetry` so callers can bound
 *   retry loops and surface user-visible errors without losing in-memory data.
 * - Error objects are never mutated; the latest error is stashed and passed to
 *   `onError` and `reportError` for diagnosis.
 * - Callback failures (`onError`/`onRetry`) are isolated so they cannot
 *   corrupt the boundary state or break the fallback UI.
 */

function safelyInvoke(callback, ...args) {
  if (typeof callback !== "function") {
    return;
  }
  try {
    callback(...args);
  } catch (callbackError) {
    // Never let a consumer callback failure escape into the error boundary
    // render path or corrupt the recovery state. Report it as a non-fatal
    // diagnostic event instead.
    reportError(callbackError, {
      boundary: "SettingsErrorBoundary",
      context: "callback",
    });
  }
}

export default class SettingsErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, retryCount: 0 };
    this.handleRetry = this.handleRetry.bind(this);
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    reportError(error, {
      boundary: "SettingsErrorBoundary",
      componentStack: errorInfo ? errorInfo.componentStack : undefined,
      retryCount: this.state.retryCount,
    });
    safelyInvoke(this.props.onError, error, errorInfo);
  }

  handleRetry() {
    // Reset to a clean state first so the retry attempt is deterministic and
    // independent of any callback failure. The count is incremented so the
    // caller can bound repeated failures.
    const nextRetryCount = this.state.retryCount + 1;
    this.setState({
      hasError: false,
      error: null,
      retryCount: nextRetryCount,
    });
    safelyInvoke(this.props.onRetry, nextRetryCount);
  }

  render() {
    if (this.state.hasError) {
      const title =
        this.props.fallbackTitle || copy.settings?.errorTitle || "Unable to load settings";
      const description =
        this.props.fallbackDescription ||
        copy.settings?.errorDescription ||
        "An unexpected error occurred in the settings section. Please try again.";
      const actionLabel =
        this.props.fallbackActionLabel || copy.settings?.errorActionLabel || "Try again";

      return (
        <div data-testid="settings-error-boundary">
          <ErrorBanner
            variant="error"
            title={title}
            description={description}
            actionLabel={actionLabel}
            onAction={this.handleRetry}
            previewLabel={copy.error?.previewLabel || "Error boundary"}
          />
        </div>
      );
    }

    return this.props.children;
  }
}
