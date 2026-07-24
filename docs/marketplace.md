# Invest Marketplace — Component Contract

This document describes the contract for the **`InvestMarketplace`** component
(`app/invest/page.js`) and its supporting exports. It covers props, component
states, accessibility behaviour, and related helpers.

For architecture context (data layer, route map, state ownership) see
[`docs/architecture.md`](architecture.md).  
For the invoice data shape see [`docs/invoice-data.md`](invoice-data.md).  
For the filter predicate API see [`FILTER_CONTRACTS.md`](../FILTER_CONTRACTS.md).

---

## Overview

`InvestMarketplace` is the primary investor-facing route component rendered at
`/invest`. It:

- Fetches a list of tokenised invoices via an injectable `loadInvoices` function.
- Applies a debounced issuer-name search and structured panel filters (yield
  range, currency, maturity range, status, and sort).
- Renders results PAGE\_SIZE (10) at a time with a "Load more" control.
- Manages loading, error, empty, no-match, and list states with appropriate
  visual treatments and screen-reader announcements.
- Exposes a "Try again" recovery path on load failure.

The **default export** `InvestPage` is the Next.js App Router page entry point.
It renders `<InvestMarketplace />` with no props (using the live data loader).
`InvestMarketplace` itself is a **named export** so tests can inject a custom
`loadInvoices` without navigating.

---

## Files

| File | Role |
| ---- | ---- |
| `app/invest/page.js` | `InvestMarketplace` component + helper exports |
| `app/invest/lib.js` | Mock invoice fixtures + data helpers |
| `app/invest/loading.js` | App Router Suspense skeleton (rendered while the route segment loads) |
| `components/InvoiceFilters.jsx` | Filter panel component (yield, currency, maturity, sort, status chips) |
| `components/InvoiceSearch.jsx` | Controlled issuer search input |
| `components/Pagination.jsx` | "Load more" / page-based pagination control |

---

## `InvestMarketplace` — named export

```js
import { InvestMarketplace } from "@/app/invest/page";
```

### Props

| Prop | Type | Default | Description |
| ---- | ---- | ------- | ----------- |
| `loadInvoices` | `(options?: { signal?: AbortSignal }) => Promise<Invoice[]>` | `loadMockInvoices` | Async function that resolves to an array of invoice objects. Defaults to the mock data loader defined in `app/invest/lib.js`. Injectable for tests and for swapping in the live API client. |

`loadInvoices` is the **only** public prop. All other state (search query,
filters, pagination, loading) is managed internally.

### Invoice object shape

`loadInvoices` must resolve to an array where each element conforms to:

| Field | Type | Example | Notes |
| ----- | ---- | ------- | ----- |
| `id` | `string` | `"inv-001"` | Unique identifier; used as React list key and for the detail route `/invest/[id]`. |
| `issuer` | `string` | `"Acme Supplies Ltd"` | Matched against the search query (case-insensitive substring). |
| `amount` | `string` | `"12,500"` | Formatted display amount (comma-separated). Used with `parseAmount` internally for sorting. |
| `currency` | `string` | `"USD"` | ISO 4217 currency code. Matched exactly by the currency filter. |
| `dueDate` | `string` | `"2026-06-15"` | ISO 8601 date string (`YYYY-MM-DD`). Used for maturity-range filtering and sort. |
| `yield` | `string` | `"8.2%"` | Percentage string. Used for yield-range filtering and sort. |
| `status` | `string` | `"Open"` | Status value. Must be one of the canonical `INVOICE_STATUSES` values defined in `lib/types/invoice.js`. |
| `amountValue` | `number` | `12500` | *Optional.* Numeric representation; present in mock fixtures but not consumed directly by `InvestMarketplace` (sorting parses `amount` via `parseAmount`). |
| `yieldValue` | `number` | `8.2` | *Optional.* Same note as `amountValue`. |

Missing or non-array results are normalised to `[]` rather than throwing.

---

## Component States

`InvestMarketplace` moves through the following mutually exclusive render
states, driven entirely by internal state:

| State | Trigger | Rendered output |
| ----- | ------- | --------------- |
| **Loading** | `invoices === null` (initial mount or after retry) | `<InvoiceListSkeleton rows={3} />` |
| **Error** | `loadInvoices` rejects and `loadError` is non-empty | `<ErrorBanner>` with a "Try again" action button |
| **Empty marketplace** | `invoices` resolved to `[]` (no invoices exist at all) | Muted `"No investable invoices"` message |
| **No filter match** | `filteredInvoices.length === 0` after filters/search applied to a non-empty list | Muted `"No invoices match your filters."` message |
| **List** | One or more `filteredInvoices` | Invoice card list with optional "Load more" button |

The **error** state is distinguished from **loading** because `invoices` is
reset to `null` before each retry — both look like "loading" to a new mount but
differ in that `loadError` is non-empty before the retry begins.

### State transitions

```
                    mount / retry
                         │
                         ▼
                    [ LOADING ]   ← invoices === null
                    /          \
              resolve         reject
                /                \
    [ LIST / EMPTY / NO-MATCH ]  [ ERROR ]
                         ▲           │
                         └── retry ──┘
```

---

## Constants

Exported from `app/invest/page.js`:

| Export | Value | Description |
| ------ | ----- | ----------- |
| `PAGE_SIZE` | `10` | Maximum invoices rendered per load-more batch. Also the initial visible count on first render. |
| `SEARCH_DEBOUNCE_MS` | `300` | Milliseconds of inactivity before the debounced search state updates and filtering runs. |

---

## Exported helper functions

### `getInvoiceLoadAnnouncement(invoices, options?)`

Returns the screen-reader announcement text for the current invoice list state.
Used by the polite `aria-live` region inside `InvestMarketplace`.

```js
/**
 * @param {Array}   invoices                    The full (unfiltered) invoice array.
 * @param {object}  [options]
 * @param {boolean} [options.filterActive]       True when any search/panel filter is applied.
 * @param {number}  [options.filteredCount]      Number of invoices matching the active filter(s).
 * @returns {string}
 */
export function getInvoiceLoadAnnouncement(invoices, { filterActive, filteredCount } = {})
```

| Scenario | Return value |
| -------- | ------------ |
| `invoices` is empty or not an array | `copy.invest.announceNoInvoices` — `"No invoices available"` |
| `filterActive` is `true` and `filteredCount === 0` | `copy.invest.announceNoMatch` — `"No invoices match"` |
| `filterActive` is `true` and `filteredCount > 0` | `"N of M invoices match"` |
| No filter active | `"N investable invoices loaded"` |

Both `filterActive` and `filteredCount` must be passed explicitly — the
function has no implicit dependencies on component state.

### `getPaginationAnnouncement(shown, total)`

Returns the pagination announcement string for the polite `aria-live` status
region. Called when `visibleCount < filteredInvoices.length` (i.e. while
pagination is active).

```js
/**
 * @param {number} shown  - Items currently visible.
 * @param {number} total  - Total items matching active filters.
 * @returns {string}
 */
export function getPaginationAnnouncement(shown, total)
```

| Scenario | Return value |
| -------- | ------------ |
| `total === 0` | `"No invoices available"` |
| `shown < total` | `"Showing N of M investable invoices"` |
| `shown === total` (last page) | `"Showing M of M investable invoices"` |

### `applySortToList(list, filters)`

Sorts a copy of `list` according to the sort column and direction held in
`filters`. Returns the original reference unchanged when the list is empty or
no sort column is active.

```js
/**
 * @param {Invoice[]} list    - Invoice array to sort.
 * @param {object}    filters - Filters object (uses `sort` and `sortDir` fields).
 * @returns {Invoice[]}
 */
export function applySortToList(list, filters)
```

Supported sort columns:

| `filters.sort` | Sort key | Parsing |
| -------------- | -------- | ------- |
| `"amount"` | `invoice.amount` | Strips commas, parses as float |
| `"yield"` | `invoice.yield` | Strips `%`, parses as float |
| `"maturity"` | `invoice.dueDate` | Lexicographic ISO date comparison |

Direction is read via `parseSortState(filters)` (exported from
`components/InvoiceFilters.jsx`), which supports both plain column keys
(`"yield"`) and compound keys (`"yield_desc"`).

---

## Internal state summary

These are internal to `InvestMarketplace` and not part of the public API. They
are documented here for contributors reading the source:

| State variable | Type | Initial value | Purpose |
| -------------- | ---- | ------------- | ------- |
| `invoices` | `Invoice[] \| null` | `null` | Raw invoice list; `null` signals loading. |
| `visibleCount` | `number` | `PAGE_SIZE` | How many `filteredInvoices` are rendered (load-more cursor). |
| `searchQuery` | `string` | `""` | Live (unthrottled) value of the search input. |
| `debouncedSearch` | `string` | `""` | Settles `SEARCH_DEBOUNCE_MS` after `searchQuery` stops changing. |
| `filters` | `object` | `DEFAULT_FILTERS` | Structured panel filters (yield, currency, maturity, sort, statuses). |
| `loadError` | `string` | `""` | Error message from a failed `loadInvoices` call. |
| `retryKey` | `number` | `0` | Incremented by `reload()` to re-trigger the load `useEffect`. |

---

## Search behaviour

| Aspect | Detail |
| ------ | ------ |
| Component | `<InvoiceSearch value={searchQuery} onChange={…} />` |
| Match field | `invoice.issuer` |
| Match strategy | Case-insensitive substring (`String#includes`) |
| Debounce | `SEARCH_DEBOUNCE_MS` (300 ms) — filtering waits for settled input |
| Shortcut | Pressing `/` anywhere on the page (outside an input) focuses the search field |
| Clear | Emptying the field restores the full unfiltered list and re-announces the total count |

---

## Filter panel

`<InvoiceFilters>` is rendered inside a `<fieldset aria-disabled="true">` to
signal that the panel is a preview / coming-soon feature. All controls remain
focusable (unlike native `disabled`) so screen readers can discover them.

| Filter | Field | Match rule |
| ------ | ----- | ---------- |
| Yield minimum | `filters.yieldMin` | `parseYield(inv.yield) >= yieldMin` |
| Yield maximum | `filters.yieldMax` | `parseYield(inv.yield) <= yieldMax` |
| Currency | `filters.currency` | Exact match (`inv.currency === currency`) |
| Maturity from | `filters.maturityFrom` | `inv.dueDate >= maturityFrom` (ISO string compare) |
| Maturity to | `filters.maturityTo` | `inv.dueDate <= maturityTo` (ISO string compare) |
| Status chips | `filters.statuses[]` | `filters.statuses.includes(inv.status)` (OR union across selected statuses) |
| Sort column / dir | `filters.sort`, `filters.sortDir` | Applied via `applySortToList` after all predicates |

`DEFAULT_FILTERS` (exported from `components/InvoiceFilters.jsx`) is the reset
target for "Clear Filters":

```js
{
  yieldMin: "",
  yieldMax: "",
  currency: "",
  maturityFrom: "",
  maturityTo: "",
  sort: "",
  sortDir: "desc",
  statuses: [],
}
```

---

## Pagination (load-more)

| Behaviour | Detail |
| --------- | ------ |
| Initial page | First `PAGE_SIZE` (10) items are rendered; the rest are hidden. |
| Load more | Clicking "Load more" appends the next `PAGE_SIZE` batch via `setVisibleCount`. |
| Button visibility | Button disappears once `visibleCount >= filteredInvoices.length`. |
| Reset on new data | `visibleCount` resets to `PAGE_SIZE` when a new invoice set arrives (mount, retry). |
| Reset on filter/search | `visibleCount` resets to `PAGE_SIZE` when `filters` or `debouncedSearch` change, so the user always starts at the top of a freshly filtered list. |
| Focus management | After each "Load more" click, `setTimeout(0)` returns focus to the button via a forwarded ref so keyboard users do not lose their place. |

---

## Error recovery

1. `loadInvoices` rejects → `loadError` is set, `invoices` remains `null`.
2. `<ErrorBanner>` renders with a "Try again" (`copy.invest.retryAction`) action.
3. Clicking "Try again" calls `reload()`:
   - Sets `invoices` back to `null` (renders the loading skeleton immediately).
   - Clears `loadError` (hides the error banner immediately).
   - Increments `retryKey`, which re-runs the load `useEffect`.
   - The previous in-flight request (if any) is aborted via `AbortController`.
4. The polite `aria-live` status region is cleared on retry and re-announces once
   the new load settles.

---

## Accessibility

### Screen-reader announcements

A `<div role="status" aria-live="polite" aria-atomic="true" className="sr-only">`
is always present in the DOM. Its text content (`statusMessage`) changes on every
meaningful state transition:

| Transition | Announcement |
| ---------- | ------------ |
| Invoices loaded (no filter) | `"N investable invoices loaded"` |
| Filter active, matches found | `"N of M invoices match"` |
| Filter active, no matches | `"No invoices match"` |
| Paging active (shown < total) | `"Showing N of M investable invoices"` |
| All items shown after Load more | `"Showing M of M investable invoices"` |
| Error state | `""` (cleared; `ErrorBanner` carries `role="alert"` for assertive announcement) |
| Loading | `""` (silent; skeleton is visually apparent) |

### Focus ring

All interactive elements (invoice links, "Load more" button, filter chips) use
the `.focus-ring` / `focus-visible:outline` utility classes defined in
`app/globals.css` for a consistent, theme-aware cyan outline.

### Coming-soon filter fieldset

```html
<fieldset aria-disabled="true" aria-describedby="filters-coming-soon">
  <div id="filters-coming-soon">Soon: These filter controls are currently unavailable.</div>
  <div class="opacity-60 pointer-events-none">
    <!-- InvoiceFilters -->
  </div>
</fieldset>
```

- `aria-disabled="true"` announces the preview state without removing controls
  from the tab order (unlike native `disabled`).
- `aria-describedby` links the fieldset to the visible "Soon" label so assistive
  technologies announce the status when users navigate into the group.
- `pointer-events-none` + `opacity-60` provide the visual disabled treatment
  while keeping controls keyboard-discoverable.

### Status chip row (`StatusLegendFilter`)

Each chip is a `<button aria-pressed="true|false">`. Multiple chips form a
`role="group" aria-label="Filter by status"` toolbar. The union (OR) semantics
mean selecting multiple statuses shows invoices matching any of the selected
values.

---

## Usage example

The default page entry point uses `InvestMarketplace` with no props:

```jsx
// app/invest/page.js (default export — do not copy, already exists)
export default function InvestPage() {
  return <InvestMarketplace />;
}
```

**Injecting a custom data loader (tests and Storybook):**

```jsx
import { InvestMarketplace } from "@/app/invest/page";

// Supply a fixed dataset — no network, no delay
const STUB_INVOICES = [
  {
    id: "inv-stub-1",
    issuer: "Demo Corp",
    amount: "5,000",
    currency: "USD",
    dueDate: "2027-01-01",
    yield: "6.0%",
    status: "Open",
  },
];

function loadStubInvoices() {
  return Promise.resolve(STUB_INVOICES);
}

export function MarketplacePreview() {
  return <InvestMarketplace loadInvoices={loadStubInvoices} />;
}
```

**Simulating the loading state:**

```jsx
function loadNever() {
  return new Promise(() => {}); // never resolves → component stays in loading state
}

<InvestMarketplace loadInvoices={loadNever} />;
```

**Simulating an error:**

```jsx
function loadFails() {
  return Promise.reject(new Error("Network error"));
}

<InvestMarketplace loadInvoices={loadFails} />;
```

---

## `app/invest/lib.js` exports

Supporting helpers for the marketplace and the detail route:

| Export | Signature | Description |
| ------ | --------- | ----------- |
| `MOCK_INVOICES` | `Invoice[]` | Static fixture array of 3 invoices (USD and EUR). Single source of truth for mock data. |
| `loadMockInvoices` | `() => Promise<Invoice[]>` | Returns `MOCK_INVOICES` after a 1500 ms dev-only delay. In tests, returns `window.__TEST_MOCK_INVOICES__` if set. |
| `daysUntilMaturity` | `(dateStr: string, now?: Date) => number` | Days between `now` and `dateStr`. Positive = future, negative = overdue, 0 = today. Compares at midnight UTC. |
| `getInvoiceById` | `(id: string) => Invoice \| undefined` | Looks up an invoice from `MOCK_INVOICES` by `id`. Used by the detail route `/invest/[id]`. |

### Test hook

Tests (Jest and Playwright) can override the fixture by assigning to
`window.__TEST_MOCK_INVOICES__` before the component mounts:

```js
// jest setup or playwright beforeEach
window.__TEST_MOCK_INVOICES__ = [{ id: "test-1", issuer: "Test Co", ... }];
```

This override is ignored in SSR environments and production builds.

---

## Current limitations

- **Filter panel is preview only.** The `<InvoiceFilters>` fieldset is wrapped
  in `aria-disabled="true"` and `pointer-events-none`. The yield, currency,
  maturity, and sort controls are not fully wired for live use (per
  `copy.invest.filterSoonLabel`). The search field and status chips are fully
  functional.
- **Mock data only for the detail route.** `/invest/[id]` reads from
  `getInvoiceById` (mock layer). The migration to a live single-invoice endpoint
  is tracked separately (see `docs/architecture.md` — Data layer section).
- **No page-based URL routing.** Pagination is load-more only; there is no
  `/invest?page=2` deep-link support. URL-serialised filter state is managed by
  `lib/hooks/useInvoiceFilters.js` but is not yet wired to `InvestMarketplace`.
- **Wallet gating not implemented.** The empty-state copy (`copy.invest.emptyState`)
  mentions connecting a wallet, but `InvestMarketplace` does not currently gate
  or react to wallet connection state. This is planned as part of the Stellar /
  Freighter integration.

---

## Cross-references

- [`docs/architecture.md`](architecture.md) — Route map and data layer overview
- [`docs/invoice-data.md`](invoice-data.md) — Invoice object shape and field contracts
- [`docs/api-integration.md`](api-integration.md) — Live API endpoint contract (`GET /invoices`)
- [`docs/accessibility.md`](accessibility.md) — WCAG notes and accessibility statement
- [`FILTER_CONTRACTS.md`](../FILTER_CONTRACTS.md) — Filter predicate function contracts
- [`WALLET_INTEGRATION_CONTRACT.md`](../WALLET_INTEGRATION_CONTRACT.md) — Wallet state machine
- [`COMPONENTS.md`](../COMPONENTS.md) — Shared component reference (`InvoiceSearch`, `InvoiceFilters`, `Pagination`, `ErrorBanner`, etc.)
- [`app/invest/page.test.jsx`](../app/invest/page.test.jsx) — Unit and pagination tests
- [`app/invest/filters.a11y.test.tsx`](../app/invest/filters.a11y.test.tsx) — Accessibility tests for the coming-soon filter panel
