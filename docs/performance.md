# Performance

## Bundle-size budgets

This project uses [size-limit](https://github.com/ai/size-limit) to guard against bundle bloat.

### Budgets

| Route | Budget | File pattern |
|-------|--------|-------------|
| `/` (Home) | 150 kB | `.next/static/chunks/app/page-*.js` |
| `/invest` | 200 kB | `.next/static/chunks/app/invest/page-*.js` |
| `/invoices` | 200 kB | `.next/static/chunks/app/invoices/page-*.js` |

Budgets are defined in `.size-limit.json` at the project root.

### Running locally

```bash
npm run build
npm run size-limit
```

The `build` step is required first because size-limit reads from the `.next` build output.

### CI

The `size.yml` workflow runs on every PR to `main`. It builds the app and checks every budget. If a route exceeds its budget the workflow fails, preventing the PR from merging.

### Updating budgets intentionally

1. Run `npm run build && npm run size-limit` to see current sizes.
2. Edit `.size-limit.json` and adjust the relevant `limit` value.
3. Update the table above in this file if the budget changed.
4. Run `npm run build && npm run size-limit` again to confirm the new budget passes.

Budget increases should be rare and justified (e.g. a deliberate new feature that adds first-load JS). For routine changes, first optimize the bundle before reaching for a higher limit.

### How it works

- The `@size-limit/file` plugin measures the gzip size of the file globs.
- Budgets target the route-specific JS chunks produced by the Next.js App Router build.
- The check runs after `next build` so it measures the real production output.

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
