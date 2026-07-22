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

### Behaviour

- Toasts auto-dismiss after **5 seconds**.
- Hovering a toast pauses the dismiss timer; leaving resumes it.
- Multiple toasts stack vertically; newest appears at the top.
- The toast container uses `aria-live="polite"` and `role="status"`.

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

---

## UploadZone

Drag-and-drop (or click-to-browse) PDF invoice upload form. Validates the file client-side, then POSTs it to `POST /invoices` on the configured API.

**File:** `components/UploadZone.jsx`

### Props

None — API endpoint is read from `NEXT_PUBLIC_API_URL` (falls back to `http://localhost:3001`).

### Exported constants

| Export             | Description                                                     |
| ------------------ | --------------------------------------------------------------- |
| `MAX_UPLOAD_BYTES` | Numeric constant limiting file size to 10 MB (in bytes)         |
| `FILE_CONSTRAINTS` | Object with `accept`, `mimeType`, `maxSizeMb`, `maxSizeBytes`   |
| `Spinner`          | Small inline SVG spinner used internally; re-exported for reuse |

### Upload states

| State        | Description                                             |
| ------------ | ------------------------------------------------------- |
| `idle`       | Waiting for a file or ready to submit                   |
| `uploading`  | `fetch` in progress; submit button disabled             |
| `tokenizing` | Upload succeeded; waiting for server tokenization delay |
| `success`    | Invoice queued; informational status shown              |

### Validation rules

- **Type:** only `application/pdf` accepted; any other MIME type is rejected.
- **Size:** file must be ≤ 10 MB (`MAX_UPLOAD_BYTES`). Validation is checked immediately upon file selection via `FILE_CONSTRAINTS`, and additionally enforced before the network `fetch` is triggered to ensure safety.

### Accessibility

- Drop zone renders as `role="button"` with `tabIndex={0}`; activates on `Enter` and `Space`.
- Errors use `role="alert"` with `aria-live="assertive"`.
- Progress messages use `role="status"` with `aria-live="polite"`.
- Upload button carries `aria-disabled` in addition to the native `disabled` attribute.

### Example

```jsx
import UploadZone from "@/components/UploadZone";

export default function InvoicePage() {
  return (
    <main>
      <h1>Upload Invoice</h1>
      <UploadZone />
    </main>
  );
}
```

---

## WalletStatus

Stellar wallet connection UI. Shows a status indicator dot, wallet address / helper text, and an action button whose label adapts to the current connection state.

**File:** `components/WalletStatus.jsx`

---

## Formatting Utilities

Locale-aware numeric formatting helpers for invoice amounts, currencies, and yield values.

**File:** `lib/format/currency.js`

### Exports

| Export           | Description                                                                    |
| ---------------- | ------------------------------------------------------------------------------ |
| `formatCurrency` | Formats a numeric value with `Intl.NumberFormat` currency style. Accepts `{ currency, locale }`. |
| `formatAmount`   | Formats a numeric amount with grouping and no currency symbol.                 |

Both helpers return a safe fallback (`—`) for `null`, `undefined`, `NaN`, empty strings, and non-numeric strings. `InvoiceCard` reuses `formatCurrency` for the amount cell and `formatAmount` for yield text before appending a single percent sign, keeping card, skeleton-aligned rows, and detail-page formatting consistent without injecting unescaped HTML.

> **Note:** Wallet connection is currently mocked for UI development. Replace the `connectWallet` internals with real Freighter / wallet-kit calls when integrating. See [WALLET_INTEGRATION_CONTRACT.md](WALLET_INTEGRATION_CONTRACT.md).

### Props

None — all state is managed internally.

### Connection states

| State           | Dot colour     | Button label     | Description                              |
| --------------- | -------------- | ---------------- | ---------------------------------------- |
| `disconnected`  | Grey           | Connect Wallet   | Initial state; no wallet linked          |
| `connecting`    | Yellow (pulse) | Connecting…      | Awaiting wallet approval                 |
| `connected`     | Green          | Disconnect       | Wallet linked; address and balance shown |
| `error`         | Red            | Retry Connection | Connection attempt failed                |
| `wrong_network` | Red            | Switch Network   | Wallet is on testnet instead of public   |
| `no_wallet`     | Grey           | Install Wallet   | No Stellar wallet extension detected     |

### Exported constants

| Export          | Description                          |
| --------------- | ------------------------------------ |
| `WALLET_STATES` | Object of all state string constants |

### Accessibility

- Status dot is `aria-hidden`; the `sr-only` live region (`aria-live="polite"`, `role="status"`) announces state changes to screen readers.
- Action button has `aria-label` matching the visible button text.
- Button links `aria-describedby` to a hidden helper-text element.

### Example

```jsx
import WalletStatus from "@/components/WalletStatus";

// Renders within a ToastProvider (required for connection toasts)
<WalletStatus />;
```

---

## StatusPill

The single source of truth for rendering an invoice-status badge. Used on the marketplace card (`InvoiceCard`) and the detail `dl` so label, tone, and accessibility metadata stay in lock-step across both surfaces.

**File:** `components/StatusPill.jsx`

### Status vocabulary

The exhaustive set of invoice-status values lives in `lib/types/invoice.js`:

| Constant                   | Value       | Label rendered        | Tone (Tailwind)                                  |
| -------------------------- | ----------- | --------------------- | ------------------------------------------------ |
| `INVOICE_STATUSES.OPEN`    | `"Open"`    | `Open`                | cyan (`bg-cyan-900/40 text-cyan-300`)            |
| `INVOICE_STATUSES.FUNDED`  | `"Funded"`  | `Funded`              | muted slate (`bg-slate-700/40 text-slate-400`)   |
| `INVOICE_STATUSES.SETTLED` | `"Settled"` | `Settled`             | emerald (`bg-emerald-900/30 text-emerald-300`)   |
| `INVOICE_STATUSES.OVERDUE` | `"Overdue"` | `Overdue by maturity` | amber (`bg-amber-900/40 text-amber-300`)         |
| _(none — fallback)_        | `null`      | `Unknown`             | neutral slate (`bg-slate-800/60 text-slate-400`) |

`INVOICE_STATUSES` and `STATUS_PILL_MAP` are both `Object.freeze`-immutable so the canonical vocabulary cannot drift at runtime.

### Props

| Prop        | Type      | Default | Description                                                                                                                |
| ----------- | --------- | ------- | -------------------------------------------------------------------------------------------------------------------------- |
| `status`    | `unknown` | —       | Any invoice status value. Strings outside `INVOICE_STATUSES` (and all nullish / non-string inputs) fall back to `Unknown`. |
| `className` | `string`  | `""`    | Optional Tailwind classes appended to the tone classes. Layout-spacing only; never override tone colours.                  |

### Behaviour

- Reads `INVOICE_STATUSES` and `STATUS_PILL_MAP` from `lib/types/invoice.js` — the only place to add a new status is to update **all three** tables (the enum, the map entry, and this contract).
- Always renders a visible pill. **Unknown / nullish / empty input → `Unknown`** neutral pill, never throws, never renders the raw input, never renders an empty `<span>`.
- The rendered `<span>` carries a `data-status` attribute whose value is the canonical key (`"Open" | "Funded" | "Settled" | "Overdue" | "Unknown"`). Use this for tests and `InvoiceCard` wiring.
- Purely presentational — never a `<button>`, never focusable.

### Accessibility

- `role="status"` so screen readers announce state changes.
- `aria-label` reads `"Status: <label>"` — the same word rendered inside the pill. **Colour is never load-bearing.**
- Status is conveyed by **text**, not by colour alone, satisfying WCAG 2.1 §1.4.1 (Use of Color).

### Example

```jsx
import StatusPill from '@/components/StatusPill';

// Marketplace card
<StatusPill status={invoice.status} />

// Detail page definition list
<dl>
  <dt>Status</dt>
  <dd><StatusPill status={invoice.status} /></dd>
</dl>

// Neutral fallback (null, undefined, unknown strings, etc.)
<StatusPill status={null} />             // → "Unknown" pill
<StatusPill status="legacy-available" /> // → "Unknown" pill
```

---

## StatusLegendFilter

A compact, toggleable chip row that lets investors filter the Invest marketplace by one or more invoice statuses. The chip set is derived from `INVOICE_STATUSES` in `lib/types/invoice.js` so it never drifts from the canonical status vocabulary and `STATUS_PILL_MAP` tones.

**File:** `components/InvoiceFilters.jsx` (named export `StatusLegendFilter`)

### Props

| Prop               | Type       | Default | Description                                                                                     |
| ------------------ | ---------- | ------- | ----------------------------------------------------------------------------------------------- |
| `selectedStatuses` | `string[]` | `[]`    | Currently active status values. Must be values from `INVOICE_STATUSES`.                         |
| `onStatusToggle`   | `Function` | —       | **Required.** Called with the status string that was clicked (add if absent, remove if present). |
| `onClearStatuses`  | `Function` | —       | Called when the "Clear" button is clicked. Shown only when at least one status is selected.     |

### Behaviour

- Each chip is a `<button>` with `aria-pressed` — toggling is keyboard-operable and screen-reader-friendly.
- Multiple selections use a union (OR) — all invoices whose status matches any selected chip are shown.
- When `selectedStatuses` is empty all invoices are visible (no filtering applied).
- An unknown status chip value falls back to the neutral `Unknown` pill tone from `STATUS_PILL_MAP`.

### Accessibility

- Chip group is wrapped with `role="group"` and `aria-label="Filter by status"`.
- Every chip exposes `aria-pressed` (`"true"` / `"false"`).
- The Clear button carries `aria-label="Clear status filters"`.
- Selected chip styling reuses the `STATUS_PILL_MAP` tone classes so colour is always paired with a visible text label (WCAG 2.1 §1.4.1 satisfied).
- All interactive elements have a visible `focus-visible:ring` outline.

### Integration in `app/invest/page.js`

The component is rendered above the filter fieldset. Status filtering is applied in the `filteredInvoices` useMemo. The `DEFAULT_FILTERS` object includes a `statuses: []` field.

```jsx
import { StatusLegendFilter } from '@/components/InvoiceFilters';

<StatusLegendFilter
  selectedStatuses={filters.statuses}
  onStatusToggle={handleStatusToggle}
  onClearStatuses={handleClearStatuses}
/>
```

### Example

```jsx
// No selection — shows all invoices
<StatusLegendFilter selectedStatuses={[]} onStatusToggle={toggle} onClearStatuses={clear} />

// Single status selected
<StatusLegendFilter selectedStatuses={['Open']} onStatusToggle={toggle} onClearStatuses={clear} />

// Multi-status union (Open OR Overdue)
<StatusLegendFilter selectedStatuses={['Open', 'Overdue']} onStatusToggle={toggle} onClearStatuses={clear} />
```

---

## InvoiceDetail (page)

Invoice detail view rendered at `/invest/[id]`. Shows the full terms of a single invoice and provides fund, share, and print/Save PDF actions.

**File:** `app/invest/[id]/page.js`

### Exports

| Export                       | Description                                                        |
| ---------------------------- | ------------------------------------------------------------------ |
| `InvoiceDetail`              | The presentational component (accepts injectable `loadInvoice`)    |
| `default` (page wrapper)     | App Router page that renders `<InvoiceDetail />`                   |
| `copyInvoiceUrl(id)`         | Async helper that copies `/invest/{id}` URL to clipboard           |
| `copyToClipboardFallback(text)` | Creates a hidden textarea and uses `execCommand('copy')`        |

### Action buttons

When an invoice is loaded, three buttons appear:

- **"Fund this invoice"** — connects wallet or funds the invoice
- **"Copy link"** — writes `{origin}/invest/{id}` to clipboard via `navigator.clipboard.writeText()` (preferred) or `document.execCommand('copy')` (fallback); shows success/error toast
- **"Print / Save PDF"** — calls `window.print()` to trigger the browser's native print dialog

### Accessibility

- All three buttons are `<button type="button">` with descriptive `aria-label` attributes that stay constant.
- Confirmation is announced via the toast system's `aria-live="polite"` container, so screen readers hear the success/error message without shifting layout.

---

## ThemeToggle

A button that cycles through **light → dark → system** theme preferences, persists the choice to `localStorage`, and applies a `data-theme` attribute on `<html>` so CSS tokens update instantly.

**File:** `components/ThemeToggle.jsx`

### Named exports

| Export                    | Description                                                                              |
| ------------------------- | ---------------------------------------------------------------------------------------- |
| `default` (`ThemeToggle`) | The toggle button component                                                              |
| `THEMES`                  | `['light', 'dark', 'system']` — the ordered cycle                                        |
| `THEME_STORAGE_KEY`       | `localStorage` key used to persist the preference                                        |
| `resolveTheme(pref)`      | Maps a preference string to `'light'` or `'dark'` (resolves `'system'` via `matchMedia`) |
| `readStoredTheme()`       | Reads from `localStorage`, returning `'system'` as fallback                              |
| `applyTheme(pref)`        | Sets `data-theme` on `document.documentElement`                                          |

### Props

| Prop        | Type     | Default | Description                                    |
| ----------- | -------- | ------- | ---------------------------------------------- |
| `className` | `string` | `''`    | Extra classes forwarded to the root `<button>` |

### How it works

1. **Pre-paint inline script** in `app/layout.js` reads `localStorage` before React hydrates and sets `data-theme` on `<html>` via `dangerouslySetInnerHTML`. This eliminates the flash of incorrect theme on first load.
2. **On mount**, the component reads the stored preference and syncs React state.
3. **On click**, cycles `system → light → dark → system`, writes to `localStorage`, and calls `applyTheme`.
4. **OS change listener**: when preference is `'system'`, a `matchMedia` listener re-applies the theme if the user toggles their OS setting.

### Theme cycle

```
system (monitor icon)  →  light (sun icon)  →  dark (moon icon)  →  system …
```

### Accessibility

- `aria-label` describes the **current** theme and the next option (e.g. `"Theme: Dark (click for System)"`).
- `aria-pressed` is `true` for explicit `light`/`dark` choices and `false` for `system`.
- All SVG icons carry `aria-hidden="true"` and `focusable="false"`.
- Button has `id="theme-toggle"` for automated testing and skip-link targeting.
- Keyboard-focusable with `focus-visible:outline` following the site ring pattern.

### CSS tokens consumed

| Token             | Dark (`[data-theme="dark"]`) | Light (`[data-theme="light"]`) |
| ----------------- | ---------------------------- | ------------------------------ |
| `--color-bg`      | `#020617` (slate-950)        | `#f8fafc` (slate-50)           |
| `--color-fg`      | `#f1f5f9` (slate-100)        | `#0f172a` (slate-900)          |
| `--color-muted`   | `#94a3b8` (slate-400)        | `#64748b` (slate-500)          |
| `--color-surface` | `#0f172a` (slate-900)        | `#ffffff` (white)              |
| `--color-border`  | `#1e293b` (slate-800)        | `#e2e8f0` (slate-200)          |
| `--color-primary` | `#22d3ee` (cyan-400)         | `#0891b2` (cyan-600)           |

### Example

```jsx
import ThemeToggle from '@/components/ThemeToggle';

// Renders inside any layout — no provider required
<ThemeToggle />

// With extra positioning class
<ThemeToggle className="ml-4" />
```

---

## FundAmountInput

A partial-funding amount input with live validation, expected-yield preview, and accessible inline error messages. Replaces the all-or-nothing fund button on the invoice detail page.

**File:** `components/FundAmountInput.jsx`

### Named exports

| Export                | Description                                                                 |
| --------------------- | --------------------------------------------------------------------------- |
| `default`             | The controlled input form component                                         |
| `validateFundAmount`  | Pure validation function — use in tests or server-side validation           |
| `deriveExpectedYield` | Pure calculation — derives the expected yield amount for a partial funding  |

### Props

| Prop        | Type       | Default     | Description                                                                             |
| ----------- | ---------- | ----------- | --------------------------------------------------------------------------------------- |
| `maxAmount` | `number`   | —           | **Required.** Maximum fundable balance (the invoice's `amountValue`).                   |
| `currency`  | `string`   | —           | **Required.** Invoice currency code (e.g. `"USD"`, `"EUR"`). Controls decimal precision. |
| `yieldValue`| `number`   | —           | **Required.** Invoice yield rate as a percentage number (e.g. `8.2` for 8.2%).         |
| `onSubmit`  | `function` | `undefined` | Called with the validated numeric amount on submit. May be async.                       |
| `disabled`  | `boolean`  | `false`     | Disables the input and submit button externally (e.g. wallet is connecting).            |

### Validation rules

All validation is performed by the exported `validateFundAmount(rawValue, maxAmount, currency)` function:

| Rule                  | Error copy key                         | Detail                                                                 |
| --------------------- | -------------------------------------- | ---------------------------------------------------------------------- |
| Non-empty             | `invest.fundAmount.errorRequired`      | Empty or whitespace-only input                                         |
| Numeric               | `invest.fundAmount.errorRequired`      | Non-numeric input                                                      |
| Positive              | `invest.fundAmount.errorPositive`      | Zero or negative values                                                |
| ≤ max balance         | `invest.fundAmount.errorExceedsBalance`| Amount exceeds the invoice `amountValue`                               |
| Decimal precision     | `invest.fundAmount.errorPrecision`     | Exceeds allowed decimal places for the currency (2 for USD, 0 for JPY) |

### Copy keys used

All strings are sourced from `app/copy/en.js` under the `invest.fundAmount` namespace:

| Key                    | Purpose                                         |
| ---------------------- | ----------------------------------------------- |
| `label`                | Input label                                     |
| `placeholder`          | Input placeholder                               |
| `helper`               | Helper text with `{max}` and `{currency}` tokens|
| `expectedYieldLabel`   | Label prefix for the yield preview              |
| `errorRequired`        | Validation error for empty / non-numeric input  |
| `errorPositive`        | Validation error for zero or negative values    |
| `errorExceedsBalance`  | Validation error with `{max}` and `{currency}`  |
| `errorPrecision`       | Validation error with `{decimals}` and `{currency}` |
| `submitLabel`          | Submit button label                             |
| `submittingLabel`      | Submit button label while in flight             |

### Accessibility

- The `<input>` is linked to its helper text and error message via `aria-describedby`. The IDs are generated with `useId()` so they are unique even if the component appears more than once on a page.
- `aria-invalid="true"` is set on the input when a validation error is visible (after the user has blurred the field or attempted to submit).
- The error message is rendered with `role="alert"` and `aria-live="polite"` so screen readers announce it without requiring focus to move to the error.
- The expected-yield preview region carries `aria-live="polite"` so screen readers announce live yield updates as the user types.
- The submit `<Button>` is disabled (and `aria-busy` is set via the `Button` component's `loading` prop) while submission is in flight.

### Example

```jsx
import FundAmountInput from "@/components/FundAmountInput";

// On the invoice detail page for an Open invoice
<FundAmountInput
  maxAmount={invoice.amountValue}
  currency={invoice.currency}
  yieldValue={invoice.yieldValue}
  onSubmit={async (amount) => {
    await fundInvoiceOnChain(invoice.id, amount);
  }}
  disabled={walletState !== "connected"}
/>
```

### Exported utility functions

#### `validateFundAmount(rawValue, maxAmount, currency)`

Returns a localized error string on failure, or `null` when the value is valid.

```js
import { validateFundAmount } from "@/components/FundAmountInput";

validateFundAmount("", 10000, "USD");       // "Please enter an amount."
validateFundAmount("0", 10000, "USD");      // "Amount must be greater than zero."
validateFundAmount("99999", 10000, "USD"); // "Amount cannot exceed …"
validateFundAmount("100.999", 10000, "USD"); // "Amount must not exceed 2 decimal places …"
validateFundAmount("500", 10000, "USD");   // null (valid)
```

#### `deriveExpectedYield(enteredAmount, totalAmount, yieldValue)`

Returns the expected yield as a numeric amount.

```js
import { deriveExpectedYield } from "@/components/FundAmountInput";

deriveExpectedYield(5000, 10000, 8.2); // 410  (5000 × 8.2% = $410 yield)
deriveExpectedYield(10000, 10000, 8.2); // 820 (full amount)
```

---

## Hooks

Reusable React hooks that live under `lib/hooks/`. Hooks are the canonical home for shared persistence and behaviour so any feature can adopt the same contract without re-implementing edge cases (SSR safety, quota errors, type preservation).

### `useLocalStorage`

A drop-in `useState`-shaped hook for `window.localStorage` with **SSR-safe hydration**, **JSON parse guarding**, and **quota/SecurityError guarding**. The single shared implementation that wallet / preferences / any future persistable feature must consume.

**File:** `lib/hooks/useLocalStorage.js`

#### Signature

```jsx
const [value, setValue] = useLocalStorage < T > (key, defaultValue);
```

| Argument         | Type                               | Description                                                                         |
| ---------------- | ---------------------------------- | ----------------------------------------------------------------------------------- |
| `key`            | `string`                           | Required. Storage key. Empty / non-string keys are defensive-no-ops (no throw).     |
| `defaultValue`   | `T \| (() => T)`                   | Initial value or lazy initialiser. Returned on the very first render.               |
| Returns value    | `T`                                | Current state. Defaults to `defaultValue` on first render, then rehydrates.         |
| Returns setValue | `(next \| (prev) => next) => void` | Stable setter. Accepts either a value or a functional updater (mirrors `useState`). |

#### SSR-safety contract

- **Initial render never reads from storage.** Whatever `defaultValue` is, that is what every consumer sees on first render (server-side and the first client render). This is the rule that keeps React hydration safe in a Next.js app router context.
- The actual read happens inside `useEffect`, after the component mounts on the client. JSON-parse failures, missing entries, and `localStorage.getItem` itself throwing (e.g. private-browsing SecurityError) are **all swallowed** — the hook falls back to `defaultValue` so React never sees an exception.
- `setValue` does not access `window` at module scope or during render; the window check sits inside the setter callback so the rule is enforced on every write.

#### Write-through contract

- `setValue(next)` writes `JSON.stringify(next)` to `localStorage` AND updates React state in lock-step. **Quota errors and SecurityError are swallowed** so the UI keeps working even when the browser refuses the write — React state still updates so the in-memory value is correct.
- `setValue(prev => next)` is the canonical functional updater form. Sequential calls inside `act()` correctly accumulate.
- `setValue(undefined)` removes the storage key (`removeItem`) and leaves React state at `undefined`. This is the React idiom for "unset"; no other value triggers a removal.

#### Stability

- The setter is referentially stable across renders when `key` does not change. Safe to put in dependency arrays.
- Changing `key` mid-lifecycle triggers a re-read from `localStorage` for the new key.

#### Caveats (intentional non-features)

- **No auto-rehydration after mount.** Within the same tab, two `useLocalStorage('key', …)` instances do **not** auto-sync each other's writes — each one rehydrates only when it first mounts (initial render → mount effect) or when its `key` prop changes. Consumers that need shared-state semantics across many components should centralise through React Context on top of this hook.
- **No cross-tab sync.** A write in tab A does not auto-propagate to tab B. The pre-paint inline script in `app/layout.js` (theme toggle) handles initial-paint sync; live cross-tab sync is out of scope.
- **No automatic debouncing.** Rapid `setValue` calls produce one `setItem` per call. The setter is cheap, but consumers that need debouncing should layer it on top (typical for text inputs).
- **Stored value types must round-trip through JSON.** Functions, classes, and other non-serialisable values will not survive a round-trip. Compose with a serialisation layer if you need that.

#### Example

```jsx
'use client';

import { useLocalStorage } from '@/lib/hooks/useLocalStorage';

// Primitive — typed default surfaces string.
const [theme, setTheme] = useLocalStorage<'light' | 'dark' | 'system'>(
  'lhf:theme',
  'system',
);

// Object — generic preserves the shape.
const [wallet, setWallet] = useLocalStorage<{ address?: string; network?: string }>(
  'lhf:wallet-snapshot',
  {},
);

// Functional updater.
setWallet((prev) => ({ ...prev, network: 'PUBLIC' }));

// Reset.
setWallet(undefined);
```

---

## Design tokens

Global tokens defined in `app/globals.css` and driven by the `[data-theme]` attribute (set by `ThemeToggle`).

| Token             | Dark value          | Light value         |
| ----------------- | ------------------- | ------------------- |
| `--color-bg`      | `#020617` slate-950 | `#f8fafc` slate-50  |
| `--color-fg`      | `#f1f5f9` slate-100 | `#0f172a` slate-900 |
| `--color-primary` | `#22d3ee` cyan-400  | `#0891b2` cyan-600  |

Dark is the `:root` default (backwards-compatible). Light overrides activate via `[data-theme="light"]`.

Font: **Geist** via `next/font/google`. Headings use `font-bold`; body copy uses the default weight.

---

## Print behavior — Invoice Detail page

**File:** `app/invest/[id]/page.js`

The invoice detail page (`/invest/[id]`) supports printing and PDF export via a `@media print` block in `app/globals.css`.

### How it works

- A **"Print / Save PDF"** button appears below the Fund button on the detail page. Clicking it calls `window.print()`, which triggers the browser's native print/save-as-PDF dialog.
- The button has `aria-label="Print or save this invoice as PDF"` and is keyboard-reachable.
- Interactive chrome (nav header, wallet widget, back link, Fund button, disclaimer note, and the print button itself) all carry the `no-print` CSS class, which the print stylesheet hides with `display: none !important`.
- The invoice summary `<section>` carries the `print-invoice-section` class, which forces a white background and dark text for ink-efficient output.

### CSS classes

| Class                   | Purpose                                                    |
| ----------------------- | ---------------------------------------------------------- |
| `no-print`              | Hides element in `@media print` (nav, buttons, disclaimer) |
| `print-invoice-section` | Forces white bg and dark text on the invoice facts panel   |
| `print-page-wrapper`    | Resets page-level dark background to white when printing   |

### Printed fields

The printed / PDF output shows only the invoice's core fields:

- Issuer
- Amount (with currency)
- Estimated yield
- Maturity date
- Status
