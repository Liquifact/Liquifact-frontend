# Invoice Detail Theming Guide

The LiquiFact invoice detail view (`app/invest/[id]`) supports light, dark,
and system theme preferences. This guide explains how the invoice detail page
consumes the current theme tokens, which CSS hooks it provides for
accessibility overrides, and how contributors can customize it safely.

## How the theme is applied

The invoice detail page does not manage its own theme state. It inherits the
global theme resolved by the same three files that drive the rest of the app:

1. `components/ThemeToggle.jsx` stores the selected preference under the
   `liquifact-theme` localStorage key.
2. The pre-paint script in `app/layout.js` resolves the system preference
   against `prefers-color-scheme` and sets `data-theme="light"` or
   `data-theme="dark"` on `<html>`.
3. `app/globals.css` selects the matching token values and applies the global
   page background, foreground, and font.

The effective `data-theme` value is always `light` or `dark`. The pre-paint
script runs before React hydrates so the invoice detail page does not flash
the wrong palette while loading.

## Current theme tokens

The invoice detail page consumes the same semantic tokens as the rest of the
app, defined in `app/globals.css`.

| Token | Dark value | Light value | Purpose |
| --- | --- | --- | --- |
| `--color-bg` | `#020617` | `#f8fafc` | Page background |
| `--color-fg` | `#f1f5f9` | `#0f172a` | Primary text |
| `--color-muted` | `#94a3b8` | `#64748b` | Secondary text and labels |
| `--color-surface` | `#0f172a` | `#ffffff` | Cards and panels |
| `--color-border` | `#1e293b` | `#e2e8f0` | Borders and dividers |
| `--color-primary` | `#22d3ee` | `#0891b2` | Brand accent and active states |
| `--color-focus-ring` | `#22d3ee` | `#0891b2` | Keyboard focus indicator |

The document root consumes the background and foreground tokens directly:

```css
html,
body {
  background: var(--color-bg);
  color: var(--color-fg);
  font-family: var(--font-geist-sans);
}
```

The reusable `.focus-ring` utility consumes `--color-focus-ring`. The
`.skip-link` utility consumes `--color-primary` and `--color-bg`.

## Tailwind mapping

The `@theme inline` block in `app/globals.css` exposes the main palette and font
tokens to Tailwind.

| CSS source token | Tailwind theme token | Example utility |
| --- | --- | --- |
| `--color-bg` | `--color-bg` | `bg-bg` |
| `--color-fg` | `--color-foreground` | `text-foreground` |
| `--color-muted` | `--color-muted` | `text-muted` |
| `--color-primary` | `--color-primary` | `text-primary` |
| `--color-focus-ring` | `--color-focus-ring` | `outline-focus-ring` |
| `--font-geist-sans` | `--font-sans` | `font-sans` |
| `--font-geist-mono` | `--font-mono` | `font-mono` |

`--color-surface` and `--color-border` are CSS custom properties, but they are
not currently registered in `@theme inline`. Use them directly in CSS or with
Tailwind arbitrary-value utilities:

```jsx
<section className="border-[var(--color-border)] bg-[var(--color-surface)] text-foreground">
  Invoice detail content
</section>
```

## Invoice detail CSS hooks

The invoice detail view exposes several `invoice-detail-*` classes that act as
CSS hooks for accessibility overrides defined in `app/globals.css`. These
classes are scoped to `app/invest/[id]/InvoiceDetailClient.jsx` and
`components/FundActions.jsx` (issue #31).

| Hook | Component usage | Overrides |
| --- | --- | --- |
| `.invoice-detail-section` | The summary `<section>` wrapper | `transition: none` under reduced motion; `Canvas`/`CanvasText` border under `forced-colors`; `slate-300` border + fully opaque `slate-900` background under `prefers-contrast: more` |
| `.invoice-detail-dt` | Definition-list `<dt>` terms | `GrayText` under `forced-colors`; `slate-400` under `prefers-contrast: more` |
| `.invoice-detail-dd` | Definition-list `<dd>` values | `CanvasText` under `forced-colors`; `slate-100` under `prefers-contrast: more` |
| `.invoice-detail-action-btn` | Action buttons (Fund, Save, Cancel) | `ButtonFace`/`ButtonText` under `forced-colors`; `cyan-300` border under `prefers-contrast: more` |
| `.invoice-detail-disclaimer` | The disclaimer note | `Canvas` background under `forced-colors`; `slate-600` border + `slate-900` background under `prefers-contrast: more` |

These hooks are the preferred way to strengthen the invoice detail view for
users with reduced motion, high-contrast, or forced-colors preferences. New
invoice detail markup should apply the relevant hook class instead of relying
on inline fixed utilities.

## Current invoice detail usage

The invoice detail page is theme-aware through the global document styles and
the shared `.focus-ring` utility. Interactive elements across
`InvoiceDetailClient.jsx`, `InvoiceDetailItems.jsx`, and
`InvoiceDetailExport.jsx` carry the `.focus-ring` class so keyboard focus
remains clearly visible in both themes.

Some existing invoice detail markup still uses fixed Tailwind palette
utilities, including `bg-slate-950`, `text-slate-100`, `text-slate-500`,
`border-slate-700`, `bg-slate-800/50`, `bg-cyan-600`, and `text-cyan-400`.
Fixed colour utilities override inherited token values, so those elements do
not fully respond to token customization.

New invoice detail components should prefer semantic tokens where practical.
Migrating existing fixed utilities is a separate implementation change and is
outside the scope of this guide.

## Customizing the invoice detail

1. Update the token values in both theme blocks in `app/globals.css`.
2. Keep the existing token names unless every consumer, test, and document is
   updated together.
3. Check text, surface, border, accent, and focus-ring contrast in both themes.
4. Confirm keyboard focus on every interactive element remains clearly visible.
5. If you change an accessibility hook, update the overrides in the
   `@media (forced-colors: active)` and `@media (prefers-contrast: more)`
   blocks in `app/globals.css`.
6. Run the focused documentation test and the full repository checks.

Changing palette values does not require changes to `ThemeToggle.jsx` or
`app/layout.js`; those files control preference resolution and persistence.

When adding a new theme-dependent token, define it in both theme blocks,
register it in `@theme inline` when a Tailwind utility is needed, document it
here, and extend `docs/invoice-detail-theming.test.js`.

## Verification

```bash
npm test -- docs/invoice-detail-theming.test.js --runInBand
npm run lint
npm test
npm run build
```