# Accessibility Statement

## Commitment

LiquiFact Frontend is committed to meeting **WCAG 2.1 AA** accessibility standards. All UI components are built with a focus on keyboard operability, screen‑reader compatibility, sufficient colour contrast, and appropriate motion handling.

## Keyboard & Screen‑Reader Patterns

- **Focus Management** – Interactive elements receive a visible focus ring via the `.focus-ring` CSS class (`outline: 2px solid var(--color-focus-ring)`, offset 2px). Focus order follows logical DOM structure. The mobile `NavMenu` disclosure moves focus to the first revealed menu link on open and returns focus to the toggle button on close.
- **ARIA Live Regions** – Used in `components/UploadZone.jsx`, `components/WalletStatus.jsx`, `components/Pagination.jsx` (page mode), and `app/invest/page.js` to announce status updates to assistive technologies.
- **Landmarks** – Page layouts employ semantic HTML landmarks (`<header>`, `<main>`, `<nav>`, `<footer>`) for easy navigation.
- **Form Labels** – All form controls include associated `<label>` elements or `aria-label` attributes.
- **Button Roles** – Buttons are native `<button>` elements; where custom elements are used, `role="button"` and keyboard handlers are added.

### Focus‑Ring Audit

A comprehensive focus‑ring audit was performed across all interactive components to ensure
a consistent, high‑contrast focus indicator.

**Token:** `--color-focus-ring` — defined in `app/globals.css` for both themes:
  - Dark  (slate‑950 bg): `#22d3ee` (cyan‑400) → ~10:1 contrast
  - Light (slate‑50 bg):   `#0891b2` (cyan‑600) → ~3.5:1 contrast

**Utility class:** `.focus-ring:focus-visible { outline: 2px solid var(--color-focus-ring); outline-offset: 2px; }`

**Audited components:**
  - `Button` (all variants: primary, secondary, warning, external, danger)
  - `NavMenu` (brand link, desktop nav links, hamburger toggle, mobile menu links)
  - `ThemeToggle`
  - `InvoiceList` (copy‑address button, empty‑state CTA)
  - `UploadZone` (submit button)

**Automated checks:**
  - Class‑presence test in `components/focus-ring.a11y.test.tsx`
  - WCAG AA contrast verification in `app/globals.contrast-ratio.test.tsx`
  - Keyboard traversal test (Tab order) using `@testing-library/user-event`

### Roving Tabindex for Filter Chips (issue #466)

The marketplace currency filter chips (`components/InvoiceFilters.jsx`) implement a **roving tabindex** pattern conforming to the [ARIA Authoring Practices Guide (APG) toolbar pattern](https://www.w3.org/WAI/ARIA/apg/patterns/toolbar/).

**Pattern overview:**

- The currency chip group is wrapped in a `role="toolbar"` container with an `aria-label="Currency filter"` accessible name.
- Only **one chip** has `tabindex="0"` at any time (the currently focusable chip); all others have `tabindex="-1"`.
- The toolbar becomes a single keyboard tab stop, reducing the number of Tab key presses needed to navigate the page.

**Keyboard shortcuts:**

| Key          | Action                                                           |
| ------------ | ---------------------------------------------------------------- |
| **Tab**      | Moves focus into (or out of) the toolbar as a single tab stop    |
| **ArrowRight** | Moves focus to the next chip; wraps from last to first         |
| **ArrowLeft**  | Moves focus to the previous chip; wraps from first to last     |
| **Home**     | Moves focus to the first chip (USD)                              |
| **End**      | Moves focus to the last chip (CHF)                               |
| **Enter** or **Space** | Toggles the currency filter on/off (native button behavior) |

**Behavior:**

- Focus is set programmatically via `.focus()` on keyboard navigation.
- Mouse clicks update the roving tabindex so the clicked chip becomes the `tabindex="0"` element.
- Each chip retains `aria-pressed` to communicate its on/off state to assistive technologies.
- The `.focus-ring` utility class provides a consistent, high-contrast focus indicator.

**Accessibility rationale:**

- Reduces the number of tab stops on the page, improving keyboard navigation efficiency.
- Provides clear focus feedback via the `.focus-ring` class.
- Arrow-key navigation aligns with user expectations for horizontal toolbars.
- Wrap-around navigation ensures no dead-ends at either end of the chip list.

**Test coverage:**

- `components/InvoiceFilters.roving.test.tsx` — comprehensive roving tabindex tests covering:
  - toolbar role and accessible name
  - initial `tabindex="0"` assignment
  - all four arrow/Home/End key bindings
  - wrap-around behavior at both ends
  - `aria-pressed` correctness across keyboard and mouse interactions
  - focus-ring class presence (compatible with `focus-ring.a11y.test.tsx`)

### Pagination Announcements (issue #276)

`components/Pagination.jsx` announces page position to screen readers when the caller
supplies the `page`, `totalPages`, and `pageSize` props (page-based mode).

**Announcement format:**

```
Page X of Y, showing items A–B
```

**Implementation details:**

- A single `role="status" aria-live="polite" aria-atomic="true"` region is rendered
  inside the component and kept visually hidden (`sr-only`).
- The region is populated only when the `page` prop changes — initial render is skipped
  using a `useRef` guard so screen readers do not hear an announcement on first mount.
- The region is **only rendered in page mode** (when `page` and `totalPages` are
  provided). In load-more mode the region is absent entirely, preventing any conflict with
  the marketplace list announcer in `app/invest/page.js`.

**Coordination with the marketplace list announcer:**

`app/invest/page.js` owns its own `role="status" aria-live="polite"` region that
announces load results, filter counts, and load-more updates.  The `Pagination`
component is used there in load-more mode (no `page` prop), so its announcement region
is not rendered and the two live regions never compete or produce duplicate output.

Callers that adopt page-based mode should ensure they do not additionally wrap
`Pagination` in another live region for the same paging event.

## Automated Accessibility Tests (CI)

- **jest‑axe** is configured in `jest.setup.js` and executed via `npm run test`.
- CI workflow `.github/workflows/ci.yml` contains a step **"Test Accessibility"** that runs `npm run test:accessibility` (which invokes jest‑axe). Failures cause the build to break, ensuring regressions are caught early.

## WCAG Contrast‑Ratio Harness

`app/globals.contrast-ratio.test.tsx` provides a programmatic WCAG 2.1 AA contrast harness for every documented foreground/background token pairing.

### What it checks

| Pair                            | Foreground token     | Background token  | Threshold        |
| ------------------------------- | -------------------- | ----------------- | ---------------- |
| Body text                       | `--color-foreground` | `--color-bg`      | 4.5 : 1 (normal) |
| Muted text                      | `--color-muted`      | `--color-bg`      | 4.5 : 1 (normal) |
| Primary on background           | `--color-primary`    | `--color-bg`      | 4.5 : 1 (normal) |
| Skip‑link (bg on primary)       | `--color-bg`         | `--color-primary` | 4.5 : 1 (normal) |
| Primary heading (large text)    | `--color-primary`    | `--color-bg`      | 3.0 : 1 (large)  |
| Muted heading (large text)      | `--color-muted`      | `--color-bg`      | 3.0 : 1 (large)  |
| Primary focus ring (UI element) | `--color-primary`    | `--color-bg`      | 3.0 : 1 (UI)     |

### How it works

- Token hex values are read directly from `app/globals.css` using a regex — **no duplicated constants** in the test file.
- The harness includes the full WCAG 2.1 linearisation and luminance math so it runs in any Node/jsdom environment with no external colour library.
- A **coverage guard** test enumerates every `--color-*` token defined in `globals.css` and asserts each one appears in at least one `TOKEN_PAIRS` entry. Adding a new colour token without a corresponding pair causes an immediate test failure.

### Adding a new token pairing

1. Add (or update) the `--color-*` variable in `app/globals.css`.
2. Append an entry to the `TOKEN_PAIRS` array in `app/globals.contrast-ratio.test.tsx`:

```ts
{
  name:      'my new pair description',
  fg:        '--color-new-token',
  bg:        '--color-bg',
  threshold: NORMAL_TEXT,   // or LARGE_TEXT / UI_ELEMENT
  context:   'Where this pairing appears in the UI',
},
```

3. Run `npm test` — the coverage guard and pair assertion both run automatically.

## Known Limitations

| Area          | Issue                                                                           | Reference                              |
| ------------- | ------------------------------------------------------------------------------- | -------------------------------------- |
| Filters       | "Soon" filter buttons are disabled and lack focus styles.                       | `app/invoices/page.js` (TODO comment)  |
| Motion        | Reduced‑motion handling is not yet implemented for animated components.         | `components/ToastProvider.jsx`         |
| Focus Ring    | `InvoiceFilters` date inputs use `focus:border-cyan-500` instead of `.focus-ring`. | `components/InvoiceFilters.jsx`     |
| Focus Ring    | `InvoiceSearch` uses `focus:ring-2` instead of `.focus-ring`.                   | `components/InvoiceSearch.jsx`         |
| Focus Ring    | `InvoiceCard` and `Pagination` use `focus-visible:ring-2` instead of `.focus-ring`. | `components/InvoiceCard.jsx`, `Pagination.jsx` |
| Focus Ring    | `WalletStatus` SVG icons may not inherit the focus ring on all interactive elements. | `components/WalletStatus.jsx`       |

We are actively tracking these items in the repository’s issue tracker and will resolve them in upcoming releases.

## Contributor Accessibility Checklist

When adding or modifying UI:

- [ ] Use semantic HTML elements and appropriate ARIA attributes.
- [ ] Ensure every interactive element has a visible focus style.
- [ ] Add the `.focus-ring` CSS class to any new interactive element (button, link, input, toggle) for consistent focus-visible styling.
- [ ] Verify colour contrast meets **AA** ratios (4.5:1 text, 3:1 large text, 3:1 UI / focus indicator).
- [ ] Add `role="status"` or `aria-live="polite"` for dynamic feedback.
- [ ] Test keyboard navigation (Tab, Shift+Tab, Enter, Space) across the component.
- [ ] Prefer semantic key/value structures (e.g. `<dl>/<dt>/<dd>`) for assistive-technology friendly “label + value” facts.
- [ ] Run `npm run test:accessibility` locally and fix any violations.
- [ ] Run `npm test` — the focus‑ring audit suite (`focus-ring.a11y.test.tsx`) asserts that new interactive elements carry the `.focus-ring` class.
- [ ] Document any known accessibility gaps in this statement.


## Maintenance

- Update this document whenever a new accessibility issue is closed or a new pattern is introduced.
- Keep the CI step `Test Accessibility` up‑to‑date with any additional tooling.

---

_Last updated: 2026‑06‑28_
