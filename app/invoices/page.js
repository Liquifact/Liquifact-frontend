import Link from "next/link";
import ErrorBanner from "../../components/ErrorBanner";

export default function InvoicesPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 px-6 py-4">
        <Link href="/" className="text-xl font-semibold tracking-tight text-cyan-400 hover:underline">
          ← LiquiFact
        </Link>
      </header>
      <main className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-2xl font-bold mb-6">Invoices</h1>
        <p className="text-slate-400 mb-8">
          Upload and tokenize invoices. List will be wired to the API and Stellar.
        </p>

        <ErrorBanner
          variant="server"
          title="Unable to load invoices"
          description="This preview shows a reusable error banner pattern for server-side failures. Live invoice data is not yet connected in this stubbed UI."
          details="Once the backend contract is available, this banner will display server errors separately from validation issues."
        />

        <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900/30 p-8 text-center text-slate-500">
          No invoices yet. Connect wallet and upload your first invoice.
        </div>
      </main>
    </div>
  );
}
