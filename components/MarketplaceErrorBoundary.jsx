"use client";

import { Component } from "react";
import ErrorBanner from "./ErrorBanner";
import { reportError } from "../lib/observability/reportError";
import { copy } from "../app/copy/en";

export default class MarketplaceErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    reportError(error, {
      componentStack: info?.componentStack,
      boundary: "MarketplaceErrorBoundary",
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="min-h-screen bg-slate-950 text-slate-100"
          data-testid="marketplace-error-boundary"
        >
          <main className="max-w-4xl mx-auto px-6 py-12">
            <ErrorBanner
              title={copy.invest.errorTitle}
              description={copy.invest.errorDescription}
              actionLabel={copy.invest.retryAction}
              onAction={this.handleRetry}
            />
          </main>
        </div>
      );
    }

    return this.props.children;
  }
}
