# Invoice PDF upload

Optional PDF attachment on `/submit`. The PDF is validated in the browser, hashed
with SHA-256 (the digest that can later be bound on-chain via
`bind_primary_attestation_hash(BytesN<32>)`), previewed, and uploaded through a
typed client that falls back to a mock until the backend endpoint exists.
Keyboard and ARIA expectations: [upload-a11y.md](upload-a11y.md).

## Modules

| File | Purpose |
| ---- | ------- |
| `lib/validation/pdf.js` | `validatePdf(file, bytes)` → `{ valid, errors: [{ code, message }] }`. Pure; no DOM. |
| `lib/hash.js` | `sha256Hex(bytes)` (via `crypto.subtle`) and `hexToBytes32(hex)` → 32-byte `Uint8Array`. |
| `lib/api/uploads.js` | `uploadInvoiceDocument(file, { sha256, signal, onProgress })` → `{ documentId, sha256, mock }`. |
| `components/upload/UploadZone.jsx` | Drop zone, file chip, digest + copy, remove, errors, preview. |

## Validation error codes

| Code | Meaning |
| ---- | ------- |
| `INVALID_TYPE` | MIME type is not `application/pdf` or name does not end in `.pdf` |
| `EMPTY_FILE` | No bytes |
| `FILE_TOO_LARGE` | `file.size` > 10 MB |
| `BAD_MAGIC` | Does not start with `%PDF-` |
| `MISSING_EOF` | No `%%EOF` in the last 1 KB |
| `ENCRYPTED` | `/Encrypt` present |
| `JAVASCRIPT` | `/JavaScript` or `/JS` present |
| `LAUNCH` | `/Launch` present |

## `<UploadZone onChange disabled />`

`onChange({ file, sha256 })` fires after a file passes validation and is hashed;
`onChange(null)` on remove or failure. Change the React `key` to reset it. The
object URL used for the preview is revoked on remove, on replacing the file, and on unmount.
Errors render in a `role="alert"` region; status changes in a polite live region.

## Upload client

- Real: `POST ${API_URL}/api/invoices/documents`, `multipart/form-data` with fields
  `file` and `sha256` (XHR, for progress). A `{ data: { documentId, sha256 } }` or flat
  `{ documentId, sha256 }` response is accepted.
- Mock: used when the endpoint returns 404/501 or `NEXT_PUBLIC_UPLOADS_MODE=mock`.
  Simulates progress and resolves `mock-<first 8 hex of sha256>` with `mock: true`.
- Pass an `AbortSignal` to cancel; the promise rejects with an `AbortError`.

## Submit integration

On submit the document (if any) is uploaded first, then `createInvoice` receives
`documentSha256` and, only for real uploads, `documentId`. A `<progress>` bar and a
**Cancel upload** button are shown while uploading.

## Security notes

- The file is never read as HTML; the filename is rendered as React text.
- PDFs with `/JavaScript`, `/JS`, `/Launch` or `/Encrypt` are rejected before preview.
- Preview uses `<object>` on a blob URL (a sandboxed iframe blocks the browser PDF viewer).
  Because script-bearing PDFs are rejected, no PDF script runs in the app origin.

## Tests

`npm test` covers the pure modules and upload client (`tests/pdf|hash|uploads.test.mjs`).
Component tests live in `tests-ui/` and run with `npm run test:ui` (Vitest, jsdom,
Testing Library; these devDependencies must be installed).
