# Filter Controls — Implementation Contract

## Overview

## Current State

Filter controls are fully interactive. Sort order for the **Amount** and **Yield** columns supports an ascending/descending direction toggle.

## 1. Invoice Object Schema

The marketplace currently maps to the following object structure. The hook expects this exact shape when performing derived state calculations.

The marketplace maps to the following object structure. The `filterInvoices()` function and `useInvoiceFilters` hook expect this exact shape when performing derived state calculations.

## Filter Controls

### 1. Issuer Search

- **Purpose:** Filter invoices by issuer name (case-insensitive substring match).
- **UI:** `InvoiceSearch` component with debounced input (`SEARCH_DEBOUNCE_MS = 200`).
- **Active chip:** `Search: {query}` — removing clears the search field.

### 2. Yield Range Filter

- **Purpose:** Filter invoices by yield percentage range.
- **Future API Contract:** `GET /api/invoices?yield_min=5&yield_max=10`
- **Active chips:** `Min yield: {n}%`, `Max yield: {n}%`

### 4. Sort Options (with direction toggle)

- **Purpose**: Sort invoices by column with ascending/descending toggle for Amount and Yield
- **Sort state shape**:
  ```ts
  {
    sort: "" | "amount" | "yield" | "maturity"; // active sort column
    sortDir: "asc" | "desc"; // direction, default 'desc'
  }
```
- **Future API Contract:** `GET /api/invoices?sort=amount&sort_dir=asc`
- **Active chip:** `Sort: {label}` (e.g. `Sort: Best Yield`)

#### Direction toggle behaviour

| State                          | UI element             | aria-sort value |
| ------------------------------ | ---------------------- | --------------- |
| Column is active, dir = `desc` | ↓ button, enabled      | `descending`    |
| Column is active, dir = `asc`  | ↑ button, enabled      | `ascending`     |
| Column is **not** active       | ↓ button, **disabled** | `none`          |

| State                          | UI element             | aria-sort value |
| ------------------------------ | ---------------------- | --------------- |
| Column is active, dir = `desc` | ↓ button, enabled      | `descending`    |
| Column is active, dir = `asc`  | ↑ button, enabled      | `ascending`     |
| Column is **not** active       | ↓ button, **disabled** | `none`          |

| State | UI element | `aria-sort` value |
|---|---|---|
| Column active, dir = `desc` | ↓ button, enabled | `descending` |
| Column active, dir = `asc` | ↑ button, enabled | `ascending` |
| Column **not** active | ↓ button, disabled | `none` |

Only `amount` and `yield` columns have direction toggles. Maturity is sorted via the main select only.

#### `parseSortState(filters)` helper

Returns `{ column: string, dir: 'asc'|'desc' }`.  
Supports both new plain-column sort values (`'amount'`, `'yield'`) and legacy compound values (`'amount_desc'`, `'yield_asc'`).

#### `applySortToList(list, filters)` helper (page.js)

Pure function that returns a sorted copy of invoice list. Does **not** mutate the original array.

### 5. Clear Filters

- **Purpose**: Reset all applied filters, including `sortDir` back to `'desc'`
- **Future API Contract**: Reset to base `GET /api/invoices`
- **UI State**: Active (disabled when no filters are active)

### 6. Marketplace Pagination Query Params
- **Purpose**: Sanitize `page` and `pageSize` values supplied through the marketplace URL so pagination stays within safe bounds.
- **Query params**: `page`, `pageSize`
- **Validation rules**:
  - Coerce both params to integers.
  - Clamp `page` to the range `[1, totalPages]`.
  - Clamp `pageSize` to the range `[1, totalItems]`.
  - Fall back to defaults when values are missing or malformed.
- **UI behavior**: The marketplace uses the sanitized values to cap the number of visible invoices and never renders more items than the filtered dataset contains.

## Accessibility Features

- **Coming Soon Semantics**: Filter controls are wrapped in a `fieldset` with `aria-disabled="true"` and `aria-describedby` indicating the "Soon" status, making the unavailable state perceivable by screen readers while keeping controls discoverable.
- Direction toggle buttons carry `aria-sort` (`ascending` | `descending` | `none`)
- Inactive toggles are `disabled` and carry `aria-sort="none"`
- All controls have `aria-label` attributes
- Keyboard navigation preserved throughout
- High contrast design follows existing slate/cyan theme

## Responsive Design

- Filter controls and chip row wrap on smaller screens using `flex-wrap`.
- Direction toggles sit inline next to the sort select.
- Maintains spacing and layout across breakpoints.

## Implementation Notes

- `DEFAULT_FILTERS.sortDir` defaults to `'desc'`
- `SORTABLE_COLUMNS` constant exported from `InvoiceFilters.jsx` lists columns with direction support: `['amount', 'yield']`
- Uses Tailwind CSS classes consistent with existing design system
- Follows slate-950/cyan-400 color scheme

## Backend Integration Requirements

When implementing the backend:

1. Accept `sort` (column name) and `sort_dir` (`asc`|`desc`) query parameters
2. Create API endpoints that support the filter query parameters above
3. Implement filtering logic on the invoice data
4. Add pagination support for large datasets
5. Consider caching for frequently accessed filter combinations
6. Validate filter parameters and return appropriate error responses

## Testing Checklist

- [x] `DEFAULT_FILTERS` includes `sortDir: 'desc'`
- [x] `parseSortState` correctly extracts column and direction (including legacy compound values)
- [x] `applySortToList` sorts amount and yield in both directions
- [x] `applySortToList` does not mutate the source array
- [x] Direction toggle button is **enabled** only for the active sort column
- [x] `aria-sort` reflects current direction on the active column toggle
- [x] Inactive column toggle has `aria-sort="none"`
- [x] Clicking the active toggle flips direction (`desc → asc`, `asc → desc`)
- [x] Clicking a disabled (inactive) toggle does not call `onFilterChange`
- [x] Changing the sort column preserves existing `sortDir`
- [x] Clearing filters resets `sortDir` to `'desc'`
- [x] Filter controls are visually consistent on mobile
- [x] Accessibility labels are present on all controls
- [x] Color contrast meets WCAG standards
- [x] No console errors on page load
- [x] `matchesYieldRange` is INCLUSIVE at both ends (yield Min and Max boundary samples)
- [x] `matchesCurrency` is strict-equality, case-sensitive, with empty-filter passthrough
- [x] `matchesMaturityRange` is INCLUSIVE at both ends using ISO lexicographic comparison
- [x] `matchesFilters(DEFAULT_FILTERS)` passes every parseable invoice (empty-filter intersection)
- [x] Combined filters intersect with logical AND across all three predicates
- [x] Predicates return `false` for unparseable invoice values (strict NaN-defence contract)

## Future Work

1. Refactor `lib/hooks/useInvoiceFilters.js` (and the inline filter block in
   `app/invest/page.js`) to consume the exported `matchesYieldRange`,
   `matchesCurrency`, `matchesMaturityRange`, and `matchesFilters` so that
   the strict NaN-defence contract becomes the production contract. Until
   that refactor lands, the predicates are the forward-looking golden copy
   while the hook/page pipeline carries the documented divergence (see
   § 2.5).
2. Consider extracting `parseYieldValue` into a shared helper (e.g.
   `lib/format/invoice.js`) so the predicate, the hook, and the page no
   longer carry duplicate parsers.
