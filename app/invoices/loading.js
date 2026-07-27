import NavMenuSkeleton from "../../components/NavMenuSkeleton";

export default function InvoicesLoading() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100" aria-busy="true">
      <NavMenuSkeleton />

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="h-7 w-28 rounded bg-slate-700 animate-pulse mb-6" />
        <div className="h-4 w-full max-w-xl rounded bg-slate-800 animate-pulse mb-2" />
        <div className="h-4 w-2/3 max-w-lg rounded bg-slate-800 animate-pulse mb-8" />

        <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4 mb-6 animate-pulse">
          <div className="h-3 w-32 rounded bg-slate-700 mb-3" />
          <div className="flex flex-wrap gap-2 mb-3">
            <div className="h-6 w-20 rounded-full bg-slate-700" />
            <div className="h-6 w-24 rounded-full bg-slate-700" />
            <div className="h-6 w-28 rounded-full bg-slate-700" />
          </div>
          <div className="h-3 w-full rounded bg-slate-800" />
        </div>

        <div className="rounded-xl border-2 border-dashed border-slate-700 p-10 text-center animate-pulse">
          <div className="space-y-4">
            <div className="h-10 w-10 mx-auto rounded bg-slate-700" />
            <div className="h-4 w-64 mx-auto rounded bg-slate-700" />
            <div className="h-3 w-32 mx-auto rounded bg-slate-800" />
            <div className="flex justify-center gap-2 pt-1">
              <div className="h-5 w-16 rounded-full bg-slate-800" />
              <div className="h-5 w-20 rounded-full bg-slate-800" />
            </div>
          </div>
        </div>

        <div className="mt-4 h-12 w-full rounded-xl bg-slate-800 animate-pulse" />
      </main>
    </div>
  );
}
