"use client";

import { useEffect, useRef, useState } from "react";
import CopyButton from "../CopyButton";
import { validatePdf } from "../../lib/validation/pdf.js";
import { sha256Hex } from "../../lib/hash.js";

const formatSize = (n) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

/**
 * Optional PDF picker. Calls onChange({ file, sha256 }) once validated and hashed,
 * and onChange(null) when removed or invalid. Remount (change `key`) to reset.
 */
export default function UploadZone({ onChange, disabled = false }) {
  const [file, setFile] = useState(null);
  const [sha256, setSha256] = useState("");
  const [url, setUrl] = useState("");
  const [errors, setErrors] = useState([]);
  const [status, setStatus] = useState("");
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);
  const urlRef = useRef("");

  const revoke = () => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = "";
  };
  useEffect(() => revoke, []);

  function clear() {
    revoke();
    setFile(null);
    setSha256("");
    setUrl("");
  }

  async function handleFile(f) {
    if (!f) return;
    clear();
    setErrors([]);
    onChange?.(null);
    setStatus("Checking PDF…");
    try {
      const bytes = await f.arrayBuffer();
      const res = validatePdf(f, bytes);
      if (!res.valid) {
        setErrors(res.errors);
        setStatus("");
        return;
      }
      const digest = await sha256Hex(bytes);
      urlRef.current = URL.createObjectURL(f);
      setUrl(urlRef.current);
      setFile(f);
      setSha256(digest);
      setStatus(`${f.name} attached. SHA-256 digest computed.`);
      onChange?.({ file: f, sha256: digest });
    } catch {
      setErrors([{ code: "READ_FAILED", message: "Could not read the file. Please try again." }]);
      setStatus("");
    }
  }

  function remove() {
    clear();
    setErrors([]);
    setStatus("Document removed.");
    if (inputRef.current) inputRef.current.value = "";
    onChange?.(null);
  }

  return (
    <div className="field">
      <span className="label-text" id="pdf-label">Invoice PDF (optional)</span>
      <div
        className={`upload-zone${dragging ? " is-dragging" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (!disabled) handleFile(e.dataTransfer?.files?.[0]);
        }}
      >
        <p className="muted" style={{ margin: 0 }}>Drag a PDF here (max 10 MB) or</p>
        <input
          ref={inputRef}
          id="pdf-input"
          className="upload-input"
          type="file"
          accept="application/pdf"
          disabled={disabled}
          aria-describedby="pdf-hint"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        <label htmlFor="pdf-input" className="btn btn-ghost upload-btn">Choose file</label>
        <span id="pdf-hint" className="hint">PDF only. It is checked in your browser and never rendered as HTML.</span>
      </div>

      <div role="status" aria-live="polite" className="sr-only">{status}</div>

      {errors.length > 0 && (
        <div role="alert" className="err">
          <ul style={{ margin: 0, paddingLeft: "1.2em" }}>
            {errors.map((e) => <li key={e.code}>{e.message}</li>)}
          </ul>
        </div>
      )}

      {file && (
        <div className="upload-chip">
          <div className="upload-chip-head">
            <span className="upload-name"><strong>{file.name}</strong> <span className="muted">({formatSize(file.size)})</span></span>
            <button type="button" className="copy" onClick={remove} disabled={disabled}>Remove</button>
          </div>
          <div className="upload-digest">
            <span className="muted">SHA-256</span>
            <code className="addr" data-testid="digest">{sha256}</code>
            <CopyButton value={sha256} label="Copy digest" />
          </div>
          <object data={url} type="application/pdf" className="upload-preview" aria-label={`Preview of ${file.name}`}>
            <p className="muted">Preview is not available in this browser.</p>
          </object>
        </div>
      )}
    </div>
  );
}
