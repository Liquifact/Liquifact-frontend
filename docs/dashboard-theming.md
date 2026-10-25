# Dashboard Theming Guide

The LiquiFact dashboard supports light, dark, and system theme preferences.
This guide explains how the dashboard resolves a preference, consumes the
current theme tokens, and can be customized safely.

## How the theme is applied

The theme flow spans three files:

1. `components/ThemeToggle.jsx` stores the selected preference under the
   `liquifact-theme` localStorage key.
2. The pre-paint script in `app/layout.js` resolves the system preference
   against `prefers-color-scheme` and sets `data-theme="light"` or
   `data-theme="dark"` on `<html>`.
3. `app/globals.css` selects the matching token values and applies the global
   page background, foreground, and font.

The effective `data-theme` value is always `light` or `dark`. The pre-paint
script runs before React hydrates so the dashboard does not flash the wrong
palette while loading.

## Current dashboard tokens

The following values are defined in `app/globals.css`.

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
  Dashboard content
</section>
```

## Marketplace card tokens

The theme blocks also define marketplace-card layout and typography tokens.
Their values are currently identical in both themes.

| Token | Current value |
| --- | --- |
| `--market-card-padding` | `1.25rem` |
| `--market-card-gap` | `1rem` |
| `--market-card-title-font-size` | `0.95rem` |
| `--market-card-title-font-weight` | `600` |
| `--market-card-title-line-height` | `1.4` |
| `--market-card-meta-font-size` | `0.875rem` |
| `--market-card-meta-line-height` | `1.5` |
| `--market-card-meta-letter-spacing` | `0.01em` |

## Current dashboard usage

The global `html` and `body` styles respond to the selected theme. Shared
utilities such as `.focus-ring` and `.skip-link` also consume semantic tokens.

Some existing dashboard markup in `app/page.js` still uses fixed Tailwind
palette utilities, including `bg-slate-950`, `text-slate-100`,
`bg-slate-900/50`, and `text-slate-400`. Fixed colour utilities override
inherited token values, so those elements do not fully respond to token
customization.

New dashboard components should prefer semantic tokens where practical.
Migrating existing fixed utilities is a separate implementation change and is
outside the scope of this guide.

## Customizing the dashboard

1. Update the values in both theme blocks in `app/globals.css`.
2. Keep the existing token names unless every consumer, test, and document is
   updated together.
3. Check text, surface, border, accent, and focus-ring contrast in both themes.
4. Confirm keyboard focus remains clearly visible.
5. Run the focused documentation test and the full repository checks.

Changing palette values does not require changes to `ThemeToggle.jsx` or
`app/layout.js`; those files control preference resolution and persistence.

When adding a new theme-dependent token, define it in both theme blocks,
register it in `@theme inline` when a Tailwind utility is needed, document it
here, and extend `docs/dashboard-theming.test.js`.

## Verification

```bash
npm test -- docs/dashboard-theming.test.js --runInBand
npm run lint
npm test
npm run build
```
