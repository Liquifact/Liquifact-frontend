"use client";

import React from "react";
import { reportError } from "../lib/observability/reportError";

export default class FormsErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
    this.resetErrorBoundary = this.resetErrorBoundary.bind(this);
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    reportError(error, errorInfo);
  }

  resetErrorBoundary() {
    this.setState({ hasError: false, error: null });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          aria-live="assertive"
          className="flex flex-col items-center justify-center p-6 text-red-500 bg-red-950/20 rounded-xl border border-red-500/30"
        >
          <span className="sr-only">Forms component failed to load</span>
          <p className="mb-4 text-sm font-medium">An error occurred while loading the forms section.</p>
          <button
            type="button"
            onClick={this.resetErrorBoundary}
            className="text-sm font-semibold hover:underline focus-ring p-2 rounded bg-red-900/40"
            aria-label="Retry loading forms"
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
