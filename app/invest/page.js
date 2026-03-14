export default function InvestPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 px-6 py-4">
        <a href="/" className="text-xl font-semibold tracking-tight text-cyan-400 hover:underline">
          ← LiquiFact
        </a>
      </header>
      <main className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-2xl font-bold mb-6">Invest</h1>
        <p className="text-slate-400 mb-8">
          Browse tokenized invoices and fund them. Principal + yield at maturity.
        </p>
        <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-8 text-center text-slate-500">
          No investable invoices. Connect wallet to see the marketplace.
        </div>
      </main>
    </div>
  );
}
