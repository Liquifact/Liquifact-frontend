# Navigation component contract

This note documents the current navigation component implemented by [components/NavMenu.jsx](../components/NavMenu.jsx). The component currently has no public props; it is a self-contained, route-aware header that renders the shared navigation experience across the app.

## Overview

`NavMenu` renders the site header and shared navigation for the LiquiFact app. It is responsible for the brand link, the desktop navigation links, the mobile hamburger disclosure, the network badge, and the lazy-loaded wallet UI.

Use it where a page needs the standard header/navigation chrome without adding any custom props or configuration.

## Props

The component does not currently accept any props.

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| None | — | — | — | `NavMenu` is rendered with no props and uses its internal defaults. |

## Component states

The implementation supports the following rendered states:

- **Default / closed mobile menu**: The header renders with the brand link, desktop navigation links, network badge, and the mobile toggle button.
- **Open mobile menu**: When the toggle is activated for the current pathname, the mobile menu opens and focuses the first available link.
- **Active route**: The link matching the current pathname is marked with `aria-current="page"` and uses the active-cyan styling.
- **Home-specific brand label**: When the pathname is `/` or `/home`, the brand link renders as `LiquiFact`; otherwise it renders as `← LiquiFact`.

## Minimal usage example

```jsx
import NavMenu from "@/components/NavMenu";

export default function Page() {
  return (
    <div>
      <NavMenu />
      <main>Page content</main>
    </div>
  );
}
```

## Accessibility notes

The component includes several accessibility behaviors that are implemented today:

- The mobile toggle uses `aria-expanded` and `aria-controls` to expose its disclosure state.
- The mobile menu uses a real navigation landmark (`aria-label="Mobile navigation"`) and receives focus management when opened.
- The active link exposes `aria-current="page"` for screen readers.
- The component closes on `Escape`, on outside click, and on navigation changes, returning focus to the toggle when appropriate.
- Interactive elements use the shared focus styling from the design system.
