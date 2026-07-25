"use client";

import React from "react";
import { reportError } from "../lib/observability/reportError";

export default class ThemeErrorBoundary extends React.Component {
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
          className="flex flex-col items-center justify-center p-2 text-red-500 bg-red-950/20 rounded-lg border border-red-500/30"
        >
          <span className="sr-only">Theme component failed to load</span>
          <button
            type="button"
            onClick={this.resetErrorBoundary}
            className="text-xs font-semibold hover:underline focus-ring p-1 rounded"
            aria-label="Retry loading theme"
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
