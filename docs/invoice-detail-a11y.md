# Invoice Detail Accessibility

This document describes the accessibility contract for the invoice-detail components on the `/invest/[id]` page. It covers **roles**, **keyboard interactions**, and **focus behaviour** for future contributors.

For the general accessibility statement, see [`docs/accessibility.md`](accessibility.md).

---

## Components in Scope

| Component | File | Responsibility |
| --------- | ---- | -------------- |
| `InvoiceDetailClient` | `app/invest/[id]/InvoiceDetailClient.jsx` | Density toggle + metadata + inline edit |
| `InvoiceDetailItems` | `app/invest/[id]/InvoiceDetailItems.jsx` | Bulk-selectable document list |
| `InvoiceDetailExport` | `app/invest/[id]/InvoiceDetailExport.jsx` | CSV/JSON export buttons |
| `BulkActionsToolbar` | `components/BulkActionsToolbar.jsx` | Shared bulk action toolbar (used by InvoiceDetailItems) |
| `ConfirmDialog` | `components/ConfirmDialog.jsx` | Confirmation dialog (used for delete) |
| `page.js` | `app/invest/[id]/page.js` | Server Component shell with semantic HTML |

---

## Roles and ARIA

### InvoiceDetailClient

| Element | Role / ARIA | Purpose |
| ------- | ----------- | ------- |
| Summary section | `aria-labelledby="invoice-summary-heading"` | Labels the invoice facts region |
| Summary heading | `id="invoice-summary-heading"` | Target for the section's aria-labelledby |
| Inline-edit announcement region | `role="status"` · `aria-live="polite"` · `aria-atomic="true"` · `sr-only` | Announces save/cancel/validation messages without shifting focus |
| Edit button (view mode) | `aria-label="Edit {field}"` | Names the edit action when the button is icon-heavy |
| Input (edit mode) | `aria-label="{field label}"` | Provides an accessible name for the input |
| Input (edit mode) | `aria-describedby="{errorId}"` (when error present) | Associates the input with its error message |
| Input (edit mode) | `aria-invalid="true"` (when error present) | Indicates the field has a validation error |
| Error message | `role="alert"` | Assertive announcement for validation errors |
| Density toggle | `role="group"` | Groups the density toggle buttons |
| Reference CopyButton | `aria-label` (from copy) | Names the copy action for the reference ID |

### InvoiceDetailItems

| Element | Role / ARIA | Purpose |
| ------- | ----------- | ------- |
| Items section | `aria-labelledby="invoice-detail-items-heading"` | Labels the document list region |
| Items heading | `id="invoice-detail-items-heading"` | Target for the section's aria-labelledby |
| Document list | `<ul aria-label="{listAriaLabel}">` | Names the list of detail documents |
| Row checkbox | `aria-label="Select {name} ({id})"` | Descriptive label for each checkbox |
| BulkActionsToolbar | `role="toolbar"` · `aria-labelledby` · `aria-controls` | See BulkActionsToolbar section below |
| ConfirmDialog | `role="dialog"` · `aria-modal="true"` · `aria-labelledby` | See ConfirmDialog section below |

### InvoiceDetailExport

| Element | Role / ARIA | Purpose |
| ------- | ----------- | ------- |
| Export button group | `role="group"` · `aria-label="{exportGroupLabel}"` | Groups the CSV and JSON export buttons |
| CSV export button | `aria-label="{exportCSVLabel}"` | Names the CSV export action |
| JSON export button | `aria-label="{exportJSONLabel}"` | Names the JSON export action |

### BulkActionsToolbar (shared)

| Element | Role / ARIA | Purpose |
| ------- | ----------- | ------- |
| Toolbar section | `role="toolbar"` · `aria-labelledby` · `aria-controls` | Identifies the toolbar and its controlled list |
| Toolbar label (sr-only) | `id` matching `aria-labelledby` | Provides an accessible name for the toolbar |
| Select-all checkbox | `aria-checked="true"|"mixed"|"false"` | Tri-state checkbox (all/partial/none selected) |
| Selection count | `role="status"` · `aria-live="polite"` · `aria-atomic="true"` · `sr-only` | Announces count changes without shifting focus |
| Clear button | `aria-label` | Names the clear selection action |
| Export button | `aria-label` | Names the export action |
| Delete button | `aria-label` (includes count) | Names the delete action with selected count |

### ConfirmDialog (shared)

| Element | Role / ARIA | Purpose |
| ------- | ----------- | ------- |
| Dialog | `role="dialog"` · `aria-modal="true"` · `aria-labelledby` | Modal dialog with accessible name |
| Dialog title | `id` matching `aria-labelledby` | Provides the dialog's accessible name |
| Confirm button | `aria-label` | Names the confirm action |
| Cancel button | `aria-label` | Names the cancel action |

### page.js (Server Component)

| Element | Role / ARIA | Purpose |
| ------- | ----------- | ------- |
| Main landmark | `<main id="main-content">` | Skip-link target |
| Back link | `aria-label` | Names the back-to-marketplace action |
| Invoice summary section | `aria-labelledby="invoice-summary-heading"` | Labels the invoice facts region (delegated to InvoiceDetailClient) |
| JSON-LD script | `type="application/ld+json"` | Structured data for SEO (sanitized via `sanitizeText`) |

---

## Keyboard Interactions

### InvoiceDetailClient — Inline Edit

| Key | Context | Action |
| --- | ------- | ------ |
| **Tab** / **Shift+Tab** | View mode | Moves focus through the metadata fields in DOM order |
| **Tab** / **Shift+Tab** | Edit mode | Moves focus through input, Save, Cancel buttons |
| **Enter** | Edit mode (non-date fields) | Saves the edit and returns to view mode |
| **Escape** | Edit mode | Cancels the edit and returns to view mode |
| **Enter** | Date input | Does NOT save (preserves date-picker navigation) |

**Behaviour:**
- When entering edit mode, focus moves to the input field automatically.
- Validation errors are announced via the shared `role="status"` region.
- Successful saves and cancellations are also announced via the same region.
- The announcement region is cleared after 2 seconds to avoid stale messages.

### InvoiceDetailItems — Bulk Selection

| Key | Context | Action |
| --- | ------- | ------ |
| **Tab** / **Shift+Tab** | Toolbar visible | Moves through select-all checkbox, Clear, Export, Delete buttons |
| **Space** / **Enter** | Row checkbox | Toggles the row selection |
| **Space** / **Enter** | Select-all checkbox | Toggles between all/none (partial state handled automatically) |
| **Escape** | Toolbar focused | Clears the selection and hides the toolbar |

**Behaviour:**
- The toolbar only appears when at least one row is selected.
- Pressing Escape anywhere inside the toolbar clears the selection (keyboard shortcut for backing out).
- Selection count changes are announced via the toolbar's `role="status"` region.
- The select-all checkbox uses the `indeterminate` DOM property for the partial state.

### InvoiceDetailExport

| Key | Context | Action |
| --- | ------- | ------ |
| **Tab** / **Shift+Tab** | Export group | Moves through CSV and JSON export buttons |
| **Space** / **Enter** | Export button | Triggers the download (CSV or JSON) |

**Behaviour:**
- Buttons are disabled when the invoice is null.
- Both buttons are grouped under `role="group"` with a descriptive label.

### ConfirmDialog (Delete Confirmation)

| Key | Context | Action |
| --- | ------- | ------ |
| **Tab** / **Shift+Tab** | Dialog open | Cycles through Cancel and Confirm buttons (focus is trapped) |
| **Escape** | Dialog open | Closes the dialog without confirming |
| **Space** / **Enter** | Confirm button | Executes the delete action |
| **Space** / **Enter** | Cancel button | Closes the dialog without confirming |

**Behaviour:**
- Focus moves to the Confirm button when the dialog opens.
- Focus is trapped inside the dialog while open (Tab/Shift+Tab wrap at boundaries).
- The element that had focus before the dialog opened is restored on close.
- Clicking the backdrop closes the dialog.

---

## Focus Behaviour

### InvoiceDetailClient

- **Edit mode entry:** When clicking the Edit button, focus moves to the input field on the next render.
- **Edit mode exit:** After saving or cancelling, focus returns to the Edit button (via DOM order).
- **Density toggle:** Focus follows the clicked density button (Compact/Comfortable).
- **Reference CopyButton:** Focus follows the copy button after the copy action completes.

### InvoiceDetailItems

- **Toolbar visibility:** The toolbar is not in the DOM when no items are selected, so it cannot receive focus.
- **Selection changes:** Focus remains on the checkbox that was clicked; the toolbar appears but does not steal focus.
- **Escape shortcut:** When Escape is pressed inside the toolbar, focus remains on the element that had focus before the keypress.
- **Delete confirmation:** When the ConfirmDialog opens, focus moves to the Confirm button. On cancel, focus returns to the Delete button. On confirm, focus returns to the Delete button (or the next focusable element if the row is removed).

### InvoiceDetailExport

- **Button focus:** Standard button focus behaviour with `.focus-ring` class.
- **Download trigger:** Focus remains on the button after the download is triggered.

### ConfirmDialog

- **Focus on open:** Focus moves to the Confirm button (or the dialog itself if no Confirm button is present) on the next animation frame.
- **Focus trap:** Tab/Shift+Tab cycle through focusable elements inside the dialog, wrapping at the boundaries.
- **Focus restore on close:** The element that had focus before the dialog opened is restored via `queueMicrotask` to ensure React has torn down the dialog first.
- **Backdrop click:** Clicking the backdrop closes the dialog; focus is restored to the trigger element.

### page.js (Server Component)

- **Main landmark:** The `<main id="main-content">` element is the skip-link target.
- **Back link:** Focus follows the back link when navigating to the marketplace.
- **Density toggle:** Focus follows the density button (delegated to InvoiceDetailClient).

---

## Focus Ring and Visual Indicators

All interactive elements in the invoice-detail components use the `.focus-ring` CSS class for consistent focus-visible styling:

```css
.focus-ring:focus-visible {
  outline: 2px solid var(--color-focus-ring);
  outline-offset: 2px;
}
```

The focus ring colour is defined in `app/globals.css`:
- Dark theme (slate-950 bg): `#22d3ee` (cyan-400) → ~10:1 contrast
- Light theme (slate-50 bg): `#0891b2` (cyan-600) → ~3.5:1 contrast

**Components with `.focus-ring`:**
- InvoiceDetailClient: Edit button, Save/Cancel buttons, input fields, DensityToggle buttons
- InvoiceDetailItems: Row checkboxes (via accent color + focus ring), BulkActionsToolbar buttons
- InvoiceDetailExport: CSV and JSON export buttons
- ConfirmDialog: Confirm and Cancel buttons

---

## Live Regions

### Inline-Edit Announcements (InvoiceDetailClient)

A single shared `role="status" aria-live="polite" aria-atomic="true"` region announces:
- Validation errors (e.g., "Save failed: Amount is required")
- Successful saves (e.g., "Issuer saved")
- Cancellations (e.g., "Edit cancelled")

The region is visually hidden (`sr-only`) and cleared after 2 seconds to avoid stale messages.

### Bulk Selection Count (BulkActionsToolbar)

A `role="status" aria-live="polite" aria-atomic="true"` region announces selection count changes:
- "1 of 3 documents selected."
- "3 of 3 documents selected."

The region is visually hidden (`sr-only`) and updates whenever the selection changes.

---

## Test Coverage

### Existing Tests

| Component | Test File | Coverage |
| --------- | --------- | -------- |
| InvoiceDetailClient | `InvoiceDetailClient.test.tsx` | Rendering, density toggle, aria structure, spacing variants, localStorage restoration, axe violations |
| InvoiceDetailItems | `InvoiceDetailItems.test.jsx` | Toolbar lifecycle, select-all/partial/clear, export/delete confirm/cancel/success, buildInvoiceDetailItems helper |
| InvoiceDetailExport | `InvoiceDetailExport.test.jsx` | Rendering, aria-labels, CSV/JSON export, CSV escaping, edge cases |
| BulkActionsToolbar | `components/BulkActionsToolbar.test.jsx` (if exists) | Tri-state checkbox, live region, Escape shortcut |
| ConfirmDialog | `components/ConfirmDialog.test.jsx` (if exists) | Focus trap, focus restore, Escape, backdrop click |

### Accessibility-Specific Tests

The following accessibility patterns are tested:

1. **InvoiceDetailClient**
   - Section has `aria-labelledby="invoice-summary-heading"`
   - Heading has `id="invoice-summary-heading"`
   - No axe violations in both comfortable and compact modes
   - Density toggle buttons have `data-density` attributes

2. **InvoiceDetailItems**
   - Row checkboxes have descriptive `aria-label`
   - Bulk selection count region has `role="status" aria-live="polite"`
   - Select-all checkbox has correct `aria-checked` values (true/mixed/false)
   - ConfirmDialog has `role="dialog"` and accessible name

3. **InvoiceDetailExport**
   - Buttons have descriptive `aria-label`
   - Button group has `role="group"` with accessible label
   - Buttons are disabled when invoice is null

---

## Known Limitations

| Area | Issue | Reference |
| ---- | ----- | --------- |
| Focus Ring | Some components may use `focus:ring-2` instead of `.focus-ring` | Consistency audit needed |
| Motion | Reduced-motion handling is not yet implemented for animated components | `components/ToastProvider.jsx` |

---

## Contributor Checklist

When modifying invoice-detail components:

- [ ] Use semantic HTML elements (`<section>`, `<dl>`, `<dt>`, `<dd>`, `<ul>`, `<li>`)
- [ ] Ensure every interactive element has a visible focus style (`.focus-ring`)
- [ ] Add appropriate ARIA attributes (`aria-label`, `aria-labelledby`, `aria-describedby`, `aria-invalid`)
- [ ] Use `role="status" aria-live="polite"` for non-critical announcements
- [ ] Use `role="alert"` for validation errors
- [ ] Test keyboard navigation (Tab, Shift+Tab, Enter, Space, Escape)
- [ ] Verify focus management (focus moves to the expected element on state changes)
- [ ] Run `npm run test:accessibility` locally and fix any violations
- [ ] Update this document if you add new accessibility patterns

---

_Last updated: 2026-07-27_
