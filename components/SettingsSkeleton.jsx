/**
 * @file components/SettingsSkeleton.jsx
 * Placeholder layout shown while settings are loading.
 */

export default function SettingsSkeleton({ ...props }) {
  return (
    <div role="region" aria-label="Loading settings" aria-busy="true" className="space-y-6 max-w-2xl" {...props}>
      <div aria-hidden="true" className="animate-pulse">
        {/* Title skeleton */}
        <div className="h-8 w-1/3 rounded bg-slate-700 mb-8" />
        
        {/* Form rows skeleton */}
        <div className="space-y-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={`settings-skeleton-row-${i}`} className="flex flex-col space-y-2">
              <div className="h-4 w-1/4 rounded bg-slate-700" />
              <div className="h-10 w-full rounded bg-slate-800" />
            </div>
          ))}
        </div>

        {/* Button skeleton */}
        <div className="mt-8 pt-4">
          <div className="h-10 w-32 rounded bg-slate-700" />
        </div>
      </div>
      <span className="sr-only">Loading settings, please wait…</span>
    </div>
  );
}
