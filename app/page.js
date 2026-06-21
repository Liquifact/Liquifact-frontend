'use client';

import { useState } from 'react';
import { copy } from './copy/en';
import { checkBackendHealth } from '../lib/api/health';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function Home() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(false);

  const checkApi = async () => {
    setLoading(true);
    try {
      setHealth(await checkBackendHealth(API_URL));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      <header className="border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <span className="text-xl font-semibold tracking-tight">LiquiFact</span>
        <button
          type="button"
          className="rounded-full bg-cyan-500/20 text-cyan-400 px-4 py-3 text-sm font-medium hover:bg-cyan-500/30 transition-colors"
        >
          {copy.layout.connectWallet}
        </button>
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
            className="block rounded-xl border border-slate-700 bg-slate-900/50 p-6 hover:border-cyan-500/50 transition-colors"
          >
            <h2 className="text-lg font-semibold text-cyan-400 mb-2">{copy.home.boxBusinessTitle}</h2>
            <p className="text-slate-400 text-sm">{copy.home.boxBusinessSub}</p>
          </a>
          <a
            href="/invest"
            className="block rounded-xl border border-slate-700 bg-slate-900/50 p-6 hover:border-cyan-500/50 transition-colors"
          >
            <h2 className="text-lg font-semibold text-cyan-400 mb-2">{copy.home.boxInvestTitle}</h2>
            <p className="text-slate-400 text-sm">{copy.home.boxInvestSub}</p>
          </a>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-6">
          <h2 className="text-sm font-medium text-slate-400 mb-2">API status</h2>
          <button
            type="button"
            onClick={checkApi}
            disabled={loading}
            className="rounded-lg bg-slate-800 px-4 py-3 text-sm font-medium hover:bg-slate-700 disabled:opacity-50"
          >
            {loading ? 'Checking…' : 'Check backend health'}
          </button>
          {health && (
            <div
              role="status"
              aria-live="polite"
              className="mt-4 rounded-lg border border-slate-800 bg-slate-950 p-4 text-sm text-slate-300"
            >
              <p className="font-semibold text-slate-100">
                {health.state === 'connected' && 'Connected'}
                {health.state === 'degraded' && 'Degraded'}
                {health.state === 'unreachable' && 'Unreachable'}
              </p>
              <p className="mt-1">{health.message}</p>
              {health.details && (
                <details className="mt-3">
                  <summary className="cursor-pointer text-cyan-400">
                    Raw health payload
                  </summary>
                  <pre className="mt-3 overflow-auto rounded bg-slate-900 p-3 text-xs">
                    {JSON.stringify(health.details, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
