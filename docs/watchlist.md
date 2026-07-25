# Watchlist

Investors can star invoices they are considering into a persisted watchlist so
they do not have to restart from the full list on every visit.

The feature is implemented across three modules:

| Module | Role |
| --- | --- |
| `lib/hooks/useWatchlist.js` | Core hook — reads/writes a `Set<string>` of invoice IDs via `useLocalStorage` |
| `components/InvoiceCard.jsx` | Star toggle button per card (`aria-pressed`) |
| `components/InvoiceFilters.jsx` | "Watchlist only" filter mode that composes with the existing search and filter predicates |

---

## `useWatchlist` hook

**File:** `lib/hooks/useWatchlist.js`

The hook wraps `useLocalStorage` with the key `"liquifact-watchlist"` and
exposes a stable API for toggling, querying, and clearing the persisted set of
watched invoice IDs.

### Signature

```js
import { useWatchlist } from "@/lib/hooks/useWatchlist";

const { watchedIds, isWatched, toggle, clear, prune } = useWatchlist();
```

### Return value

| Property | Type | Description |
| --- | --- | --- |
| `watchedIds` | `string[]` | Sorted array of every currently-watched invoice ID. Empty array when the watchlist is empty. |
| `isWatched(id)` | `(id: string) => boolean` | Returns `true` if the given invoice ID is in the watchlist. |
| `toggle(id)` | `(id: string) => void` | Adds the ID if it is absent; removes it if it is present. Writes through to `localStorage` immediately. |
| `clear()` | `() => void` | Empties the watchlist and clears the `localStorage` entry. |
| `prune(validIds)` | `(validIds: string[]) => void` | Removes any watched IDs not present in `validIds`. Call on load to evict stale IDs for invoices that have disappeared from the API. |

### Storage contract

| Field | Value |
| --- | --- |
| `localStorage` key | `"liquifact-watchlist"` |
| Stored shape | JSON-serialised `string[]` (array of invoice ID strings) |
| SSR behaviour | Returns an empty array on the first render; rehydrates from storage after mount (matches `useLocalStorage` contract) |
| Parse failures | Silently fall back to an empty array — no exception escapes to a parent error boundary |
| Storage write failures | Swallowed (`QuotaExceededError`, `SecurityError`); React state is still updated so the UI keeps working within the session |

---

## Star toggle in `InvoiceCard`

When the watchlist feature is active, `InvoiceCard` renders a star `<button>`
alongside each invoice row.

### Props added to `InvoiceCard`

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `watched` | `boolean` | `false` | Whether this invoice is currently in the watchlist. Controls the filled/outline star icon and `aria-pressed`. |
| `onToggleWatch` | `(id: string) => void` | `undefined` | Callback fired when the star is clicked. Pass `toggle` from `useWatchlist`. Omit to hide the button entirely. |

### Accessibility

- The toggle is a `<button type="button">` with `aria-pressed={watched}`.
- Its accessible name includes the invoice reference, e.g.
  `"Watch invoice INV-001 from Acme Corp"` / `"Unwatch invoice INV-001 from Acme Corp"`.
- The star SVG is `aria-hidden="true"` — meaning is carried by the button label only.
- The button uses `.focus-ring` so the focus outline is consistent with every
  other interactive element on the page.

---

## Watchlist filter in `InvoiceFilters`

`InvoiceFilters` gains a **"Watchlist"** chip that, when active, restricts the
invoice list to watched IDs only. The chip composes with the existing yield,
currency, maturity, and search predicates — i.e. the watchlist filter is
applied first, and the remaining filters narrow that subset further.

### Props added to `InvoiceFilters`

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `watchedIds` | `string[]` | `[]` | The current `watchedIds` array from `useWatchlist`. Used to filter when `filters.watchlistOnly` is `true`. |

### Filter state extension

The existing `filters` object gains one new key:

| Key | Type | Default | Description |
| --- | --- | --- | --- |
| `watchlistOnly` | `boolean` | `false` | When `true`, only invoices whose `id` appears in `watchedIds` are shown. |

---

## Component states

### Empty watchlist (watchlist filter active)

When a user activates the watchlist filter but has not starred any invoices yet,
the result set is empty and the standard `EmptyState` component is rendered with
the message _"No invoices in your watchlist"_ and a call to action that clears
the filter.

### Stale IDs after API refresh

On each data load the host page calls `prune(freshIds)` so IDs for invoices
that have been removed from the API are evicted from the persisted set
automatically. The watchlist count in the filter chip updates reactively.

---

## Usage example

```jsx
"use client";

import { useWatchlist } from "@/lib/hooks/useWatchlist";
import InvoiceCard from "@/components/InvoiceCard";
import InvoiceFilters from "@/components/InvoiceFilters";
import { useState } from "react";

export default function InvestMarketplace({ invoices }) {
  const { watchedIds, isWatched, toggle, prune } = useWatchlist();

  const [filters, setFilters] = useState({
    currency: "",
    yieldMin: "",
    yieldMax: "",
    maturityFrom: "",
    maturityTo: "",
    sort: "yield-desc",
    watchlistOnly: false,
  });

  // Prune stale watched IDs whenever the invoice list changes.
  const freshIds = invoices.map((inv) => inv.id);
  prune(freshIds);

  // Apply watchlist filter before the remaining predicates.
  const visible = filters.watchlistOnly
    ? invoices.filter((inv) => isWatched(inv.id))
    : invoices;

  return (
    <>
      <InvoiceFilters
        filters={filters}
        onChange={setFilters}
        watchedIds={watchedIds}
      />

      <ul aria-label="Investable invoices">
        {visible.map((invoice) => (
          <li key={invoice.id}>
            <InvoiceCard
              invoice={invoice}
              watched={isWatched(invoice.id)}
              onToggleWatch={toggle}
            />
          </li>
        ))}
      </ul>
    </>
  );
}
```

---

## Related

- [`lib/hooks/useLocalStorage.js`](../lib/hooks/useLocalStorage.js) — the
  underlying SSR-safe storage hook that `useWatchlist` builds on.
- [`components/InvoiceFilters.jsx`](../components/InvoiceFilters.jsx) — the
  filter panel that hosts the watchlist chip.
- [`components/InvoiceCard.jsx`](../components/InvoiceCard.jsx) — the card
  component that renders the star toggle.
- [`COMPONENTS.md`](../COMPONENTS.md) — full component library reference with
  props tables for every shared component.
