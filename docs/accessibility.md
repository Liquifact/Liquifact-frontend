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
  provided). In load-more mode the region is absent entirely, so callers that already
  own a list announcer (for example the marketplace page) will not get competing output.

**Coordination with the marketplace list announcer:**

`app/invest/page.js` owns its own `role="status" aria-live="polite"` region that
announces load results, filter counts, and load-more updates, and currently renders an
**inline** Load more button (not `components/Pagination.jsx`). When adopting the shared
`Pagination` component on `/invest`, use it in **load-more mode** (omit `page` /
`totalPages`) so its page-mode announcer stays unmounted and the two live regions never
compete.

Callers that adopt page-based mode should ensure they do not additionally wrap
`Pagination` in another live region for the same paging event.

### Keyboard Shortcut Help (issue #464)

`components/ShortcutHelpDialog.jsx` is a discoverable, accessible modal dialog that
lists every keyboard shortcut the LiquiFact frontend advertises. It is mounted near
the root of the application (`app/layout.js`) so the dialog is reachable from any
page.

#### Opening the dialog

Press **`?`** (`Shift+/"`) from anywhere on a page to open the dialog. The shortcut
is intentionally ignored when focus is inside an `input`, a `textarea`, or any
`contenteditable` element so typing in those controls is never intercepted.
Modifer combinations such as `Ctrl+/`, `Meta+/`, or `Alt+/` are also ignored to
preserve browser-default behaviour.

#### Currently registered shortcuts

| Shortcut key | Action                                     | Scope    | Wired in                              |
| ------------ | ------------------------------------------ | -------- | ------------------------------------- |
| `/`          | Focus the marketplace search input         | Global   | `components/InvoiceSearch.jsx`        |
| `?`          | Open the keyboard shortcut help dialog     | Global   | `components/ShortcutHelpDialog.jsx`   |

The dialog renders directly from the `KEYBOARD_SHORTCUTS` array exported by
`lib/shortcuts.js`, so adding a new shortcut to the registry automatically
surfaces it in the dialog — no changes to `ShortcutHelpDialog.jsx` are required.

#### Shared registry

`lib/shortcuts.js` is the single source of truth for keyboard shortcuts and the
matcher logic that decides whether a `keydown` event should fire a shortcut. It
exports:

- `KEYBOARD_SHORTCUTS` — the list of advertised shortcuts consumed by the dialog.
- `SEARCH_SHORTCUT_KEY`, `HELP_SHORTCUT_KEY` — the canonical key strings.
- `isEditableElement(el)` / `isFocusInsideEditableElement()` — utilities to skip
  shortcuts when the user is typing in an editable control.
- `createShortcutMatcher(key, handler)` — factory that builds a `keydown` handler
  matching the given key while honouring the modifier and editable-element rules.
  Components register their listeners using this helper so the suppression rules
  stay consistent across the app.

#### Accessibility behavior

The dialog exposes the accessibility contract required by WAI‑ARIA Authoring
Practices for modal dialogs:

- `role="dialog"`, `aria-modal="true"`, and `aria-labelledby` linking the dialog
  to its visible heading.
- Focus moves into the dialog on open (the Close button receives focus first so
  screen-reader users land in an actionable element).
- Focus is **trapped** while the dialog is open: `Tab` and `Shift+Tab` cycle
  through the focusable elements inside the dialog and wrap at the boundaries.
- `Escape` closes the dialog from anywhere inside it (and from the backdrop
  region as a safety net).
- Clicks on the **backdrop** close the dialog; clicks bubbling up from inside
  the dialog card do not, because the handler tests `event.target ===
  event.currentTarget`.
- The element that held focus before the dialog opened is restored on close,
  scheduled with a microtask so focus does not visibly drop to `<body>`. If that
  element has been removed from the DOM in the meantime, the restore step is
  silently skipped.

#### Adding a new shortcut

1. Append a new entry to `KEYBOARD_SHORTCUTS` in `lib/shortcuts.js`:

   ```js
   {
     id: "my-shortcut",
     key: "g",
     description: "Jump to the invoice listing",
     scope: "page",
   }
   ```

2. Wire the behaviour in the owning component, importing the key constant and
   `createShortcutMatcher` from `lib/shortcuts.js`:

   ```js
   useEffect(() => {
     const handler = createShortcutMatcher(MY_SHORTCUT_KEY, (e) => {
       e.preventDefault();
       document.getElementById("invoice-listing")?.focus();
     });
     document.addEventListener("keydown", handler);
     return () => document.removeEventListener("keydown", handler);
   }, []);
   ```

3. Run `npm test` — `components/ShortcutHelpDialog.test.tsx` will exercise the
   registry wiring and `components/InvoiceSearch.shortcut.test.tsx` will continue
   to assert the existing `/` shortcut is preserved.

### Marketplace accessibility (issue #692)

This section is the accessibility contract for the Invest marketplace (`/invest` and
`/invest/[id]`). It documents **roles**, **keyboard interactions**, and **focus
behaviour** as implemented today. Related deep-dives live above:

- [Roving Tabindex for Filter Chips (#466)](#roving-tabindex-for-filter-chips-issue-466)
- [Pagination Announcements (#276)](#pagination-announcements-issue-276)
- [Keyboard Shortcut Help (#464)](#keyboard-shortcut-help-issue-464)

Per-component notes also live in [`COMPONENTS.md`](../COMPONENTS.md).

#### Surfaces in scope

| Surface | Primary files | Notes |
| ------- | ------------- | ----- |
| Marketplace list | `app/invest/page.js` | Search, status chips, preview filters, list, Load more |
| Invoice detail | `app/invest/[id]/page.js`, `FundActions.jsx` | Summary, timeline, fund / copy / print |
| Shared marketplace UI | `InvoiceSearch`, `InvoiceFilters` (+ `StatusLegendFilter`, `ActiveFilterSummary`), `InvoiceCard`, `Pagination`, `InvoiceListSkeleton`, `StatusPill`, `FundAmountInput`, `InvoiceTimeline`, `ErrorBanner` | Reusable contracts; some are not yet mounted on `/invest` |

**Wiring accuracy:** the live list currently renders **inline** `<li>` rows and an
**inline** Load more button. `InvoiceCard`, `Pagination`, and `ActiveFilterSummary` are
shared components with tests and documented contracts; adopt them without changing the
live-region ownership rules below.

#### Roles and ARIA (list page)

| Element | Role / ARIA | Purpose |
| ------- | ----------- | ------- |
| List announcer | `role="status"` · `aria-live="polite"` · `aria-atomic="true"` · `sr-only` | Announces load, filter, and “Showing N of M” updates |
| Search input | `aria-label` (from page copy) | Names the issuer search field |
| Status chips | `role="group"` · `aria-pressed` per chip · Clear `aria-label` | Multi-select status filter (`StatusLegendFilter`) |
| Advanced filters wrapper | `<fieldset aria-disabled="true" aria-describedby="filters-coming-soon">` · `sr-only` `<legend>` | Preview “coming soon” filters while keeping controls discoverable |
| Currency chips (inside `InvoiceFilters`) | `role="toolbar"` · roving `tabindex` · `aria-pressed` | See [#466](#roving-tabindex-for-filter-chips-issue-466) |
| Yield / maturity / sort controls | `sr-only` legends · control `aria-label`s | Accessible names for numeric and date filters |
| Invoice list | `<ul aria-label="…">` | Named list of investable invoices |
| Issuer link (inline row) | Native `<Link>` with visible text | Focusable navigation to detail |
| Load more | `<button>` · `aria-label` | Appends the next page of results |
| Load failure | `ErrorBanner` → `role="alert"` · `aria-live="assertive"` | Error + retry; assertive so it supersedes the polite announcer |
| Loading skeleton | `ul aria-busy="true"` · labelled | Busy state while invoices load |
| Route loading shells | `aria-busy="true"` on root | `/invest/loading.js`, `/invest/[id]/loading.js` |

#### Roles and ARIA (detail page)

| Element | Role / ARIA | Purpose |
| ------- | ----------- | ------- |
| Main landmark | `<main id="main-content">` | Skip-link target |
| Back link | `aria-label` | Return to marketplace |
| Summary | `<section aria-labelledby="…">` | Labels the invoice facts region |
| Status | `StatusPill` → `role="status"` · `aria-label="Status: …"` | Text + tone (not colour-only) |
| Timeline | `<section>` · `<ol aria-label>` · `aria-current="step"` | Lifecycle stages |
| Fund / Copy / Print | Constant `aria-label`s on native buttons | Actions stay named when labels are icon-heavy |
| Fund amount | `aria-describedby` · `aria-invalid` · error `role="alert"` · yield `aria-live="polite"` | Validation and expected yield feedback |

#### Keyboard interactions

| Key | Where | Action |
| --- | ----- | ------ |
| **Tab** / **Shift+Tab** | Entire marketplace | Moves through search, status chips, preview filter controls, issuer links, Load more, and detail actions in DOM order |
| **/** | Global (list) | Focuses the marketplace search input (`InvoiceSearch` via `lib/shortcuts.js`); ignored inside editable fields |
| **?** | Global | Opens the shortcut help dialog ([#464](#keyboard-shortcut-help-issue-464)) |
| **Enter** / **Space** | Buttons and chips | Activates Load more, status / currency chips, Clear, Fund / Copy / Print |
| **ArrowLeft** / **ArrowRight** / **Home** / **End** | Currency toolbar | Roving focus inside the currency chip toolbar ([#466](#roving-tabindex-for-filter-chips-issue-466)) |
| **Escape** | Shortcut help dialog | Closes the dialog and restores prior focus |

Status chips use **normal Tab** stops (each chip is its own tab stop). Only the currency
toolbar uses the roving-tabindex pattern.

#### Focus behaviour

- **Load more:** after a successful append, focus is restored to the Load more button via
  `loadMoreRef` when the button remains mounted (hidden once all items are visible).
- **Search shortcut:** `/` calls `inputRef.focus()` on the search field.
- **Preview filters fieldset:** `aria-disabled="true"` (not native `disabled`) keeps
  controls in the tab order and discoverable; interaction is blocked with
  `pointer-events-none` and no-op handlers while the “Soon” badge is linked via
  `aria-describedby`.
- **Shared `Pagination`:** forwards a ref to the Load more button for the same
  focus-restore pattern when adopted by callers.
- **Detail actions / search:** use cyan `focus-visible` / `focus:ring` outlines (some
  surfaces still use Tailwind rings instead of `.focus-ring` — see Known Limitations).
- **Shortcut dialog:** focus moves in on open, is trapped while open, and restores to
  the previously focused element on close.

#### Shared components not currently mounted on `/invest`

| Component | Contract to preserve when wiring |
| --------- | -------------------------------- |
| `InvoiceCard` | Whole card is one `Link` with a composed `aria-label` (issuer + optional status); embeds `StatusPill` |
| `Pagination` | Load-more mode: named button + forwarded ref; page mode: hidden status announcer only when `page` / `totalPages` are set |
| `ActiveFilterSummary` | `ul aria-label="Active filters"`; remove chips with `aria-label={`Remove ${label}`}`; decorative `×` is `aria-hidden` |

#### Test pointers

| Area | Test file(s) |
| ---- | ------------ |
| Coming-soon fieldset | `app/invest/filters.a11y.test.tsx` |
| List live region / Load more | `app/invest/page.test.jsx`, `tests/invest.spec.jsx` |
| Currency roving tabindex | `components/InvoiceFilters.roving.test.tsx` |
| Search `/` shortcut | `components/InvoiceSearch.shortcut.test.tsx` |
| Card / status / timeline / fund input | `components/InvoiceCard.test.tsx`, `StatusPill.test.tsx`, `InvoiceTimeline.test.tsx`, `FundAmountInput.test.tsx` |
| Pagination announcer | `components/Pagination.announce.test.tsx` |
| Detail labels | `app/invest/[id]/page.test.tsx` |

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

_Last updated: 2026‑07‑26_
