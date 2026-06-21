'use client';

import Link from 'next/link';
import { useState } from 'react';
import { copy } from './copy/en';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function Home() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(false);

  const checkApi = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/health`);
      const data = await res.json();
      setHealth(data);
    } catch (e) {
      setHealth({ status: 'error', message: e.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      <header className="border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <nav className="contents" aria-label="Primary">
          <Link href="/" className="text-xl font-semibold tracking-tight" aria-label="LiquiFact home">
            LiquiFact
          </Link>
          <button
            type="button"
            className="rounded-full bg-cyan-500/20 text-cyan-400 px-4 py-3 text-sm font-medium hover:bg-cyan-500/30 transition-colors"
          >
            {copy.layout.connectWallet}
          </button>
        </nav>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold tracking-tight mb-4">
          {copy.home.heroTitle}
        </h1>
        <p className="text-slate-400 text-lg mb-12 max-w-2xl">
          {copy.home.heroSub}
        </p>

        <div className="grid gap-6 sm:grid-cols-2 mb-12">
          <a
            href="/invoices"
            aria-label={copy.home.boxBusinessLabel}
            className="block rounded-xl border border-slate-700 bg-slate-900/50 p-6 hover:border-cyan-500/50 transition-colors"
          >
            <h2 className="text-lg font-semibold text-cyan-400 mb-2">{copy.home.boxBusinessTitle}</h2>
            <p className="text-slate-400 text-sm">{copy.home.boxBusinessSub}</p>
          </a>
          <a
            href="/invest"
            aria-label={copy.home.boxInvestLabel}
            className="block rounded-xl border border-slate-700 bg-slate-900/50 p-6 hover:border-cyan-500/50 transition-colors"
          >
            <h2 className="text-lg font-semibold text-cyan-400 mb-2">{copy.home.boxInvestTitle}</h2>
            <p className="text-slate-400 text-sm">{copy.home.boxInvestSub}</p>
          </a>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-6" aria-labelledby="api-status-label">
          {/* API status is a panel label, so the home page keeps one h1 followed by CTA h2 headings. */}
          <span id="api-status-label" className="block text-sm font-medium text-slate-400 mb-2">
            {copy.home.apiStatusLabel}
          </span>
          <button
            type="button"
            onClick={checkApi}
            disabled={loading}
            className="rounded-lg bg-slate-800 px-4 py-3 text-sm font-medium hover:bg-slate-700 disabled:opacity-50"
          >
            {loading ? 'Checking…' : 'Check backend health'}
          </button>
          {health && (
            <pre className="mt-4 p-4 rounded-lg bg-slate-950 text-xs text-slate-300 overflow-auto">
              {JSON.stringify(health, null, 2)}
            </pre>
          )}
        </div>
      </main>
    </div>
  );
}
