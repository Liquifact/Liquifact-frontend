import Link from "next/link";

export default function InvoicesPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 px-6 py-4">
        <Link href="/" className="text-xl font-semibold tracking-tight text-cyan-400 hover:underline">
          ← LiquiFact
        </Link>
      </header>
      <main className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-2xl font-bold mb-6">{copy.invoices.title}</h1>
        <p className="text-slate-400 mb-8">
          {copy.invoices.subtext}
        </p>
        <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-8 text-center text-slate-500">
          {copy.invoices.emptyState}
        </div>
      </main>
    </div>
  );
}
