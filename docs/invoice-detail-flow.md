# Invoice-Detail Data Flow

A visual reference for how `/invest/[id]` loads, transforms, and renders an
invoice for new contributors. Read this alongside
[`docs/architecture.md`](architecture.md) (routes overview) and
[`docs/invoice-data.md`](invoice-data.md) (field contract).

---

## Overview

The detail page is split across two files that live in `app/invest/[id]/`:

| File | Rendering mode | Responsibility |
| ---- | -------------- | -------------- |
| `page.js` | **Server Component (RSC)** | Data fetch, format helpers, JSON-LD, metadata table, timeline |
| `FundActions.jsx` | **Client Component** (`"use client"`) | Fund / Copy link / Print buttons, wallet state, toast feedback |

Only `FundActions.jsx` ships JavaScript to the browser. Everything else
(`<h1>`, `<dl>`, `<InvoiceTimeline>`, JSON-LD `<script>`) is rendered to HTML
on the server and never appears in the client bundle.

---

## End-to-end flow diagram

```
Browser                 Next.js Server               Mock / API Layer
──────                  ──────────────               ────────────────

GET /invest/[id]
──────────────────────► InvoiceDetailPage({ params })
                              │
                              │  await Promise.resolve(params)
                              │  ──────────────────────────────►  params.id
                              │
                              │  getInvoiceById(id)
                              │  ──────────────────────────────►  app/invest/lib.js
                              │                                    MOCK_INVOICES.find(…)
                              │  ◄──────────────────────────────  invoice | undefined
                              │
                        ┌─────┴─────────┐
                        │ invoice found? │
                        └──────┬────────┘
                      No │               │ Yes
                         ▼               ▼
                    notFound()     Transform phase
                    (renders          │
                  not-found.js)       │
                                      ├─ sanitizeText(…)  ──► strips <>{}"' from each field
                                      ├─ buildInvoiceJsonLd(invoice)  ──► schema.org/Offer object
                                      ├─ formatCurrency(amount, { currency })
                                      ├─ formatYield(yieldStr)  ──► formatAmount(v) + "%"
                                      │
                                      ▼
                              RSC renders HTML
                                      │
                              ┌───────┴──────────────────────────────────┐
                              │  <header>  NavMenu + back-to-home link    │
                              │  <script type="application/ld+json">      │
                              │  <Link href="/invest"> ← back             │
                              │  <h1> page title                          │
                              │  <section aria-labelledby="…">            │
                              │    <h2> invoice.issuer                    │
                              │    <dl>  Issuer / Amount / Yield /        │
                              │          Maturity / Status                │
                              │    <StatusPill status={…} />              │
                              │  </section>                               │
                              │  <InvoiceTimeline status timestamps />    │
                              │  <FundActions …props… />  ← client island │
                              └──────────────────────────────────────────┘
                                      │
◄─────────────────────────────────────┘  streamed HTML + JS chunk for FundActions

Client hydration
─────────────────
FundActions({ id, status, maxAmount, currency, yieldValue })
      │
      ├─ useWallet()  ──► WALLET_STATES: DISCONNECTED | CONNECTING | CONNECTED | NO_WALLET
      ├─ useToast()   ──► success / error toast callbacks
      ├─ useState(isCopying)
      │
      ├─ Fund button
      │     disabled when: CONNECTING | NO_WALLET | status ≠ "Open"
      │     onClick → connect() if DISCONNECTED; TX placeholder if CONNECTED
      │
      ├─ Copy link button
      │     onClick → copyInvoiceUrl(id)
      │                 navigator.clipboard.writeText(url)  OR
      │                 copyToClipboardFallback(url)  (textarea execCommand)
      │               → toast.success | toast.error
      │
      ├─ Print button
      │     onClick → window.print()
      │
      └─ FundAmountInput  (only when status === "Open" && maxAmount != null)
            onSubmit(amount) → connect() if DISCONNECTED
                            → toast.success "Funding request submitted"
```

---

## Step-by-step notes

### 1. Route entry — `params.id`

Next.js App Router passes `{ params }` to `InvoiceDetailPage`. The page awaits
`Promise.resolve(params)` so it is compatible with both the current synchronous
params shape and the upcoming async-params API.

### 2. Data fetch — `getInvoiceById(id)`

The current data source is the mock layer in `app/invest/lib.js`. `getInvoiceById`
is a synchronous `Array.find` over `MOCK_INVOICES`. When the backend is wired, this
will be replaced by an async `fetchInvoiceById(id)` call to `GET /invoices/:id`
(see [`docs/api-integration.md`](api-integration.md) and the migration note in
[`docs/invoice-data.md`](invoice-data.md#migrate-the-detail-route)).

```
app/invest/lib.js
  └── MOCK_INVOICES (3 fixtures, 9 fields each)
  └── getInvoiceById(id) → invoice | undefined
```

Unknown ids trigger `notFound()`, which renders `app/invest/[id]/not-found.js`.

### 3. Transform phase (server-only, never in the client bundle)

All three helpers below are module-private to `page.js` and are never exported:

| Helper | Input | Output | Purpose |
| ------ | ----- | ------ | ------- |
| `sanitizeText(value)` | any field | `string` | Strips `< > { } " '` so values are safe to embed in JSON-LD |
| `buildInvoiceJsonLd(invoice)` | full invoice | `schema.org/Offer` object or `null` | Structured data for SEO; inlined as `<script type="application/ld+json">` |
| `formatYield(value)` | `invoice.yield` string/number | `"8.2%"` or `"—"` | Calls `lib/format/currency.formatAmount`, appends `%`; falls back to `INVALID_VALUE_FALLBACK` |

`formatCurrency(amount, { currency })` from `lib/format/currency.js` formats
the display amount directly in the JSX (`<dd>`).

### 4. Server render

The RSC renders a complete HTML page. Key structural landmarks:

| Element | Content | Notes |
| ------- | ------- | ----- |
| `<header class="no-print">` | Logo link + `<NavMenu>` | Hidden when printing |
| `<script type="application/ld+json">` | JSON-LD Offer | Emitted only when `buildInvoiceJsonLd` returns non-null |
| `<main id="main-content">` | All visible content | `id` is the skip-link target |
| `<section aria-labelledby="invoice-summary-heading">` | `<h2>` + `<dl>` metadata | `class="print-invoice-section"` is visible when printing |
| `<InvoiceTimeline>` | Step-by-step lifecycle | Driven by `status` and optional `timestamps` prop |
| `<FundActions>` | Client island | Only interactive bytes sent to the browser |

### 5. Client island — `FundActions.jsx`

`FundActions` receives five props from the server component:

| Prop | Source field | Used for |
| ---- | ------------ | -------- |
| `id` | `invoice.id` | Building the share URL |
| `status` | `invoice.status` | Enabling/disabling the Fund button |
| `maxAmount` | `invoice.amountValue` | Ceiling for `FundAmountInput` |
| `currency` | `invoice.currency` | Label in the funding toast |
| `yieldValue` | `invoice.yieldValue` | Expected-yield preview in `FundAmountInput` |

Wallet state comes from `useWallet()` (provided by `WalletProvider` in
`app/layout.js`). The fund button is disabled while the wallet is `CONNECTING`
or `NO_WALLET`, and also when `status !== "Open"`.

### 6. Clipboard copy path

```
handleCopyLink()
  └─ copyInvoiceUrl(id)
        ├─ navigator.clipboard.writeText(url)   ← modern browsers (HTTPS)
        └─ copyToClipboardFallback(url)          ← fallback (non-HTTPS / older Safari)
              └─ createElement("textarea") → select() → execCommand("copy") → remove()
```

Both paths return (or resolve to) the copied URL string. On success, `toast.success`
is called; on failure (clipboard permission denied), `toast.error` is called.

---

## Key invariants

1. **No browser APIs in `page.js`** — the server component contains zero
   `useEffect`, `useState`, `window`, or `document` calls. Violations would
   break SSR.

2. **`notFound()` always terminates** — if `getInvoiceById` returns `undefined`,
   `notFound()` is called immediately and the rest of the component body does
   not execute.

3. **`sanitizeText` runs before JSON-LD** — every field included in the
   `<script>` tag is passed through `sanitizeText` first, preventing XSS via
   `JSON.stringify` injection.

4. **Single client boundary** — `FundActions.jsx` is the only `"use client"`
   file under `/invest/[id]/`. Adding hooks or browser APIs elsewhere would
   silently pull extra bytes into the client bundle.

5. **Props cross the RSC/client boundary as serializable values only** —
   `FundActions` receives plain strings and numbers; no functions, class
   instances, or unserializable objects are passed.

---

## File map

```
app/invest/[id]/
├── page.js            ← Server Component (RSC) — this flow's entry point
├── FundActions.jsx    ← Client Component — interactive controls
├── loading.js         ← Suspense skeleton shown while page.js resolves
└── not-found.js       ← Rendered when getInvoiceById returns undefined

app/invest/
└── lib.js             ← MOCK_INVOICES + getInvoiceById + loadMockInvoices

lib/format/
├── currency.js        ← formatCurrency, formatAmount, INVALID_VALUE_FALLBACK
└── config.js          ← FORMAT_CONFIG (locale, fallback)

lib/types/
└── invoice.js         ← INVOICE_STATUSES, STATUS_PILL_MAP, resolveStatusPill

components/
├── InvoiceTimeline.jsx ← Lifecycle steps (Uploaded→Verified→Listed→Funded→Settled)
├── StatusPill.jsx      ← Renders a coloured badge for the invoice status
└── FundAmountInput.jsx ← Partial-funding form with live yield preview
```

---

## Related docs

- [`docs/architecture.md`](architecture.md) — full route map and state ownership
- [`docs/invoice-data.md`](invoice-data.md) — field contract, formatted vs raw values, migration checklist
- [`docs/api-integration.md`](api-integration.md) — backend HTTP contract for the planned live migration
- [`WALLET_INTEGRATION_CONTRACT.md`](../WALLET_INTEGRATION_CONTRACT.md) — `useWallet` state machine
