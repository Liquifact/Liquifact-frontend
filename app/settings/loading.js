/**
 * @file app/settings/loading.js
 * Next.js route-level loading UI for the /settings page.
 *
 * Rendered automatically by the Next.js App Router while the page segment
 * is streaming. Delegates the content area to the reusable ThemeSkeleton
 * component so both stay in sync with the real settings layout.
 *
 * @see components/ThemeSkeleton.jsx — reusable theme/settings skeleton
 */
import NavMenuSkeleton from "../../components/NavMenuSkeleton";
import ThemeSkeleton from "../../components/ThemeSkeleton";

export default function SettingsLoading() {
  return (
    <div
      className="min-h-screen bg-slate-950 text-slate-50"
      aria-busy="true"
      data-testid="settings-loading"
    >
      {/* ---- Reusable nav skeleton ---- */}
      <NavMenuSkeleton />

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        {/* ---- Reusable theme/settings skeleton ---- */}
        <ThemeSkeleton isBusy={true} />
      </main>
    </div>
  );
}
