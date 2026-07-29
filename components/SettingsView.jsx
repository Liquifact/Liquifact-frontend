"use client";

import { useState, useEffect, useCallback } from "react";
import SettingsErrorBoundary from "./SettingsErrorBoundary";
import Button from "./Button";
import EmptyState from "./EmptyState";
import ErrorBanner from "./ErrorBanner";
import { copy } from "../app/copy/en";

/**
 * SettingsContent — inner component rendering settings UI.
 */
export function SettingsContent({ loadData, children, ...props }) {
  const [loading, setLoading] = useState(!!loadData);
  const [error, setError] = useState(null);
  const [data, setData] = useState({ email: "user@example.com", notifications: true });
  const [retryCount, setRetryCount] = useState(0);

  const fetchData = useCallback(async () => {
    if (!loadData) return;
    setLoading(true);
    setError(null);
    try {
      const res = await loadData();
      setData(res);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [loadData]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, [fetchData, retryCount]);

  const handleRetry = () => setRetryCount((prev) => prev + 1);

  if (loading) {
    return <div data-testid="settings-loading" aria-busy="true">Loading settings...</div>;
  }

  if (error) {
    return (
      <ErrorBanner
        variant="error"
        title={copy.settings?.errorTitle || "Unable to load settings"}
        description={copy.settings?.errorDescription || "An unexpected error occurred. Please try again."}
        actionLabel={copy.settings?.errorActionLabel || "Try again"}
        onAction={handleRetry}
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

  return (
    <div className="space-y-6 max-w-2xl" data-testid="settings-content" {...props}>
      <h2 className="text-2xl font-semibold text-slate-100 mb-8">Settings</h2>
      {children}
      <div className="space-y-5">
        <div className="flex flex-col space-y-2">
          <label htmlFor="settings-email" className="text-sm font-medium text-slate-300">
            Email Address
          </label>
          <input
            id="settings-email"
            type="email"
            defaultValue={data?.email || "user@example.com"}
            className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-slate-100"
          />
        </div>
        <div className="flex flex-col space-y-2">
          <label className="text-sm font-medium text-slate-300">Notifications</label>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              defaultChecked={data?.notifications ?? true}
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
