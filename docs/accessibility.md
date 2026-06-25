# Accessibility Statement

## Commitment

LiquiFact Frontend is committed to meeting **WCAG 2.1 AA** accessibility standards. All UI components are built with a focus on keyboard operability, screen‑reader compatibility, sufficient colour contrast, and appropriate motion handling.

## Keyboard & Screen‑Reader Patterns

- **Focus Management** – Interactive elements receive a visible focus ring (`outline: 2px solid var(--color-primary)`); focus order follows logical DOM structure.
- **ARIA Live Regions** – Used in `components/UploadZone.jsx`, `components/WalletStatus.jsx`, and `app/invest/page.js` to announce status updates to assistive technologies.
- **Single Announcer for Pagination** – `components/Pagination.jsx` keeps the visible "Showing N of M" count non-live. The owning page status region announces pagination changes so assistive technologies hear each update once.
- **Landmarks** – Page layouts employ semantic HTML landmarks (`<header>`, `<main>`, `<nav>`, `<footer>`) for easy navigation.
- **Form Labels** – All form controls include associated `<label>` elements or `aria-label` attributes.
- **Button Roles** – Buttons are native `<button>` elements; where custom elements are used, `role="button"` and keyboard handlers are added.

## Automated Accessibility Tests (CI)

- **jest‑axe** is configured in `jest.setup.js` and executed via `npm run test`.
- CI workflow `.github/workflows/ci.yml` contains a step **"Test Accessibility"** that runs `npm run test:accessibility` (which invokes jest‑axe). Failures cause the build to break, ensuring regressions are caught early.

## Known Limitations

| Area | Issue | Reference |
|------|-------|-----------|
| Filters | "Soon" filter buttons are disabled and lack focus styles. | `app/invoices/page.js` (TODO comment) |
| Motion | Reduced‑motion handling is not yet implemented for animated components. | `components/ToastProvider.jsx` |
| Focus Styles | Some custom SVG icons do not inherit focus outline. | `components/WalletStatus.jsx` |

We are actively tracking these items in the repository’s issue tracker and will resolve them in upcoming releases.

## Contributor Accessibility Checklist

When adding or modifying UI:
- [ ] Use semantic HTML elements and appropriate ARIA attributes.
- [ ] Ensure every interactive element has a visible focus style.
- [ ] Verify colour contrast meets **AA** ratios (4.5:1 text, 3:1 large text).
- [ ] Add `role="status"` or `aria-live="polite"` for dynamic feedback.
- [ ] Test keyboard navigation (Tab, Shift+Tab, Enter, Space) across the component.
- [ ] Run `npm run test:accessibility` locally and fix any violations.
- [ ] Document any known accessibility gaps in this statement.

## Maintenance

- Update this document whenever a new accessibility issue is closed or a new pattern is introduced.
- Keep the CI step `Test Accessibility` up‑to‑date with any additional tooling.

---

*Last updated: 2026‑06‑24*
