import Link from 'next/link';
import { copy } from '../copy/en';
import UploadZone from '../../components/UploadZone';

export default function InvoicesPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <Link
          href="/"
          className="focus-ring inline-block py-3 text-xl font-semibold tracking-tight text-cyan-400 hover:underline"
        >
          ← LiquiFact
        </Link>
        <button
          type="button"
          className="focus-ring rounded-full bg-cyan-500/20 text-cyan-400 px-4 py-3 text-sm font-medium hover:bg-cyan-500/30 transition-colors"
        >
          Connect Wallet
        </button>
      </header>
      <main id="main-content" tabIndex={-1} className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-2xl font-bold mb-6">{copy.invoices.title}</h1>
        <p className="text-slate-400 mb-8">
          {copy.invoices.subtext}
        </p>
        <UploadZone />
      </main>
    </div>
  );
}
