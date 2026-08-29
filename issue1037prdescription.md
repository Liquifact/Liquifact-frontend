Closes #1037

## Summary

Add client-side CSV and JSON export for the invoice marketplace view with formula-injection safety. Users can now download the currently-displayed invoices as CSV or JSON with correct escaping for quotes, commas, newlines, and leading formula-triggering characters (`=`, `+`, `-`, `@`).

Closes #1037

## What Changed

- **`app/invest/exportUtils.js`** (new) — Pure utility module with:
  - `escapeCSVField()` — RFC 4180 CSV escaping + formula-injection neutralization (prefix `'`)
  - `generateCSV()` / `generateJSON()` — content generation from invoice arrays
  - `triggerDownload()` — client-side Blob download via temporary anchor element
  - `exportToCSV()` / `exportToJSON()` — orchestrate generation + download

- **`app/invest/page.js`** — Added two accessible export buttons ("Export CSV" / "Export JSON") to the marketplace filter bar, disabled when no data is loaded

- **`app/copy/en.js`** — Added `exportCSVLabel` and `exportJSONLabel` copy strings

- **`app/invest/exportUtils.test.js`** (new) — 21 unit tests covering:
  - CSV field escaping (commas, quotes, newlines, formula prefixes)
  - `generateCSV` with data, empty arrays, explicit columns
  - `generateJSON` round-trip, null/undefined input, special characters
  - `triggerDownload` DOM interaction and cleanup
  - `exportToCSV` / `exportToJSON` end-to-end

- **`app/invest/page.test.jsx`** — Added 6 integration tests:
  - Export buttons render after invoices load
  - Export buttons are disabled during loading and when empty
  - CSV/JSON button clicks call the correct export function with loaded data

## Contributor Checklist

- [x] Tests were added or updated for the changed behavior.
- [x] Impacted code meets the 95% coverage expectation, or the gap is explained.
- [x] Accessibility was verified for UI changes, including keyboard flow, labels, focus states, and contrast.
- [x] Documentation was updated, or no docs change is needed.
- [x] `npm run lint`, `npm test`, and `npm run build` pass locally.

## Validation

- [x] `npm run lint` — passes clean
- [x] `npm test` — 59/59 tests pass (21 new export tests + 6 new integration tests + 32 existing)
- [x] `npm run build` — builds successfully

## Accessibility

- [x] Interactive controls have accessible names (`aria-label` on export buttons)
- [x] Keyboard and focus-visible behavior were preserved (standard `<button>` elements)
- [x] New or changed UI has relevant Jest/RTL coverage

## Review Notes

- Testing guidance: [TESTING.md](../TESTING.md)
- Accessibility guidance: [docs/accessibility.md](../docs/accessibility.md)
- Contributor workflow: [CONTRIBUTING.md](../CONTRIBUTING.md)

## Security

- [x] No secrets, wallet keys, `.env` files, or generated artifacts are included
- [x] API or wallet trust-boundary changes are explained

## Design Decisions

- **Formula neutralization via single-quote prefix**: Follows the Excel/Google Sheets convention of prefixing with `'` to neutralize formula evaluation while keeping the cell readable in a text editor.
- **Co-located utilities**: `exportUtils.js` lives in `app/invest/` since this feature is marketplace-specific and the repo has no `lib/` or `utils/` directory.
- **No new dependencies**: Pure browser APIs (Blob, URL.createObjectURL, anchor click) for download triggering.
- **Filters are disabled placeholders**: "Export what the user sees" currently means all loaded invoices; when filters are enabled in the future, the export buttons already operate on the `invoices` state which will reflect active filtering.
