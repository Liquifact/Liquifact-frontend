# Frontend Architecture & Data Flow

A map of the LiquiFact frontend (Next.js **App Router**) for new contributors:
which routes exist, the special files each route ships, which `lib/api` client a
route consumes, the mock-vs-live data boundary, and where shared state lives.

For HTTP payload/endpoint details see
[`docs/api-integration.md`](api-integration.md); for the wallet state machine
see [`../WALLET_INTEGRATION_CONTRACT.md`](../WALLET_INTEGRATION_CONTRACT.md).

---

## Top-level layout

`app/layout.js` is the root layout that wraps **every** route. It mounts the
shared providers and chrome exactly once:

```
RootLayout (app/layout.js)
├── pre-paint theme <script> (no flash of incorrect theme)
├── <ToastProvider>            ← transient notifications (components/ToastProvider.jsx)
│   └── <WalletProvider>       ← single source of truth for wallet state
│       └── {children}         ← the active route's page
├── <ThemeToggle/>             ← fixed top-right
└── <Footer/>
```

The header/navigation (`components/NavMenu.jsx`) is **not** in the layout — each
page renders `<NavMenu/>` itself. `NavMenu` lazy-loads the wallet UI
(`components/WalletStatusLazy.jsx` → `WalletStatus.jsx`) so the Stellar SDK
chunk stays out of the initial bundle.

---

## Routes

| Route          | `page` file                | Special files (loading / error / not-found)                              | Data source                                          |
| -------------- | -------------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------- |
| `/`            | `app/page.js`              | `app/error.js`                                                            | `getHealth()` → `lib/api/health.js` (live `/health`) |
| `/invoices`    | `app/invoices/page.js`     | `app/invoices/loading.js`                                                 | `UploadZone` POST `${API_URL}/invoices`; `InvoiceList` |
| `/invest`      | `app/invest/page.js`       | `app/invest/loading.js`                                                   | `fetchInvestableInvoices()` → `lib/api/invoices.js` (live client) |
| `/invest/[id]` | `app/invest/[id]/page.js`  | `app/invest/[id]/loading.js`, `app/invest/[id]/not-found.js`             | `getInvoiceById()` → `app/invest/lib.js` (mock layer) |

`loading.js` files are App Router Suspense fallbacks (rendered while a segment
loads); `error.js` is the route error boundary; `not-found.js` backs
`notFound()` calls (the detail page calls it for unknown ids).

---

## Route → component map

```
/                app/page.js          → NavMenu, Link cards, health badge (getHealth)
/invoices        app/invoices/page.js → NavMenu, UploadZone, InvoiceList
/invest          app/invest/page.js   → NavMenu, InvoiceSearch, InvoiceFilters,
                                         InvoiceList(Skeleton), Pagination, ErrorBanner
                                         (data via InvestMarketplace → fetchInvestableInvoices)
/invest/[id]     app/invest/[id]/page → NavMenu, StatusPill, WalletStatus, Button,
                                         ErrorBanner (data via getInvoiceById)
```

Shared presentational components live in `components/` and are framework-route
agnostic (e.g. `InvoiceCard`, `StatusPill`, `Pagination`, `EmptyState`).

---

## Data layer: mock vs live, and the migration boundary

There are **two** invoice data paths today, and they are intentionally separate:

1. **Live client — `lib/api/invoices.js`** (`fetchInvestableInvoices`)
   The real boundary: fetches `GET ${NEXT_PUBLIC_API_URL}/invoices`, validates
   the response, and **normalizes** every entry to the UI contract
   `{ id, issuer, amount, currency, dueDate, yield, status }` (missing fields
   default to `null`, unknown fields are dropped). Consumed by `/invest` via the
   `InvestMarketplace({ loadInvoices = fetchInvestableInvoices })` seam, which
   makes the data source injectable for tests.

2. **Mock layer — `app/invest/lib.js`** (`MOCK_INVOICES`, `loadMockInvoices`,
   `getInvoiceById`)
   Static fixtures used by the **detail** route (`/invest/[id]`) and as a
   deterministic source for e2e tests via the `window.__TEST_MOCK_INVOICES__`
   hook. `loadMockInvoices()` prefers that global when present, otherwise returns
   the in-file fixtures after a dev-only delay.

**Migration boundary:** the marketplace list (`/invest`) already consumes the
live client; the detail page (`/invest/[id]`) still reads the mock layer via
`getInvoiceById`. Completing the migration means replacing `getInvoiceById` with
a live single-invoice fetch (`GET /invoices/:id`, see
[`docs/api-integration.md`](api-integration.md)) and retiring `MOCK_INVOICES`
once the backend is wired. The normalization in `lib/api/invoices.js` is the
single place new backend fields should be mapped.

Other live clients: `lib/api/health.js` (`/health`, used on the home page) and
`lib/api/fetchWithRetry.js` (shared retry wrapper).

---

## Where state lives

| State              | Owner                                        | Notes                                                              |
| ------------------ | -------------------------------------------- | ----------------------------------------------------------------- |
| Wallet connection  | `components/WalletProvider.jsx` (`useWallet`) | Mounted once in `app/layout.js`; persists a minimal, non-secret snapshot to `localStorage`. |
| Toasts             | `components/ToastProvider.jsx` (`useToast`)   | Mounted once in `app/layout.js`.                                  |
| Theme              | `components/ThemeToggle.jsx` + pre-paint script | Persisted in `localStorage`; applied before hydration.           |
| Marketplace filters| `/invest` page + `lib/hooks/useInvoiceFilters.js` | Search/filter/sort state is serialized to the URL query string.  |

`components/WalletContext.jsx` is a deprecated re-export shim — new code should
import from `@/components/WalletProvider`.

---

## Conventions

- Route components that use hooks/wallet/browser APIs are `"use client"`.
- UI copy is centralized in `app/copy/en.js` (imported as `copy`).
- Environment config is read through `lib/config/env.js` (only `NEXT_PUBLIC_*`).
- Tests: Jest for units/components (`*.test.jsx?`), Playwright for e2e under
  `tests/` (see [`../TESTING.md`](../TESTING.md)).

---

## Repository hygiene (Issue #453)

This is a **JavaScript/TypeScript frontend** only. The repo must never contain
Rust build tooling or Soroban contract files — those live in the separate
`Liquifact-contracts` repository.

### What does not belong here

| Category | Examples | Action |
| -------- | -------- | ------ |
| Rust manifests | `Cargo.toml`, `Cargo.lock` | Delete — `.gitignore` blocks re-addition |
| Rust source / WASM | `*.rs`, `*.wasm`, `src/*.rs`, `contracts/` | Delete — `.gitignore` blocks re-addition |
| Binary installers | `rustup-init.exe`, `*.exe`, `*.so`, `*.dylib` | Delete — `.gitignore` blocks re-addition |
| Transient PR bodies | `PR_BODY_*.md`, `PR_DESCRIPTION*.md` | Delete — `.gitignore` blocks re-addition |
| One-off implementation notes | `ISSUE_*_IMPLEMENTATION.md`, `*_REFACTOR_SUMMARY.md`, `DELIVERY_CHECKLIST.md` | Archive useful content to `docs/` then delete — `.gitignore` blocks re-addition |

### What lives in `docs/`

All permanent reference material for this frontend belongs in `docs/`:

| File | Purpose |
| ---- | ------- |
| `docs/architecture.md` | This file — routes, data flow, state, conventions |
| `docs/api-integration.md` | HTTP payload / endpoint contract with the Express backend |
| `docs/configuration.md` | Every `NEXT_PUBLIC_*` env variable, validation rules, defaults |
| `docs/design-tokens.md` | CSS custom properties, Tailwind token mapping |
| `docs/accessibility.md` | Accessibility statement and WCAG notes |
| `docs/wallet-developer-guide.md` | Stellar / Freighter integration guide |
| `docs/observability.md` | `reportError` sink and pluggable observability |
| `docs/performance.md` | Bundle-size targets and code-splitting notes |
| `docs/security.md` | CSP policy rationale and threat model |
| `docs/getting-started.md` | Onboarding walkthrough for new contributors |
| `docs/issue-334-cpu-budget-median-throttling.md` | Archived: CPU budget fix for median price oracle (contracts context) |
| `docs/issue-334-flow-diagram.md` | Archived: Flow diagram for Issue #334 buffer truncation |

### `.gitignore` guard rails

The `.gitignore` was extended (Issue #453) with two labelled sections:

```
# ── Repo hygiene: block Rust/binary artifacts ──────────────────────────────
Cargo.toml
Cargo.lock
*.exe  *.wasm  *.so  *.dylib
rustup-init*
/src/*.rs  /contracts/  /examples/*.rs  /test_snapshots/

# ── Repo hygiene: block generated PR-body / one-off note files ──────────────
PR_BODY_*.md
PR_DESCRIPTION*.md
ISSUE_*_IMPLEMENTATION.md
ISSUE_*_FLOW_DIAGRAM.md
DELIVERY_CHECKLIST.md
*_REFACTOR_SUMMARY.md
REFACTORING_*.md
*_IMPLEMENTATION_SUMMARY.md
*_INTEGRATION_SUMMARY.md
IMPLEMENTATION_COMPLETE.md
*_QUICK_REFERENCE.md
LEDGER_GAP_TESTS.md
```

### Hygiene tests

`tests/lint/repo-hygiene.test.tsx` (Jest, `node` environment) asserts the above
rules on every CI run. It checks:

1. Named Rust artefacts and directories are absent.
2. Named transient note / PR-body files are absent.
3. `.gitignore` contains every required pattern.
4. Archived notes exist in `docs/`.
5. Core frontend files (`package.json`, `next.config.mjs`, `app/layout.js`, …)
   are still present after cleanup.
6. Helper predicate functions (`isPrBodyFile`, `isTransientNote`, `isRustSource`,
   `isBinary`) behave correctly.
