# Settings Theming Guide

The settings page (`app/settings/page.js`) supports light, dark, system, and
high-contrast theme preferences. This guide explains how the settings page
resolves a preference, consumes the current theme tokens, and can be customized
safely.

## How the theme is applied

The settings page inherits the global theme flow from the app layout:

1. `components/ThemeToggle.jsx` stores the selected preference under the
   `liquifact-theme` localStorage key.
2. The pre-paint script in `app/layout.js` resolves the system preference
   against `prefers-color-scheme` and sets `data-theme="light"` or
   `data-theme="dark"` on `<html>`.
3. Settings-specific density and spacing tokens are defined in
   `app/globals.css` under `[data-density="comfortable"]` and
   `[data-density="compact"]`.

The Effective `data-theme` value is always `light` or `dark`. The pre-paint
script runs before React hydrates so the settings page does not flash the wrong
palette while loading.

## Current settings tokens

The settings page uses the global theme tokens plus density-specific spacing
tokens.

### Global theme tokens

These are set in `app/globals.css` under `:root, [data-theme="dark"]` and
`[data-theme="light"]`.

| Token | Dark value | Light value | Purpose |
| --- | --- | --- | --- |
| `--color-bg` | `#020617` | `#f8fafc` | Page background |
| `--color-fg` | `#f1f5f9` | `#0f172a` | Primary text |
| `--color-muted` | `#94a3b8` | `#64748b` | Secondary text and labels |
| `--color-surface` | `#0f172a` | `#ffffff` | Cards and panels |
| `--color-border` | `#1e293b` | `#e2e8f0` | Borders and dividers |
| `--color-primary` | `#22d3ee` | `#0891b2` | Brand accent and active states |
| `--color-focus-ring` | `#22d3ee` | `#0891b2` | Keyboard focus indicator |

### Settings density tokens

The settings page defines density-specific spacing tokens that drive section
padding, section gap, and list gap within the settings layout.

| Token | Comfortable | Compact | Purpose |
| --- | --- | --- | --- |
| `--settings-section-padding` | `1.5rem` | `1rem` | Section inner padding |
| `--settings-section-gap` | `1.5rem` | `1rem` | Gap between sections |
| `--settings-list-gap` | `0.75rem` | `0.5rem` | Gap between list items |

### High-contrast mode

The settings page is covered by the high-contrast mode CSS in `app/globals.css`:

- **`forced-colors: active`**: The `.settings-page`, `.settings-card`, and
  `.settings-item` classes apply system Canvas/CanvasText/ButtonText colours
  with `forced-color-adjust: none` so the settings UI remains readable under
  Windows High Contrast Mode.
- **`prefers-contrast: more`**: Border widths are increased to 2px and muted
  colours are upgraded to fully opaque values so every interactive element has
  a clear visual boundary.

## How settings consumes theme tokens

The settings page uses the theme tokens in the following ways:

### Page background and text

The settings page inherits the global `html` and `body` background and text
colour from the theme. The page wrapper uses `bg-bg` and `text-foreground`
Tailwind utilities that map to the theme tokens:

```css
/* app/globals.css */
@theme inline {
  --color-foreground: var(--color-fg);
  --color-bg: var(--color-bg);
}
```

### Settings cards and panels

Each settings section is rendered as a card with a bordered container. The
cards use `bg-[var(--color-surface)]` and `border-[var(--color-border)]`:

```jsx
<section className="border border-[var(--color-border)] bg-[var(--color-surface)] rounded-lg">
  <SettingsRow />
</section>
```

### Inline edit rows

The `InlineEditRow` component (shared across pages) receives density-driven
spacing through `--settings-section-*` tokens. The edit/save/cancel buttons
use `--color-primary` for accent and `--color-focus-ring` for focus indicators.

### Density toggle

The `DensityToggle` component in the settings page header switches between
`data-density="comfortable"` and `data-density="compact"`, which changes the
`--settings-section-*` token values to compress or expand the layout.

## Customizing the settings theme

1. Update the global theme token values in both theme blocks in
   `app/globals.css`.
2. For density-specific changes, update the
   `[data-density="comfortable"]` or `[data-density="compact"]` blocks.
3. Keep the existing token names unless every consumer, test, and document is
   updated together.
4. Check text, surface, border, accent, and focus-ring contrast in both themes.
5. Confirm keyboard focus remains clearly visible.
6. Verify the high-contrast mode overrides still apply by testing with
   `forced-colors: active` and `prefers-contrast: more` in the browser DevTools.
7. Run the focused documentation test and the full repository checks.

When adding a new theme-dependent token, define it in both theme blocks,
register it in `@theme inline` when a Tailwind utility is needed, document it
here, and extend `docs/settings-theming.test.js`.

## Verification

```bash
npm test -- docs/settings-theming.test.js --runInBand
npm run lint
npm test
npm run build
```