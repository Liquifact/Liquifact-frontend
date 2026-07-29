# Marketplace API reference

This page summarizes the current Invest marketplace UI components and the props they expose. The reference is based on the implementation in [app/invest/page.js](../app/invest/page.js) and the shared components in [components/](../components/).

## Components at a glance

| Component | Purpose | Main props |
| --- | --- | --- |
| `InvestMarketplace` | Page-level marketplace list with loading, retry, search, and load-more behavior. | `loadInvoices` |
| `InvoiceSearch` | Issuer search input for the marketplace header. | `value`/`onChange` or `searchTerm`/`onSearchChange`, `aria-label` |
| `InvoiceFilters` | Structured filters for yield, currency, maturity, and sort. | `filters`, `onFilterChange`, `onClearFilters` |
| `StatusLegendFilter` | Status pill row used above the filters. | `selectedStatuses`, `onStatusToggle`, `onClearStatuses` |
| `Pagination` | Shared list pagination control with a load-more button. | `shown`, `total`, `onLoadMore`, `page`, `totalPages`, `pageSize` |

## `InvestMarketplace`

Use this for the main marketplace view.

### Props

- `loadInvoices` (`Function`, optional): async loader used to fetch invoices. The current implementation passes `{ signal }` to the function so stale requests can be aborted on retry or unmount. It should resolve to an array of invoice objects, or an empty array when there are no results.

### Notes

- The component handles loading, error, empty, and filtered states internally.
- It paginates results in groups of 10 by default.

## `InvoiceSearch`

Use this for the search box above the marketplace list.

### Props

- `value` / `onChange` (`string` / `Function`): controlled input pattern.
- `searchTerm` / `onSearchChange` (`string` / `Function`): alternate controlled pattern supported by the component.
- `aria-label` (`string`, optional): accessible label for the input.
- `sortOption`, `onSortChange`, `filters`, `onFiltersChange` (`any`, optional): legacy props accepted by the component but not used by the current invest page.

## `InvoiceFilters`

Use this for the structured marketplace filters.

### Props

- `filters` (`object`): a filter state object with these keys:
  - `yieldMin` (`string`)
  - `yieldMax` (`string`)
  - `currency` (`string`)
  - `maturityFrom` (`string`)
  - `maturityTo` (`string`)
  - `sort` (`string`)
  - `sortDir` (`"asc" | "desc"`)
  - `statuses` (`string[]`)
- `onFilterChange` (`Function`): receives the updated filters object.
- `onClearFilters` (`Function`): clears all active filters.

## `StatusLegendFilter`

Use this when you want a compact status-chip row above the list.

### Props

- `selectedStatuses` (`string[]`): currently selected status values.
- `onStatusToggle` (`Function`): called with the toggled status string.
- `onClearStatuses` (`Function`, optional): clears the selected status chips.

## `Pagination`

Use this for list pagination in cases where the page wants explicit page-based navigation.

### Props

- `shown` (`number`): how many items are currently visible.
- `total` (`number`): total number of matching items.
- `onLoadMore` (`Function`): invoked when the user clicks the load-more button.
- `page`, `totalPages`, `pageSize` (`number`, optional): optional page-based mode used to announce page changes.

## Minimal usage example

```jsx
import { InvestMarketplace } from "@/app/invest/page";

async function loadInvoices({ signal }) {
  const response = await fetch("/api/invoices", { signal });
  if (!response.ok) throw new Error("Unable to load invoices");
  return response.json();
}

export default function MarketplacePage() {
  return <InvestMarketplace loadInvoices={loadInvoices} />;
}
```

## Current marketplace behavior

The current Invest page uses `InvoiceSearch` for issuer text search, `StatusLegendFilter` for status chips, and the disabled preview filter fieldset for the structured controls. The search input is debounced, and retries cancel stale loads with `AbortController`.
