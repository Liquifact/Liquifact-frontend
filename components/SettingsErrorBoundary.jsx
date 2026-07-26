"use client";

import { Component } from "react";
import ErrorBanner from "./ErrorBanner";
import { reportError } from "../lib/observability/reportError";
import { copy } from "../app/copy/en";

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
 */
export default class SettingsErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
    this.handleRetry = this.handleRetry.bind(this);
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    reportError(error, {
      boundary: "SettingsErrorBoundary",
      componentStack: errorInfo?.componentStack,
    });
    if (typeof this.props.onError === "function") {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry() {
    this.setState({ hasError: false, error: null });
    if (typeof this.props.onRetry === "function") {
      this.props.onRetry();
    }
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
