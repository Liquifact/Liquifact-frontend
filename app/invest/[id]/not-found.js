import Link from "next/link";

export default function InvoiceNotFound() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 px-6 py-4">
        <Link
          href="/"
          className="inline-block py-3 text-xl font-semibold tracking-tight text-cyan-400 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 rounded"
        >
          ← LiquiFact
        </Link>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12 text-center">
        <h1 className="text-3xl font-bold mb-4">Invoice not found</h1>
        <p className="text-slate-400 mb-8 max-w-md mx-auto">
          We could not find that invoice in the marketplace. It may have been removed or the link
          might be incorrect.
        </p>
        <Link
          href="/invest"
          className="inline-block rounded-full bg-cyan-500/20 text-cyan-400 px-6 py-3 text-sm font-medium hover:bg-cyan-500/30 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-950 focus:ring-cyan-500"
        >
          Browse marketplace
        </Link>
      </main>
    </div>
  );
}
