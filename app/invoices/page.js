import Link from "next/link";
import ErrorBanner from "../../components/ErrorBanner";

import { useRef, useState } from 'react';
import Link from 'next/link';

/**
 * FILE_CONSTRAINTS
 * Single source of truth for upload rules.
 * Wire these to the real API contract when the backend issue is resolved.
 * Mock contract: { accept: string, maxSizeMb: number, maxSizeBytes: number }
 */
const FILE_CONSTRAINTS = {
  accept: '.pdf',
  mimeType: 'application/pdf',
  maxSizeMb: 10,
  maxSizeBytes: 10 * 1024 * 1024, // 10 MB
};

/**
 * ConstraintBadge
 * Small pill that communicates a single file rule at a glance.
 */
function ConstraintBadge({ icon, label }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-800/60 px-3 py-1 text-xs font-medium text-slate-300"
      aria-label={label}
    >
      <span aria-hidden="true">{icon}</span>
      {label}
    </span>
  );
}

/**
 * FileConstraintNotice
 * Proactive copy displayed *before* the upload CTA so users know the rules
 * without having to attempt an invalid upload first.
 */
function FileConstraintNotice() {
  return (
    <div
      role="note"
      aria-label="File upload requirements"
      className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4 mb-6"
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400 mb-3">
        Upload requirements
      </p>
      <div className="flex flex-wrap gap-2 mb-3">
        <ConstraintBadge icon="📄" label="PDF only" />
        <ConstraintBadge icon="⚖️" label={`Max ${FILE_CONSTRAINTS.maxSizeMb} MB`} />
        <ConstraintBadge icon="🔒" label="One file per invoice" />
      </div>
      <p className="text-xs text-slate-400 leading-relaxed">
        Only <strong className="text-slate-200">PDF documents</strong> are accepted.
        Files larger than <strong className="text-slate-200">{FILE_CONSTRAINTS.maxSizeMb} MB</strong> will
        be rejected. Ensure your invoice is complete and legible before uploading.
      </p>
    </div>
  );
}

/**
 * UploadZone
 * Drag-and-drop / click-to-browse upload area (stubbed; no real API call).
 * Validates file type and size client-side and surfaces errors immediately.
 */
function UploadZone() {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState(null);
  const [error, setError] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  function validate(f) {
    if (!f) return 'No file selected.';
    if (f.type !== FILE_CONSTRAINTS.mimeType) {
      return `Invalid file type "${f.type || 'unknown'}". Only PDF files are accepted.`;
    }
    if (f.size > FILE_CONSTRAINTS.maxSizeBytes) {
      const sizeMb = (f.size / 1024 / 1024).toFixed(1);
      return `File is ${sizeMb} MB — exceeds the ${FILE_CONSTRAINTS.maxSizeMb} MB limit.`;
    }
    return null;
  }

  function handleFile(f) {
    setSubmitted(false);
    const err = validate(f);
    if (err) {
      setError(err);
      setFile(null);
    } else {
      setError(null);
      setFile(f);
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  }

  function handleChange(e) {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!file) return;
    // TODO: wire to real upload endpoint — see follow-up backend issue.
    setSubmitted(true);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      inputRef.current?.click();
    }
  }

  const dropZoneBorder = dragOver
    ? 'border-cyan-400 bg-cyan-500/10'
    : error
    ? 'border-red-500/50 bg-red-500/5'
    : file
    ? 'border-emerald-500/40 bg-emerald-500/5'
    : 'border-slate-700 bg-slate-900/40 hover:border-slate-600';

  return (
    <form onSubmit={handleSubmit} noValidate>
      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Drop PDF invoice here or press Enter to browse files"
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        onKeyDown={handleKeyDown}
        className={`cursor-pointer rounded-xl border-2 border-dashed transition-colors duration-200 p-10 text-center ${dropZoneBorder}`}
      >
        <input
          ref={inputRef}
          id="invoice-file-input"
          type="file"
          accept={FILE_CONSTRAINTS.accept}
          className="sr-only"
          aria-label="Select PDF invoice file"
          onChange={handleChange}
        />

        {file ? (
          <div className="space-y-2">
            <span className="text-3xl" aria-hidden="true">✅</span>
            <p className="font-medium text-emerald-400">{file.name}</p>
            <p className="text-xs text-slate-500">
              {(file.size / 1024 / 1024).toFixed(2)} MB · PDF
            </p>
            <p className="text-xs text-slate-500">Click to choose a different file</p>
          </div>
        ) : (
          <div className="space-y-3">
            <span className="text-4xl" aria-hidden="true">📂</span>
            <p className="font-medium text-slate-300">
              Drag &amp; drop your invoice PDF here
            </p>
            <p className="text-sm text-slate-500">or click to browse</p>
            <div className="flex justify-center gap-2 flex-wrap pt-1">
              <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs text-slate-400">
                PDF only
              </span>
              <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs text-slate-400">
                Max {FILE_CONSTRAINTS.maxSizeMb} MB
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Validation error */}
      {error && (
        <p
          role="alert"
          aria-live="assertive"
          className="mt-3 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400"
        >
          <span aria-hidden="true">⚠️</span>
          {error}
        </p>
      )}

      {/* Success stub */}
      {submitted && (
        <p
          role="status"
          aria-live="polite"
          className="mt-3 flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400"
        >
          <span aria-hidden="true">🚀</span>
          Invoice queued for tokenization. Blockchain confirmation pending.
          <span className="text-slate-500 ml-1">(stub — backend TBD)</span>
        </p>
      )}

      {/* Submit CTA */}
      <button
        id="invoice-upload-btn"
        type="submit"
        disabled={!file || !!error}
        aria-disabled={!file || !!error}
        className="mt-4 w-full rounded-xl bg-cyan-500 py-3 text-sm font-semibold text-slate-950 transition-all duration-200
          hover:bg-cyan-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400
          disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Upload &amp; Tokenize Invoice
      </button>
    </form>
  );
}

/**
 * InvoicesPage
 * Main page — file constraints surfaced *before* the upload CTA (issue #27).
 */
export default function InvoicesPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <Link
          href="/"
          className="text-xl font-semibold tracking-tight text-cyan-400 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 rounded"
        >
          ← LiquiFact
        </Link>
        <button
          type="button"
          className="rounded-full bg-cyan-500/20 text-cyan-400 px-4 py-2 text-sm font-medium hover:bg-cyan-500/30 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
        >
          Connect Wallet
        </button>
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
