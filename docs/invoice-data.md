# Invoice data contract

This guide documents the invoice objects that currently power the investment
marketplace and invoice detail page. It describes the mock contract as it exists
in `app/invest/lib.js`, including the difference between display-ready strings
and numeric values used for calculations.

## Source of truth

`app/invest/lib.js` is the source of mock invoice fixtures for the `/invest`
marketplace and detail routes. It exports:

- `MOCK_INVOICES`, the canonical fixture array;
- `loadMockInvoices()`, the asynchronous list loader used by default on
  `/invest`; and
- `getInvoiceById(id)`, the synchronous lookup used by `/invest/[id]`.

New code for those routes should import these exports rather than copying the
fixture array into another component or test. That keeps the marketplace and
detail behavior aligned.

In a browser, `loadMockInvoices()` first checks
`window.__TEST_MOCK_INVOICES__`. Jest and Playwright can set that value before
the component mounts to supply a deterministic fixture. Without an override,
the loader resolves `MOCK_INVOICES`; development builds add a 1.5-second delay
so the loading skeleton is visible.

## Object shape

Every object currently in `MOCK_INVOICES` has all nine fields below.

| Field | Current type | Example | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | `"inv-001"` | Stable invoice identifier used by list keys and the `/invest/[id]` route. |
| `issuer` | `string` | `"Acme Supplies Ltd"` | Issuer's display name. |
| `amount` | `string` | `"12,500"` | Display-ready amount with grouping separators but no currency symbol. |
| `amountValue` | `number` | `12500` | Raw amount used for validation and calculations. |
| `currency` | `string` | `"USD"` | ISO 4217 currency code used when formatting the amount. |
| `dueDate` | `string` | `"2026-06-15"` | Calendar date in `YYYY-MM-DD` form. |
| `yield` | `string` | `"8.2%"` | Display-ready estimated yield, including the percent sign. |
| `yieldValue` | `number` | `8.2` | Yield in percentage points, so `8.2` means 8.2 percent, not `0.082`. |
| `status` | `string` | `"Open"` | Invoice lifecycle status. All current fixtures use `Open`. |

The paired amount and yield fields intentionally serve different consumers:

- renderers can show `amount` and `yield` without reparsing them;
- validation, funding, sorting, and arithmetic should use `amountValue` and
  `yieldValue`; and
- `currency` remains separate so locale-aware formatters can add the correct
  symbol when rendering a raw value.

New fixtures and API normalizers should keep each formatted field consistent
with its raw counterpart. For example, an `amountValue` of `12500` and a
currency of `USD` correspond to the current `amount` value `"12,500"`.

Some consumers also support an optional `issuerAddress` field for a Stellar
public key and copy control. It is part of the broader `InvoiceList` component
contract documented in `COMPONENTS.md`, but it is not present in the current
mock fixtures and therefore is not one of the nine required mock fields.

## Current consumers

| Surface | Consumer | Current data entry point |
| --- | --- | --- |
| Marketplace list | `app/invest/page.js` | `InvestMarketplace({ loadInvoices = loadMockInvoices })` |
| Invoice detail | `app/invest/[id]/page.js` | `getInvoiceById(id)` |
| Legacy reusable invoice list | `components/InvoiceList.jsx` | A separate local fixture and injectable `loadInvoices` prop |
| Tests | Jest and Playwright suites | Direct imports or `window.__TEST_MOCK_INVOICES__` |

Loaders must resolve to an array of invoice objects. The marketplace passes an
`AbortSignal` in an options object, so a live loader should accept and honor
that signal even though the mock loader currently ignores the argument.

`components/InvoiceList.jsx` predates the `/invest` data module and still owns a
different local fixture with a different lifecycle-status contract. It is not a
consumer of `app/invest/lib.js`, and changing the marketplace loader does not
change that component. Treat consolidating or migrating this legacy component
as separate work rather than assuming that the `/invest` API seam covers it.

## Swap the marketplace list to the API

`lib/api/invoices.js` already exports `fetchInvestableInvoices({ signal,
timeoutMs })`. The marketplace's injectable loader is the single list-data seam.
Replace its default import and value:

```diff
- import { loadMockInvoices } from "./lib";
+ import { fetchInvestableInvoices } from "@/lib/api/invoices";

- export function InvestMarketplace({ loadInvoices = loadMockInvoices }) {
+ export function InvestMarketplace({ loadInvoices = fetchInvestableInvoices }) {
```

Tests can continue injecting a loader through the `loadInvoices` prop, so the
page does not need environment-specific fetching branches.

Before making that swap, keep the live normalizer compatible with the consumers.
The current `fetchInvestableInvoices` normalizer returns only `id`, `issuer`,
`amount`, `currency`, `dueDate`, `yield`, and `status`; it does not yet return
`amountValue` or `yieldValue`. Either derive those numeric fields in
`lib/api/invoices.js` or migrate all calculation consumers to a new canonical
raw-value contract in the same change. Do not silently treat formatted strings
as the API's numeric source of truth.

## Migrate the detail route

The list-loader swap does not migrate `/invest/[id]`. That server-rendered route
still calls the synchronous `getInvoiceById(id)` mock lookup. Completing the
mock removal requires a live `fetchInvoiceById(id)` client for the planned
`GET /invoices/:id` endpoint, then awaiting it in
`app/invest/[id]/page.js`. The returned object must follow the same normalized
field contract as the list client so list and detail views cannot disagree.

Once both `/invest` routes use the API and no related tests import the fixtures
directly,
`MOCK_INVOICES`, `loadMockInvoices`, and `getInvoiceById` can be retired
together from `app/invest/lib.js`. The separate fixture in
`components/InvoiceList.jsx` must be migrated or retired independently.

## Verification checklist

When changing the invoice contract or data source:

1. Cross-check all nine mock fields in `app/invest/lib.js`.
2. Confirm formatted and numeric field pairs represent the same values.
3. Verify both `/invest` and `/invest/[id]`, not only the marketplace list.
4. Keep the `loadInvoices` injection point for deterministic component tests.
5. Run `npm run format:check`, `npm run lint`, `npm test`, and `npm run build`.
