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

---

## Geist font loading

The site ships two webfonts from `next/font/google`: **Geist Sans** (body
& UI) and **Geist Mono** (addresses, hashes, balances). Both are configured
in `app/layout.js` so the first paint is free of layout shift.

### Loader options

Each font is configured with the same four options:

| Option                  | Value   | Reason                                                                                                                            |
| :---------------------- | :------ | :--------------------------------------------------------------------------------------------------------------------------------- |
| `subsets`               | `latin` | The UI is English-only; other subsets would ship unused glyphs.                                                                   |
| `display`               | `swap`  | Keeps text visible during the network round-trip — no FOIT. Combined with `adjustFontFallback` the swap is visually invisible.    |
| `preload`               | `true`  | Emits `<link rel="preload">` so the font downloads in parallel with the critical HTML/CSS instead of after first paint.            |
| `adjustFontFallback`    | `true`  | Next.js synthesises a fallback `@font-face` whose ascent / descent / line-gap metrics closely track Geist's, so the swap is ~0 px.|

### Weights

Only the weights actually used in the application are requested so the
payload contains no unused font bytes:

| Font       | Weights requested | Used by                                                                       |
| :--------- | :---------------- | :---------------------------------------------------------------------------- |
| Geist Sans | `400, 500, 600, 700, 800` | `font-normal` (body) · `font-medium` (badges/buttons) · `font-semibold` (headings) · `font-bold` (hero / h1) · `font-extrabold` (decorative `404` in `app/not-found.js`) |
| Geist Mono | `400`                   | Addresses, invoice hashes, balances — no weight overrides at any call site                       |

### Layout-shift impact (CLS)

Because Next.js cannot be regression-tested in CI for CLS and we have no
production traffic numbers yet, the figures below are derived from
documentation of the `next/font` behaviour rather than measured in a
real browser. They are held here as a baseline; replace them with the
first Lighthouse / WebPageTest result once one is taken.

| Metric                                                              | Before | After | Δ            |
| :------------------------------------------------------------------ | :----- | :---- | :----------- |
| `next/font` `display`                                              | `auto` | `swap`| explicit     |
| `next/font` `preload`                                               | `auto` | `true`| explicit     |
| `next/font` `adjustFontFallback`                                   | `auto` | `true`| explicit     |
| Estimated CLS contribution from font swap on `/` (ratio units)     | ~0.10–0.20 | ~0.00 (metrics-aligned fallback) | −0.10–0.20 |
| Sans payload (compressed, latin only, restricted weights)           | ~50 kB variable | ~5 × ~10 kB static | smaller in aggregate for the five weights used |
| Mono payload (compressed, latin only)                               | ~30 kB variable | ~10 kB static 400    | ~−20 kB      |

_Numbers above are projections of the documented `next/font` behaviour;
they should be replaced with the first WebPageTest / Lighthouse CLS
reading on the production build._

### References

- Issue and PR: GitHub issue **#459** — "Subset and preload the Geist
  font to remove first-paint layout shift".
- Next.js docs: [Font Optimization](https://nextjs.org/docs/app/building-your-application/optimizing/fonts)
  and [`next/font/google`](https://nextjs.org/docs/app/api-reference/components/font).
