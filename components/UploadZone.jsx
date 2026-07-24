"use client";

import { useRef, useState } from "react";
import { env } from "../lib/config/env";
import { copy } from "../app/copy/en";
import { validatePdfFile, sanitizeFilename } from "../lib/validation/pdf";

// Base URL for backend API; validated and centralized in lib/config/env.
const API_URL = env.apiUrl;

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

const FILE_CONSTRAINTS = {
  accept: ".pdf",
  mimeType: "application/pdf",
  maxSizeMb: 10,
  maxSizeBytes: MAX_UPLOAD_BYTES,
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
  const maxSizeMb = FILE_CONSTRAINTS.maxSizeMb;
  return (
    <div
      role="note"
      aria-label="File upload requirements"
      className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4 mb-6"
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400 mb-3">
        {copy.uploadZone.requirementsTitle}
      </p>
      <div className="flex flex-wrap gap-2 mb-3">
        <ConstraintBadge icon="\u{1F4C4}" label={copy.uploadZone.badgePdfOnly} />
        <ConstraintBadge
          icon="\u{2696}\u{FE0F}"
          label={copy.uploadZone.badgeMaxSize.replace("{maxSizeMb}", maxSizeMb)}
        />
        <ConstraintBadge icon="\u{1F512}" label={copy.uploadZone.badgeOneFile} />
      </div>
      <p className="text-xs text-slate-400 leading-relaxed">
        {copy.uploadZone.requirementsBody
          .replace(/\{maxSizeMb\}/g, maxSizeMb)
          .split(/(PDF documents|{maxSizeMb} MB)/)
          .map((part, i) =>
            part === "PDF documents" || part === `${maxSizeMb} MB` ? (
              <strong key={i} className="text-slate-200">
                {part}
              </strong>
            ) : (
              part
            )
          )}
      </p>
    </div>
  );
}

function Spinner({ className = "" }) {
  return (
    <svg
      className={`animate-spin -ml-1 mr-2 h-4 w-4 inline ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      role="img"
      aria-label={copy.uploadZone.spinnerLabel}
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

/**
 * UploadZone Component
 * Renders a drag-and-drop file upload area for invoice PDFs.
 * Handles file validation (MIME-type, size, and magic bytes) and manages
 * upload states (idle, uploading, tokenizing, success, error).
 *
 * @param {Object} props - Component properties
 * @param {Function} [props.onUploadSuccess] - Callback triggered when the invoice upload completes successfully. Passes the generated invoice metadata object.
 * @param {number} [props.progress] - Optional upload progress percentage (0 to 100). If provided as a number during the upload status, a determinate progress bar is rendered. If undefined, it falls back to an indeterminate spinner.
 */
function UploadZone({ onUploadSuccess, progress }) {
  const inputRef = useRef(null);
  const dropzoneRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState(null);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState("idle");

  /**
   * Resets the component back to its idle state, clearing the selected file,
   * any error message, and the current status. Focus is moved to the dropzone
   * so keyboard users can immediately start a fresh upload without having to
   * tab back to it manually.
   */
  function resetUpload() {
    setFile(null);
    setError(null);
    setStatus("idle");
    if (inputRef.current) {
      inputRef.current.value = "";
    }
    // Move focus to the dropzone after reset so keyboard-assisted users can
    // immediately start a new upload without re-navigating.
    dropzoneRef.current?.focus();
  }

  function validate(f) {
    if (!f) return copy.uploadZone.errorNoFile;
    if (f.type !== FILE_CONSTRAINTS.mimeType) {
      return copy.uploadZone.errorInvalidType.replace("{type}", f.type || "unknown");
    }
    if (f.size > FILE_CONSTRAINTS.maxSizeBytes) {
      const sizeMb = (f.size / 1024 / 1024).toFixed(1);
      return copy.uploadZone.errorOversize
        .replace("{sizeMb}", sizeMb)
        .replace("{maxSizeMb}", FILE_CONSTRAINTS.maxSizeMb);
    }
    if (f.size === 0) {
      return copy.uploadZone.errorEmpty;
    }
    return null;
  }

  async function handleFile(f) {
    setStatus("idle");
    const err = validate(f);
    if (err) {
      setError(err);
      setFile(null);
      return;
    }
    // Optimistically set the file and clear any previous error.
    setFile(f);
    setError(null);
    // Comprehensive PDF validation (async). If it fails, clear the file and show error.
    try {
      const validation = await validatePdfFile(f);
      if (!validation.valid) {
        setError(validation.reason || copy.uploadZone.errorInvalidPdf);
        setFile(null);
      }
    } catch (e) {
      setError(copy.uploadZone.errorReadFailed);
      setFile(null);
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

  async function handleSubmit(e) {
    e.preventDefault();
    if (!file || status !== "idle") return;

    setStatus("uploading");
    setError(null);

    try {
      const body = new FormData();
      body.append("invoice", file);

      const baseUrl = typeof API_URL !== "undefined" && API_URL ? API_URL : "";
      const res = await fetch(`${baseUrl}/invoices`, { method: "POST", body });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          data.message || copy.uploadZone.errorUploadStatus.replace("{status}", res.status)
        );
      }

      setStatus("tokenizing");
      const { tokenizationDelay = 0 } = await res.json().catch(() => ({}));
      if (tokenizationDelay > 0) {
        await new Promise((r) => setTimeout(r, tokenizationDelay));
      }
      setStatus("success");
      if (typeof onUploadSuccess === "function") {
        onUploadSuccess({
          id: `upload-${Date.now()}-${sanitizeFilename(file.name)}`,
          issuer: sanitizeFilename(file.name),
          amount: "Pending",
          currency: "USD",
          dueDate: "Pending",
          yield: "Pending",
          status: "Pending tokenization",
        });
      }
    } catch (err) {
      setError(err.message || copy.uploadZone.errorUploadFailed);
      setStatus("idle");
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      inputRef.current?.click();
    }
  }

  const isProcessing = status === "uploading" || status === "tokenizing";

  const dropZoneBorder = dragOver
    ? "border-cyan-400 bg-cyan-500/10"
    : error
      ? "border-red-500/50 bg-red-500/5"
      : file
        ? "border-emerald-500/40 bg-emerald-500/5"
        : "border-slate-700 bg-slate-900/40 hover:border-slate-600";

  return (
    <form onSubmit={handleSubmit} noValidate>
      <FileConstraintNotice />

      <label htmlFor="invoice-file-input" className="sr-only">
        {copy.uploadZone.fileInputLabel}
      </label>
      <input
        ref={inputRef}
        id="invoice-file-input"
        type="file"
        accept={FILE_CONSTRAINTS.accept}
        className="sr-only"
        aria-label={copy.uploadZone.fileInputLabel}
        onChange={handleChange}
      />
      <div
        ref={dropzoneRef}
        role="button"
        tabIndex={0}
        aria-label={copy.uploadZone.dropZoneLabel}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        onKeyDown={handleKeyDown}
        className={`cursor-pointer rounded-xl border-2 border-dashed transition-colors duration-200 p-10 text-center ${dropZoneBorder}`}
      >
        {file ? (
          <div className="space-y-2">
            <span className="text-3xl" aria-hidden="true">
              {"\u2705"}
            </span>
            <p
              className="font-medium text-emerald-400"
              dangerouslySetInnerHTML={{ __html: sanitizeFilename(file.name) }}
            />
            <p className="text-xs text-slate-500">
              {(file.size / 1024 / 1024).toFixed(2)} MB {"\u00B7"} PDF
            </p>
            <p className="text-xs text-slate-500">{copy.uploadZone.changeFile}</p>
          </div>
        ) : (
          <div className="space-y-3">
            <span className="text-4xl" aria-hidden="true">
              {"\u{1F4C2}"}
            </span>
            <p className="font-medium text-slate-300">{copy.uploadZone.dragDropPrompt}</p>
            <p className="text-sm text-slate-500">{copy.uploadZone.browsePrompt}</p>
            <div className="flex justify-center gap-2 flex-wrap pt-1">
              <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs text-slate-400">
                {copy.uploadZone.badgePdfOnly}
              </span>
              <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs text-slate-400">
                {copy.uploadZone.badgeMaxSize.replace("{maxSizeMb}", FILE_CONSTRAINTS.maxSizeMb)}
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
          <span aria-hidden="true">{"⚠️"}</span>
          {error}
        </p>
      )}

      {status === "uploading" && (
        <div
          role="status"
          aria-live="polite"
          className="mt-3 flex flex-col gap-2 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-400"
        >
          <div className="flex items-center gap-2">
            {typeof progress !== "number" && <Spinner />}
            <span id="upload-status-text">{copy.uploadZone.statusUploading}</span>
            {typeof progress === "number" && (
              <span className="ml-auto font-medium">{Math.round(progress)}%</span>
            )}
          </div>
          {typeof progress === "number" && (
            <div
              role="progressbar"
              aria-valuemin="0"
              aria-valuemax="100"
              aria-valuenow={Math.round(progress)}
              aria-labelledby="upload-status-text"
              className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-cyan-950/50"
            >
              <div
                className="h-full bg-cyan-400 transition-all duration-300 motion-reduce:transition-none"
                style={{ width: `${Math.round(progress)}%` }}
              />
            </div>
          )}
        </div>
      )}

      {status === "tokenizing" && (
        <p
          role="status"
          aria-live="polite"
          className="mt-3 flex items-start gap-2 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-400"
        >
          <Spinner />
          {copy.uploadZone.statusTokenizing}
        </p>
      )}

      {status === "success" && (
        <div className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
          <p
            role="status"
            aria-live="polite"
            className="flex items-start gap-2 text-sm text-emerald-400"
          >
            <span aria-hidden="true">{"\u{1F680}"}</span>
            {copy.uploadZone.statusSuccess}
          </p>
          <button
            type="button"
            onClick={resetUpload}
            className="mt-3 w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-emerald-500 focus-ring"
            aria-label={copy.uploadZone.resetAriaLabel}
          >
            {copy.uploadZone.resetAction}
          </button>
        </div>
      )}

      <button
        id="invoice-upload-btn"
        type="submit"
        disabled={!file || isProcessing}
        aria-disabled={!file || isProcessing}
        className="mt-4 w-full rounded-xl bg-cyan-500 py-3 text-sm font-semibold text-slate-950 transition-all duration-200
          hover:bg-cyan-400 focus-ring
          disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {status === "uploading" && (
          <>
            <Spinner />
            {copy.uploadZone.submitUploading}
          </>
        )}
        {status === "tokenizing" && (
          <>
            <Spinner />
            {copy.uploadZone.submitTokenizing}
          </>
        )}
        {(status === "idle" || status === "success") && copy.uploadZone.submitIdle}
      </button>
    </form>
  );
}

export default UploadZone;
export { FILE_CONSTRAINTS, Spinner };
