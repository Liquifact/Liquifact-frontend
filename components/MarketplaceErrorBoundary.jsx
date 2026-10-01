"use client";

import React, { Component } from "react";
import ErrorBanner from "./ErrorBanner";
import { reportError } from "../lib/observability/reportError";
import { copy } from "../app/copy/en";

/**
 * MarketplaceErrorBoundary
 *
 * Deterministic failure recovery for the invest/marketplace surface.
 *
 * Invariants:
 *  1. A child render failure never escapes the boundary to unmount the
 *     whole app.
 *  2. Retry is deterministic: every retry increments a monotonic
 *     `attemptId` and remounts the subtree via a stable `resetKey`. The
 *     same failure input always produces the same state transition.
 *  3. Retries are bounded. After `MAX_RETRIES` attempts the boundary
 *     enters a `terminal` state and stops attempting recovery, so a
 *     permanently broken dependency cannot cause an infinite retry loop.
 *  4. Observability is best-effort and must never throw or leak sensitive
 *     data. Only a sanitized message, name, and component stack are reported.
 *  5. The public props contract (`children`, `onReset`, `fallback`,
 *     `maxRetries`) remains backward compatible.
 */

const DEFAULT_MAX_RETRIES = 3;

function sanitizeErrorMessage(error) {
  if (!error) return "unknown_error";
  if (typeof error === "string") return error.slice(0, 200);
  if (typeof error.message === "string") return error.message.slice(0, 200);
  return "unknown_error";
}

export default class MarketplaceErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      attemptId: 0,
      terminal: false,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    const { attemptId, terminal } = this.state;
    const maxRetries = this.resolveMaxRetries();
    const nextAttemptId = attemptId + 1;
    const nextTerminal = nextAttemptId >= maxRetries;

    // Observability is best-effort: a throwing or failing reporter must
    // never prevent the boundary from entering a recoverable state.
    try {
      reportError(error, {
        componentStack: info.componentStack,
        boundary: "MarketplaceErrorBoundary",
        attemptId: nextAttemptId,
        terminal: nextTerminal,
        message: sanitizeErrorMessage(error),
        name: typeof error.name === "string" ? error.name : "Error",
      });
    } catch {
      // Swallowed by design: observability failures are not user-facing.
    }

    this.setState({
      attemptId: nextAttemptId,
      terminal: nextTerminal,
    });
  }

  resolveMaxRetries() {
    const { maxRetries } = this.props;
    if (Number.isInteger(maxRetries) && maxRetries >= 0) {
      return maxRetries;
    }
    return DEFAULT_MAX_RETRIES;
  }

  // NOTE: `resolveMaxRetries` is intentionally a prototype method (not an
  // arrow-function class field) so it is available during `componentDidCatch`
  // and remains stable across remounts.

  handleRetry = () => {
    if (this.state.terminal) {
      return;
    }

    // Notify the owner before clearing state so they can refetch data.
    // A throwing callback must not leave the boundary stuck in an error state.
    try {
      this.props.onReset?.();
    } catch {
      // Swallowed by design: the boundary must remain recoverable.
    }

    this.setState({
      hasError: false,
      error: null,
    });
  };

  render() {
    if (this.state.hasError) {
      if (typeof this.props.fallback === "function") {
        return this.props.fallback({
          error: this.state.error,
          attemptId: this.state.attemptId,
          terminal: this.state.terminal,
          retry: this.handleRetry,
        });
      }

      const description = copy.invest.errorDescription;

      return (
        <div
          className="min-h-screen bg-slate-950 text-slate-100"
          data-testid="marketplace-error-boundary"
          data-attempt-id={this.state.attemptId}
          data-terminal={this.state.terminal ? "true" : "false"}
        >
          <main className="max-w-4xl mx-auto px-6 py-12">
            <ErrorBanner
              title={copy.invest.errorTitle}
              description={description}
              actionLabel={copy.invest.retryAction}
              onAction={this.handleRetry}
              actionDisabled={this.state.terminal}
            />
          </main>
        </div>
      );
    }

    // Remount the subtree on every retry so failed component state is dropped
    // deterministically and no stale in-memory data survives a recovery.
    return (
      <React.Fragment key={this.state.attemptId}>
        {this.props.children}
      </React.Fragment>
    );
  }
}
