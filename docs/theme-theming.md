# Theme Theming Guide

LiquiFact supports light, dark, and system-controlled colour themes. This guide
explains how the theme layer resolves a preference, which tokens it consumes,
and how contributors can customize the current palettes safely.

## Theme flow

The runtime theme flow spans three files:

1. `components/ThemeToggle.jsx` exposes the `light`, `dark`, and `system`
   preferences and persists the selected value under the
   `liquifact-theme` localStorage key.
2. The pre-paint script in `app/layout.js` reads the stored preference before
   React hydrates. A `system` preference is resolved through
   `prefers-color-scheme`.
3. The script and `ThemeToggle` apply the effective value to
   `data-theme` on `<html>`. The effective value is always `light` or `dark`.
4. `app/globals.css` selects the matching CSS custom-property values.

Applying the attribute before the first paint prevents a flash of the wrong
palette during hydration.

## Current colour tokens

The theme palettes are defined in `app/globals.css`.

| Token | Dark value | Light value | Purpose |
| --- | --- | --- | --- |
| `--color-bg` | `#020617` | `#f8fafc` | Page background |
| `--color-fg` | `#f1f5f9` | `#0f172a` | Primary foreground text |
| `--color-muted` | `#94a3b8` | `#64748b` | Secondary text and labels |
| `--color-surface` | `#0f172a` | `#ffffff` | Cards and panels |
| `--color-border` | `#1e293b` | `#e2e8f0` | Borders and dividers |
| `--color-primary` | `#22d3ee` | `#0891b2` | Brand accent and active states |
| `--color-focus-ring` | `#22d3ee` | `#0891b2` | Keyboard focus indicator |

The global document styles consume the background, foreground, and font
directly:

```css
html,
body {
  background: var(--color-bg);
  color: var(--color-fg);
  font-family: var(--font-geist-sans);
}
```

The `.skip-link` utility consumes `--color-primary` and `--color-bg`.
The reusable `.focus-ring` utility consumes `--color-focus-ring`.

## Tailwind mapping

The `@theme inline` block exposes the principal palette and font values to
Tailwind CSS v4.

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

## Theme-control usage

The theme controls are implemented by:

- `components/ThemeToggle.jsx` for cycling and persisting the preference.
- `components/ThemeOptionsModal.jsx` for selecting Light, Dark, or System in a
  dialog.
- `components/ThemeInputs.jsx` for the settings form's theme and accent fields.

These controls currently use fixed Slate and Cyan Tailwind utilities such as
`bg-slate-900`, `text-slate-100`, `border-slate-700`, and `text-cyan-300`.
Those utilities do not inherit customized CSS-token values. Changing the
palette tokens affects global document colours and semantic-token consumers,
but it does not automatically recolour every fixed utility in the controls.

Migrating fixed utilities to semantic theme tokens is a separate implementation
change and is outside the scope of this documentation issue.

## Customizing the theme

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

Palette changes do not require edits to `ThemeToggle.jsx` or `app/layout.js`;
those files control preference resolution, persistence, and application rather
than colour values.

When adding a new theme-dependent token, define it in both palette blocks,
document both values here, and extend `docs/theme-theming.test.js` so the guide
cannot silently drift from the source.

## Verification

Run the focused source-alignment test:

```bash
npm test -- docs/theme-theming.test.js --runInBand
```

Then run the repository checks:

```bash
npm run lint
npm test -- --runInBand
npm run build
```
