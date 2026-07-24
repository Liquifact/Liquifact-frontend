# LiquiFact Frontend

Web app for **LiquiFact** — the global invoice liquidity network on Stellar. Next.js dashboard for SMEs (upload invoices, get liquidity) and investors (fund tokenized invoices, earn yield). Stellar wallet integration is planned.

Part of the LiquiFact stack: **frontend** (this repo) | **backend** (Express API) | **contracts** (Soroban).

---

## Prerequisites

- **Node.js** 20+ (LTS recommended)
- **npm** 9+

---

## Setup

1. **Clone the repo**

   ```bash
   git clone <this-repo-url>
   cd liquifact-frontend
   ```

2. **Install dependencies**

   ```bash
   npm ci
   ```

3. **Configure environment** (optional)

   ```bash
   cp .env.local.example .env.local
   # Set NEXT_PUBLIC_API_URL if the API is not at http://localhost:3001
   # Set NEXT_PUBLIC_STELLAR_NETWORK for Freighter integration (default: testnet)
   ```

---

## Architecture

New to the codebase? Start with the
[Frontend Architecture & Data Flow guide](docs/architecture.md) — it maps the
App Router routes (and their loading/error files), the mock-vs-live data layers,
and where wallet/toast/theme state lives.

For the exact invoice fixture shape, formatted-versus-raw value rules, and the
API migration seam, see the [Invoice data contract](docs/invoice-data.md).

---

## API Integration

For frontend/backend contract details see:

docs/api-integration.md

---

## Development

| Command            | Description                                             |
| ------------------ | ------------------------------------------------------- |
| `npm run dev`      | Start dev server (Turbopack)                            |
| `npm run lint`     | Run ESLint                                              |
| `npm test`         | Run Jest/jsdom unit and accessibility tests             |
| `npm run build`    | Production build                                        |
| `npm run start`    | Start production server                                 |
| `npm run test:e2e` | Run Playwright smoke tests (toast & invest marketplace) |

### Environment variables

For the full reference — purpose, defaults, required-vs-optional, and consuming module for every variable — see **[docs/configuration.md](docs/configuration.md)**.

Quick summary:

| Variable | Required | Default | Used by |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | No | `http://localhost:3001` | `lib/api/invoices.js`, `app/page.js` |
| `NEXT_PUBLIC_SITE_URL` | No | `http://localhost:3000` | `app/layout.js`, `app/sitemap.js`, `app/robots.js` |
| `NEXT_PUBLIC_STELLAR_NETWORK` | No | *(unset)* | `lib/wallet/freighter.js` |

`NEXT_PUBLIC_*` values are inlined by Next.js at **build time** and shipped to the browser. **Never store secrets here.**

#### Build-time validation

All `NEXT_PUBLIC_*` variables are validated by [`lib/config/env.js`](lib/config/env.js) when the module is first imported, and the resulting config object is **frozen** so it cannot be mutated at runtime. Consumers (`app/page.js`, `lib/api/invoices.js`, `components/UploadZone.jsx`, `components/WalletProvider.jsx`) read the validated value instead of `process.env` directly.

Validation rules:

- **`NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_SITE_URL`** — must parse via `new URL(...)` **and** use an `http:` or `https:` scheme. Disallowed schemes (`javascript:`, `data:`, `file:`, `ftp:`, …) are rejected so a hostile value can never flow into a `fetch()` URL or CSP origin.
- **`NEXT_PUBLIC_STELLAR_NETWORK`** — optional; when set it must be one of `testnet` or `public`. An empty string is treated as unset.

If any variable is invalid, the build fails immediately with a message listing every problem:

```
[env] Environment misconfiguration — fix before deploying:
  • NEXT_PUBLIC_API_URL: "not-a-url" is not a valid URL
  • NEXT_PUBLIC_API_URL: "javascript:alert(1)" uses a disallowed scheme "javascript:" — only http/https are permitted
  • NEXT_PUBLIC_STELLAR_NETWORK: "mainnet" must be one of [testnet, public]
```

Unset variables fall back to their defaults and do **not** cause a build error.

The invoices page header also uses the shared `NavMenu` component, replacing the old bespoke header so navigation and wallet entry stay consistent across routes.

### Marketplace search

The Invest page (`app/invest/page.js`) includes an issuer search field (`components/InvoiceSearch.jsx`) above the invoice list.

| Behaviour | Detail |
| --------- | ------ |
| **Component** | `InvoiceSearch` — controlled text input rendered above the filter panel |
| **Match strategy** | Case-insensitive substring match on the `issuer` field |
| **Debounce** | `SEARCH_DEBOUNCE_MS` (300 ms) — `debouncedSearch` state lags `searchQuery` so the DOM stays responsive while filtering waits for settled input |
| **Filter wiring** | `filteredInvoices` (useMemo) applies `debouncedSearch` first, then the panel filters (currency, yield range, maturity range), then sort |
| **Screen-reader announcement** | A polite `aria-live` region calls `getInvoiceLoadAnnouncement(invoices, { filterActive, filteredCount })` — when a filter is active it announces _"N of M invoices match"_; when the full list is shown it announces _"N investable invoices loaded"_ |
| **No-match state** | Zero filtered results shows _"No invoices match your filters."_ — a distinct empty state separate from the zero-invoices marketplace state |
| **Cleared query** | Clearing the search field (or removing all panel filters) restores the full unfiltered list and re-announces the total count |

#### `getInvoiceLoadAnnouncement` signature

```js
// app/invest/page.js
/**
 * Returns the screen-reader announcement text for the current list state.
 *
 * @param {Array}   invoices              - The full (unfiltered) invoice array.
 * @param {object}  [options]
 * @param {boolean} [options.filterActive]  - True when any search/panel filter is applied.
 * @param {number}  [options.filteredCount] - Number of invoices matching the active filter(s).
 * @returns {string}
 */
export function getInvoiceLoadAnnouncement(invoices, { filterActive, filteredCount } = {})
```

Both `filterActive` and `filteredCount` are computed inside `InvestMarketplace` from live state (`hasAnyActiveFilters(filters, debouncedSearch)` and `filteredInvoices.length`) and are passed in explicitly — the function itself has no implicit dependencies on component state.

### Error recovery

If the marketplace fails to load invoices, an `ErrorBanner` is rendered with a **"Try again"** action. Clicking it resets the component to the loading skeleton, cancels any stale in-flight request via `AbortController`, and re-invokes `loadInvoices`. The polite `aria-live` status region is cleared on retry and re-announced once the new load settles.

### Error and Not-Found Boundaries

LiquiFact ships three App Router boundary files that replace Next.js's default plain-white error and 404 pages with branded, accessible versions consistent with the dark slate/cyan theme.

| File | When activated | Key behaviour |
|---|---|---|
| `app/error.js` | Any segment throws during render or data-fetching | Wraps `ErrorBanner`; logs via `reportError`; exposes a **Try again** reset button |
| `app/not-found.js` | `notFound()` is called, or no route matches the URL | Branded 404 with decorative status code and a home link |
| `app/global-error.js` | `app/layout.js` itself throws (rare, layout-level) | Must render `<html>`/`<body>` itself; uses inline styles as a defensive fallback |

#### `app/error.js`

- **Client component** (`"use client"`) — required by Next.js for the `reset` prop.
- Calls `reportError(error, { digest: error.digest })` inside a `useEffect` so errors are forwarded to the pluggable observability sink (swap `console.error` for Sentry/Datadog via `lib/observability/reportError.js`).
- `error.digest` is the server-side opaque identifier that correlates browser errors with server logs — it is never exposed in the UI.
- The **Try again** button calls the `reset()` function provided by Next.js, which unmounts and re-mounts the failed subtree without a full navigation.
- All copy strings are sourced from `copy.error.*` in `app/copy/en.js`.

#### `app/not-found.js`

- **Server component** — no `"use client"` directive needed.
- The decorative "404" badge is `aria-hidden="true"` so screen readers hear only the meaningful `<h1>`.
- The **"← Back to LiquiFact"** link uses the `.focus-ring` utility for a consistent, theme-aware keyboard outline.
- All copy strings are sourced from `copy.notFound.*` in `app/copy/en.js`.

#### `app/global-error.js`

- **Client component** — required by Next.js for `reset`.
- Renders its own `<html>` and `<body>` tags (Next.js requirement at the layout boundary).
- Uses **inline styles** rather than Tailwind classes as a defensive measure — at this error level the global CSS bundle may not have loaded.
- The error container uses `role="alert"` / `aria-live="assertive"` so screen readers immediately announce the critical failure.
- All copy strings are sourced from `copy.globalError.*` in `app/copy/en.js`.

#### Adding new copy

All user-visible strings live in `app/copy/en.js`. To change wording, update the relevant key under `copy.error`, `copy.notFound`, or `copy.globalError` — never inline strings directly in the boundary files.

### i18n / Copy Convention

All user-facing strings are externalised into a single typed dictionary at `app/copy/en.js`. This ensures:

- **Single source of truth** — every visible string has a canonical key, making copy edits and future localisation straightforward.
- **Typed shape** — the dictionary is documented with a `@typedef` JSDoc comment describing every top-level namespace and its string keys, so missing keys are caught during code review.
- **No inline strings** — components and pages must import `copy` from `app/copy/en` and reference keys rather than hard-coding user-visible text.

**Convention checklist when adding new UI:**

1. Add every user-visible string to `app/copy/en.js` under the appropriate namespace (`invest`, `wallet`, `uploadZone`, `error`, etc.).
2. Update the `@typedef` JSDoc block at the top of `app/copy/en.js` to document new keys.
3. Import `copy` in your component and reference the key directly (e.g., `copy.invest.title`).
4. For strings with dynamic values, use `{placeholder}` tokens and call `.replace("{placeholder}", value)` at the call site.
5. Add a key-presence assertion in `app/copy/en.test.tsx` for new keys.

**Template placeholder conventions:**

- Use `{placeholderName}` tokens in dictionary strings that need dynamic interpolation.
- Call `.replace("{placeholderName}", value)` at the render site — never concatenate or interpolate inline.
- All placeholders in `app/copy/en.js` are documented in `app/copy/en.test.tsx` via the "template placeholder consistency" describe block.

### File Upload Security

The invoice upload system (`components/UploadZone.jsx`) implements comprehensive security validation for PDF files:

- **Magic byte validation**: Verifies files start with `%PDF-` magic bytes to prevent MIME type spoofing
- **Zero-byte rejection**: Blocks empty files (0 bytes) to prevent processing invalid files
- **Extension validation**: Ensures file extension matches `.pdf` (case-insensitive)
- **Content-extension mismatch detection**: Rejects files where the extension doesn't match the actual content
- **Filename sanitization**: Escapes HTML special characters in filenames to prevent XSS attacks
- **Filename length capping**: Truncates displayed filenames to 50 characters to prevent layout abuse

All validation is performed client-side using the `lib/validation/pdf.js` helper functions:

- `isPdfMagicValid(file)` - Checks PDF magic bytes
- `validatePdfFile(file)` - Comprehensive validation including size, extension, and content
- `sanitizeFilename(filename, maxLength)` - Sanitizes and truncates filenames for safe display

The validation never executes or trusts file content - it only inspects the file's bytes and metadata.

---

## Project structure

```
liquifact-frontend/
├── app/
│   ├── layout.js           # Root layout, LiquiFact metadata
│   ├── page.js             # Home (wallet CTA, API health check)
│   ├── error.js            # Route-level error boundary (uses ErrorBanner)
│   ├── not-found.js        # Global 404 boundary (branded, home link)
│   ├── global-error.js     # Layout-level error boundary (renders html/body)
│   ├── copy/en.js          # Centralised UI copy
│   ├── invoices/           # SME invoice upload page
│   └── invest/             # Investor marketplace
│       ├── page.js         # Marketplace list (links to detail)
│       ├── loading.js      # Marketplace skeleton
│       ├── lib.js          # Mock invoice data + helpers
│       └── [id]/           # Invoice detail + funding CTA
│           ├── page.js     # Full invoice details
│           ├── loading.js  # Detail skeleton
│           └── not-found.js # Unknown invoice fallback
├── components/
│   ├── WalletStatus.jsx    # Wallet connection UI
│   ├── WalletProvider.jsx  # Single source of truth for shared wallet state
│   └── UploadZone.jsx      # Invoice upload with security validation
├── lib/
│   └── validation/
│       └── pdf.js          # PDF validation helpers (magic bytes, sanitization)
├── public/
├── .env.local.example
├── eslint.config.mjs
└── package.json
```

Tech: **Next.js 16** (App Router), **React 19**, **Tailwind CSS 4**.

---

## Accessibility

### Skip-to-content link

A visually-hidden "Skip to content" link is the first focusable element on every page. It becomes visible when focused (first Tab press) and jumps the keyboard user past the navigation header directly to `<main id="main-content">`.

All interactive elements (nav links, card links, buttons) use a consistent `focus-visible` cyan outline that matches the brand's primary colour. The utility classes are defined in `app/globals.css`:

- `.skip-link` — positions and reveals the skip link on focus
- `.focus-ring` — reusable `focus-visible` outline for custom interactive elements

### Home page heading structure

The home page uses a single `<h1>` for the hero title and `<h2>` headings for the two CTA cards only. The "API status" panel label is a `<p>`, not a heading, so it does not appear in the heading outline.

---

## CI/CD

GitHub Actions runs on every push and pull request to `main`:

- **Lockfile check** — asserts `package-lock.json` is in sync with `package.json`
- **Lint** — `npm run lint`
- **Build** — `npm run build`

Keep all checks passing before opening a PR.

To reproduce the lockfile check locally:

```bash
npm install --package-lock-only --ignore-scripts
git diff --exit-code package-lock.json  # exits 1 if drifted
```

---

## Dependency updates

Dependabot opens weekly PRs on Monday to keep npm packages and GitHub Actions current.

PRs are grouped to limit noise:

- **nextjs-react** — `next`, `react`, `react-dom`, and their `@types` packages together (coordinated bumps).
- **dev-tooling** — all remaining `devDependencies` in one PR.
- **github-actions** — action version bumps in a separate PR.

**Reviewing a Dependabot PR**

1. Check the CI run passes (lockfile check + lint + build).
2. Scan the changelog/release notes linked in the PR description for breaking changes.
3. For `nextjs-react` bumps, do a quick smoke test (`npm run dev`) locally.
4. Approve and merge — **do not enable auto-merge**; every dependency bump requires a human reviewer.

---

## Contributing

See CONTRIBUTING.md for the full contributor workflow, branch naming convention, local checks, and accessibility expectations. Also see our Accessibility Statement.

1. **Fork** the repo and clone your fork.
2. **Create a branch** from `main`: `git checkout -b feature/your-feature` or `fix/your-fix`.
3. **Setup**: `npm ci`, optionally `cp .env.local.example .env.local`.
4. **Make changes**:
   - Follow existing patterns under `app/` and `components/`.
   - Run `npm run lint` and `npm run build` locally.
5. **Commit** with clear messages (e.g., `feat: add X`, `fix: Y`).
6. **Push** to your fork and open a **Pull Request** to `main`.
7. Wait for CI and address review feedback.

We welcome UI improvements, new pages (e.g., invoice upload, marketplace), and Stellar wallet integration aligned with the LiquiFact product.

---

## UI Components

See COMPONENTS.md for the full component library reference — props, accessibility notes, and usage examples for every shared component (`ErrorBanner`, `Footer`, `InvoiceListSkeleton`, `ToastProvider`, `UploadZone`, `WalletProvider`, `WalletStatus`).

- **WalletStatus Button variants**: `WalletStatus` delegates all button rendering to the shared `Button` component. `getStateConfig` returns a `buttonVariant` key that maps directly to `<Button variant={config.buttonVariant}>`. The `loading` prop is derived independently (`state === WALLET_STATES.CONNECTING`) so `Button` can render its own `Spinner` and set `aria-busy`. The mapping is:

  | Wallet state   | `buttonVariant` | Visual signal                          |
  | -------------- | --------------- | -------------------------------------- |
  | DISCONNECTED   | `primary`       | Cyan CTA — invites connection          |
  | CONNECTING     | `primary`       | Cyan + spinner via `loading=true`      |
  | CONNECTED      | `secondary`     | Muted — signals destructive disconnect |
  | ERROR          | `primary`       | Cyan — re-invites retry                |
  | WRONG_NETWORK  | `warning`       | Amber — user must switch network       |
  | NO_WALLET      | `external`      | Violet — opens install URL             |

- **UploadZone Progress Indicator**: During the upload phase, if a `progress` prop (number between `0` and `100`) is supplied to `UploadZone`, a determinate progress bar (`role="progressbar"`) is displayed. If no `progress` is supplied, it falls back to an indeterminate spinner. Smooth transitions are disabled when `prefers-reduced-motion` is active.
- **UploadZone Reset Flow**: After a successful upload (status = `"success"`), an **"Upload another invoice"** button appears below the success message. Clicking it:
  - Clears the file, error, and status back to their initial (idle) values.
  - Clears the hidden file `<input>` so the same file can be re-selected.
  - Moves focus to the dropzone, enabling keyboard users to immediately start a fresh upload without re-navigating.
  The reset flow is tested for: button visibility in success state, state clearing (file, error, status), re-upload after reset, stale error clearing, and focus management. The success message's `role="status"` / `aria-live="polite"` region is preserved and cleared on reset.
- **WalletStatus button variant alignment** (fix: `refactor/wallet-02-fix-button-config`): `WalletStatus` now passes `variant={config.buttonVariant}` and `loading={state === WALLET_STATES.CONNECTING}` correctly to `Button`. The previous `getStateConfig` returned `buttonVariant: "loading"` for the connecting state — but `"loading"` is not a valid `Button` variant (`primary | secondary | warning | external | danger`), which caused `variantStyles["loading"]` to be `undefined` and silently broke the button's className. The fix:
  - CONNECTING state now uses `buttonVariant: "primary"` (the loading spinner is rendered by `Button` via `loading={true}` and `aria-busy="true"`).
  - `getStateConfig` is extracted to module scope with `walletData` and `error` as explicit parameters.
  - `aria-describedby` on the wallet button is omitted when the connected address row is displayed (the `#wallet-helper-text` span is absent in that state, so the attribute would be a dangling IDREF reference).
  - No inline spinner SVG is needed in `WalletStatus` — `Button`'s built-in `Spinner` handles it.


## Invoice List

The invoices page now renders an SME invoice table below `UploadZone` using `InvoiceList`.

- `InvoiceList` accepts an injectable `loadInvoices` prop so data loading can be mocked during tests and swapped for a backend API later.
- While invoices are loading, it renders `InvoiceListSkeleton` and exposes a polite `aria-live` status region for assistive technology.
- If no invoices are returned, it shows `copy.invoices.emptyState` text.
- If invoice loading fails, an accessible `ErrorBanner` is displayed with localized fallback copy.
- After `UploadZone` successfully uploads a document, `onUploadSuccess` appends a new optimistic invoice entry immediately without requiring a manual browser refresh.

### Wallet connection (`WalletProvider`)

Wallet state is shared app-wide via `WalletProvider`, mounted in `app/layout.js` inside `ToastProvider`. Any client component can read connection state with `useWallet()`:

```jsx
import { useWallet } from "@/components/WalletProvider";

function FundInvoiceButton() {
  const { state, walletData, connect, disconnect } = useWallet();

  if (state !== "connected") {
    return (
      <button type="button" onClick={() => connect()}>
        Connect wallet
      </button>
    );
  }

  return <span>Ready to fund as {walletData.address}</span>;
}
```

**Persistence:** On successful connect, a minimal snapshot is saved to `localStorage` under `liquifact-wallet-snapshot`:

| Field                  | Persisted | Notes                                              |
| ---------------------- | --------- | -------------------------------------------------- |
| `version`              | Yes       | Schema version (`1`)                               |
| `state`                | Yes       | Only `connected` is restored                       |
| `address`              | Yes       | Truncated display form only (e.g. `GABC...XYZ123`) |
| `network`              | Yes       | `public` or `testnet`                              |
| `balance`              | **No**    | Fetched live after real wallet integration         |
| Private keys / secrets | **Never** | Rejected on read if detected                       |

The provider rehydrates from storage **after mount** (SSR-safe). `disconnect()` clears storage immediately. See WALLET_INTEGRATION_CONTRACT.md for the full integration contract.

### NavMenu

`components/NavMenu.jsx` — Responsive site-wide header navigation used on every page.

**Props**

| Prop            | Type       | Default            | Description                                      |
| --------------- | ---------- | ------------------ | ------------------------------------------------ |
| `walletLabel`   | `string`   | `'Connect Wallet'` | Label text rendered inside the wallet button     |
| `onWalletClick` | `function` | `undefined`        | Callback fired when the wallet button is clicked |

**Behaviour**

- **Desktop (≥ `md` breakpoint):** Home, Invoices, and Invest links render inline in the header row alongside the wallet button.
- **Mobile (< `md` breakpoint):** Nav links are hidden behind a hamburger toggle (☰). Clicking the toggle reveals a dropdown menu below the header bar.
- The active route is detected automatically via `usePathname` and marked with `aria-current="page"` on the matching link.
- The menu closes on **Escape** (with focus returned to the toggle button), on any navigation event (pathname change), or when the toggle is clicked again.
- Passes `jest-axe` accessibility checks in both open and closed states. The toggle exposes `aria-expanded` and `aria-controls` so assistive technologies can correctly announce the disclosure state.

**Usage**

```jsx
import NavMenu from "@/components/NavMenu";

// Drop-in replacement for the static <header> on any page
export default function MyPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <NavMenu />
      <main>...</main>
    </div>
  );
}

// With Stellar wallet integration
<NavMenu walletLabel="Freighter" onWalletClick={handleConnectWallet} />;
```

---

## Design Tokens

Global tokens are defined in `app/globals.css` and used across all components. For a comprehensive, detailed list of all colors, spacing, radii, and typography tokens, see the [Design Token Reference](docs/design-tokens.md) document.

| Token             | Value     | Tailwind equivalent |
| ----------------- | --------- | ------------------- |
| `--color-bg`      | `#020617` | `slate-950`         |
| `--color-primary` | `#22d3ee` | `cyan-400`          |

- **Typography**
  - Font family: **Geist** – imported via `@fontsource/geist`.
  - Headings use `font‑bold`, body uses `font‑regular`.

---

## Testing

See [TESTING.md](TESTING.md) for the full guide covering Jest unit/accessibility tests and Playwright end‑to‑end setup.

## Backend Health Check

The home page health check now:

- Uses an 8 second timeout.
- Aborts hung requests.
- Safely handles HTML and malformed JSON responses.
- Reports one of the following status states with distinct visual treatments:
  - **Connected** (green badge with ✓ icon) — Backend is healthy and responding correctly
  - **Degraded** (amber badge with ⚠ icon) — Backend responded but with an error status (e.g., HTTP 500)
  - **Unreachable** (red badge with ✕ icon) — Backend could not be reached or request timed out

- Provides a detailed disclosure for raw responses behind an expandable `<details>` element
- Status changes are announced politely via `aria-live="polite"` for accessibility
- Badges include both color and text/icons (not color-only) to meet accessibility requirements

## Contracts

- WALLET_INTEGRATION_CONTRACT.md
- FILTER_CONTRACTS.md

---

## Security

- **Bounded health rendering** — The home page displays the backend `/health` response
  through a bounded pipeline: recognised fields (`status`, `message`, `version`) are
  extracted and shown in a structured summary. The full payload is hidden behind a
  collapsible `<details>` element and stringified via a depth-limited (max 5 levels),
  length-truncated (max 2000 characters) formatter (`lib/format/safeJson.js`).
  This prevents DoS from giant or deeply nested attacker-controlled payloads.

### HTTP security headers & Content-Security-Policy

Every response carries a baseline set of security headers, attached via the
`headers()` function in `next.config.mjs`. The values are built by
`lib/securityHeaders.mjs` (a small pure module so the policy
can be unit-tested and later reused by middleware for per-request nonces). Coverage is
asserted in `security/headers.test.tsx`.

| Header                       | Value                                                     | Purpose                                                        |
| ---------------------------- | --------------------------------------------------------- | -------------------------------------------------------------- |
| `Content-Security-Policy`    | see below                                                 | Primary defence against XSS / data injection                   |
| `X-Content-Type-Options`     | `nosniff`                                                 | Stops MIME-sniffing away from the declared type                |
| `Referrer-Policy`            | `strict-origin-when-cross-origin`                         | Avoids leaking invoice/wallet IDs in the `Referer`             |
| `X-Frame-Options`            | `DENY`                                                    | Legacy clickjacking protection (complements `frame-ancestors`) |
| `Permissions-Policy`         | `camera=(), microphone=(), geolocation=(), payment=(), …` | Disables unused powerful browser features                      |
| `Strict-Transport-Security`  | `max-age=63072000; includeSubDomains; preload`            | Forces HTTPS (ignored over plain http/localhost)               |
| `Cross-Origin-Opener-Policy` | `same-origin`                                             | Isolates the browsing context group                            |

**Content-Security-Policy directives** (each is annotated in `lib/securityHeaders.mjs`):

| Directive                                 | Value                                                       | Why                                                                                                                                                                                                                                                                                                            |
| ----------------------------------------- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `default-src`                             | `'self'`                                                    | Deny-by-default for anything not listed below                                                                                                                                                                                                                                                                  |
| `script-src`                              | `'self' 'unsafe-inline'` (+ `'unsafe-eval'` in dev only)    | Next.js App Router injects an inline bootstrap script. `'unsafe-eval'` is added **only** under `next dev` for React Fast Refresh and never ships to production                                                                                                                                                 |
| `style-src`                               | `'self' 'unsafe-inline' https://fonts.googleapis.com`       | `'unsafe-inline'` is required because **next/font** and Tailwind/Next inject inline `<style>` tags and `style` attributes (critical CSS + font variables) that are generated per build and cannot be hashed ahead of time. This relaxation is scoped to styles only — scripts stay far more tightly controlled |
| `font-src`                                | `'self' https://fonts.gstatic.com data:`                    | Geist is self-hosted by `next/font` at build time; the Google Fonts host and `data:` are defensive fallbacks                                                                                                                                                                                                   |
| `connect-src`                             | `'self' <NEXT_PUBLIC_API_URL origin>` (+ `ws: wss:` in dev) | **Allow-lists the backend API origin** so the home page health check and future `fetch()` calls are not blocked. `ws:`/`wss:` are added only in dev for Hot Module Replacement                                                                                                                                 |
| `img-src`                                 | `'self' data: blob:`                                        | Inline/generated images and the favicon                                                                                                                                                                                                                                                                        |
| `frame-ancestors`                         | `'none'`                                                    | Blocks the app from being framed (clickjacking)                                                                                                                                                                                                                                                                |
| `base-uri` / `object-src` / `form-action` | `'self'` / `'none'` / `'self'`                              | Prevent `<base>` hijacking, plugins, and off-origin form posts                                                                                                                                                                                                                                                 |

The backend origin is read from `NEXT_PUBLIC_API_URL` (default `http://localhost:3001`).
If you point the app at a different backend, that origin is automatically added to
`connect-src` — no manual CSP edit needed.

#### Verifying the headers at runtime

```bash
npm run build && npm run start
# in another shell:
curl -sI http://localhost:3000 | grep -i -E 'content-security-policy|x-frame|referrer|permissions|content-type-options'
```

Load each page (`/`, `/invoices`, `/invest`) with DevTools open and confirm there are
**no CSP violation messages** in the console, that the Geist font renders, and that the
**Check API Health** button still reaches the backend.

#### Threat-model note

These headers harden the app ahead of wallet and API integration that will handle
financial data. The CSP is the main mitigation for **cross-site scripting** — even if
attacker-controlled markup reaches the DOM, it cannot load off-origin scripts, exfiltrate
data to an unlisted host (`connect-src`), or be framed for clickjacking (`frame-ancestors`).
`nosniff` and `Referrer-Policy` close common information-leak / content-confusion vectors.
The known residual is `'unsafe-inline'` for **styles** (not scripts): CSS-only injection
remains possible, which is low-impact compared to script execution. The planned next step
is to move to per-request **nonces** via `middleware.js`, which would let us drop
`'unsafe-inline'` from `script-src` entirely.

### Notes about newly added tests

- `app/page.test.tsx` — Unit tests covering the Home page API health check interaction (success, network error, and loading/disabled button states). These tests mock `global.fetch` and use `@testing-library/user-event` for interaction. They are intended to improve coverage for the home page health-check flow.
- `components/ToastProvider.dedupe.test.tsx` — Covers the bounded toast queue, duplicate collapse, timer refresh, hover pause/resume, and cleanup on unmount. The visible stack is capped to three so repeat errors do not cover the viewport.

---

## Contracts

- [WALLET_INTEGRATION_CONTRACT.md](WALLET_INTEGRATION_CONTRACT.md)
- [FILTER_CONTRACTS.md](FILTER_CONTRACTS.md)

---

## License

MIT (see root LiquiFact project for full license).

Web app for **LiquiFact** — the global invoice liquidity network on Stellar. Next.js dashboard for SMEs (upload invoices, get liquidity) and investors (fund tokenized invoices, earn yield). Stellar wallet integration is planned.

Part of the LiquiFact stack: **frontend** (this repo) | **backend** (Express API) | **contracts** (Soroban).

---

## Prerequisites

- **Node.js** 20+ (LTS recommended)
- **npm** 9+

---

## Setup

1. **Clone the repo**

   ```bash
   git clone <this-repo-url>
   cd liquifact-frontend
   ```

2. **Install dependencies**

   ```bash
   npm ci
   ```

3. **Configure environment** (optional)

   ```bash
   cp .env.local.example .env.local
   # Set NEXT_PUBLIC_API_URL if the API is not at http://localhost:3001
   ```

---

## API Integration

For frontend/backend contract details see:

[docs/api-integration.md](docs/api-integration.md)

---

## Development

| Command            | Description                                             |
| ------------------ | ------------------------------------------------------- |
| `npm run dev`      | Start dev server (Turbopack)                            |
| `npm run lint`     | Run ESLint                                              |
| `npm test`         | Run Jest/jsdom unit and accessibility tests             |
| `npm run build`    | Production build                                        |
| `npm run start`    | Start production server                                 |
| `npm run test:e2e` | Run Playwright smoke tests (toast & invest marketplace) |

### Environment variables

| Variable                      | Required | Default                 | Used by                                                          |
| ----------------------------- | -------- | ----------------------- | ---------------------------------------------------------------- |
| `NEXT_PUBLIC_API_URL`         | No       | `http://localhost:3001` | [app/page.js](app/page.js)                                       |
| `NEXT_PUBLIC_STELLAR_NETWORK` | No       | Unset                   | [WALLET_INTEGRATION_CONTRACT.md](WALLET_INTEGRATION_CONTRACT.md) |

`NEXT_PUBLIC_*` values are inlined at build time and must never contain secrets. See [`lib/config/env.js`](lib/config/env.js) for validation rules and defaults.

The invoices page header also uses the shared `NavMenu` component, replacing the old bespoke header so navigation and wallet entry stay consistent across routes.

### Marketplace search & filtering

The Invest page (`app/invest/page.js`) includes an issuer-name search field and filter panel above the invoice list.

| Feature                         | Details                                                                                                           |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| **Search component**            | `components/InvoiceSearch.jsx` — controlled text input                                                            |
| **Filter panel**                | `components/InvoiceFilters.jsx` — yield, risk, maturity, and currency filters                                     |
| **Debounce**                    | `200 ms` — filtering waits for settled input before updating results                                              |
| **Match strategy**              | Case-insensitive substring match on the `issuer` field                                                            |
| **Screen-reader announcements** | An `aria-live="polite"` region announces the result count on every filter change (e.g. _"2 of 3 invoices match"_) |
| **No-match state**              | A distinct empty state is shown when filters produce zero results, separate from the empty-marketplace state      |
| **Pagination**                  | `components/Pagination.jsx` — page controls appear when filtered results exceed `PAGE_SIZE` (default 10)          |

#### Pagination

The Invest marketplace (`app/invest/page.js`) renders at most `PAGE_SIZE` (10) invoices at a time. When the filtered result set exceeds `PAGE_SIZE`, a **"Load more"** button is displayed below the list.

| Behaviour | Detail |
| --------- | ------ |
| **Initial page** | First `PAGE_SIZE` items are rendered; remaining items are hidden. |
| **Load more** | Clicking "Load more" appends the next `PAGE_SIZE` batch. The button disappears when all items are visible. |
| **Paging reset on data change** | `visibleCount` resets to `PAGE_SIZE` when the raw invoice data changes (new fetch, retry). |
| **Paging reset on filter/search** | `visibleCount` resets to `PAGE_SIZE` when filters or the debounced search term change, so the user always starts at the top of a newly filtered list. |
| **Focus management** | After each "Load more" click, focus is returned to the button via `setTimeout(0)` so keyboard users do not lose their place. |
| **Screen-reader announcement** | The polite `aria-live` status region announces _"Showing N of M investable invoices"_ when paging is active (N < M) and the full count when all items are visible. |
| **Edge cases** | Fewer items than `PAGE_SIZE` → no Load more button, all items shown. Exact `PAGE_SIZE` boundary → no Load more button. Last page remainder → only remaining items appended. |
| **Empty / error states** | When invoices are loading, errored, empty, or all filtered out, the Load more button is not rendered. |

**Exports from `app/invest/page.js`:**

| Export | Type | Description |
| ------ | ---- | ----------- |
| `PAGE_SIZE` | `number` (10) | Maximum items shown per page / load-more batch |
| `SEARCH_DEBOUNCE_MS` | `number` (300) | Debounce delay for issuer search input |
| `getPaginationAnnouncement(shown, total)` | `function` | Returns the _"Showing N of M investable invoices"_ screen-reader announcement string |
| `getInvoiceLoadAnnouncement(invoices, opts)` | `function` | Returns the initial-load or filtered-count announcement string |

**Test coverage:**

- `app/invest/page.test.jsx` covers initial page size, load-more appends, exact boundary, last page remainder, filter-reset, search-reset, and empty/error/no-match states.
- `components/Pagination.jsx` has dedicated tests for page-change announcements (`Pagination.announce.test.tsx`) and parameter clamping (`Pagination.clamp.test.tsx`).

---

## Project structure

```
liquifact-frontend/
├── app/
│   ├── layout.js           # Root layout, LiquiFact metadata
│   ├── page.js             # Home (wallet CTA, API health check)
│   ├── copy/en.js          # Centralised UI copy
│   ├── invoices/           # SME invoice upload page
│   └── invest/             # Investor marketplace
│       ├── page.js         # Marketplace list with search, filters & pagination
│       ├── loading.js      # Marketplace skeleton
│       ├── lib.js          # Mock invoice data + loadMockInvoices helper
│       └── [id]/           # Invoice detail + funding CTA
│           ├── page.js     # Full invoice details
│           ├── loading.js  # Detail skeleton
│           └── not-found.js # Unknown invoice fallback
├── components/
│   ├── Button.jsx          # Reusable button with variant styles
│   ├── ErrorBanner.jsx     # Accessible error state banner
│   ├── Footer.jsx          # Site-wide footer with copy-driven links
│   ├── InvoiceFilters.jsx  # Yield / risk / maturity / currency filter panel
│   ├── InvoiceList.jsx     # Invoice table with loading / error / empty states
│   ├── InvoiceListSkeleton.jsx # aria-busy skeleton loader for invoice lists
│   ├── InvoiceSearch.jsx   # Controlled issuer-name search input
│   ├── NavMenu.jsx         # Responsive site navigation header
│   ├── Pagination.jsx      # Page controls for large result sets
│   ├── ToastProvider.jsx   # Toast notification system
│   ├── UploadZone.jsx      # Invoice PDF upload + validation
│   ├── WalletProvider.jsx  # App-wide wallet state provider
│   ├── WalletStatus.jsx    # Wallet connection / address display
│   └── WalletStatusLazy.jsx # next/dynamic wrapper (ssr: false)
├── lib/
│   ├── api/invoices.js     # Invoice API helpers
│   └── format/safeJson.js  # Depth-limited JSON formatter
├── public/
├── .env.local.example
├── eslint.config.mjs
└── package.json
```

Tech: **Next.js 16** (App Router), **React 19**, **Tailwind CSS 4**.

---

## Accessibility

### Skip-to-content link

A visually-hidden "Skip to content" link is the first focusable element on every page. It becomes visible when focused (first Tab press) and jumps the keyboard user past the navigation header directly to `<main id="main-content">`.

All interactive elements (nav links, card links, buttons) use a consistent `focus-visible` cyan outline that matches the brand's primary colour. The utility classes are defined in `app/globals.css`:

- `.skip-link` — positions and reveals the skip link on focus
- `.focus-ring` — reusable `focus-visible` outline for custom interactive elements

### Home page heading structure

The home page uses a single `<h1>` for the hero title and `<h2>` headings for the two CTA cards only. The "API status" panel label is a `<p>`, not a heading, so it does not appear in the heading outline.

### Reduced-motion support

Users who enable **prefers-reduced-motion** in their OS or browser settings receive a
motion-safe experience automatically. A `@media (prefers-reduced-motion: reduce)` block
in `app/globals.css` disables `animate-spin` (spinners) and `animate-pulse` (skeleton
loaders) globally. Skeleton shapes and spinner SVGs remain visible — only the animation
is removed. ARIA semantics (`aria-busy`, `role="status"`, `aria-live`) are unaffected,
so screen-reader users always hear loading announcements regardless of motion preference.

To verify manually: open DevTools → Rendering tab → set **"Emulate CSS media feature
prefers-reduced-motion"** to `reduce`, then navigate to `/invoices` or `/invest` and
confirm skeletons are visible without shimmer and spinners are static.

---

## CI/CD

GitHub Actions runs on every push and pull request to `main`:

- **Lockfile check** — asserts `package-lock.json` is in sync with `package.json`
- **Lint** — `npm run lint`
- **Build** — `npm run build`

Keep all checks passing before opening a PR.

To reproduce the lockfile check locally:

```bash
npm install --package-lock-only --ignore-scripts
git diff --exit-code package-lock.json  # exits 1 if drifted
```

### Security in CI

As the application handles financial flows and wallet integration, our CI pipeline includes parallel security gates:

1. **Dependency Audit** (`npm audit --audit-level=high`):
   - Fails the build if high or critical vulnerabilities are found in the dependency tree.
   - **Triage & Waive**: If a vulnerability is flagged, try running `npm audit fix` locally to resolve it. If it is a false positive or unfixable, you can document the rationale and waive it by updating package versions or using standard `npm audit` override mechanisms (e.g., `overrides` in `package.json`).

2. **Secret Scanning** (`gitleaks`):
   - Scans the repository and pull request diffs for leaked secrets, API keys, and sensitive tokens.
   - If a scan fails due to a false positive, verify the flagged string is safe and (if necessary) add a `.gitleaksignore` file or a `#gitleaks:allow` inline comment to waive it.

---

## Dependency updates

Dependabot opens weekly PRs on Monday to keep npm packages and GitHub Actions current.

PRs are grouped to limit noise:

- **nextjs-react** — `next`, `react`, `react-dom`, and their `@types` packages together (coordinated bumps).
- **dev-tooling** — all remaining `devDependencies` in one PR.
- **github-actions** — action version bumps in a separate PR.

**Reviewing a Dependabot PR**

1. Check the CI run passes (lockfile check + lint + build).
2. Scan the changelog/release notes linked in the PR description for breaking changes.
3. For `nextjs-react` bumps, do a quick smoke test (`npm run dev`) locally.
4. Approve and merge — **do not enable auto-merge**; every dependency bump requires a human reviewer.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full contributor workflow, branch naming convention, local checks, and accessibility expectations. Also see our [Accessibility Statement](docs/accessibility.md).

1. **Fork** the repo and clone your fork.
2. **Create a branch** from `main`: `git checkout -b feature/your-feature` or `fix/your-fix`.
3. **Setup**: `npm ci`, optionally `cp .env.local.example .env.local`.
4. **Make changes**:
   - Follow existing patterns under `app/`.
   - Run `npm run lint` and `npm run build` locally.
5. **Commit** with clear messages (e.g. `feat: add X`, `fix: Y`).
6. **Push** to your fork and open a **Pull Request** to `main`.
7. Wait for CI and address review feedback.

We welcome UI improvements, new pages (e.g. invoice upload, marketplace), and Stellar wallet integration aligned with the LiquiFact product.

## UI Components

See [COMPONENTS.md](COMPONENTS.md) for the full component library reference — props, accessibility notes, and usage examples for every shared component (`ErrorBanner`, `Footer`, `InvoiceListSkeleton`, `ToastProvider`, `UploadZone`, `WalletProvider`, `WalletStatus`).

- **UploadZone Progress Indicator**: During the upload phase, if a `progress` prop (number between `0` and `100`) is supplied to `UploadZone`, a determinate progress bar (`role="progressbar"`) is displayed. If no `progress` is supplied, it falls back to an indeterminate spinner. Smooth transitions are disabled when `prefers-reduced-motion` is active.
- **UploadZone Reset Flow**: After a successful upload (status = `"success"`), an **"Upload another invoice"** button appears below the success message. Clicking it:
  - Clears the file, error, and status back to their initial (idle) values.
  - Clears the hidden file `<input>` so the same file can be re-selected.
  - Moves focus to the dropzone, enabling keyboard users to immediately start a fresh upload without re-navigating.
  The reset flow is tested for: button visibility in success state, state clearing (file, error, status), re-upload after reset, stale error clearing, and focus management. The success message's `role="status"` / `aria-live="polite"` region is preserved and cleared on reset.
- **WalletStatus button variant alignment** (fix: `refactor/wallet-02-fix-button-config`): `WalletStatus` now passes `variant={config.buttonVariant}` and `loading={state === WALLET_STATES.CONNECTING}` correctly to `Button`. The previous `getStateConfig` returned `buttonVariant: "loading"` for the connecting state — but `"loading"` is not a valid `Button` variant (`primary | secondary | warning | external | danger`), which caused `variantStyles["loading"]` to be `undefined` and silently broke the button's className. The fix:
  - CONNECTING state now uses `buttonVariant: "primary"` (the loading spinner is rendered by `Button` via `loading={true}` and `aria-busy="true"`).
  - `getStateConfig` is extracted to module scope with `walletData` and `error` as explicit parameters.
  - `aria-describedby` on the wallet button is omitted when the connected address row is displayed (the `#wallet-helper-text` span is absent in that state, so the attribute would be a dangling IDREF reference).
  - No inline spinner SVG is needed in `WalletStatus` — `Button`'s built-in `Spinner` handles it.


## Invoice List

The invoices page now renders an SME invoice table below `UploadZone` using `InvoiceList`.

- `InvoiceList` accepts an injectable `loadInvoices` prop so data loading can be mocked during tests and swapped for a backend API later.
- While invoices are loading, it renders `InvoiceListSkeleton` and exposes a polite `aria-live` status region for assistive technology.
- If no invoices are returned, it shows `copy.invoices.emptyState` text.
- If invoice loading fails, an accessible `ErrorBanner` is displayed with localized fallback copy.
- After `UploadZone` successfully uploads a document, `onUploadSuccess` appends a new optimistic invoice entry immediately without requiring a manual browser refresh.

### Wallet connection (`WalletProvider`)

Wallet state is shared app-wide via `WalletProvider`, mounted in `app/layout.js` inside `ToastProvider`. Any client component can read connection state with `useWallet()`:

```jsx
import { useWallet } from "@/components/WalletProvider";

function FundInvoiceButton() {
  const { state, walletData, connect, disconnect } = useWallet();

  if (state !== "connected") {
    return (
      <button type="button" onClick={() => connect()}>
        Connect wallet
      </button>
    );
  }

  return <span>Ready to fund as {walletData.address}</span>;
}
```

**Persistence:** On successful connect, a minimal snapshot is saved to `localStorage` under `liquifact-wallet-snapshot`:

| Field                  | Persisted | Notes                                              |
| ---------------------- | --------- | -------------------------------------------------- |
| `version`              | Yes       | Schema version (`1`)                               |
| `state`                | Yes       | Only `connected` is restored                       |
| `address`              | Yes       | Truncated display form only (e.g. `GABC...XYZ123`) |
| `network`              | Yes       | `public` or `testnet`                              |
| `balance`              | **No**    | Fetched live after real wallet integration         |
| Private keys / secrets | **Never** | Rejected on read if detected                       |

The provider rehydrates from storage **after mount** (SSR-safe). `disconnect()` clears storage immediately. See [WALLET_INTEGRATION_CONTRACT.md](WALLET_INTEGRATION_CONTRACT.md) for the full integration contract.

### NavMenu

`components/NavMenu.jsx` — Responsive site-wide header navigation used on every page.

**Props**

| Prop            | Type       | Default            | Description                                      |
| --------------- | ---------- | ------------------ | ------------------------------------------------ |
| `walletLabel`   | `string`   | `'Connect Wallet'` | Label text rendered inside the wallet button     |
| `onWalletClick` | `function` | `undefined`        | Callback fired when the wallet button is clicked |

**Behaviour**

- **Desktop (≥ `md` breakpoint):** Home, Invoices, and Invest links render inline in the header row alongside the wallet button.
- **Mobile (< `md` breakpoint):** Nav links are hidden behind a hamburger toggle (☰). Clicking the toggle reveals a dropdown menu below the header bar.
- The active route is detected automatically via `usePathname` and marked with `aria-current="page"` on the matching link.
- The menu closes on **Escape** (with focus returned to the toggle button), on any navigation event (pathname change), or when the toggle is clicked again.
- Passes `jest-axe` accessibility checks in both open and closed states. The toggle exposes `aria-expanded` and `aria-controls` so assistive technologies can correctly announce the disclosure state.

**Usage**

```jsx
import NavMenu from "@/components/NavMenu";

// Drop-in replacement for the static <header> on any page
export default function MyPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <NavMenu />
      <main>...</main>
    </div>
  );
}

// With Stellar wallet integration
<NavMenu walletLabel="Freighter" onWalletClick={handleConnectWallet} />;
```

## Design Tokens

Global tokens are defined in `app/globals.css` and used across all components. For a comprehensive, detailed list of all colors, spacing, radii, and typography tokens, see the [Design Token Reference](docs/design-tokens.md) document.

- **Colors**
  - `--color-bg`: `#020617` (slate‑950)
  - `--color-primary`: `#22d3ee` (cyan‑400)

- **Typography**
  - Font family: **Geist** – imported via `@fontsource/geist`.
  - Headings use `font‑bold`, body uses `font‑regular`.

## Testing

See [TESTING.md](TESTING.md) for the full guide covering Jest unit/accessibility tests and Playwright end-to-end setup.

## Backend Health Check

The home page health check now:

- Uses an 8 second timeout.
- Aborts hung requests.
- Safely handles HTML and malformed JSON responses.
- Reports one of the following status states with distinct visual treatments:
  - **Connected** (green badge with ✓ icon) — Backend is healthy and responding correctly
  - **Degraded** (amber badge with ⚠ icon) — Backend responded but with an error status (e.g., HTTP 500)
  - **Unreachable** (red badge with ✕ icon) — Backend could not be reached or request timed out

- Provides a detailed disclosure for raw responses behind an expandable `<details>` element
- Status changes are announced politely via `aria-live="polite"` for accessibility
- Badges include both color and text/icons (not color-only) to meet accessibility requirements

## Contracts

- [WALLET_INTEGRATION_CONTRACT.md](WALLET_INTEGRATION_CONTRACT.md)
- [FILTER_CONTRACTS.md](FILTER_CONTRACTS.md)

---

## SEO and Social Metadata

The root `app/layout.js` exports comprehensive metadata for improved discoverability and rich social sharing (OpenGraph, Twitter Cards).

- **Social Previews**: When links are shared, a dynamically generated OpenGraph image (`app/opengraph-image.tsx`) aligned with the cyan/slate brand colors is displayed.
- **Icons**: App icons and Apple Touch Icons are generated dynamically via `app/icon.tsx` and `app/apple-icon.tsx`, using Next.js `ImageResponse`.
- **Absolute URLs**: The metadata utilizes `metadataBase` which is powered by the `NEXT_PUBLIC_SITE_URL` environment variable to ensure all social image links resolve to absolute URLs correctly.

---

## Security

- **Bounded health rendering** — The home page displays the backend `/health` response
  through a bounded pipeline: recognised fields (`status`, `message`, `version`) are
  extracted and shown in a structured summary. The full payload is hidden behind a
  collapsible `<details>` element and stringified via a depth-limited (max 5 levels),
  length-truncated (max 2000 characters) formatter (`lib/format/safeJson.js`).
  This prevents DoS from giant or deeply nested attacker-controlled payloads.

### HTTP security headers & Content-Security-Policy

Every response carries a baseline set of security headers, attached via the
`headers()` function in [`next.config.mjs`](next.config.mjs). The values are built by
[`lib/securityHeaders.mjs`](lib/securityHeaders.mjs) (a small pure module so the policy
can be unit-tested and later reused by middleware for per-request nonces). Coverage is
asserted in [`security/headers.test.tsx`](security/headers.test.tsx).

| Header                       | Value                                                     | Purpose                                                        |
| ---------------------------- | --------------------------------------------------------- | -------------------------------------------------------------- |
| `Content-Security-Policy`    | see below                                                 | Primary defence against XSS / data injection                   |
| `X-Content-Type-Options`     | `nosniff`                                                 | Stops MIME-sniffing away from the declared type                |
| `Referrer-Policy`            | `strict-origin-when-cross-origin`                         | Avoids leaking invoice/wallet IDs in the `Referer`             |
| `X-Frame-Options`            | `DENY`                                                    | Legacy clickjacking protection (complements `frame-ancestors`) |
| `Permissions-Policy`         | `camera=(), microphone=(), geolocation=(), payment=(), …` | Disables unused powerful browser features                      |
| `Strict-Transport-Security`  | `max-age=63072000; includeSubDomains; preload`            | Forces HTTPS (ignored over plain http/localhost)               |
| `Cross-Origin-Opener-Policy` | `same-origin`                                             | Isolates the browsing context group                            |

**Content-Security-Policy directives** (each is annotated in `lib/securityHeaders.mjs`):

| Directive                                 | Value                                                       | Why                                                                                                                                                                                                                                                                                                            |
| ----------------------------------------- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `default-src`                             | `'self'`                                                    | Deny-by-default for anything not listed below                                                                                                                                                                                                                                                                  |
| `script-src`                              | `'self' 'unsafe-inline'` (+ `'unsafe-eval'` in dev only)    | Next.js App Router injects an inline bootstrap script. `'unsafe-eval'` is added **only** under `next dev` for React Fast Refresh and never ships to production                                                                                                                                                 |
| `style-src`                               | `'self' 'unsafe-inline' https://fonts.googleapis.com`       | `'unsafe-inline'` is required because **next/font** and Tailwind/Next inject inline `<style>` tags and `style` attributes (critical CSS + font variables) that are generated per build and cannot be hashed ahead of time. This relaxation is scoped to styles only — scripts stay far more tightly controlled |
| `font-src`                                | `'self' https://fonts.gstatic.com data:`                    | Geist is self-hosted by `next/font` at build time; the Google Fonts host and `data:` are defensive fallbacks                                                                                                                                                                                                   |
| `connect-src`                             | `'self' <NEXT_PUBLIC_API_URL origin>` (+ `ws: wss:` in dev) | **Allow-lists the backend API origin** so the home page health check and future `fetch()` calls are not blocked. `ws:`/`wss:` are added only in dev for Hot Module Replacement                                                                                                                                 |
| `img-src`                                 | `'self' data: blob:`                                        | Inline/generated images and the favicon                                                                                                                                                                                                                                                                        |
| `frame-ancestors`                         | `'none'`                                                    | Blocks the app from being framed (clickjacking)                                                                                                                                                                                                                                                                |
| `base-uri` / `object-src` / `form-action` | `'self'` / `'none'` / `'self'`                              | Prevent `<base>` hijacking, plugins, and off-origin form posts                                                                                                                                                                                                                                                 |

The backend origin is read from `NEXT_PUBLIC_API_URL` (default `http://localhost:3001`).
If you point the app at a different backend, that origin is automatically added to
`connect-src` — no manual CSP edit needed.

#### Verifying the headers at runtime

```bash
npm run build && npm run start
# in another shell:
curl -sI http://localhost:3000 | grep -i -E 'content-security-policy|x-frame|referrer|permissions|content-type-options'
```

Load each page (`/`, `/invoices`, `/invest`) with DevTools open and confirm there are
**no CSP violation messages** in the console, that the Geist font renders, and that the
**Check API Health** button still reaches the backend.

#### Threat-model note

These headers harden the app ahead of wallet and API integration that will handle
financial data. The CSP is the main mitigation for **cross-site scripting** — even if
attacker-controlled markup reaches the DOM, it cannot load off-origin scripts, exfiltrate
data to an unlisted host (`connect-src`), or be framed for clickjacking (`frame-ancestors`).
`nosniff` and `Referrer-Policy` close common information-leak / content-confusion vectors.
The known residual is `'unsafe-inline'` for **styles** (not scripts): CSS-only injection
remains possible, which is low-impact compared to script execution. The planned next step
is to move to per-request **nonces** via `middleware.js`, which would let us drop
`'unsafe-inline'` from `script-src` entirely.

## License

MIT (see root LiquiFact project for full license).

### Code-splitting: WalletStatus

`WalletStatus` is lazy-loaded via `next/dynamic` (`ssr: false`) so the wallet
chunk (including the upcoming Stellar/Freighter SDK) is **not** shipped in the
initial JS bundle for routes that do not need immediate wallet access
(e.g. the static home page).

| Route       | Before (kB) | After (kB) | Δ     |
| ----------- | ----------- | ---------- | ----- |
| `/` (home)  | ~X kb       | ~X kb      | –Y kb |
| `/invoices` | ~X kb       | ~X kb      | –Y kb |
| `/invest`   | ~X kb       | ~X kb      | –Y kb |

_Run `npm run build` and inspect `.next/static/chunks` to verify. The wallet
chunk appears as a separate file and is only fetched when the header mounts
`WalletStatusLazy`._

**Why `ssr: false`?** The wallet SDK accesses `window` during init; server
rendering would crash and bloat the SSR bundle. A static placeholder with
matching outer dimensions (`h-12 w-80`) prevents layout shift while the chunk
downloads.

**Placeholder → component swap** is handled by `next/dynamic` automatically.
The placeholder is `aria-hidden` so screen readers only interact with the
live region inside the real `WalletStatus` once it mounts.
