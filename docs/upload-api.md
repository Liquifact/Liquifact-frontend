# UploadZone API Reference

Component reference for `components/UploadZone.jsx` — the drag-and-drop PDF invoice
upload form. For accessibility contract, ARIA roles, and keyboard behaviour see
[docs/upload-a11y.md](upload-a11y.md).

---

## Table of Contents

- [Overview](#overview)
- [Props](#props)
- [Named Exports](#named-exports)
- [Upload States](#upload-states)
- [Validation](#validation)
  - [Client-side pre-validation](#client-side-pre-validation)
  - [Deep PDF validation](#deep-pdf-validation)
  - [Error messages](#error-messages)
- [Validation Helpers (`lib/validation/pdf.js`)](#validation-helpers-libvalidationpdfjs)
- [ProgressBar sub-component](#progressbar-sub-component)
- [onUploadSuccess payload](#onuploadsuccess-payload)
- [Density toggle](#density-toggle)
- [Usage examples](#usage-examples)
- [Integration notes](#integration-notes)

---

## Overview

`UploadZone` wraps the full invoice-upload flow in a single form element:

1. The user drops or browses to a PDF file.
2. Client-side validation runs immediately (MIME type, size, magic bytes).
3. On submit, the file is POSTed to `POST /invoices` on the configured backend.
4. The component transitions through `uploading → tokenizing → success` states,
   announcing each change via ARIA live regions.
5. After success an **"Upload another invoice"** reset button returns the component
   to its idle state and focuses the drop zone.

The API endpoint is read from `NEXT_PUBLIC_API_URL` (validated at build time by
`lib/config/env.js`; default `http://localhost:3001`). The component itself has no
router dependency and can be mounted on any page.

---

## Props

| Prop              | Type       | Required | Default     | Description |
| ----------------- | ---------- | -------- | ----------- | ----------- |
| `onUploadSuccess` | `function` | No       | `undefined` | Called once the upload **and** server tokenization delay complete (status reaches `"success"`). Receives a single [optimistic invoice object](#onuploadsuccess-payload). Omit when the parent does not need to react to a successful upload. |
| `progress`        | `number`   | No       | `undefined` | Current upload progress from `0` to `100`. When supplied, replaces the indeterminate spinner with a determinate `ProgressBar` and a visible percentage. Wire this to an `XMLHttpRequest.upload.onprogress` or `fetch` streaming callback. When omitted the component shows an indeterminate spinner. |

---

## Named Exports

| Export             | Type       | Description |
| ------------------ | ---------- | ----------- |
| `default`          | Component  | The `UploadZone` component (default export). |
| `FILE_CONSTRAINTS` | `object`   | Frozen object describing the accepted file format. See table below. |
| `Spinner`          | Component  | Small inline SVG spinner used internally. Re-exported so other components can share the same visual and ARIA treatment without duplicating the SVG. |

### `FILE_CONSTRAINTS` shape

| Key            | Value               | Description |
| -------------- | ------------------- | ----------- |
| `accept`       | `".pdf"`            | Value for the `<input accept>` attribute |
| `mimeType`     | `"application/pdf"` | Expected MIME type; used for synchronous pre-validation |
| `maxSizeMb`    | `10`                | Human-readable size cap (megabytes) |
| `maxSizeBytes` | `10485760`          | Numeric byte limit (`10 * 1024 * 1024`) used in validation logic |

---

## Upload States

The component exposes four internal status values that drive the UI. State is managed
entirely inside `UploadZone` — there is no controlled `status` prop.

| Status        | What triggers it | UI shown |
| ------------- | ---------------- | -------- |
| `"idle"`      | Initial render; after a validation error; after reset | Drop zone, optional error banner, submit button |
| `"uploading"` | `handleSubmit` is called with a valid file | Indeterminate spinner **or** `ProgressBar` (when `progress` prop is set); submit button disabled |
| `"tokenizing"`| Server returns `200` with an optional `tokenizationDelay` | Spinner with "Pending tokenization…" copy; submit button disabled |
| `"success"`   | Tokenization delay elapses | Success message (`role="status"` / `aria-live="polite"`); "Upload another invoice" button |

---

## Validation

Validation runs in two stages. The first is synchronous; the second is asynchronous and
inspects file bytes.

### Client-side pre-validation

Runs inside `validate(file)` immediately on file selection (drop or browse):

| Check | Rule | Error key |
| ----- | ---- | --------- |
| File present | `file` must be truthy | `uploadZone.errorNoFile` |
| MIME type | `file.type` must equal `"application/pdf"` | `uploadZone.errorInvalidType` |
| Max size | `file.size` must be ≤ `FILE_CONSTRAINTS.maxSizeBytes` (10 MB) | `uploadZone.errorOversize` |
| Non-empty | `file.size` must be > `0` | `uploadZone.errorEmpty` |

### Deep PDF validation

Runs inside `handleFile(file)` after the synchronous checks pass, using
`validatePdfFile(file)` from `lib/validation/pdf.js`:

| Check | Rule | Error key |
| ----- | ---- | --------- |
| Extension | File name must end with `.pdf` (case-insensitive) | `uploadZone.errorInvalidPdf` |
| Magic bytes | First 5 bytes must equal `%PDF-` | `uploadZone.errorInvalidPdf` |
| Zero byte | `file.size === 0` (also checked synchronously above) | `uploadZone.errorInvalidPdf` |
| Read failure | `FileReader` throws | `uploadZone.errorReadFailed` |

Files that pass all checks are held in component state until the user clicks "Upload &
Tokenize Invoice". The deep validation never executes file content — it only inspects
bytes and metadata.

### Error messages

All error strings are sourced from `app/copy/en.js` under the `uploadZone` namespace.
The relevant keys and their default English values:

| Key | Default value |
| --- | ------------- |
| `errorNoFile` | `"No file selected."` |
| `errorInvalidType` | `"Invalid file type \"{type}\". Only PDF files are accepted."` |
| `errorOversize` | `"File is {sizeMb} MB — exceeds the {maxSizeMb} MB limit."` |
| `errorEmpty` | `"File is empty (0 bytes). Please select a valid PDF file."` |
| `errorInvalidPdf` | `"The selected file does not appear to be a valid PDF."` |
| `errorReadFailed` | `"Unable to read file. Please try again."` |
| `errorUploadFailed` | `"Upload failed. Please try again."` |
| `errorUploadStatus` | `"Upload failed ({status})"` |

Errors are rendered with `role="alert"` / `aria-live="assertive"` so screen readers
announce them immediately.

---

## Validation Helpers (`lib/validation/pdf.js`)

These helpers are used internally by `UploadZone`. They are also exported for use in
server-side validation, tests, or any future upload surface.

### `isPdfMagicValid(file)`

```js
import { isPdfMagicValid } from "@/lib/validation/pdf";

const isValid = await isPdfMagicValid(file); // true | false
```

Reads the first 5 bytes of `file` via `FileReader` and checks for the `%PDF-` magic
number. Returns a `Promise<boolean>`. Rejects with an `Error` if the read fails.

| Parameter | Type   | Description |
| --------- | ------ | ----------- |
| `file`    | `File` | The file object to inspect |

**Returns:** `Promise<boolean>` — `true` when the file starts with `%PDF-`.

---

### `validatePdfFile(file)`

```js
import { validatePdfFile } from "@/lib/validation/pdf";

const result = await validatePdfFile(file);
// { valid: true }
// { valid: false, reason: "File content does not match PDF format" }
```

Comprehensive validation combining zero-byte check, extension check, and magic-byte
check. Returns a `Promise<{valid: boolean, reason?: string}>`.

| Parameter | Type   | Description |
| --------- | ------ | ----------- |
| `file`    | `File` | The file object to validate |

**Returns:** `Promise<{ valid: boolean, reason?: string }>` — `valid: false` includes a
human-readable `reason` string.

| Failure condition | `reason` |
| ----------------- | -------- |
| Zero-byte file | `"File is empty (0 bytes)"` |
| Extension mismatch | `"File extension does not match .pdf"` |
| Magic byte mismatch | `"File content does not match PDF format"` |

---

### `sanitizeFilename(filename, maxLength?)`

```js
import { sanitizeFilename } from "@/lib/validation/pdf";

sanitizeFilename("invoice<2024>.pdf");      // "invoice&lt;2024&gt;.pdf"
sanitizeFilename("a".repeat(60) + ".pdf");  // truncated to 50 chars + "..."
```

Escapes HTML special characters in a filename and truncates it to prevent layout abuse.
Used both before storing a file reference and when rendering filenames in the DOM.

| Parameter   | Type     | Default | Description |
| ----------- | -------- | ------- | ----------- |
| `filename`  | `string` | —       | Original filename to sanitize |
| `maxLength` | `number` | `50`    | Maximum display length before truncation |

**Returns:** `string` — HTML-escaped, truncated filename. Returns `""` for falsy input.

**Characters escaped:** `&`, `<`, `>`, `"`, `'`.

---

## ProgressBar sub-component

`components/ProgressBar.jsx` is a reusable, accessible determinate progress indicator
used by `UploadZone` when the `progress` prop is supplied. It can also be used standalone.

```jsx
import ProgressBar from "@/components/ProgressBar";

<ProgressBar value={42} max={100} label="Uploading invoice" />
```

| Prop        | Type     | Default | Description |
| ----------- | -------- | ------- | ----------- |
| `value`     | `number` | —       | **Required.** Current progress (clamped to `[0, max]`). |
| `max`       | `number` | `100`   | Maximum value. |
| `label`     | `string` | —       | Accessible label; composed with the percentage for `aria-label` (e.g. `"Uploading invoice 42%"`). |
| `className` | `string` | `""`    | Extra classes forwarded to the outer wrapper `<div>`. |

`ProgressBar` renders a `role="progressbar"` element with `aria-valuemin`, `aria-valuemax`,
and `aria-valuenow`. A visually hidden `<span>` provides a percentage for screen readers.
The fill transition is disabled when `prefers-reduced-motion: reduce` is active.

---

## `onUploadSuccess` payload

When a file successfully uploads and the server tokenization delay elapses,
`onUploadSuccess` is called with a single **optimistic invoice object**:

```js
{
  id: `upload-${Date.now()}-${sanitizeFilename(file.name)}`,
  issuer: sanitizeFilename(file.name),
  amount: "Pending",
  currency: "USD",
  dueDate: "Pending",
  yield: "Pending",
  status: "Pending tokenization",
}
```

This shape satisfies the `InvoiceList` optimistic entry contract. The parent can prepend
it to the invoice list immediately so the user sees their upload reflected without a
full data refresh. All monetary fields are placeholder strings until the backend processes
the invoice.

---

## Density toggle

`UploadZone` includes an internal **compact / comfortable** density toggle. The preference
is persisted to `localStorage` (key: `upload-density`) and rehydrated after mount.

- **Comfortable** (default): wider padding (`p-10`), larger gap between elements (`gap-4`)
- **Compact**: reduced padding (`p-6`), tighter gap (`gap-2`)

The toggle is internal implementation detail — there is no prop to control density
from outside the component.

---

## Usage examples

### Basic — no callback

```jsx
import UploadZone from "@/components/UploadZone";

export default function InvoicePage() {
  return (
    <main id="main-content">
      <h1>Upload Invoice</h1>
      <UploadZone />
    </main>
  );
}
```

### With `onUploadSuccess` to update a sibling list

```jsx
import { useState } from "react";
import UploadZone from "@/components/UploadZone";
import InvoiceList from "@/components/InvoiceList";

export default function InvoicePage() {
  const [optimisticInvoices, setOptimisticInvoices] = useState([]);

  function handleUploadSuccess(newInvoice) {
    setOptimisticInvoices((prev) => [newInvoice, ...prev]);
  }

  return (
    <main id="main-content">
      <UploadZone onUploadSuccess={handleUploadSuccess} />
      <InvoiceList optimisticInvoices={optimisticInvoices} />
    </main>
  );
}
```

### With determinate progress via XHR

```jsx
import { useState } from "react";
import UploadZone from "@/components/UploadZone";

// UploadZone handles the actual fetch internally.
// Use `progress` only when you replace the internal fetch with your own XHR.
export default function InvoicePageWithProgress() {
  const [uploadProgress, setUploadProgress] = useState(undefined);

  // Example: wire a custom XHR upload and feed progress back.
  // In most cases the built-in indeterminate spinner is sufficient.
  return <UploadZone progress={uploadProgress} />;
}
```

### Using `FILE_CONSTRAINTS` for validation in a custom form

```js
import { FILE_CONSTRAINTS } from "@/components/UploadZone";

function validateFile(file) {
  if (file.type !== FILE_CONSTRAINTS.mimeType) {
    return `Only ${FILE_CONSTRAINTS.accept} files are accepted.`;
  }
  if (file.size > FILE_CONSTRAINTS.maxSizeBytes) {
    return `File exceeds the ${FILE_CONSTRAINTS.maxSizeMb} MB limit.`;
  }
  return null;
}
```

### Reusing `Spinner` in a custom component

```jsx
import { Spinner } from "@/components/UploadZone";

function MyLoadingButton({ loading, children }) {
  return (
    <button disabled={loading}>
      {loading && <Spinner />}
      {children}
    </button>
  );
}
```

---

## Integration notes

- **API endpoint:** `POST /invoices` expects `multipart/form-data` with the file under the
  field key `"invoice"`. The server response may include an optional `tokenizationDelay`
  (milliseconds) that the component waits before transitioning to `"success"`.
- **Environment variable:** `NEXT_PUBLIC_API_URL` controls the base URL. The variable is
  validated at build time by `lib/config/env.js` — only `http:` and `https:` schemes are
  accepted.
- **Toast notifications:** `UploadZone` does **not** use the `ToastProvider`. Error and
  status messages are rendered inline within the component. The parent page is responsible
  for any toast feedback if needed.
- **No router dependency:** `UploadZone` does not call `useRouter` or `usePathname`. It
  can be mounted on any page or in a modal without side-effects on navigation state.
- **SSR:** the component is a Client Component (`"use client"`). It must not be imported
  by Server Components directly — wrap with `next/dynamic` if needed, similar to
  `WalletStatusLazy`.
