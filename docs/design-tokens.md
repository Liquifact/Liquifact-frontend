# Design Token Reference

This document serves as the single source of truth for the LiquiFact styling system. It documents the custom Tailwind v4 `@theme` tokens defined in `app/globals.css` as well as standard Tailwind tokens used in this codebase.

Contributors must use these tokens rather than hardcoding arbitrary HEX values, pixel margins, or custom radii.

---

## Theme Context

> [!NOTE]
> The LiquiFact application is intentionally **hard-themed dark**. There are no light-mode overrides or alternate light-mode values. Therefore, "Light Mode" and "Dark Mode" values do not differ; the dark theme values apply globally.

---

## Color Tokens

These colors are defined custom in `app/globals.css` under the `@theme inline` block.

| CSS Variable         | Tailwind Utility              | HEX Value | Intended Usage                                                                         |
| :------------------- | :---------------------------- | :-------- | :------------------------------------------------------------------------------------- |
| `--color-bg`         | `bg-bg` / `bg-slate-950`      | `#020617` | Base background color of the application.                                              |
| `--color-primary`    | `text-primary` / `bg-primary` | `#22d3ee` | Primary brand accent color (cyan-400) used for links, brand badges, and active states. |
| `--color-foreground` | `text-foreground`             | `#f1f5f9` | Primary text color (slate-100) for body text and headers.                              |
| `--color-muted`      | `text-muted`                  | `#94a3b8` | Muted text color (slate-400) for helper text, labels, and secondary information.       |

---

## Accessibility & Contrast Pairings

Below is a contrast-compliance matrix for the custom colors, validated against the WCAG 2.1 AA and AAA standards.

| Text Color                       | Background Color              | Contrast Ratio | WCAG Compliance      | Status                                     |
| :------------------------------- | :---------------------------- | :------------- | :------------------- | :----------------------------------------- |
| `--color-foreground` (`#f1f5f9`) | `--color-bg` (`#020617`)      | **18.2:1**     | AAA (Pass, ≥ 7:1)    | **Safe to use**                            |
| `--color-primary` (`#22d3ee`)    | `--color-bg` (`#020617`)      | **11.1:1**     | AAA (Pass, ≥ 7:1)    | **Safe to use**                            |
| `--color-muted` (`#94a3b8`)      | `--color-bg` (`#020617`)      | **7.8:1**      | AAA (Pass, ≥ 7:1)    | **Safe to use**                            |
| `--color-bg` (`#020617`)         | `--color-primary` (`#22d3ee`) | **11.1:1**     | AAA (Pass, ≥ 7:1)    | **Safe to use** (e.g., skip-link on focus) |
| `--color-foreground` (`#f1f5f9`) | `--color-primary` (`#22d3ee`) | **1.6:1**      | Fail (Limit < 4.5:1) | **DO NOT USE** (Insufficient contrast)     |
| `--color-muted` (`#94a3b8`)      | `--color-primary` (`#22d3ee`) | **1.3:1**      | Fail (Limit < 4.5:1) | **DO NOT USE** (Insufficient contrast)     |

---

## Spacing Tokens

LiquiFact relies on standard Tailwind CSS v4 spacing tokens. The spacing scale is relative to root-font size (`1rem = 16px`).

| Tailwind Class Prefix | Rem Value  | Pixel Value | Common Use Cases                                 |
| :-------------------- | :--------- | :---------- | :----------------------------------------------- |
| `0.5` (e.g. `p-0.5`)  | `0.125rem` | `2px`       | Extra tight padding/gaps, border layouts.        |
| `1` (e.g. `p-1`)      | `0.25rem`  | `4px`       | Tight gap between icons and text, small borders. |
| `1.5` (e.g. `p-1.5`)  | `0.375rem` | `6px`       | Compact button/badge padding.                    |
| `2` (e.g. `p-2`)      | `0.5rem`   | `8px`       | General padding inside small alerts or inputs.   |
| `3` (e.g. `p-3`)      | `0.75rem`  | `12px`      | Padding for table cells, side-by-side elements.  |
| `4` (e.g. `p-4`)      | `1.0rem`   | `16px`      | Standard spacing; padding inside cards/drawers.  |
| `5` (e.g. `p-5`)      | `1.25rem`  | `20px`      | Layout margins, larger block container padding.  |
| `6` (e.g. `p-6`)      | `1.5rem`   | `24px`      | Section padding, modal header spacing.           |
| `8` (e.g. `p-8`)      | `2.0rem`   | `32px`      | Outer shell container padding for large screens. |
| `12` (e.g. `p-12`)    | `3.0rem`   | `48px`      | Large hero page layouts.                         |

---

## Border Radius Tokens

The application uses standard Tailwind CSS border-radius utilities to round the corners of panels, buttons, inputs, and cards.

| Tailwind Class           | Value            | Intended Usage                                    |
| :----------------------- | :--------------- | :------------------------------------------------ |
| `rounded-sm`             | `0.125rem` (2px) | Very small elements (checkboxes, status dots).    |
| `rounded` / `rounded-md` | `0.375rem` (6px) | Standard interactive elements (buttons, inputs).  |
| `rounded-lg`             | `0.5rem` (8px)   | Inner card panels, select dropdowns.              |
| `rounded-xl`             | `0.75rem` (12px) | Outer cards, dashboard widget containers.         |
| `rounded-2xl`            | `1rem` (16px)    | Large components (modals, upload zones).          |
| `rounded-full`           | `9999px`         | Badges, status indicator pills, circular buttons. |

---

## Typography Tokens

Typography is handled via Next.js `next/font/google` configuration (Geist Sans and Geist Mono).

### Font Families

| CSS Variable  | Tailwind Utility | Font Family | Intended Usage                                                   |
| :------------ | :--------------- | :---------- | :--------------------------------------------------------------- |
| `--font-sans` | `font-sans`      | Geist Sans  | Default body text, form fields, and main headers.                |
| `--font-mono` | `font-mono`      | Geist Mono  | Monospace/code font for addresses, invoice hashes, and balances. |

### Font Weights

- **Regular / Normal** (`font-normal`): `400` - Default body text.
- **Bold** (`font-bold`): `700` - Used for headings, table headers, and important labels.

### Font Sizes

| Tailwind Class | Size (Rem) | Size (Pixels) | Intended Usage                                 |
| :------------- | :--------- | :------------ | :--------------------------------------------- |
| `text-xs`      | `0.75rem`  | `12px`        | Small caption/helper text, secondary metadata. |
| `text-sm`      | `0.875rem` | `14px`        | Standard body text, compact form inputs.       |
| `text-base`    | `1.0rem`   | `16px`        | Large body text, paragraph text.               |
| `text-lg`      | `1.125rem` | `18px`        | Small headings, list item titles.              |
| `text-xl`      | `1.25rem`  | `20px`        | Main subsection headings.                      |
| `text-2xl`     | `1.5rem`   | `24px`        | Secondary section headers.                     |
| `text-3xl`     | `1.875rem` | `30px`        | Main page title headings.                      |
| `text-4xl`     | `2.25rem`  | `36px`        | Large hero page titles.                        |

---

## Theme Toggle – Auto Mode

The `ThemeToggle` component (see [`components/ThemeToggle.jsx`](../components/ThemeToggle.jsx)) allows users to cycle through three explicit preference states stored under the `liquifact-theme` localStorage key.

### States and Cycle Order

| State    | Icon    | Behaviour                                                         |
| :------- | :------ | :---------------------------------------------------------------- |
| `auto`   | Monitor | Follows the OS `prefers-color-scheme` media query live.          |
| `light`  | Sun     | Always renders the light colour palette regardless of OS setting. |
| `dark`   | Moon    | Always renders the dark colour palette regardless of OS setting.  |

Clicking the toggle advances through the cycle: **`auto` → `light` → `dark` → `auto`**.  
Pressing **ArrowRight** / **ArrowDown** also advances; **ArrowLeft** / **ArrowUp** reverses.

### Persistence

- **Storage key**: `liquifact-theme`  
- **First-time visitors** receive the `"auto"` default (nothing written until the user explicitly clicks).
- The preference is persisted via `useLocalStorage` (`lib/hooks/useLocalStorage.js`), which is SSR-safe — no read occurs during render, preventing Next.js hydration mismatches.

### Live OS Preference Subscription (`auto` mode only)

While the preference is `"auto"` the component subscribes to:

```js
window.matchMedia("(prefers-color-scheme: light)").addEventListener("change", handler);
```

The handler calls `applyTheme("auto")` to update `data-theme` on `<html>` in real time. The listener is automatically **removed** on component unmount or when the user selects an explicit preference (`"light"` or `"dark"`), preventing memory leaks.

### Accessible Labels

The `aria-label` on the toggle button must always describe **both** the stored preference and, when in `auto` mode, the currently resolved visual theme:

| Stored Preference | OS Preference | `aria-label` value |
| :---------------- | :------------ | :----------------- |
| `auto`            | dark          | `Theme: Auto (resolved: Dark) – click for Light` |
| `auto`            | light         | `Theme: Auto (resolved: Light) – click for Light` |
| `light`           | any           | `Theme: Light (click for Dark)` |
| `dark`            | any           | `Theme: Dark (click for Auto)` |

### Pre-paint Bootstrap

An inline script in `app/layout.js` reads `localStorage` before React hydrates and applies `data-theme` to `<html>`. The same `resolveTheme` and `applyTheme` helpers exported from `ThemeToggle.jsx` are used so the logic stays consistent between the pre-paint script and the React component.
