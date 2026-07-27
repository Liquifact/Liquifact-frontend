# Marketplace Usage Guide

This guide covers the marketplace components used on the Invest page (`/invest`). The marketplace allows investors to browse, filter, and fund tokenized invoices.

---

## Table of Contents

- [Overview](#overview)
- [Core Components](#core-components)
- [Data Contracts](#data-contracts)
- [Common Patterns](#common-patterns)
- [Accessibility](#accessibility)
- [Examples](#examples)

---

## Overview

The marketplace is built around the `InvestMarketplace` component (`app/invest/page.js`) which orchestrates:

- **Invoice loading** with error handling and retry
- **Search** by issuer name with keyboard shortcut (`/`)
- **Filtering** by status, currency, yield range, and maturity date
- **Sorting** by amount, yield, or maturity
- **Pagination** with "Load more" functionality
- **Screen reader announcements** for state changes

The marketplace uses a client-side filtering approach: all invoices are fetched once, then filtered/sorted in the browser. This provides instant feedback as users adjust filters.

---

## Core Components

### InvestMarketplace

Main marketplace container that fetches invoices and manages filtering/sorting state.

**File:** `app/invest/page.js`

#### Props

| Prop            | Type       | Default           | Description                                                                 |
| --------------- | ---------- | ----------------- | --------------------------------------------------------------------------- |
| `loadInvoices`  | `function` | `loadMockInvoices` | Async function that resolves to an invoice array. Injectable for testing. |

#### Behaviour

- Fetches invoices on mount using `loadInvoices({ signal })`
- Supports retry via ErrorBanner action button
- Resets pagination when filters change
- Debounces search input (300ms)
- Announces state changes to screen readers via `aria-live="polite"`

#### Example

```jsx
import { InvestMarketplace } from "@/app/invest/page";

// With custom loader
<InvestMarketplace loadInvoices={fetchInvoicesFromApi} />
```

---

### InvoiceCard

Individual invoice card rendered in the marketplace list. Links to the invoice detail page.

**File:** `components/InvoiceCard.jsx`

#### Props

| Prop      | Type      | Required | Description          |
| --------- | --------- | -------- | -------------------- |
| `invoice` | `Invoice` | Yes      | Invoice data object  |

#### Invoice Shape

| Field      | Type            | Required | Description                              |
| ---------- | --------------- | -------- | ---------------------------------------- |
| `id`       | `string`        | Yes      | Unique identifier                        |
| `issuer`   | `string`        | Yes      | Company name                             |
| `amount`   | `number|string` | Yes      | Invoice face value                       |
| `currency` | `string`        | Yes      | ISO currency code (e.g., "USD", "EUR")   |
| `dueDate`  | `string`        | Yes      | ISO 8601 date (e.g., "2025-09-30")       |
| `yield`    | `number|string` | Yes      | Expected annual yield percentage         |
| `status`   | `InvoiceStatus` | Yes      | One of: "Open", "Funded", "Settled", "Overdue" |

#### Behaviour

- Formats amounts using `formatCurrency` from `lib/format/currency.js`
- Formats dates using `toLocaleDateString`
- Renders status via `StatusPill` component
- Includes accessible link with dynamic `aria-label`

#### Example

```jsx
import InvoiceCard from "@/components/InvoiceCard";

<InvoiceCard
  invoice={{
    id: "INV-001",
    issuer: "Acme Corp",
    amount: 12500,
    currency: "USD",
    dueDate: "2025-09-30",
    yield: 8.5,
    status: "Open",
  }}
/>
```

---

### InvoiceSearch

Controlled search input for filtering invoices by issuer name. Includes a global keyboard shortcut (`/`) to focus the input.

**File:** `components/InvoiceSearch.jsx`

#### Props

| Prop         | Type       | Default                        | Description                                      |
| ------------ | ---------- | ------------------------------ | ------------------------------------------------ |
| `value`      | `string`   | —                              | Current search query (controlled)                |
| `onChange`   | `function` | —                              | Called with new value on keystroke               |
| `placeholder` | `string`   | `"Search invoices..."`         | Placeholder text                                |
| `aria-label` | `string`   | —                              | Accessible label for the input                   |

#### Behaviour

- Supports both `{value, onChange}` and `{searchTerm, onSearchChange}` prop patterns
- Global `/` shortcut focuses input (ignored when already in an editable field)
- Shortcut registered via `lib/shortcuts.js` for consistency with help dialog

#### Example

```jsx
import InvoiceSearch from "@/components/InvoiceSearch";

function MarketplaceFilters() {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <InvoiceSearch
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      aria-label="Search invoices by issuer name"
    />
  );
}
```

---

### InvoiceFilters

Structured filter controls for yield range, currency, maturity date, and sorting.

**File:** `components/InvoiceFilters.jsx`

#### Named Exports

| Export                | Description                                           |
| --------------------- | ----------------------------------------------------- |
| `default`             | Main filter component with all controls               |
| `StatusLegendFilter`  | Toggleable status chip row (see below)               |
| `DEFAULT_FILTERS`     | Default filter state object                           |
| `SORT_OPTIONS`        | Available sort column options                         |
| `parseSortState`      | Parses sort column and direction from filters         |
| `matchesFilters`      | Predicate: checks if invoice matches filters          |
| `hasActiveFilters`    | Returns true if any filter is active                  |
| `hasAnyActiveFilters`  | Returns true if search or filters are active          |
| `getActiveFilterChips` | Returns removable chip objects for active filters    |
| `clearFilterByKey`    | Returns filters with a single field cleared           |

#### Props (InvoiceFilters)

| Prop            | Type       | Required | Description                              |
| --------------- | ---------- | -------- | ---------------------------------------- |
| `filters`       | `object`   | Yes      | Current filter state                     |
| `onFilterChange`| `function` | Yes      | Called with updated filters object       |
| `onClearFilters`| `function` | Yes      | Called to reset all filters to defaults  |

#### Filter State Shape

```javascript
{
  yieldMin: "",        // Minimum yield percentage (string)
  yieldMax: "",        // Maximum yield percentage (string)
  currency: "",        // Selected currency code (string)
  maturityFrom: "",    // ISO date string (YYYY-MM-DD)
  maturityTo: "",      // ISO date string (YYYY-MM-DD)
  sort: "",            // Sort column: "", "amount", "yield", "maturity"
  sortDir: "desc",     // Sort direction: "asc" or "desc"
  statuses: [],        // Array of active status filters
}
```

#### Behaviour

- Currency filter uses roving tabindex for keyboard navigation
- Sort direction toggle (↑↓) only active for sortable columns (amount, yield)
- All inputs are controlled components
- Clear button disabled when no filters are active

#### Example

```jsx
import InvoiceFilters, { DEFAULT_FILTERS } from "@/components/InvoiceFilters";

function Marketplace() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  return (
    <InvoiceFilters
      filters={filters}
      onFilterChange={setFilters}
      onClearFilters={() => setFilters(DEFAULT_FILTERS)}
    />
  );
}
```

---

### StatusLegendFilter

Toggleable chip row for filtering by invoice status. Derived from `INVOICE_STATUSES` to stay in sync with the canonical status vocabulary.

**File:** `components/InvoiceFilters.jsx` (named export)

#### Props

| Prop               | Type       | Required | Description                                  |
| ------------------ | ---------- | -------- | -------------------------------------------- |
| `selectedStatuses` | `string[]` | Yes      | Currently active status values              |
| `onStatusToggle`   | `function` | Yes      | Called with toggled status string            |
| `onClearStatuses`  | `function` | No       | Called when "Clear" button is clicked        |

#### Behaviour

- Each chip is a `<button>` with `aria-pressed`
- Multiple selections use union (OR) logic
- When empty, all invoices are shown
- Chip tone matches `STATUS_PILL_MAP` from `lib/types/invoice.js`

#### Example

```jsx
import { StatusLegendFilter } from "@/components/InvoiceFilters";

function Marketplace() {
  const [selectedStatuses, setSelectedStatuses] = useState([]);

  const handleToggle = (status) => {
    setSelectedStatuses((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status]
    );
  };

  return (
    <StatusLegendFilter
      selectedStatuses={selectedStatuses}
      onStatusToggle={handleToggle}
      onClearStatuses={() => setSelectedStatuses([])}
    />
  );
}
```

---

### StatusPill

Single source of truth for rendering invoice status badges. Used on cards and detail pages.

**File:** `components/StatusPill.jsx`

#### Props

| Prop        | Type      | Default | Description                                    |
| ----------- | --------- | ------- | ---------------------------------------------- |
| `status`    | `unknown` | —       | Any invoice status value                       |
| `className` | `string`  | `""`    | Optional Tailwind classes (layout only)        |

#### Behaviour

- Reads from `INVOICE_STATUSES` and `STATUS_PILL_MAP` in `lib/types/invoice.js`
- Unknown/nullish/empty input → neutral "Unknown" pill
- Never throws, never renders raw input
- Renders `data-status` attribute for testing
- Status conveyed by text, not colour alone (WCAG compliant)

#### Example

```jsx
import StatusPill from "@/components/StatusPill";

<StatusPill status="Open" />      // Cyan pill
<StatusPill status="Funded" />    // Slate pill
<StatusPill status="Settled" />   // Emerald pill
<StatusPill status="Overdue" />   // Amber pill
<StatusPill status={null} />      // Neutral "Unknown" pill
```

---

## Data Contracts

### Invoice Type

The canonical invoice shape is defined in `lib/types/invoice.js`:

```javascript
/**
 * @typedef {Object} Invoice
 * @property {string}        id

 - Unique invoice identifier
 * @property {string}        issuer    - Company name
 * @property {number|string} amount    - Invoice face value
 * @property {string}        currency  - ISO currency code
 * @property {string}        dueDate   - ISO 8601 date string
 * @property {number|string} yield     - Expected yield percentage
 * @property {InvoiceStatus} status    - Status value
 */
```

### InvoiceStatus Union

The exhaustive set of status values:

```javascript
/**
 * @typedef {"Open" | "Funded" | "Settled" | "Overdue"} InvoiceStatus
 */
```

### Constants

```javascript
import { INVOICE_STATUSES, STATUS_PILL_MAP } from "@/lib/types/invoice";

// INVOICE_STATUSES = { OPEN: "Open", FUNDED: "Funded", SETTLED: "Settled", OVERDUE: "Overdue" }
// STATUS_PILL_MAP maps each status to label and Tailwind tone classes
```

---

## Common Patterns

### Filtering and Sorting Together

The marketplace combines search, status filters, and structured filters:

```jsx
import { useState, useMemo } from "react";
import { matchesFilters, applySortToList } from "@/components/InvoiceFilters";

function Marketplace() {
  const [invoices, setInvoices] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  const filteredInvoices = useMemo(() => {
    let list = invoices;

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((inv) => inv.issuer?.toLowerCase().includes(q));
    }

    // Structured filters
    list = list.filter((inv) => matchesFilters(inv, filters));

    // Status filters
    if (filters.statuses.length > 0) {
      list = list.filter((inv) => filters.statuses.includes(inv.status));
    }

    // Sort
    return applySortToList(list, filters);
  }, [invoices, searchQuery, filters]);

  return <InvoiceList invoices={filteredInvoices} />;
}
```

### Resetting Pagination on Filter Change

When filters change, reset pagination to show results from the top:

```jsx
const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
const filterSignature = JSON.stringify([searchQuery, filters]);
const [prevFilterSignature, setPrevFilterSignature] = useState(filterSignature);

if (filterSignature !== prevFilterSignature) {
  setPrevFilterSignature(filterSignature);
  setVisibleCount(PAGE_SIZE);
}
```

### Accessible Filter Chips

Use `aria-pressed` for toggleable filter chips:

```jsx
<button
  type="button"
  aria-pressed={isSelected}
  onClick={() => onToggle(value)}
  className={isSelected ? "active-styles" : "inactive-styles"}
>
  {label}
</button>
```

### Loading with Error Handling

Use `AbortController` for cancellable requests:

```jsx
useEffect(() => {
  let isActive = true;
  const controller = new AbortController();

  const load = async () => {
    try {
      const data = await loadInvoices({ signal: controller.signal });
      if (isActive) setInvoices(data);
    } catch (err) {
      if (isActive) setError(err.message);
    }
  };

  load();

  return () => {
    isActive = false;
    controller.abort();
  };
}, [loadInvoices, retryKey]);
```

---

## Accessibility

### Screen Reader Announcements

The marketplace uses `aria-live="polite"` regions to announce state changes:

```jsx
<div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
  {statusMessage}
</div>
```

Announce:
- Initial load count
- Filtered result count
- Pagination changes
- Empty states

### Keyboard Navigation

- **Search shortcut**: Press `/` to focus search (ignored when in editable fields)
- **Currency filter**: Roving tabindex with Arrow keys, Home, End
- **Status chips**: Standard tab order with `aria-pressed`
- **Sort toggle**: Only active for sortable columns

### Focus Management

After "Load more" is clicked, focus returns to the button:

```jsx
const handleLoadMore = () => {
  setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, total));
  setTimeout(() => loadMoreRef.current?.focus(), 0);
};
```

### Colour Independence

Status is conveyed by text, not colour alone:
- `StatusPill` includes `aria-label="Status: {label}"`
- Invoice card links include status in `aria-label`
- All status tones have distinct labels

---

## Examples

### Complete Marketplace Implementation

```jsx
"use client";

import { useState, useMemo, useCallback } from "react";
import InvoiceSearch from "@/components/InvoiceSearch";
import InvoiceFilters, { DEFAULT_FILTERS, StatusLegendFilter } from "@/components/InvoiceFilters";
import InvoiceCard from "@/components/InvoiceCard";
import { loadMockInvoices } from "@/app/invest/lib";

export function Marketplace() {
  const [invoices, setInvoices] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [visibleCount, setVisibleCount] = useState(10);

  // Fetch invoices
  useState(() => {
    loadMockInvoices().then(setInvoices);
  });

  // Filter and sort
  const filteredInvoices = useMemo(() => {
    if (!invoices) return [];
    let list = invoices;

    if (searchQuery.trim()) {
      list = list.filter((inv) => inv.issuer?.toLowerCase().includes(searchQuery.toLowerCase()));
    }

    if (selectedStatuses.length > 0) {
      list = list.filter((inv) => selectedStatuses.includes(inv.status));
    }

    return list.slice(0, visibleCount);
  }, [invoices, searchQuery, selectedStatuses, visibleCount]);

  const handleStatusToggle = useCallback((status) => {
    setSelectedStatuses((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    );
  }, []);

  return (
    <div>
      <InvoiceSearch value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
      
      <StatusLegendFilter
        selectedStatuses={selectedStatuses}
        onStatusToggle={handleStatusToggle}
        onClearStatuses={() => setSelectedStatuses([])}
      />

      <InvoiceFilters
        filters={filters}
        onFilterChange={setFilters}
        onClearFilters={() => setFilters(DEFAULT_FILTERS)}
      />

      <ul>
        {filteredInvoices.map((invoice) => (
          <li key={invoice.id}>
            <InvoiceCard invoice={invoice} />
          </li>
        ))}
      </ul>

      {filteredInvoices.length > visibleCount && (
        <button onClick={() => setVisibleCount((c) => c + 10)}>
          Load more
        </button>
      )}
    </div>
  );
}
```

### Custom Invoice Loader

```jsx
async function fetchInvoicesFromApi({ signal }) {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/invoices`, {
    signal,
  });
  if (!response.ok) throw new Error("Failed to fetch invoices");
  return response.json();
}

<InvestMarketplace loadInvoices={fetchInvoicesFromApi} />
```

### Using Filter Predicates Directly

```jsx
import { matchesFilters, matchesYieldRange, matchesCurrency } from "@/components/InvoiceFilters";

// Check if a single invoice matches filters
const isMatch = matchesFilters(invoice, filters);

// Check specific dimensions
const hasValidYield = matchesYieldRange(invoice.yield, "5", "10");
const isUSD = matchesCurrency(invoice.currency, "USD");
```

---

## Related Documentation

- [Invoice data contract](invoice-data.md) - Data shape and API migration
- [Component Library Reference](../COMPONENTS.md) - Full component API
- [Accessibility guide](accessibility.md) - A11y patterns and testing
- [API integration](api-integration.md) - Backend contract details
