import Link from 'next/link';
import { copy } from './copy/en';

export default function NotFound() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-slate-100">
      <div className="mx-auto max-w-3xl rounded-3xl border border-slate-800 bg-slate-900/40 p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-300">
          404
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-white">
          {copy.errors.notFoundTitle}
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">
          {copy.errors.notFoundDescription}
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center justify-center rounded-xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:ring-offset-2 focus:ring-offset-slate-950"
        >
          {copy.errors.homeAction}
        </Link>
      </div>
    </main>
  );
}
