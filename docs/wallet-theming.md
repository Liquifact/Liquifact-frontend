# Wallet Theming Guide

LiquiFact's wallet subsystem (the connect button, connection status panel, and
its loading skeleton) inherits the application theme through the same global
mechanism as the rest of the app. This guide explains how the wallet consumes
theme tokens, which density and layout tokens it reads, and how contributors
can customise its appearance safely.

## How the theme is applied

The wallet does not own a separate theme. It inherits the application theme
through the shared flow:

1. `components/ThemeToggle.jsx` stores the selected `light`, `dark`, or
   `system` preference under the `liquifact-theme` localStorage key.
2. The pre-paint script in `app/layout.js` resolves `system` via
   `prefers-color-scheme` and sets `data-theme="light"` or
   `data-theme="dark"` on `<html>` before React hydrates.
3. `app/globals.css` selects the CSS custom-property values for the effective
   theme.

The wallet components respond to the effective `data-theme` attribute because
they sit inside the same document and the global background/foreground tokens
(`--color-bg`, `--color-fg`) are applied to `html, body`. They also reuse the
shared `.focus-ring` utility, which consumes `--color-focus-ring`.

## Current wallet colour usage

Most of the wallet surface still uses **fixed Slate and status Tailwind
utilities** rather than semantic theme tokens. Because fixed colour utilities
override inherited token values, those elements do not re-colour when the
palette tokens change.

| Wallet element | Current utility | Consumed source |
| --- | --- | --- |
| State dot — connected | `bg-green-500` | Fixed utility |
| State dot — connecting | `bg-yellow-500` | Fixed utility |
| State dot — error / wrong network | `bg-red-500` | Fixed utility |
| State dot — disconnected | `bg-slate-600` | Fixed utility |
| Address row | `text-slate-300` | Fixed utility |
| Copy button | `text-slate-400 hover:text-slate-200` | Fixed utility |
| Balance row | `text-slate-500` | Fixed utility |
| Helper text | `text-slate-400` | Fixed utility |
| Disconnected helper text | `text-slate-400` | Fixed utility |
| Error helper text | `text-red-400` | Fixed utility |
| Focus ring on interactive elements | `focus-visible:outline-cyan-400` | Fixed utility |

These live in `components/WalletStatus.jsx`. The wallet skeleton in
`components/WalletSkeleton.jsx` uses fixed `bg-slate-700` and `bg-slate-800`
utilities for its shimmering shapes.

Migrating these fixed utilities to semantic tokens is a separate
implementation change and is outside the scope of this documentation issue.

## High-contrast / forced-colours handling

The wallet participates in the repository's forced-colours and
`prefers-contrast` handling. In `app/globals.css`, the
`@media (forced-colors: active)` block maps the wallet surfaces to system
colours:

| Wallet element class | Forced-colours rule |
| --- | --- |
| `.wallet-status-dot` | `forced-color-adjust: none` |
| `.wallet-address-text` | `color: CanvasText` |
| `.wallet-balance-text` | `color: GrayText` |
| `.wallet-helper-text` | `color: CanvasText` |
| `.wallet-skeleton-text-primary`, `.wallet-skeleton-text-secondary`, `.wallet-skeleton-btn` | `border: 1px solid CanvasText; background-color: Canvas` |

These classes are added to the wallet's JSX alongside the fixed utilities so
the wallet keeps readable contrast when the user forces a high-contrast
colour set.

## Wallet density and layout tokens

The wallet reads four CSS custom properties that control its panel spacing and
typography scale. These are **density** tokens, not colour tokens — they live
on the `:root, [data-density="comfortable"]` and `[data-density="compact"]`
blocks in `app/globals.css`.

| Token | Comfortable value | Compact value | Purpose |
| --- | --- | --- | --- |
| `--wallet-panel-padding` | `1rem` | `0.5rem` | Connected panel padding |
| `--wallet-panel-gap` | `0.75rem` | `0.375rem` | Connected panel gap |
| `--wallet-meta-font-size` | `0.75rem` | `0.6875rem` | Balance / subtitle text |
| `--wallet-address-font-size` | `0.875rem` | `0.75rem` | Wallet address text |

`components/WalletStatus.jsx` consumes these values via inline `style`
properties (`padding`, `gap`, `fontSize`) and the `data-density` attribute on
the connected panel. `components/DensityToggle.jsx` lets the user switch
between `comfortable` and `compact`, which re-applies the matching token set.
`data-theme` and `data-density` are independent: changing the theme does not
change the density, and vice-versa.

## Customising the wallet

1. **Colours** — update the palette tokens in `app/globals.css` (both the
   `:root, [data-theme="dark"]` block and the `[data-theme="light"]` block).
   This re-colours global surfaces and semantic-token consumers. Remember that
   the wallet's fixed Slate/status utilities (`bg-green-500`,
   `text-slate-300`, etc.) will not follow, so check both light and dark —
   and forced-colours — separately.
2. **Spacing / typography scale** — update `--wallet-panel-padding`,
   `--wallet-panel-gap`, `--wallet-meta-font-size`, and
   `--wallet-address-font-size` in both the comfortable and compact density
   blocks in `app/globals.css`. Keep the token names stable so
   `WalletStatus.jsx` continues to consume them.
3. **Status colours** — if the semantic state dot colours are migrated, define
   the state colours in both theme blocks and document them here.
4. Confirm keyboard focus (`.focus-ring`, `focus-visible:outline-cyan-400`)
   remains clearly visible in both themes.
5. Run the focused documentation test and the full repository checks.

When adding a new theme- or density-dependent wallet token, define it in the
appropriate block, document both values here, and extend
`docs/wallet-theming.test.js` so the guide cannot silently drift from the
source.

## Verification

```bash
npm test -- docs/wallet-theming.test.js --runInBand
npm run lint
npm test
npm run build
```