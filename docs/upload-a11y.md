# UploadZone Accessibility Notes

Accessibility contract for `components/UploadZone.jsx`, the drag-and-drop PDF invoice
upload zone used by the submit wizard.

---

## Roles and ARIA Attributes

### Drop zone

| Attribute | Value | Purpose |
| --------- | ----- | ------- |
| `role` | `button` | Exposes the zone as an interactive control |
| `tabIndex` | `0` (or `-1` when disabled) | Keeps the zone in the natural tab order |
| `aria-label` | "Drop PDF invoice here, or click to browse" / "Drop a new PDF invoice here, or click to replace" | Names the control; changes when a file is attached |
| `aria-describedby` | Instructions, status and error IDs | Connects the control to requirements and feedback |
| `aria-disabled` | `true` when disabled | Communicates the disabled state |

The zone handles `click`, `keydown`, `dragenter`, `dragover`, `dragleave` and `drop`.
Activation with `Enter` or `Space` opens the native file picker. Drag events call
`preventDefault` so the browser does not navigate to the dropped file.

### File input

| Attribute | Value | Purpose |
| --------- | ----- | ------- |
| `type` | `file` | Native file picker |
| `accept` | `.pdf,application/pdf` | Hints the accepted format |
| `class` | `sr-only` | Visually hidden but still accessible |
| `tabIndex` | `-1` | Removes the duplicate stop from the tab order |
| `aria-label` | "Choose a PDF invoice file" | Accessible name for assistive technology |

The visible drop zone is the keyboard entry point; the input remains available to
screen readers and automation.

### Instructions, status and errors

| Element | Attributes | Announcement |
| ------- | ---------- | ------------ |
| Requirements | `role="note"`, `aria-label="File upload requirements"` | Read when the zone is focused through `aria-describedby` |
| Progress | `role="status"`, `aria-live="polite"` | "Validating and fingerprinting your PDF…" then the validated filename |
| Error | `role="alert"`, `aria-live="assertive"` | Invalid type, extension, size, empty file, signature mismatch, read failure, hashing failure |

Error messages come from the `upload.error.*` dictionary keys, so they are localized in
both English and Spanish.

### Metadata and remove action

After validation the component renders a `<dl>` with the filename, human-readable size
and SHA-256 fingerprint, plus a native `<button>` labelled "Remove file". Removing the
file clears the metadata and returns focus to the drop zone.

---

## Keyboard Interaction

| Key | Where | Action |
| --- | ----- | ------ |
| `Tab` | Page | Moves focus to the drop zone, then to the remove button when a file is attached |
| `Enter` | Drop zone | Opens the file picker |
| `Space` | Drop zone | Opens the file picker |
| `Enter` / `Space` | Remove button | Clears the validated file and focuses the drop zone |
| `Tab` | Remove button | Continues through the rest of the form |

---

## Focus Management

1. The drop zone is the first focusable element in the component.
2. After removal, focus moves back to the drop zone so a keyboard user can immediately
   choose another file.
3. Errors do not move focus; the assertive live region announces them, and the drop zone
   stays available for a retry.

---

## State Transitions

```
idle
  ↓ file selected / dropped
validating  (polite status)
  ↓ validation + SHA-256 succeed          ↓ validation or hashing fails
ready (metadata + polite status)          error (assertive alert, metadata cleared)
  ↓ remove / replace
idle
```

Re-selecting the same file triggers a fresh validation because the hidden input value is
reset after every change. Starting a new selection cancels any in-flight validation so a
late result cannot overwrite newer state.

---

## Screen Reader Announcements

| Event | Live region | Example |
| ----- | ----------- | ------- |
| Validating | `role="status"` / polite | "Validating and fingerprinting your PDF…" |
| Validated | `role="status"` / polite | "invoice.pdf validated and fingerprinted." |
| Invalid MIME type | `role="alert"` / assertive | "Invalid file type \"text/plain\". Only PDF files are accepted." |
| Oversized file | `role="alert"` / assertive | "File is 12 MB — exceeds the 10 MB limit." |
| Spoofed extension or signature | `role="alert"` / assertive | "The selected file does not appear to be a valid PDF." |
| Read or hash failure | `role="alert"` / assertive | "Could not compute the file fingerprint. Please try again." |

The metadata list itself is not a live region; the polite status announces the filename
after success.

---

## Visual Feedback

- The drop zone gets an `is-dragging` class while a file is dragged over it.
- The drop zone gets an `is-disabled` class and `aria-disabled` when disabled.
- Error text uses the existing `.err` class; status text uses `.hint`.
- The fingerprint is rendered in a monospace element with `word-break: break-all`.
- The component relies on the shared `.focus-ring` / browser focus styles for visible
  keyboard focus.

---

## Test Coverage

| File | Coverage |
| ---- | -------- |
| `tests/pdfValidation.test.mjs` | MIME, extension, size, empty file, magic bytes, read failure, SHA-256 output, unavailable Web Crypto |
| `tests-ui/UploadZone.test.jsx` | Keyboard activation, accessible labels and instructions, assertive rejection, metadata-only callback, fingerprint display, remove and focus return |

Run them with:

```bash
node --test tests/pdfValidation.test.mjs
npm run test:ui -- tests-ui/UploadZone.test.jsx
```

---

## WCAG 2.1 Compliance

- **1.1.1 Non-text Content** — the decorative document emoji is `aria-hidden="true"`.
- **1.3.1 Info and Relationships** — `<dl>`/`<dt>`/`<dd>` describe file metadata; the
  hidden input has an accessible label.
- **2.1.1 Keyboard** — the drop zone is focusable and activates with `Enter` or `Space`.
- **2.4.3 Focus Order** — the drop zone is a single logical tab stop; the input is not a
  duplicate stop.
- **2.4.7 Focus Visible** — native focus indicators remain visible.
- **3.3.1 Error Identification** — every rejection names the problem in an alert.
- **3.3.3 Error Suggestion** — messages state the accepted format or size limit.
- **4.1.2 Name, Role, Value** — the drop zone exposes `role="button"`, an accessible
  name and `aria-disabled`.
- **4.1.3 Status Messages** — validation progress and errors use polite and assertive
  live regions.
