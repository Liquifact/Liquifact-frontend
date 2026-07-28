"use client";

import { useState, useEffect } from "react";
import SettingsErrorBoundary from "./SettingsErrorBoundary";
import Button from "./Button";

/**
 * SettingsContent — inner component rendering settings UI.
 */
export function SettingsContent({ loadData, children, ...props }) {
  const [loading, setLoading] = useState(!!loadData);
  const [data, setData] = useState({ email: "user@example.com", notifications: true });

  useEffect(() => {
    let active = true;
    if (loadData) {
      loadData()
        .then((res) => {
          if (active) setData(res);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }
    return () => {
      active = false;
    };
  }, [loadData]);

  if (loading) {
    return <div data-testid="settings-loading">Loading settings...</div>;
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
