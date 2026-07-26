import React from "react";
import PropTypes from "prop-types";
import { reportError } from "@/lib/observability/reportError";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, instanceId: 0 };
    this.retryButtonRef = React.createRef();
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    try {
      // prefer explicit onError prop; fall back to repository seam
      if (typeof this.props.onError === "function") {
        this.props.onError(error, errorInfo);
      } else {
        reportError(error, { component: "ErrorBoundary", info: errorInfo });
      }
    } catch (e) {
      // avoid throwing from the logging call
      // eslint-disable-next-line no-console
      console.error("ErrorBoundary logging failed", e);
    }
  }

  handleRetry = () => {
    this.setState((s) => ({ hasError: false, error: null, errorInfo: null, instanceId: s.instanceId + 1 }), () => {
      if (typeof this.props.onRetry === "function") this.props.onRetry();
    });
  };

  componentDidUpdate(_, prevState) {
    if (!prevState.hasError && this.state.hasError && this.retryButtonRef.current) {
      setTimeout(() => {
        try {
          this.retryButtonRef.current.focus();
        } catch (e) {
          // ignore
        }
      }, 0);
    }
  }

  render() {
    const { hasError } = this.state;
    const { children, fallbackTitle, fallbackDescription, retryLabel } = this.props;

    if (hasError) {
      return (
        <div role="alert" aria-live="assertive" className="error-boundary-fallback" data-testid="error-boundary-fallback">
          <h2>{fallbackTitle || "Something went wrong"}</h2>
          <p>{fallbackDescription || "We encountered an unexpected error while rendering this section. You can try again."}</p>
          <div>
            <button
              ref={this.retryButtonRef}
              type="button"
              onClick={this.handleRetry}
              aria-label={retryLabel || "Retry loading this section"}
              className="btn btn-primary"
              data-testid="error-boundary-retry"
            >
              {retryLabel || "Retry"}
            </button>
          </div>
        </div>
      );
    }

    return React.cloneElement(<>{children}</>, { key: this.state.instanceId });
  }
}

ErrorBoundary.propTypes = {
  children: PropTypes.node,
  onError: PropTypes.func,
  onRetry: PropTypes.func,
  fallbackTitle: PropTypes.string,
  fallbackDescription: PropTypes.string,
  retryLabel: PropTypes.string,
};
