# Accessibility Statement

## Commitment

LiquiFact Frontend is committed to meeting **WCAG 2.1 AA** accessibility standards. All UI components are built with a focus on keyboard operability, screen‑reader compatibility, sufficient colour contrast, and appropriate motion handling.

## Keyboard & Screen‑Reader Patterns

- **Focus Management** – Interactive elements receive a visible focus ring (`outline: 2px solid var(--color-primary)`); focus order follows logical DOM structure. The mobile `NavMenu` disclosure moves focus to the first revealed menu link on open and returns focus to the toggle button on close.
- **ARIA Live Regions** – Used in `components/UploadZone.jsx`, `components/WalletStatus.jsx`, and `app/invest/page.js` to announce status updates to assistive technologies.
- **Landmarks** – Page layouts employ semantic HTML landmarks (`<header>`, `<main>`, `<nav>`, `<footer>`) for easy navigation.
- **Form Labels** – All form controls include associated `<label>` elements or `aria-label` attributes.
- **Button Roles** – Buttons are native `<button>` elements; where custom elements are used, `role="button"` and keyboard handlers are added.

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

| Area         | Issue                                                                   | Reference                             |
| ------------ | ----------------------------------------------------------------------- | ------------------------------------- |
| Filters      | "Soon" filter buttons are disabled and lack focus styles.               | `app/invoices/page.js` (TODO comment) |
| Motion       | Reduced‑motion handling is not yet implemented for animated components. | `components/ToastProvider.jsx`        |
| Focus Styles | Some custom SVG icons do not inherit focus outline.                     | `components/WalletStatus.jsx`         |

We are actively tracking these items in the repository’s issue tracker and will resolve them in upcoming releases.

## Contributor Accessibility Checklist

When adding or modifying UI:

- [ ] Use semantic HTML elements and appropriate ARIA attributes.
- [ ] Ensure every interactive element has a visible focus style.
- [ ] Verify colour contrast meets **AA** ratios (4.5:1 text, 3:1 large text).
- [ ] Add `role="status"` or `aria-live="polite"` for dynamic feedback.
- [ ] Test keyboard navigation (Tab, Shift+Tab, Enter, Space) across the component.
- [ ] Prefer semantic key/value structures (e.g. `<dl>/<dt>/<dd>`) for assistive-technology friendly “label + value” facts.
- [ ] Run `npm run test:accessibility` locally and fix any violations.
- [ ] Document any known accessibility gaps in this statement.

 ## Single-Announcer Pattern (Pagination)

`components/Pagination.jsx` renders a visible "Showing N of M invoices" count
for sighted users, but that paragraph does **not** carry `aria-live`.

`app/invest/page.js` owns a single `role="status"` live region that announces
every count change — on load, filter change, and after "Load more" — exactly
once. The count paragraph in `Pagination` uses `aria-hidden="true"` so
assistive technologies skip it entirely.

This prevents the double-announcement bug where two live regions fired
simultaneously, causing screen-readers to read the count twice.



## Maintenance

- Update this document whenever a new accessibility issue is closed or a new pattern is introduced.
- Keep the CI step `Test Accessibility` up‑to‑date with any additional tooling.

---

_Last updated: 2026‑06‑24_
