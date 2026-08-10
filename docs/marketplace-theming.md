# Marketplace Theming Guide

LiquiFact supports light, dark, and system-controlled colour themes. This guide
explains how the marketplace area (`/invest`) consumes the current theme tokens,
documents the marketplace-specific card tokens, and lists the customisation
steps.

## How the theme is applied

The marketplace is rendered by `app/invest/page.js` inside the global app layout.
The theme flow is the same as the rest of the application:

1. `components/ThemeToggle.jsx` stores the selected preference under the
   `liquifact-theme` localStorage key.
2. The pre-paint script in `app/layout.js` resolves the system preference
   against `prefers-color-scheme` and sets `data-theme="light"` or
   `data-theme="dark"` on `<html>`.
3. `app/globals.css` selects the matching token values and applies the global
   page background, foreground, and font.

The effective `data-theme` value is always `light` or `dark`. The pre-paint
script runs before React hydrates so the marketplace does not flash the wrong
palette while loading.

## Current marketplace colour tokens

The following values are defined in `app/globals.css` and are shared across all
areas of the application.

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

## Marketplace card tokens

The marketplace defines card-specific tokens for the invoice cards in the
invest list. These tokens use the same value in both themes.

| Token | Value | Purpose |
| --- | --- | --- |
| `--market-card-padding` | `1.25rem` | Inner padding of each invoice card |
| `--market-card-gap` | `1rem` | Gap between cards |
| `--market-card-title-font-size` | `0.95rem` | Issuer name font size |
| `--market-card-title-font-weight` | `600` | Issuer name font weight |
| `--market-card-title-line-height` | `1.4` | Issuer name line height |
| `--market-card-meta-font-size` | `0.875rem` | Metadata text font size |
| `--market-card-meta-line-height` | `1.5` | Metadata text line height |
| `--market-card-meta-letter-spacing` | `0.01em` | Metadata text letter spacing |

These tokens are used by the invoice card layout in `app/invest/page.js`.
They are not currently registered in `@theme inline` and can be consumed
directly in CSS:

```css
.card {
  padding: var(--market-card-padding);
  gap: var(--market-card-gap);
}
```

## Tailwind mapping

The `@theme inline` block in `app/globals.css` exposes the principal palette
and font values to Tailwind CSS v4.

| CSS source token | Tailwind theme token | Example utility |
| --- | --- | --- |
| `--color-bg` | `--color-bg` | `bg-bg` |
| `--color-fg` | `--color-foreground` | `text-foreground` |
| `--color-muted` | `--color-muted` | `text-muted` |
| `--color-primary` | `--color-primary` | `text-primary` or `bg-primary` |
| `--color-focus-ring` | `--color-focus-ring` | `outline-focus-ring` |
| `--font-geist-sans` | `--font-sans` | `font-sans` |
| `--font-geist-mono` | `--font-mono` | `font-mono` |

`--color-surface` and `--color-border` are valid CSS custom properties but are
not currently registered in `@theme inline`. They can be consumed directly in
CSS or through Tailwind arbitrary-value utilities:

```jsx
<section className="border-[var(--color-border)] bg-[var(--color-surface)] text-foreground">
  Theme-aware content
</section>
```

## Marketplace CSS hooks

The marketplace component tree uses the following CSS classes and hooks that
are relevant to theming:

| Hook / class | Location | Purpose |
| --- | --- | --- |
| `min-h-screen` | `app/invest/page.js` | Page minimum height |
| `max-w-4xl` | `app/invest/page.js` | Content width constraint |
| `.focus-ring` | `app/globals.css` | Reusable focus-visible outline |
| `.skip-link` | `app/globals.css` | Skip-to-content link |

## Fixed-utility limitation

The current marketplace implementation in `app/invest/page.js` uses hardcoded
Slate and Cyan Tailwind utilities such as:

- `bg-slate-950` — page background
- `text-slate-100` — primary text
- `text-slate-400` — muted text
- `bg-slate-900/50` — card surface
- `bg-slate-900/30` — filter / status panel background
- `border-slate-800` — card and panel borders
- `border-slate-700` — load-more button border
- `bg-slate-800` — filter label badge
- `text-cyan-400` — brand accent links and load-more button text
- `bg-cyan-900/60` — status badge background
- `text-cyan-300` — status badge text
- `hover:bg-slate-800/50` — load-more button hover
- `focus-visible:outline-cyan-400` — keyboard focus indicator

These utilities do **not** inherit the custom CSS token values. Changing the
palette tokens affects global document colours and semantic-token consumers,
but it does **not** automatically recolour every fixed utility in the
marketplace.

Migrating the marketplace from fixed utilities to semantic theme tokens is a
separate implementation change and is outside the scope of this documentation
issue.

## Customizing the marketplace theme

To customize the existing palettes:

1. Open `app/globals.css`.
2. Update each token in both the `:root, [data-theme="dark"]` block and the
   `[data-theme="light"]` block.
3. Keep token names stable unless all consumers, tests, and documentation are
   updated together.
4. Register a token in `@theme inline` when a named Tailwind utility is needed.
5. Check foreground, muted text, surface, border, primary, and focus-ring
   contrast in both themes.
6. Confirm the skip link and every `.focus-ring` element remain clearly visible.

Palette changes do not require edits to the marketplace components or
`app/invest/page.js`; those files consume fixed Tailwind utilities and will
not automatically reflect token changes.

When adding a new theme-dependent token, define it in both palette blocks,
document both values here, and extend `docs/marketplace-theming.test.js` so
the guide cannot silently drift from the source.

## Verification

Run the focused source-alignment test:

```bash
npm test -- docs/marketplace-theming.test.js --runInBand
```

Then run the repository checks:

```bash
npm run lint
npm test -- --runInBand
npm run build
```