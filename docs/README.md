# Documentation Index

Entry point for all contributor and developer documentation under `docs/`.

> **Status Note:** Documents marked **`[planned/outdated]`** reference routes (such as `/invest`, `/invoices`, or `/settings`) or components (such as `NavMenu`, `WalletProvider`, `WalletStatus`, `UploadZone`, `InvoiceFilters`, or `SettingsView`) that do not exist in `app/` or `components/`. Current production routes live under `/`, `/marketplace`, `/marketplace/[id]`, `/submit`, `/get-started`, `/docs`, and `/offline`.

---

## Architecture

- [`architecture.md`](architecture.md) — **`[planned/outdated]`** App Router structure, route-to-component map, mock vs. live data boundaries, and repository hygiene rules. *(Note: references non-existent `/invest` and `/invoices` routes and components such as `NavMenu`, `WalletProvider`, `WalletStatus`, `UploadZone`, `InvoiceList`, and `StatusPill`; active routes are `/marketplace` and `/submit` with `SiteHeader` and `SiteFooter`.)*
- [`api-integration.md`](api-integration.md) — **`[planned/outdated]`** HTTP payload contracts, mock data wiring, error handling, and timeout/truncation guards for backend communication. *(Note: references non-existent `app/invest/page.js`, `app/invest/[id]/page.js`, `components/UploadZone.jsx`, and `ErrorBanner`.)*
- [`observability.md`](observability.md) — Route-level and root error boundaries (`app/**/error.js`, `components/ErrorState.jsx`) and the `reportError` telemetry sink with sensitive-key scrubbing.
- [`issue-334-cpu-budget-median-throttling.md`](issue-334-cpu-budget-median-throttling.md) — **`[planned/outdated]`** Archived implementation summary for Soroban price-oracle median buffer truncation to prevent CPU budget exhaustion. *(Note: describes Rust smart contract code in `contracts/price-oracle/` with no components in `app/` or `components/`.)*
- [`issue-334-flow-diagram.md`](issue-334-flow-diagram.md) — **`[planned/outdated]`** Archived ASCII flow and weight-prioritization diagrams for Issue #334 price-oracle buffer truncation. *(Note: describes external Soroban contract logic with no frontend components in `app/` or `components/`.)*

## Marketplace

- [`marketplace.md`](marketplace.md) — **`[planned/outdated]`** Usage guide for browsing, searching, filtering, sorting, and paginating invoices. *(Note: documents `app/invest/page.js`, `InvoiceSearch`, `InvoiceFilters`, `StatusLegendFilter`, and `StatusPill`, which do not exist in `app/` or `components/`; the current implementation is `app/marketplace/Marketplace.jsx` and `components/InvoiceCard.jsx`.)*
- [`marketplace-api.md`](marketplace-api.md) — **`[planned/outdated]`** Component prop reference and usage example for the marketplace UI controls. *(Note: references non-existent `InvestMarketplace` in `app/invest/page.js` and `InvoiceSearch`, `InvoiceFilters`, `StatusLegendFilter`, and `Pagination` in `components/`.)*
- [`marketplace-data-flow.md`](marketplace-data-flow.md) — **`[planned/outdated]`** Lifecycle diagrams for fetching, filtering, sorting, and announcing marketplace invoices. *(Note: describes `app/invest/page.js`, `InvoiceListSkeleton`, `ErrorBanner`, and `EmptyState`, which do not exist in `app/` or `components/`.)*
- [`invoice-data.md`](invoice-data.md) — **`[planned/outdated]`** Mock invoice object shape, display vs. numeric fields, and live API migration checklist. *(Note: references non-existent `app/invest/lib.js`, `app/invest/page.js`, `app/invest/[id]/page.js`, and `components/InvoiceList.jsx`.)*
- [`upload-api.md`](upload-api.md) — **`[planned/outdated]`** Prop and validation reference for the PDF invoice drag-and-drop upload form. *(Note: describes `components/UploadZone.jsx`, `components/ProgressBar.jsx`, and `components/InvoiceList.jsx`, which do not exist in `components/`; invoice submission is currently handled by `app/submit/SubmitForm.jsx`.)*
- [`upload-data-flow.md`](upload-data-flow.md) — **`[planned/outdated]`** State machine and data lifecycle diagrams for PDF selection, validation, tokenization delay, and optimistic list updates. *(Note: references non-existent `components/UploadZone.jsx`, `components/InvoiceList.jsx`, and `app/invoices/page.js`.)*
- [`upload-a11y.md`](upload-a11y.md) — **`[planned/outdated]`** Accessibility contract, ARIA attributes, keyboard interactions, and screen-reader announcements for PDF uploading. *(Note: documents `components/UploadZone.jsx`, which does not exist in `components/`.)*

## Wallet

- [`wallet-developer-guide.md`](wallet-developer-guide.md) — **`[planned/outdated]`** State machine transitions, persistence rules, and adapter guide for Stellar Freighter wallet integration. *(Note: documents `components/WalletProvider.jsx`, `components/WalletStatus.jsx`, `components/WalletStatusLazy.jsx`, and `components/WalletContext.jsx`, none of which exist in `components/`; current wallet UI lives in `components/wallet/BalanceHint.jsx` and `lib/stellar/`.)*
- [`wallet-api-reference.md`](wallet-api-reference.md) — **`[planned/outdated]`** Complete API reference for wallet context providers, hooks, status components, and snapshot utilities. *(Note: describes non-existent `WalletProvider`, `WalletStatus`, `WalletStatusLazy`, `WalletContext`, and `NavMenu` components.)*
- [`wallet-data-flow.md`](wallet-data-flow.md) — **`[planned/outdated]`** Sequence diagrams for SSR hydration, Freighter connection, network verification, and localStorage snapshots. *(Note: references non-existent `WalletProvider`, `WalletStatus`, `WalletStatusLazy`, and `NavMenu` in `components/`.)*

## Invoice detail

- [`invoice-detail-usage.md`](invoice-detail-usage.md) — **`[planned/outdated]`** Usage guide, prop contracts, and data-loading patterns for presenting individual invoices. *(Note: documents `components/InvoiceDetail.jsx`, `components/InvoiceDetailSkeleton.jsx`, `components/ErrorBoundary.jsx`, and `app/invest/[id]/page.js`, which do not exist; the active detail view is `app/marketplace/[id]/InvoiceDetail.jsx`.)*
- [`invoice-detail-flow.md`](invoice-detail-flow.md) — **`[planned/outdated]`** Visual end-to-end flow for server rendering and client hydration on the invoice detail route. *(Note: describes `app/invest/[id]/page.js`, `app/invest/[id]/FundActions.jsx`, `components/InvoiceTimeline.jsx`, `components/StatusPill.jsx`, and `components/FundAmountInput.jsx`, which do not exist in `app/` or `components/`.)*
- [`invoice-detail-data-flow.md`](invoice-detail-data-flow.md) — **`[planned/outdated]`** Detailed RSC transform pipeline and client-island hydration diagrams for invoice details and optimistic funding. *(Note: references non-existent `app/invest/[id]/InvoiceDetailClient.jsx`, `InvoiceDetailItems.jsx`, `FundActions.jsx`, `MarketplaceContext.jsx`, and `MarketplaceShell.jsx`.)*
- [`invoice-detail-a11y.md`](invoice-detail-a11y.md) — **`[planned/outdated]`** Accessibility roles, inline-edit keyboard shortcuts, focus traps, and live regions for invoice detail views. *(Note: documents non-existent `app/invest/[id]/InvoiceDetailClient.jsx`, `InvoiceDetailItems.jsx`, `InvoiceDetailExport.jsx`, `components/BulkActionsToolbar.jsx`, and `components/ConfirmDialog.jsx`.)*

## PWA/Performance

- [`performance.md`](performance.md) — **`[planned/outdated]`** Bundle-size budgets with `size-limit` and React Server Component split metrics for the detail route. *(Note: references non-existent `app/invest/page.js`, `app/invoices/page.js`, `app/invest/[id]/page.js`, and `app/invest/[id]/FundActions.jsx`.)*
- [`accessibility.md`](accessibility.md) — **`[planned/outdated]`** WCAG 2.1 AA statement, focus-ring audit, roving tabindex, keyboard shortcuts, and contrast harness. *(Note: references non-existent components including `NavMenu`, `UploadZone`, `WalletStatus`, `Pagination`, `InvoiceFilters`, `ShortcutHelpDialog`, and `app/invest/page.js`.)*
- [`pwa-evidence/README.md`](pwa-evidence/README.md) — Browser verification report and before/after screenshots for offline caching, service worker reload prompts, and installability (`components/pwa/OfflineNotice.jsx`, `components/pwa/ServiceWorkerRegistrar.jsx`, `app/offline/page.js`).

## Security

- [`security.md`](security.md) — XSS prevention policy (`react/no-danger` audit), inline theme script allowlist in `app/layout.js`, and per-request CSP nonce enforcement.

## Config

- [`getting-started.md`](getting-started.md) — Local environment setup, prerequisites, development server commands, test runners, and troubleshooting tips.
- [`configuration.md`](configuration.md) — Reference for `NEXT_PUBLIC_*` environment variables, defaults, local `.env.local` setup, and production checklist.
- [`design-tokens.md`](design-tokens.md) — **`[planned/outdated]`** CSS custom properties, WCAG contrast matrix, Tailwind spacing/typography scales, and `ThemeToggle` auto-mode cycle. *(Note: describes a hard-themed dark setup and 3-state `auto`/`light`/`dark` `ThemeToggle` that no longer matches the current light/dark implementation in `components/ThemeToggle.jsx` and `app/globals.css`.)*
- [`dashboard-theming.md`](dashboard-theming.md) — Light and dark theme token resolution across `components/ThemeToggle.jsx`, `app/layout.js`, and `app/globals.css`.
- [`theme-theming.md`](theme-theming.md) — **`[planned/outdated]`** Guide to colour palette resolution, Tailwind token mapping, and theme-control components. *(Note: references `components/ThemeOptionsModal.jsx` and `components/ThemeInputs.jsx`, which do not exist in `components/`.)*
- [`settings-api.md`](settings-api.md) — **`[planned/outdated]`** Component prop reference and helper exports for the user settings route and view. *(Note: documents `app/settings/page.js` and `components/SettingsView.jsx`, neither of which exists in `app/` or `components/`.)*
- [`settings-data-flow.md`](settings-data-flow.md) — **`[planned/outdated]`** Data flow diagrams and state machine for settings localStorage persistence, inline editing, and error boundaries. *(Note: describes non-existent `app/settings/page.js`, `components/SettingsView.jsx`, `components/InlineEditRow.jsx`, and `components/SettingsErrorBoundary.jsx`.)*
