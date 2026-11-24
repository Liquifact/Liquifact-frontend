"use client";

import { useId, useRef, useState } from "react";
import { useT } from "@/lib/i18n/I18nProvider";
import { PDF_MAX_BYTES, sha256Hex, validatePdfFile } from "@/lib/validation/pdf";

export const FILE_CONSTRAINTS = Object.freeze({
  accept: ".pdf,application/pdf",
  mimeType: "application/pdf",
  maxSizeMb: PDF_MAX_BYTES / (1024 * 1024),
  maxSizeBytes: PDF_MAX_BYTES,
});

function formatFileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatMegabytes(bytes) {
  return String(Number((bytes / (1024 * 1024)).toFixed(2)));
}

/**
 * Drag-and-drop PDF invoice upload zone with client-side validation and a
 * SHA-256 fingerprint. Only validated metadata is handed to the parent.
 *
 * @param {object} props
 * @param {{ name: string, size: number, sha256: string } | null} [props.value]
 * @param {(value: { name: string, size: number, sha256: string } | null) => void} props.onChange
 * @param {boolean} [props.disabled]
 * @param {number} [props.maxBytes]
 */
export default function UploadZone({ value = null, onChange = () => {}, disabled = false, maxBytes = PDF_MAX_BYTES }) {
  const t = useT();
  const id = useId();
  const inputRef = useRef(null);
  const zoneRef = useRef(null);
  const requestRef = useRef(0);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState(null);
  const [dragging, setDragging] = useState(false);

  const instructionsId = `${id}-instructions`;
  const statusId = `${id}-status`;
  const errorId = `${id}-error`;

  function openPicker() {
    if (disabled) return;
    inputRef.current?.click();
  }

  function onKeyDown(event) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    openPicker();
  }

  async function handleFile(file) {
    if (disabled || !file) return;
    const request = requestRef.current + 1;
    requestRef.current = request;
    setError(null);
    onChange(null);
    setStatus("validating");
    const result = await validatePdfFile(file, { maxBytes });
    if (requestRef.current !== request) return;
    if (!result.valid) {
      setStatus("error");
      setError(result);
      return;
    }

    try {
      const sha256 = await sha256Hex(file);
      if (requestRef.current !== request) return;
      onChange({ name: file.name, size: file.size, sha256 });
      setStatus("ready");
    } catch (err) {
      if (requestRef.current !== request) return;
      onChange(null);
      setStatus("error");
      setError({ code: err?.code || "pdf.hashFailed", details: err?.details || {} });
    }
  }

  function onInputChange(event) {
    const file = event.target.files?.[0];
    // Reset so selecting the same file again still fires onChange.
    event.target.value = "";
    handleFile(file);
  }

  function onDrop(event) {
    event.preventDefault();
    setDragging(false);
    if (disabled) return;
    handleFile(event.dataTransfer?.files?.[0]);
  }

  function onDragOver(event) {
    event.preventDefault();
    if (!disabled) setDragging(true);
  }

  function remove() {
    requestRef.current += 1;
    setStatus("idle");
    setError(null);
    onChange(null);
    if (inputRef.current) inputRef.current.value = "";
    zoneRef.current?.focus();
  }

  function errorMessage({ code, details }) {
    if (code === "pdf.type") return t("upload.error.pdf.type", { type: details?.type || "unknown" });
    if (code === "pdf.size") {
      return t("upload.error.pdf.size", {
        sizeMb: formatMegabytes(details?.size ?? 0),
        maxSizeMb: formatMegabytes(details?.maxBytes ?? maxBytes),
      });
    }
    return t(`upload.error.${code}`);
  }

  const describedBy = [instructionsId, statusId, error ? errorId : null].filter(Boolean).join(" ");
  const statusText =
    status === "validating"
      ? t("upload.status.validating")
      : status === "ready" && value
        ? t("upload.status.ready", { name: value.name })
        : "";

  return (
    <div className="upload-zone">
      <div
        ref={zoneRef}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label={value ? t("upload.dropLabelReplace") : t("upload.dropLabel")}
        aria-describedby={describedBy}
        aria-disabled={disabled || undefined}
        className={`upload-drop${dragging ? " is-dragging" : ""}${disabled ? " is-disabled" : ""}`}
        onClick={openPicker}
        onKeyDown={onKeyDown}
        onDragEnter={onDragOver}
        onDragOver={onDragOver}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <span aria-hidden="true" style={{ fontSize: "1.6rem" }}>📄</span>
        <span style={{ fontWeight: 600 }}>{value ? t("upload.dropReplace") : t("upload.dropHint")}</span>
        <span className="muted" style={{ fontSize: "0.85rem" }}>{t("upload.browse")}</span>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={FILE_CONSTRAINTS.accept}
        className="sr-only"
        tabIndex={-1}
        aria-label={t("upload.inputLabel")}
        onChange={onInputChange}
        disabled={disabled}
      />

      <p id={instructionsId} role="note" aria-label={t("upload.requirementsLabel")} className="hint">
        {t("upload.instructions", { maxSizeMb: FILE_CONSTRAINTS.maxSizeMb })}
      </p>

      <div id={statusId} role="status" aria-live="polite" className="hint">
        {statusText}
      </div>

      {error && (
        <p id={errorId} role="alert" aria-live="assertive" className="err">
          {errorMessage(error)}
        </p>
      )}

      {value && (
        <div className="upload-meta">
          <dl>
            <div>
              <dt>{t("upload.fileName")}</dt>
              <dd>{value.name}</dd>
            </div>
            <div>
              <dt>{t("upload.fileSize")}</dt>
              <dd>{formatFileSize(value.size)}</dd>
            </div>
            <div>
              <dt>{t("upload.sha256")}</dt>
              <dd><code className="mono" style={{ wordBreak: "break-all" }}>{value.sha256}</code></dd>
            </div>
          </dl>
          <button type="button" className="btn btn-ghost" onClick={remove} disabled={disabled}>
            {t("upload.remove")}
          </button>
        </div>
      )}
    </div>
  );
}
