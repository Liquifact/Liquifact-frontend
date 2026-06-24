'use client';

import { useRef, useState } from 'react';
import { isValidPdfContent, sanitizeFilename } from '../lib/validation/pdf';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const FILE_CONSTRAINTS = {
  accept: '.pdf',
  mimeType: 'application/pdf',
  maxSizeMb: 10,
  maxSizeBytes: 10 * 1024 * 1024,
};

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
        <ConstraintBadge icon="\u{1F4C4}" label="PDF only" />
        <ConstraintBadge icon="\u{2696}\u{FE0F}" label={`Max ${FILE_CONSTRAINTS.maxSizeMb} MB`} />
        <ConstraintBadge icon="\u{1F512}" label="One file per invoice" />
      </div>
      <p className="text-xs text-slate-400 leading-relaxed">
        Only <strong className="text-slate-200">PDF documents</strong> are accepted.
        Files larger than <strong className="text-slate-200">{FILE_CONSTRAINTS.maxSizeMb} MB</strong> will
        be rejected. Ensure your invoice is complete and legible before uploading.
      </p>
    </div>
  );
}

function Spinner({ className = '' }) {
  return (
    <svg
      className={`animate-spin -ml-1 mr-2 h-4 w-4 inline ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}

function UploadZone() {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState(null);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('idle');

  async function validate(f) {
    if (!f) return 'No file selected.';
    if (f.size === 0) return 'File is empty (0 bytes).';
    if (f.type !== FILE_CONSTRAINTS.mimeType) {
      return `Invalid file type "${f.type || 'unknown'}". Only PDF files are accepted.`;
    }
    if (f.size > FILE_CONSTRAINTS.maxSizeBytes) {
      const sizeMb = (f.size / 1024 / 1024).toFixed(1);
      return `File is ${sizeMb} MB — exceeds the ${FILE_CONSTRAINTS.maxSizeMb} MB limit.`;
    }

    const isValidContent = await isValidPdfContent(f);
    if (!isValidContent) {
      return 'File content does not match a valid PDF document.';
    }

    return null;
  }

  async function handleFile(f) {
    setStatus('idle');
    const err = await validate(f);
    if (err) {
      setError(err);
      setFile(null);
    } else {
      setError(null);
      setFile(f);
    }
  }

  async function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) await handleFile(f);
  }

  async function handleChange(e) {
    const f = e.target.files?.[0];
    if (f) await handleFile(f);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!file || status !== 'idle') return;

    setStatus('uploading');
    setError(null);

    try {
      const body = new FormData();
      body.append('invoice', file);

      const res = await fetch(`${API_URL}/invoices`, { method: 'POST', body });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || `Upload failed (${res.status})`);
      }

      setStatus('tokenizing');
      const { tokenizationDelay = 0 } = await res.json().catch(() => ({}));
      if (tokenizationDelay > 0) {
        await new Promise((r) => setTimeout(r, tokenizationDelay));
      }
      setStatus('success');
    } catch (err) {
      setError(err.message || 'Upload failed. Please try again.');
      setStatus('idle');
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      inputRef.current?.click();
    }
  }

  const isProcessing = status === 'uploading' || status === 'tokenizing';

  const dropZoneBorder = dragOver
    ? 'border-cyan-400 bg-cyan-500/10'
    : error
      ? 'border-red-500/50 bg-red-500/5'
      : file
        ? 'border-emerald-500/40 bg-emerald-500/5'
        : 'border-slate-700 bg-slate-900/40 hover:border-slate-600';

  return (
    <form onSubmit={handleSubmit} noValidate>
      <FileConstraintNotice />

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
            <span className="text-3xl" aria-hidden="true">{'\u2705'}</span>
            <p className="font-medium text-emerald-400" title={file.name}>{sanitizeFilename(file.name)}</p>
            <p className="text-xs text-slate-500">
              {(file.size / 1024 / 1024).toFixed(2)} MB {'\u00B7'} PDF
            </p>
            <p className="text-xs text-slate-500">Click to choose a different file</p>
          </div>
        ) : (
          <div className="space-y-3">
            <span className="text-4xl" aria-hidden="true">{'\u{1F4C2}'}</span>
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

      {error && (
        <p
          role="alert"
          aria-live="assertive"
          className="mt-3 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400"
        >
          <span aria-hidden="true">{'\u26A0\uFE0F'}</span>
          {error}
        </p>
      )}

      {status === 'uploading' && (
        <p
          role="status"
          aria-live="polite"
          className="mt-3 flex items-start gap-2 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-400"
        >
          <Spinner />
          Uploading invoice...
        </p>
      )}

      {status === 'tokenizing' && (
        <p
          role="status"
          aria-live="polite"
          className="mt-3 flex items-start gap-2 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-400"
        >
          <Spinner />
          Invoice uploaded. Pending tokenization...
        </p>
      )}

      {status === 'success' && (
        <p
          role="status"
          aria-live="polite"
          className="mt-3 flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400"
        >
          <span aria-hidden="true">{'\u{1F680}'}</span>
          Invoice queued for tokenization. Blockchain confirmation pending.
        </p>
      )}

      <button
        id="invoice-upload-btn"
        type="submit"
        disabled={!file || isProcessing}
        aria-disabled={!file || isProcessing}
        className="mt-4 w-full rounded-xl bg-cyan-500 py-3 text-sm font-semibold text-slate-950 transition-all duration-200
          hover:bg-cyan-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400
          disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {status === 'uploading' && (
          <>
            <Spinner />
            Uploading invoice...
          </>
        )}
        {status === 'tokenizing' && (
          <>
            <Spinner />
            Tokenizing invoice...
          </>
        )}
        {(status === 'idle' || status === 'success') && 'Upload & Tokenize Invoice'}
      </button>
    </form>
  );
}

export default UploadZone;
export { FILE_CONSTRAINTS, Spinner };
