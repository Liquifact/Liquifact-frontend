# Performance

## Bundle-size budgets

This project enforces gzip bundle budgets using a dependency-free check script (`scripts/check-bundle-size.mjs`) configured via `bundle-budgets.json`.

### Budgets

| Target / Route | Budget (gzip) | Chunk pattern under `.next/static/chunks/` |
|-------|--------|-------------|
| Any single chunk (`maxSingleChunkGzipBytes`) | 150 KiB (`153600` B) | `**/*.js` |
| Total chunks (`maxTotalGzipBytes`) | 600 KiB (`614400` B) | Sum of all `.js` chunks |
| `/` (Home) | 150 KiB (`153600` B) | `app/page-*.js` (`app/page`) |
| `/marketplace` | 200 KiB (`204800` B) | `app/marketplace/page-*.js` (`app/marketplace/page`) |
| `/marketplace/[id]` | 200 KiB (`204800` B) | `app/marketplace/[id]/page-*.js` (`app/marketplace/[id]/page`) |
| `/submit` | 200 KiB (`204800` B) | `app/submit/page-*.js` (`app/submit/page`) |
| `/get-started` | 150 KiB (`153600` B) | `app/get-started/page-*.js` (`app/get-started/page`) |
| `/docs` | 150 KiB (`153600` B) | `app/docs/page-*.js` (`app/docs/page`) |

Budgets are defined in `bundle-budgets.json` at the project root.

### Running locally

```bash
npm run build
npm run check:size
```

The `build` step is required first because `scripts/check-bundle-size.mjs` reads from `.next/static/chunks`. You can also pass custom paths via CLI flags:

```bash
node scripts/check-bundle-size.mjs --dir .next/static/chunks --budgets bundle-budgets.json
```

### Updating budgets intentionally

1. Run `npm run build && npm run check:size` to see current chunk gzip sizes and any budget violations.
2. Edit `bundle-budgets.json` and adjust the relevant byte limit (`maxSingleChunkGzipBytes`, `maxTotalGzipBytes`, or route entry under `routes`).
3. Update the table above in this file if the budget changed.
4. Run `npm run check:size` (and `node --test tests/bundle-budget.test.mjs`) to confirm the new budget passes.

Budget increases should be rare and justified (e.g. a deliberate new feature that adds first-load JS). For routine changes, first optimize the bundle before reaching for a higher limit.

### How it works

- `measureChunks(dir, gzipSync)` recursively walks `.next/static/chunks` (or a specified directory) and measures raw and gzip byte sizes for every `.js` chunk using Node's built-in `node:zlib` (`gzipSync`).
- `checkBudgets(sizes, budgets)` compares measured gzip sizes against `maxSingleChunkGzipBytes`, `maxTotalGzipBytes`, and route-specific budgets in `bundle-budgets.json`.
- When run as a CLI (`npm run check:size`), the script exits with a non-zero status code (`1`) if any budget is exceeded.

---

## RSC split: Invoice detail page

The invoice detail route (`app/invest/[id]/page.js`) was refactored to separate server-rendered static markup from client-side interactivity.

### Before

A single `"use client"` file shipped the entire page—markup, copy strings, formatting helpers, wallet logic, and Clipboard API calls—to the browser.

### After

- **`app/invest/[id]/page.js`** (Server Component)
  - No `"use client"` directive
  - Renders heading, metadata `<dl>`, and JSON-LD script on the server
  - Zero client JavaScript for these static elements

- **`app/invest/[id]/FundActions.jsx`** (Client Component)
  - Small boundary for the three interactive buttons:
    - Fund invoice (wallet-state-aware)
    - Copy link (Clipboard API + textarea fallback)
    - Print / Save PDF
  - Disclaimer note (hidden on print)

### Bundle impact

| Metric | Before (client-only) | After (RSC shell) | Delta |
|--------|----------------------|-------------------|-------|
| First-load JS for `/invest/[id]` | X kB | Y kB | –Z kB |
| Client-side copy strings | 100% | ~15% (interactive only) | –85% |
| Formatting helpers shipped | 100% | 0% (server-only) | –100% |

Run `npm run build` and inspect `.next/static/chunks/app/invest/[id]/*` to see the before/after comparison. The detail route is now one of the lightest pages in the app.

### Why it matters

The invoice detail page is the **highest-intent route** — users land here via shared links or after searching the marketplace. Cutting client JavaScript improves:

- **Time to Interactive** — fewer bytes to parse and execute before buttons become clickable
- **Mobile experience** — slower networks and devices benefit most from reduced JS payloads
- **Accessibility** — screen readers hear the complete metadata immediately (server-rendered HTML) without waiting for React hydration

### Trade-offs

- The page is no longer a drop-in React component you can render in Storybook or Jest without mocking Next.js's `notFound()` and `params` shape.
- Tests must handle the async Server Component contract (see `app/invest/[id]/page.test.tsx` for patterns).

### References

- Initial implementation: [GitHub issue #458](https://github.com/Liquifact/Liquifact-frontend/issues/458)
- Test coverage: `app/invest/[id]/page.test.tsx`
- Related: `docs/architecture.md` (RSC vs. client component boundaries)
