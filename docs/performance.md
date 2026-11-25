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

**Note:** Budgets are defined in `bundle-budgets.json` at the project root. Budgets are currently defined but not yet enforced in CI. Enforcement will be added in a future update (see bundle-budget issue for details).

### Running locally

```bash
npm run build
npm run check:size
```

The `build` step is required first because `scripts/check-bundle-size.mjs` reads from `.next/static/chunks`. You can also pass custom paths via CLI flags:

```bash
node scripts/check-bundle-size.mjs --dir .next/static/chunks --budgets bundle-budgets.json
```

### Reading `next build` output

Running `npm run build` produces a summary of each route's bundle size in the terminal output. Look for sections like:

```
Route (app)                              Size     First Load JS
┌ ○ /                                    3.2 kB        87.2 kB
├ ○ /marketplace                         4.1 kB        88.1 kB
├ ○ /marketplace/[id]                    5.3 kB        89.3 kB
└ λ /submit                             12.4 kB        96.4 kB
```

- **Size**: The JavaScript chunk for that specific route
- **First Load JS**: Total JavaScript loaded when navigating to that route (includes shared chunks)

To inspect individual chunks, check `.next/static/chunks/` after building. The chunks are named based on their source (e.g., `app/page-abc123.js` for `app/page.js`).

### Existing optimizations

- **Dynamic imports for SSR-unsafe code**: `app/marketplace/[id]/InvoiceDetail.jsx` uses `next/dynamic` to lazy-load `ExitPanel` (which uses `@stellar/stellar-sdk` and the Freighter browser API) with `{ ssr: false }`. This prevents the Soroban SDK from running on the server and reduces the initial client-side bundle.

### Updating budgets intentionally

1. Run `npm run build && npm run check:size` to see current chunk gzip sizes and any budget violations.
2. Edit `bundle-budgets.json` and adjust the relevant byte limit (`maxSingleChunkGzipBytes`, `maxTotalGzipBytes`, or route entry under `routes`).
3. Update the table above in this file if the budget changed.
4. Run `npm run check:size` to confirm the new budget passes.

Budget increases should be rare and justified (e.g. a deliberate new feature that adds first-load JS). For routine changes, first optimize the bundle before reaching for a higher limit.

### How it works

- `measureChunks(dir, gzipSync)` recursively walks `.next/static/chunks` (or a specified directory) and measures raw and gzip byte sizes for every `.js` chunk using Node's built-in `node:zlib` (`gzipSync`).
- `checkBudgets(sizes, budgets)` compares measured gzip sizes against `maxSingleChunkGzipBytes`, `maxTotalGzipBytes`, and route-specific budgets in `bundle-budgets.json`.
- When run as a CLI (`npm run check:size`), the script exits with a non-zero status code (`1`) if any budget is exceeded.

---

## RSC split: Invoice detail page

The invoice detail route (`app/marketplace/[id]/page.js`) uses a Server Component to render static metadata on the server, with a client component for interactivity.

### Architecture

- **`app/marketplace/[id]/page.js`** (Server Component)
  - No `"use client"` directive
  - Generates metadata and JSON-LD script on the server
  - Zero client JavaScript for these static elements

- **`app/marketplace/[id]/InvoiceDetail.jsx`** (Client Component)
  - Contains all interactive functionality: funding, wallet connection, state management
  - Uses `next/dynamic` to lazy-load `ExitPanel` (SSR-unsafe Soroban SDK code) with `{ ssr: false }`

### Bundle impact

The Server Component architecture reduces the initial client-side bundle by keeping metadata generation and JSON-LD on the server. Run `npm run build` and inspect `.next/static/chunks/app/marketplace/[id]/*` to see the chunk sizes.

### Why it matters

The invoice detail page is the **highest-intent route** — users land here via shared links or after searching the marketplace. The RSC split improves:

- **Time to Interactive** — fewer bytes to parse and execute before buttons become clickable
- **Mobile experience** — slower networks and devices benefit most from reduced JS payloads
- **Accessibility** — screen readers hear the complete metadata immediately (server-rendered HTML) without waiting for React hydration

### Trade-offs

- The page is no longer a drop-in React component you can render in Storybook or Jest without mocking Next.js's `params` shape.
- Tests must handle the async Server Component contract.
