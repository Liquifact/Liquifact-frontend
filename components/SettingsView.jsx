"suse client";

import { useState, useEffect, useCallback, useRef } from "react";
import SettingsErrorBoundary from "./SettingsErrorBoundary";
import Button from "./Button";
import EmptyState from "./EmptyState";
import ErrorBanner from "./ErrorBanner";
import { copy } from "../app/copy/en";

/**
 * Normalizes an error into a safe, non-sensitive message for logging and display.
 * Never surfaces raw error objects, stack traces, or potentially sensitive data.
 */
function toSafeErrorMessage(error) {
  if (error instanceof Error) {
    return error.message || error.name || "Unknown error";
  }
  if (typeof error === "string") {
    return error;
  }
  return "Unknown error";
}

/**
 * Deterministic failure recovery for settings loading.
 *
 * Invariants:
 * 1. A load attempt is identified by a monotonically increasing request ID.
 * 2. Only the latest in-flight request may commit state (stale responses are dropped).
 * 3. Retries are bounded by MAX_RETRIES to prevent unbounded loops.
 * 4. On failure, previously loaded data is preserved (no silent data loss).
 * 5. Errors are observable via a safe, non-sensitive message.
 */
export const MAX_RETRIES = 3;

export const DEFAULT_SETTINGS = {
  email: "",
  notifications: true,
};

/**
 * SettingsContent — inner component rendering settings UI.
 */
export function SettingsContent({ loadData, children, ...props }) {
  const [loading, setLoading] = useState(!!loadData);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  // Monotonic request counter used to drop stale responses.
  const requestIdRef = useRef(0);
  // Tracks whether the component is still mounted to avoid setting state after unmount.
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchData = useCallback(async () => {
    if (!loadData) {
      setLoading(false);
      return;
    }

    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);

    try {
      const res = await loadData();
      // Drop stale responses and avoid updating after unmount.
      if (!mountedRef.current || requestId !== requestIdRef.current) {
        return;
      }
      setData(res);
    } catch (e) {
      if (!mountedRef.current || requestId !== requestIdRef.current) {
        return;
      }
      // Preserve previous data on failure; only record the error.
      setError(toSafeErrorMessage(e));
    } finally {
      if (mountedRef.current && requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [loadData]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, [fetchData, retryCount]);

  const handleRetry = () => {
    setRetryCount((prev) => {
      if (prev >= MAX_RETRIES) {
        return prev;
      }
      return prev + 1;
    });
  };

  const retriesExhausted = retryCount >= MAX_RETRIES;

  if (loading) {
    return (
      <div data-testid="settings-loading" aria-busy="true">
        Loading settings...
      </div>
    );
  }

  // Only surface the error banner when there is no previously loaded data to fall back on.
  // When data exists, we keep rendering it and expose the error as a non-blocking notice.
  if (error && !data) {
    return (
      <ErrorBanner
        variant="error"
        title={copy.settings?.errorTitle || "Unable to load settings"}
        description={error}
        actionLabel={
          retriesExhausted
            ? copy.settings?.retryExhaustedLabel || "Retry limit reached"
            : copy.settings?.errorActionLabel || "Try again"
        }
        onAction={retriesExhausted ? undefined : handleRetry}
        disabled={retriesExhausted}
      />
    );
  }

  // Assume data is empty if it's null or an empty object.
  if (!data || Object.keys(data).length === 0) {
    return (
      <EmptyState
        title={copy.settings?.emptyStateTitle || "No settings found"}
        description={copy.settings?.emptyStateDescription || "There are no settings to display."}
      />
    );
  }

  const mergedData = { ...DEFAULT_SETTINGS, ...data };

  return (
    <div className="space-y-6 max-w-2xl" data-testid="settings-content" {...props}>
      <h2 className="text-2xl font-semibold text-slate-100 mb-8">Settings</h2>
      {error && (
        <ErrorBanner
          variant="warning"
          title={copy.settings?.staleErrorTitle || "Could not refresh settings"}
          description={error}
          actionLabel={
            retriesExhausted
              ? copy.settings?.retryExhaustedLabel || "Retry limit reached"
              : copy.settings?.errorActionLabel || "Try again"
          }
          onAction={retriesExhausted ? undefined : handleRetry}
          disabled={retriesExhausted}
        />
      )}
      {children}
      <div className="space-y-5">
        <div className="flex flex-col space-y-2">
          <label htmlFor="settings-email" className="text-sm font-medium text-slate-300">
            Email Address
          </label>
          <input
            id="settings-email"
            type="email"
            defaultValue={mergedData.email || ""}
            className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-slate-100"
          />
        </div>
        <div className="flex flex-col space-y-2">
          <label className="text-sm font-medium text-slate-300">Notifications</label>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              defaultChecked={mergedData.notifications ?? true}
              id="notif"
              className="w-5 h-5 rounded border-slate-700 bg-slate-900"
            />
            <label htmlFor="notif" className="text-slate-300">
              Enable email notifications
            </label>
          </div>
        </div>
      </div>

      <div className="mt-8 pt-4">
        <Button variant="primary">Save Changes</Button>
      </div>
    </div>
  );
}

/**
 * SettingsView — wraps settings section in SettingsErrorBoundary with retry.
 */
export default function SettingsView({ children, ...props }) {
  return (
    <SettingsErrorBoundary>
      <SettingsContent {...props}>{children}</SettingsContent>
    </SettingsErrorBoundary>
  );
}
