import { copy } from '../copy/en';

export default function InvestPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 px-6 py-4">
        <a href="/" className="text-xl font-semibold tracking-tight text-cyan-400 hover:underline">
          {copy.layout.backToHome}
        </a>
      </header>
      <main className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-2xl font-bold mb-6">{copy.invest.title}</h1>
        <p className="text-slate-400 mb-8">
          {copy.invest.subtext}
        </p>

        {/* Issue #24 Example marketplace row */}
        <div className="mb-8 rounded-xl border border-slate-700/50 bg-slate-900/50 p-6 flex items-center justify-between opacity-70 relative overflow-hidden">
          <div className="absolute -inset-1 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(255,255,255,0.03)_10px,rgba(255,255,255,0.03)_20px)] pointer-events-none"></div>
          <div>
            <h2 className="font-semibold text-lg text-slate-300">{copy.invest.exampleHeading}</h2>
            <p className="text-sm text-slate-500 mt-1">Invoice #EX-1029 • Expected yield: 8% APR</p>
          </div>
          <div className="text-right">
            <p className="font-bold text-slate-300">10,000 USDC</p>
            <p className="text-xs text-orange-400/80 font-medium uppercase tracking-wider mt-1">{copy.invest.exampleDisclaimer}</p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-8 text-center text-slate-500">
          {copy.invest.emptyState}
        </div>
      </main>
    </div>
  );
}
