# UploadZone Accessibility Notes

This document describes the accessibility contract for `components/UploadZone.jsx` — the drag-and-drop PDF invoice upload component.

## Roles and ARIA Attributes

### Drop Zone

| Attribute | Value | Purpose |
|-----------|-------|---------|
| `role` | `button` | Exposes the drop zone as an interactive control to assistive technologies |
| `tabIndex` | `0` | Makes the drop zone keyboard-focusable and part of the natural tab order |
| `aria-label` | `"Drop PDF invoice here, or click to browse"` | Provides an accessible name describing the component's purpose |

### Error Messages

| Attribute | Value | Purpose |
|-----------|-------|---------|
| `role` | `alert` | Immediately announces validation errors to screen readers |
| `aria-live` | `assertive` | Interrupts current screen reader output to announce the error |

### Status Messages

| Attribute | Value | Purpose |
|-----------|-------|---------|
| `role` | `status` | Non-intrusive announcements for progress updates |
| `aria-live` | `polite` | Waits for the screen reader to finish before announcing |

### Progress Bar (when `progress` prop is provided)

| Attribute | Value | Purpose |
|-----------|-------|---------|
| `role` | `progressbar` | Identifies the element as a progress indicator |
| `aria-valuemin` | `0` | Minimum value |
| `aria-valuemax` | `100` | Maximum value |
| `aria-valuenow` | `{rounded progress}` | Current progress value |
| `aria-labelledby` | `upload-status-text` | Links to the status text element |

### File Constraint Notice

| Attribute | Value | Purpose |
|-----------|-------|---------|
| `role` | `note` | Provides advisory information about file requirements |
| `aria-label` | `"File upload requirements"` | Accessible name for the notice region |

### Spinner

| Attribute | Value | Purpose |
|-----------|-------|---------|
| `role` | `img` | Identifies the spinner as an image |
| `aria-label` | `"Uploading…"` | Describes the spinner's purpose |

### Submit Button

| Attribute | Value | Purpose |
|-----------|-------|---------|
| `disabled` | `{!file \|\| isProcessing}` | Prevents interaction when no file is selected or during processing |
| `aria-disabled` | `{!file \|\| isProcessing}` | Communicates disabled state to assistive technologies |

## Keyboard Interactions

### Drop Zone

| Key | Action | Notes |
|-----|--------|-------|
| `Enter` | Opens the file picker dialog | Equivalent to clicking the drop zone |
| `Space` | Opens the file picker dialog | Equivalent to clicking the drop zone |
| `Tab` | Moves focus to/from the drop zone | Part of the natural tab order |
| `Escape` | No action | Does not open the file picker |

### Submit Button

| Key | Action | Notes |
|-----|--------|-------|
| `Enter` | Submits the form | When the button is not disabled |
| `Space` | Submits the form | When the button is not disabled |
| `Tab` | Moves focus to/from the button | Standard button keyboard behavior |

### Reset Button (in success state)

| Key | Action | Notes |
|-----|--------|-------|
| `Enter` | Resets the upload and focuses the drop zone | For keyboard users to start a new upload |
| `Space` | Resets the upload and focuses the drop zone | Standard button keyboard behavior |
| `Tab` | Moves focus to/from the button | Standard button keyboard behavior |

## Focus Management

1. **Initial focus**: The drop zone receives focus in the natural tab order
2. **After reset**: Focus is programmatically moved to the drop zone so keyboard users can immediately start a new upload
3. **During upload**: Focus remains on the submit button (disabled state)
4. **After error**: Focus stays on the drop zone for retry

## State Transitions

### Idle → Uploading → Tokenizing → Success

```
Idle (drop zone focused)
  ↓ File selected + Submit clicked
Uploading (submit button disabled, progress announced)
  ↓ Server responds
Tokenizing (submit button disabled, status announced)
  ↓ Tokenization delay completes
Success (reset button appears)
```

### Idle → Error → Idle

```
Idle
  ↓ Invalid file selected
Error (role="alert" announced)
  ↓ New valid file selected or reset clicked
Idle (error cleared)
```

## Screen Reader Announcements

### File Selected
- No announcement (visual feedback only)

### File Validation Error
- Announced immediately via `role="alert"` with `aria-live="assertive"`
- Example: "Invalid file type: text/plain"

### Upload Progress (indeterminate)
- Announced via `role="status"` with `aria-live="polite"`
- Example: "Uploading invoice…"

### Upload Progress (determinate)
- Progress bar updates announced via `role="progressbar"`
- Percentage shown visually and available via `aria-valuenow`

### Tokenization
- Announced via `role="status"` with `aria-live="polite"`
- Example: "Pending tokenization…"

### Success
- Announced via `role="status"` with `aria-live="polite"`
- Example: "Upload complete!"

## Focus Ring

The submit button uses the `.focus-ring` CSS class for consistent focus-visible styling:
- Dark theme: `#22d3ee` (cyan-400) → ~10:1 contrast
- Light theme: `#0891b2` (cyan-600) → ~3.5:1 contrast

The reset button also uses `.focus-ring` for consistent keyboard visibility.

## Test Coverage

Tests for the accessibility contract are located in:
- `components/UploadZone.test.jsx` — GROUP 5: Accessibility
- `components/focus-ring.a11y.test.tsx` — Focus ring presence checks

### Test Cases

1. **axe accessibility check in idle state** — Verifies no WCAG violations
2. **axe accessibility check after file selected** — Verifies no violations with file info displayed
3. **axe accessibility check after validation error** — Verifies no violations with error displayed
4. **role="alert" with aria-live="assertive"** — Confirms error announcement attributes
5. **role="status" with aria-live="polite"** — Confirms progress announcement attributes
6. **Progress bar ARIA attributes** — Confirms progressbar role and value attributes
7. **Keyboard activation** — Enter and Space open the file dialog
8. **Focus management after reset** — Drop zone receives focus after reset

## WCAG 2.1 Compliance

This component satisfies the following success criteria:

- **1.1.1 Non-text Content** — All icons have `aria-hidden="true"` or descriptive `aria-label`
- **1.3.1 Info and Relationships** — Roles and ARIA attributes convey structure
- **1.3.3 Sensory Characteristics** — State is conveyed via text, not color alone
- **2.1.1 Keyboard** — All functionality available via keyboard
- **2.1.2 No Keyboard Trap** — Focus can move freely in and out of the component
- **2.4.3 Focus Order** — Logical tab order maintained
- **2.4.7 Focus Visible** — `.focus-ring` class provides visible focus indicator
- **3.2.1 On Focus** — No unexpected context changes on focus
- **3.3.1 Error Identification** — Errors clearly identified and described
- **3.3.3 Error Suggestion** — Error messages provide guidance when possible
- **4.1.2 Name, Role, Value** — All custom elements have proper ARIA attributes
