"use client";

import React, { Component } from "react";
import { reportError } from "../lib/observability/reportError";
import { copy } from "../app/copy/en";

export default class UploadErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    reportError(error, { component: "UploadErrorBoundary", ...errorInfo });
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          aria-live="assertive"
          className="rounded-xl border border-red-500/20 bg-red-500/5 p-6 text-center"
        >
          <h2 className="mb-2 text-lg font-semibold text-red-400">{copy.error.title}</h2>
          <p className="mb-6 text-sm text-red-300/80">{copy.error.description}</p>
          <button
            type="button"
            onClick={this.handleRetry}
            className="rounded-lg bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-400 transition-colors hover:bg-red-500/20 focus-ring"
          >
            {copy.error.actionLabel}
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
