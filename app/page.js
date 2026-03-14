'use client';

import { useState } from 'react';

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
        <span className="text-xl font-semibold tracking-tight">LiquiFact</span>
        <button
          type="button"
          className="rounded-full bg-cyan-500/20 text-cyan-400 px-4 py-2 text-sm font-medium hover:bg-cyan-500/30 transition-colors"
        >
          Connect Wallet
        </button>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold tracking-tight mb-4">
          Global Invoice Liquidity Network on Stellar
        </h1>
        <p className="text-slate-400 text-lg mb-12 max-w-2xl">
          Unlock liquidity from unpaid invoices instantly. SMEs get working capital; investors earn yield. Tokenized invoices, escrow on Soroban.
        </p>

        <div className="grid gap-6 sm:grid-cols-2 mb-12">
          <a
            href="/invoices"
            className="block rounded-xl border border-slate-700 bg-slate-900/50 p-6 hover:border-cyan-500/50 transition-colors"
          >
            <h2 className="text-lg font-semibold text-cyan-400 mb-2">For Businesses</h2>
            <p className="text-slate-400 text-sm">Upload invoices, get instant stablecoin liquidity.</p>
          </a>
          <a
            href="/invest"
            className="block rounded-xl border border-slate-700 bg-slate-900/50 p-6 hover:border-cyan-500/50 transition-colors"
          >
            <h2 className="text-lg font-semibold text-cyan-400 mb-2">For Investors</h2>
            <p className="text-slate-400 text-sm">Fund tokenized invoices and earn yield at maturity.</p>
          </a>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-6">
          <h2 className="text-sm font-medium text-slate-400 mb-2">API status</h2>
          <button
            type="button"
            onClick={checkApi}
            disabled={loading}
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium hover:bg-slate-700 disabled:opacity-50"
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
