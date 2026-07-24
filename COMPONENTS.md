# Component Library Reference

Shared UI components for the LiquiFact frontend. All components live under `components/`.

---

## Table of Contents

- [EmptyState](#emptystate)
- [ErrorBanner](#errorbanner)
- [Footer](#footer)
- [FundAmountInput](#fundamountinput)
- [Hooks](#hooks)
- [InvoiceList](#invoicelist)
- [InvoiceListSkeleton](#invoicelistskeleton)
- [InvoiceSearch](#invoicesearch)
- [InvoiceTimeline](#invoicetimeline)
- [NavMenu](#navmenu)
- [StatusPill](#statuspill)
- [ThemeToggle](#themetoggle)
- [ToastProvider / useToast](#toastprovider--usetoast)
- [UploadZone](#uploadzone)
- [WalletStatus](#walletstatus)
- [Formatting Utilities](#formatting-utilities)

---

## EmptyState

A reusable empty-state panel with an icon slot, heading, description, and an action element. Used whenever a list or page region has no content to show.

**File:** `components/EmptyState.jsx`

### Named exports

| Export                     | Description                                                                         |
| -------------------------- | ----------------------------------------------------------------------------------- |
| `default` (`EmptyState`)   | The reusable empty-state container component                                        |
| `InvoiceEmptyIllustration` | Decorative inline SVG of an empty document tray; always rendered with `aria-hidden` |

### Props (`EmptyState`)

| Prop          | Type        | Default | Description                                                                                        |
| ------------- | ----------- | ------- | -------------------------------------------------------------------------------------------------- |
| `title`       | `string`    | —       | **Required.** Heading text shown in the panel (rendered as `<h3>`)                                 |
| `description` | `string`    | —       | Optional supporting paragraph below the title                                                      |
| `icon`        | `ReactNode` | —       | Decorative icon or SVG placed above the title. SVGs should include `aria-hidden="true"`            |
| `action`      | `ReactNode` | —       | CTA element (link or button) rendered below the description                                        |
| `className`   | `string`    | `''`    | Additional Tailwind classes forwarded to the root `<div>` alongside the component's default styles |

### Accessibility

- The `icon` slot is purely decorative — always pass `aria-hidden="true"` and `focusable="false"` on the SVG.
- The action element must be a focusable element (`<a>` or `<button>`). Include `focus-visible:outline` classes to meet WCAG 2.1 §2.4.11.
- The title is rendered as `<h3>` — ensure the surrounding page hierarchy is correct (usually inside a `<section>` headed by `<h2>`).

### Example

```jsx
import EmptyState, { InvoiceEmptyIllustration } from "@/components/EmptyState";

<EmptyState
  icon={<InvoiceEmptyIllustration />}
  title="No invoices yet"
  description="Upload your first invoice to get started."
  action={
    <a
      href="#invoice-upload-btn"
      className="rounded-xl border border-cyan-700 bg-cyan-900/30 px-5 py-2.5 text-sm font-semibold text-cyan-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
    >
      Upload your first invoice
    </a>
  }
/>;
```

---

## ErrorBanner

Displays a structured error message with a variant label, title, description, optional details, and an optional action button.

**File:** `components/ErrorBanner.jsx`

### Props

| Prop           | Type       | Default          | Description                                                                          |
| -------------- | ---------- | ---------------- | ------------------------------------------------------------------------------------ |
| `variant`      | `string`   | `"server"`       | Controls the label shown above the title. See **Variant set** below.                 |
| `title`        | `string`   | —                | Bold heading for the error                                                           |
| `description`  | `string`   | —                | Short explanatory text                                                               |
| `details`      | `string`   | —                | Optional secondary detail text rendered below the description                        |
| `actionLabel`  | `string`   | —                | Label rendered inside the action button; omit (or pass `undefined`) to hide the button |
| `onAction`     | `function` | —                | Callback fired when the action button is clicked                                     |
| `previewLabel` | `string`   | `"Preview only"` | Badge text shown next to the variant label                                           |

### Variant set

| `variant` value | Label displayed    | When to use                                                      |
| --------------- | ------------------ | ---------------------------------------------------------------- |
| `"server"`      | `Server error`     | API or network errors — the server could not fulfil the request  |
| `"validation"`  | `Validation error` | Form / input errors — the request was invalid before it was sent |
| `"error"`       | `Error`            | General client-side errors that are not specifically server or validation errors (e.g. an invoice that cannot be resolved) |
| _(any other)_   | `Server error`     | Unknown variants fall back to the `server` label                 |

### Accessibility

- Renders with `role="alert"` and `aria-live="assertive"` so screen readers announce errors immediately.
- The action button's accessible name is derived directly from `actionLabel` — pass a descriptive label (e.g. `"Try again"`, `"Reload page"`) rather than a generic `"Click here"`.
- Action button includes a `focus-visible` ring for keyboard visibility.

### Example

```jsx
// Server error with retry action
<ErrorBanner
  variant="server"
  title="Could not load invoices"
  description="The API returned an unexpected error."
  details="Status 500 — please try again."
  actionLabel="Try again"
  onAction={() => refetch()}
/>

// Validation error without action
<ErrorBanner
  variant="validation"
  title="Invalid file"
  description="Only PDF files are accepted."
/>

// General client-side error (e.g. invoice not found)
<ErrorBanner
  variant="error"
  title="Unable to load invoice details"
  description="Could not retrieve this invoice."
  previewLabel="Invoice detail"
/>
```

---

## Footer

Site footer with navigation links (Docs, System Status, Contact Support). Links are sourced from the `app/copy/en.js` copy file.

**File:** `components/Footer.jsx`

### Props

| Prop    | Type                                                    | Default                          | Description                                                                                                    |
| ------- | ------------------------------------------------------- | -------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `links` | `Array<{label:string, href:string, external?:boolean}>` | `undefined` (uses default links) | Optional custom links array. Allows passing internal links (with `external: false`) to render via Next `Link`. |

> **Note:** When `external` is omitted or set to `true`, the link is rendered as a normal `<a>` with `target="_blank"` and `rel="noopener noreferrer"` for security.

### Example

```jsx
<Footer />

// Custom internal link example
<Footer
  links={[{ label: 'Home', href: '/', external: false }]}
/>
```

---

## InvoiceList

Renders the SME invoice list with loading, empty, and error states. Each card that includes an `issuerAddress` field shows a truncated Stellar address with an inline copy button.

**File:** `components/InvoiceList.jsx`

### Props

| Prop                 | Type       | Default            | Description                                                                |
| -------------------- | ---------- | ------------------ | -------------------------------------------------------------------------- |
| `loadInvoices`       | `function` | `loadMockInvoices` | Async loader that resolves to an invoice array                             |
| `optimisticInvoices` | `array`    | `[]`               | Newly submitted invoices to prepend optimistically before the API responds |

### Invoice object shape

| Field           | Type     | Required | Description                                                        |
| --------------- | -------- | -------- | ------------------------------------------------------------------ |
| `id`            | `string` | Yes      | Unique identifier                                                  |
| `issuer`        | `string` | Yes      | Display name (company name)                                        |
| `issuerAddress` | `string` | No       | Stellar public key; when present, shown truncated with copy button |
| `amount`        | `string` | Yes      | Formatted amount string                                            |
| `currency`      | `string` | Yes      | ISO currency code                                                  |
| `dueDate`       | `string` | Yes      | ISO-8601 due date                                                  |
| `yield`         | `string` | Yes      | Estimated yield percentage                                         |
| `status`        | `string` | Yes      | One of: `Pending tokenization`, `Tokenized`, `Funded`, `Settled`   |

### Copy-issuer-address button

When `invoice.issuerAddress` is set, each card renders:

- A **truncated** address in head/tail form (`GABCDE…34DE`) via `lib/format/truncateAddress.js`
- A **copy button** that writes the **full** address to the clipboard
- A **"Copied!"** confirmation that appears for 2 seconds after a successful copy, announced via `aria-live="polite"`
- A **guarded fallback** using `document.execCommand('copy')` when `navigator.clipboard` is unavailable
- Clipboard failures are **silent** — no error banner or toast is shown

### Accessibility

- `role="status"` + `aria-live="polite"` on the "Copied!" confirmation region
- Copy button `aria-label` includes the truncated address and updates to `"Copied!"` on success
- `title` attribute on the truncated span exposes the full address as a tooltip
- `aria-label` on the truncated address span reads the full address for screen readers
- Copy button is `type="button"` to prevent accidental form submission

### Example

```jsx
import InvoiceList from '@/components/InvoiceList';

// With API loader
<InvoiceList loadInvoices={fetchInvoicesFromApi} />

// With optimistic invoice after upload
<InvoiceList
  loadInvoices={fetchInvoicesFromApi}
  optimisticInvoices={[{
    id: 'upload-xyz',
    issuer: 'My Company',
    issuerAddress: 'GABCDE1234FGHIJ5678KLMNO9012PQRST3456UVWXY7890ZABC1234DE',
    amount: 'Pending',
    currency: 'USD',
    dueDate: 'Pending',
    yield: 'Pending',
    status: 'Pending tokenization',
  }]}
/>
```

---

## InvoiceListSkeleton

Animated placeholder list rendered while invoice data is loading. Mirrors the shape of the real invoice card layout.

**File:** `components/InvoiceListSkeleton.jsx`

### Props

| Prop   | Type     | Default | Description                       |
| ------ | -------- | ------- | --------------------------------- |
| `rows` | `number` | `3`     | Number of skeleton rows to render |

### Accessibility

- `<ul>` has `aria-busy="true"` and `aria-label="Loading investable invoices"` so screen readers announce the loading state.
- Replace with real content once data resolves; remove or set `aria-busy="false"` at that point.

### Example

```jsx
// default 3 rows
<InvoiceListSkeleton />

// custom row count
<InvoiceListSkeleton rows={5} />
```

---

## InvoiceSearch

Controlled search input for filtering marketplace invoices by issuer name. Styled to match the slate/cyan marketplace theme. A clear button appears when the input has a value.

**File:** `components/InvoiceSearch.jsx`

### Props

| Prop          | Type       | Default                         | Description                                      |
| ------------- | ---------- | ------------------------------- | ------------------------------------------------ |
| `value`       | `string`   | —                               | Current search query (controlled by parent)      |
| `onChange`    | `function` | —                               | Called with the new value on every keystroke     |
| `placeholder` | `string`   | `"Search issuer… (press /)"`    | Placeholder text; override to hide shortcut hint |

### Keyboard shortcut

Press **`/`** anywhere on the page to move focus to the search input. The shortcut is ignored when focus is already inside an `input`, `textarea`, or `contenteditable` element so typing elsewhere is never intercepted.

The default placeholder includes a visible `(press /)` hint for discoverability.

### Accessibility

- Labelled via a `sr-only` `<label>` linked to the input with `htmlFor` / `id`.
- The global shortcut does not trap or hijack keystrokes in editable fields.
- Modifier combinations (`Ctrl+/`, `Meta+/`, `Alt+/`) are ignored to avoid conflicting with browser shortcuts.

### Example

```jsx
import InvoiceSearch from "@/components/InvoiceSearch";

function MarketplaceFilters() {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <InvoiceSearch value={searchQuery} onChange={setSearchQuery} />
  );
}
```

---

## InvoiceTimeline

Renders an accessible vertical lifecycle timeline for an invoice detail page. Visualises the five canonical stages every invoice passes through and marks the current stage based on the invoice's `status` field.

**File:** `components/InvoiceTimeline.jsx`

### Lifecycle stages

Stages are rendered in this fixed order:

| Order | Stage key  | Display label | Copy key                              |
| ----- | ---------- | ------------- | ------------------------------------- |
| 1     | `uploaded` | Uploaded      | `copy.invoiceTimeline.stageUploaded`  |
| 2     | `verified` | Verified      | `copy.invoiceTimeline.stageVerified`  |
| 3     | `listed`   | Listed        | `copy.invoiceTimeline.stageListed`    |
| 4     | `funded`   | Funded        | `copy.invoiceTimeline.stageFunded`    |
| 5     | `settled`  | Settled       | `copy.invoiceTimeline.stageSettled`   |

### Status → current stage mapping

The `status` prop (one of `INVOICE_STATUSES`) is mapped to the active stage key via `resolveCurrentStage`:

| Invoice status | Current stage | Rationale                                      |
| -------------- | ------------- | ---------------------------------------------- |
| `"Open"`       | `listed`      | Invoice is listed and awaiting funding         |
| `"Funded"`     | `funded`      | Invoice has been funded                        |
| `"Settled"`    | `settled`     | Invoice has fully settled                      |
| `"Overdue"`    | `listed`      | Listed but past maturity without being funded  |
| _(unknown)_    | _(none)_      | All stages render as pending; no stage is current |

### Visual state of each stage

| Stage state | Dot colour     | Label colour     | Copy key                              |
| ----------- | -------------- | ---------------- | ------------------------------------- |
| Completed   | `bg-emerald-400` (mirrors `STATUS_PILL_MAP.Settled`) | `text-emerald-300` | `copy.invoiceTimeline.statusCompleted` |
| Current     | `bg-cyan-400`  (mirrors `STATUS_PILL_MAP.Open`)      | `text-cyan-300 font-semibold` | `copy.invoiceTimeline.statusCurrent` |
| Pending     | `bg-slate-700`                                       | `text-slate-500` | `copy.invoiceTimeline.statusPending`  |

Tone classes are derived from `STATUS_PILL_MAP` in `lib/types/invoice.js` so timeline and pill colours are always in lock-step.

### Props

| Prop         | Type     | Default | Description                                                                                              |
| ------------ | -------- | ------- | -------------------------------------------------------------------------------------------------------- |
| `status`     | `string` | —       | Invoice status value (`"Open"`, `"Funded"`, `"Settled"`, `"Overdue"`). Unknown/missing → all pending.   |
| `timestamps` | `object` | `{}`    | Optional map of stage keys to display strings (e.g. `{ uploaded: "2025-01-10" }`). Missing keys are silently skipped — no placeholder, no error. |
| `className`  | `string` | `""`    | Additional Tailwind classes forwarded to the root `<section>`.                                           |

### Named exports

| Export                | Type       | Description                                                                               |
| --------------------- | ---------- | ----------------------------------------------------------------------------------------- |
| `default`             | Component  | The timeline component                                                                    |
| `TIMELINE_STAGES`     | `object`   | Frozen enum of stage keys: `UPLOADED`, `VERIFIED`, `LISTED`, `FUNDED`, `SETTLED`         |
| `STAGE_ORDER`         | `string[]` | Ordered array of stage keys used to render the timeline                                   |
| `resolveCurrentStage` | `function` | `(status) => stageKey | null` — maps an invoice status to the active stage key           |

### Accessibility

- The component root is a `<section>` with `aria-labelledby` pointing to the `<h2>` heading inside it. Screen readers announce the section as _"Invoice lifecycle"_ (or the copy-equivalent).
- Stages are rendered as an `<ol>` (ordered list) so the sequence is conveyed semantically. The list carries `aria-label` matching the heading text.
- **`aria-current="step"`** is set on the currently active stage `<li>`. Only one stage bears this attribute at a time.
- Each `<li>` carries an `aria-label` of the form `"<Stage name> — <Completed | Current | Pending>"` so state is conveyed in text, not by colour alone (WCAG 2.1 §1.4.1).
- Decorative dot, connector, and SVG checkmark elements are `aria-hidden="true"` / `focusable="false"`.
- Passes `jest-axe` checks for every lifecycle state (no status, Open, Funded, Settled, Overdue).

### Graceful handling of missing timestamps

- If `timestamps` is omitted or an empty object, no timestamp text is rendered — stages still display correctly.
- If a specific stage key is absent from `timestamps`, that stage's timestamp is simply omitted; chronological order and status state are preserved.
- `null`, `undefined`, and empty string values for a timestamp key are silently skipped; no placeholder text or error is shown.
- Extra / unknown keys in `timestamps` are ignored without error.

### Example

```jsx
import InvoiceTimeline from "@/components/InvoiceTimeline";

// Basic usage — status only, no timestamps
<InvoiceTimeline status={invoice.status} />

// With optional timestamps
<InvoiceTimeline
  status="Funded"
  timestamps={{
    uploaded: "2025-01-10",
    verified: "2025-01-12",
    listed:   "2025-01-15",
    funded:   "2025-02-04",
  }}
/>

// On the invoice detail page (with spacing class)
<InvoiceTimeline status={invoice.status} timestamps={invoice.timestamps} className="mb-6" />
```

---

## NavMenu

Responsive site-wide header navigation used on every page.

**File:** `components/NavMenu.jsx`

### Props

| Prop            | Type       | Default            | Description                                      |
| --------------- | ---------- | ------------------ | ------------------------------------------------ |
| `walletLabel`   | `string`   | `'Connect Wallet'` | Label text rendered inside the wallet button     |
| `onWalletClick` | `function` | —                  | Callback fired when the wallet button is clicked |

### Behaviour

- **Desktop (≥ `md` breakpoint):** Home, Invoices, and Invest links render inline in the header row alongside the wallet button.
- **Mobile (< `md` breakpoint):** Nav links are hidden behind a hamburger toggle (☰). Clicking the toggle reveals a dropdown menu below the header bar.
- The active route is detected automatically via `usePathname` and marked with `aria-current="page"` on the matching link.
- The menu closes on **Escape** (focus returns to the toggle button), on any navigation event (pathname change), or when the toggle is clicked again.

### Accessibility

- Toggle button exposes `aria-expanded` and `aria-controls` so assistive technologies announce the disclosure state.
- All links carry `aria-current="page"` on the active route.
- Passes `jest-axe` checks in both open and closed states.
- All interactive elements have visible `focus-visible` outlines using the cyan-400 design token.

### Example

```jsx
import NavMenu from "@/components/NavMenu";

// Drop-in replacement for the static <header> on any page
export default function MyPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <NavMenu />
      <main>...</main>
    </div>
  );
}

// With Stellar wallet integration
<NavMenu walletLabel="Freighter" onWalletClick={handleConnectWallet} />;
```

---
## ToastProvider / useToast

Context-based toast notification system. Wrap your app (or the relevant subtree) with `ToastProvider`, then call `useToast()` anywhere inside to fire toasts.

**File:** `components/ToastProvider.jsx`

### `<ToastProvider>`

| Prop       | Type        | Description        |
| ---------- | ----------- | ------------------ |
| `children` | `ReactNode` | Subtree to provide |

### `useToast()` return value

| Method                     | Description                |
| -------------------------- | -------------------------- |
| `success(message, title?)` | Show a green success toast |
| `error(message, title?)`   | Show a red error toast     |
| `info(message, title?)`    | Show a cyan info toast     |

> **Throws** if called outside a `<ToastProvider>` tree: `useToast must be used within a ToastProvider`.

### Behaviour

- Toasts auto-dismiss after **5 seconds**.
- Hovering a toast pauses the dismiss timer; leaving resumes it.
- Multiple toasts stack vertically; newest appears at the top.
- **Stack limit:** at most **3** toasts are shown at once (`MAX_TOASTS`). Triggering a 4th toast removes the oldest (bottom) toast and its timer to make room.
- **Deduplication:** a toast is keyed by `variant::title::message`. Firing a toast that matches an already-visible toast's key does not add a duplicate — it moves the existing toast back to the top of the stack and restarts its 5-second timer.
- The toast container uses `aria-live="polite"` and `role="status"`.

### Keyboard accessibility

- Each toast card is focusable (`tabIndex={0}`), so keyboard users can `Tab` to a toast.
- Focusing a toast (or any element inside it, e.g. the Close button) pauses its auto-dismiss timer, same as hovering. Blurring away from the toast resumes it.
- Pressing **Escape** dismisses the most recently added toast — this works from anywhere in the document, not only while a toast has focus.
- On dismiss (via Escape or the Close button), focus is restored to whichever element was focused immediately before the toast gained focus, so keyboard users don't lose their place in the page.
- The Close button has `aria-label="Dismiss notification"`.

### Example

```jsx
// app/layout.js or equivalent root
import { ToastProvider } from "@/components/ToastProvider";

export default function RootLayout({ children }) {
  return <ToastProvider>{children}</ToastProvider>;
}

// Anywhere inside the tree
import { useToast } from "@/components/ToastProvider";

function SaveButton() {
  const toast = useToast();
  return <button onClick={() => toast.success("Changes saved.", "Saved")}>Save</button>;
}
```
- Status
