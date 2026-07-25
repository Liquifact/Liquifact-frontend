import { useState, useEffect } from "react";
import SettingsSkeleton from "./SettingsSkeleton";
import ErrorBanner from "./ErrorBanner";
import Button from "./Button";

/**
 * @file components/SettingsView.jsx
 * Settings view component with loading, error, and content states.
 */
export default function SettingsView({ loadData, ...props }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  useEffect(() => {
    let active = true;
    
    // Simulate fast or slow load depending on loadData prop behavior
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        if (loadData) {
          const result = await loadData();
          if (active) {
            setData(result);
            setLoading(false);
          }
        } else {
          // Default mock behavior
          setTimeout(() => {
            if (active) {
              setData({ email: "user@example.com", notifications: true });
              setLoading(false);
            }
          }, 500);
        }
      } catch (err) {
        if (active) {
          setError(err);
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      active = false;
    };
  }, [loadData]);

  if (error) {
    return (
      <div className="max-w-2xl">
        <ErrorBanner 
          title="Failed to load settings" 
          details={error.message}
          actionLabel="Retry"
          onAction={() => {
            setLoading(true);
            setError(null);
            loadData().then(setData).catch(setError).finally(() => setLoading(false));
          }} 
        />
      </div>
    );
  }

  if (loading || !data) {
    return <SettingsSkeleton />;
  }

  return (
    <div className="space-y-6 max-w-2xl" {...props}>
      <h2 className="text-2xl font-semibold text-slate-100 mb-8">Settings</h2>
      
      <div className="space-y-5">
        <div className="flex flex-col space-y-2">
          <label className="text-sm font-medium text-slate-300">Email Address</label>
          <input 
            type="email" 
            defaultValue={data.email}
            className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-slate-100" 
          />
        </div>
        <div className="flex flex-col space-y-2">
          <label className="text-sm font-medium text-slate-300">Notifications</label>
          <div className="flex items-center space-x-2">
            <input type="checkbox" defaultChecked={data.notifications} id="notif" className="w-5 h-5 rounded border-slate-700 bg-slate-900" />
            <label htmlFor="notif" className="text-slate-300">Enable email notifications</label>
          </div>
        </div>
      </div>

      <div className="mt-8 pt-4">
        <Button variant="primary">Save Changes</Button>
      </div>
    </div>
  );
}
