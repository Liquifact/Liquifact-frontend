# UploadZone API Reference

Component reference for `components/UploadZone.jsx`, the drag-and-drop PDF invoice
upload zone used by the submit wizard. For the accessibility contract see
[docs/upload-a11y.md](upload-a11y.md).

---

## Overview

`UploadZone` validates a PDF entirely in the browser and reports only stable metadata to
its parent:

1. The user drops a file on the zone, activates it with the keyboard, or picks one from
   the hidden file input.
2. `validatePdfFile` checks the MIME type, `.pdf` extension, size limit, non-empty
   content and the actual `%PDF-` magic bytes.
3. `sha256Hex` fingerprints the file with `crypto.subtle`.
4. `onChange` receives `{ name, size, sha256 }` only after both steps succeed.
5. Invalid files, read failures and hashing failures call `onChange(null)` and show a
   translated error in an assertive live region.

The component never uploads the file and never stores file bytes. The submit wizard
persists only the validated metadata in `sessionStorage`.

---

## Props

| Prop       | Type       | Required | Default          | Description |
| ---------- | ---------- | -------- | ---------------- | ----------- |
| `value`    | `object \| null` | No | `null`      | Validated metadata already attached to the form: `{ name, size, sha256 }`. When set, the component shows the filename, human-readable size, fingerprint and a remove button. |
| `onChange` | `function` | Yes      | —                | Called with `{ name, size, sha256 }` after successful validation and hashing, or with `null` when the file is removed, replaced or rejected. |
| `disabled` | `boolean`  | No       | `false`          | Disables the drop zone, file input and remove button. |
| `maxBytes` | `number`   | No       | `PDF_MAX_BYTES`  | Maximum accepted file size in bytes (default 10 MB). |

---

## Named Exports

| Export             | Type      | Description |
| ------------------ | --------- | ----------- |
| `default`          | Component | The `UploadZone` component. |
| `FILE_CONSTRAINTS` | `object`  | Frozen descriptor for the accepted format (see below). |

### `FILE_CONSTRAINTS`

| Key            | Value               | Description |
| -------------- | ------------------- | ----------- |
| `accept`       | `".pdf,application/pdf"` | Value for the `<input accept>` attribute. |
| `mimeType`     | `"application/pdf"` | Expected MIME type. |
| `maxSizeMb`    | `10`                | Human-readable size cap in megabytes. |
| `maxSizeBytes` | `10485760`          | Numeric byte limit (`10 * 1024 * 1024`). |

---

## Internal States

| Status        | Trigger | UI |
| ------------- | ------- | -- |
| `"idle"`      | Initial render, remove, or a new selection before validation completes | Drop zone, instructions and any previous metadata |
| `"validating"`| A file was selected or dropped | Polite status: "Validating and fingerprinting your PDF…" |
| `"ready"`     | Validation and hashing succeeded | Polite status naming the validated file plus the metadata list |
| `"error"`     | Validation, reading or hashing failed | Assertive alert with the translated error; metadata remains cleared |

Re-selecting the same file works because the hidden input value is reset after every
change. A remove action also cancels any in-flight validation and returns focus to the
drop zone.

---

## Validation

### `lib/validation/pdf.js`

```js
import {
  PDF_MAX_BYTES,
  PdfValidationError,
  sha256Hex,
  validatePdfFile,
} from "@/lib/validation/pdf";
```

#### `validatePdfFile(file, { maxBytes } = {})`

Runs all checks in order and never throws for invalid input.

```js
const result = await validatePdfFile(file);
// { valid: true }
// { valid: false, code: "pdf.signature", details: {} }
```

| Check | Rule | Error code |
| ----- | ---- | ---------- |
| File present | A file-like object with `name` and `size` | `pdf.required` |
| MIME type | `file.type === "application/pdf"` | `pdf.type` |
| Extension | Name ends with `.pdf` (case-insensitive) | `pdf.extension` |
| Size cap | `file.size <= maxBytes` | `pdf.size` |
| Non-empty | `file.size > 0` | `pdf.empty` |
| Readable | `arrayBuffer()` or `FileReader` succeeds | `pdf.read` |
| Magic bytes | First five bytes are `%PDF-` | `pdf.signature` |

The signature check reads the file bytes, so a spoofed extension or MIME type is rejected.

#### `sha256Hex(file)`

Returns a lowercase 64-character hexadecimal SHA-256 fingerprint using
`crypto.subtle.digest("SHA-256", bytes)`. Throws a `PdfValidationError` with one of:

| Code | Meaning |
| ---- | ------- |
| `pdf.required` | No file-like object was supplied |
| `pdf.read` | The file could not be read |
| `pdf.hashUnavailable` | Web Crypto / `crypto.subtle` is unavailable |
| `pdf.hashFailed` | `crypto.subtle.digest` rejected |

The `details` object carries the underlying `cause` when one exists.

---

## Error Messages

All user-facing strings live in the `upload.*` dictionary namespace and are resolved
with `useT`. Codes map to keys as follows:

| Code | Dictionary key |
| ---- | -------------- |
| `pdf.required` | `upload.error.pdf.required` |
| `pdf.type` | `upload.error.pdf.type` |
| `pdf.extension` | `upload.error.pdf.extension` |
| `pdf.size` | `upload.error.pdf.size` |
| `pdf.empty` | `upload.error.pdf.empty` |
| `pdf.signature` | `upload.error.pdf.signature` |
| `pdf.read` | `upload.error.pdf.read` |
| `pdf.hashUnavailable` | `upload.error.pdf.hashUnavailable` |
| `pdf.hashFailed` | `upload.error.pdf.hashFailed` |

The size message receives `{ sizeMb, maxSizeMb }`; the MIME message receives `{ type }`.
Errors render with `role="alert"` and `aria-live="assertive"`.

---

## Usage

### Inside the submit wizard

```jsx
import { useReducer } from "react";
import UploadZone from "@/components/UploadZone";
import { reducer } from "@/lib/submitWizard";

function ReviewStep({ state, dispatch }) {
  return (
    <UploadZone
      value={state.form.document}
      onChange={(document) =>
        dispatch({ type: "set", field: "document", value: document })
      }
    />
  );
}
```

`document` is either `null` or `{ name, size, sha256 }`. `lib/submitWizard.js`
normalizes it with `normalizeDocument` before storing it and includes
`documentSha256` in `toPayload` only when the fingerprint is a valid lowercase
SHA-256 value.

### Standalone

```jsx
import { useState } from "react";
import UploadZone from "@/components/UploadZone";

export default function InvoiceUpload() {
  const [document, setDocument] = useState(null);
  return <UploadZone value={document} onChange={setDocument} />;
}
```

---

## Integration Notes

- **No network request:** the component validates and hashes locally. Uploading the file
  is outside its scope; the submit wizard sends only `documentSha256` with the invoice
  payload.
- **No file bytes in storage:** never write `File`, `Blob` or `ArrayBuffer` values to
  `sessionStorage` or `localStorage`.
- **Fingerprint lifecycle:** replacing or removing a file clears the previous
  fingerprint. A restored draft that contains an invalid fingerprint is normalized to
  `null`.
- **Client Component:** the file starts with `"use client"` and depends on browser APIs
  (`File`, `FileReader`, `crypto.subtle`).
