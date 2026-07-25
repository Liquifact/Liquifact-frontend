---
type: Feature
title: "Replace mock invoice data on the Invest marketplace with a live backend API client"
labels: type:feature, area:invest, stack:nextjs, stack:react, stack:typescript, priority:high, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Implement a live backend API client for the Invest marketplace

### Description
The Invest marketplace in [`app/invest/page.js`](app/invest/page.js) renders three hard-coded entries from the local `MOCK_INVOICES` array via `loadMockInvoices()`, with a `DEV_DELAY` timer simulating latency. There is no shared API client anywhere in the repo, even though [`README.md`](README.md) and [`.env.local.example`](.env.local.example) define `NEXT_PUBLIC_API_URL`. This issue replaces the mock loader with a real `fetch`-based client that pulls investable invoices from the backend while preserving the existing loading, empty, and error states.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Create `lib/api/invoices.js` exporting `fetchInvestableInvoices({ signal })` that calls `${NEXT_PUBLIC_API_URL}/invoices` and normalizes the response into the existing item contract `{ id, issuer, amount, currency, dueDate, yield, status }`.
- Wire `InvestMarketplace` to use the new client by passing it as the `loadInvoices` prop default, keeping the injectable-prop pattern used by [`app/invest/page.test.jsx`](app/invest/page.test.jsx) intact.
- Preserve the existing `null` (loading), empty, and `loadError` branches and the `aria-live` status announcement from `getInvoiceLoadAnnouncement`.
- Use `AbortController` so in-flight requests are cancelled when the component unmounts (the effect already tracks `isActive`).
- Read the base URL from `process.env.NEXT_PUBLIC_API_URL` with the `http://localhost:3001` fallback, matching [`app/page.js`](app/page.js).

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/invest-01-live-invoice-api-client`
- Implement changes
  - **Write code in:** create [`lib/api/invoices.js`](lib/api/invoices.js) and update [`app/invest/page.js`](app/invest/page.js).
  - **Write comprehensive tests in:** create [`lib/api/invoices.test.tsx`](lib/api/invoices.test.tsx) and extend [`app/invest/page.test.jsx`](app/invest/page.test.jsx) — mock `fetch`, assert normalization, abort behaviour, and error fallback.
  - **Add documentation:** update [`README.md`](README.md) with the new `lib/api` layer and document the `/invoices` response shape.
  - Add JSDoc to every exported function describing params, return shape, and thrown errors.
  - Validate security: never interpolate unvalidated data into the DOM, and guard against non-array/`null` responses.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: non-200 responses, malformed JSON, empty arrays, network failure, and unmount-during-fetch.
- Include the full `npm test` output and a short note on how the mock loader was retired.

### Example commit message
`feat: replace invest marketplace mock data with live backend api client`

### Guidelines
- **Minimum 95 percent test coverage** for impacted modules.
- Clear, reviewer-focused documentation.
- **Timeframe: 96 hours.**

### Community & contribution rewards
- 💬 **Join the Liquifact community on Discord for questions, reviews, and faster merges:** https://discord.gg/JrGPH4V3
- ⭐ This is a **GrantFox OSS / Official Campaign** task and **may be rewarded**. When your PR is merged you'll be prompted to rate the project — if this issue and the maintainers helped you ship, we'd be grateful for a **5-star rating**. Clear questions in Discord and tidy, well-tested PRs are the fastest path to a merge and a reward.
++++++
---
type: Feature
title: "Wire the UploadZone invoice submission to a real upload endpoint"
labels: type:feature, area:upload, stack:nextjs, stack:react, stack:typescript, priority:high, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Implement a real upload endpoint for the UploadZone component

### Description
[`components/UploadZone.jsx`](components/UploadZone.jsx) validates a PDF and then fakes the upload by stepping through `uploading → tokenizing → success` with two `setTimeout(1500)` calls — no network request is ever made. This issue replaces the simulated flow with a real multipart upload to the backend while keeping the existing status copy, spinner, and `role="status"` announcements that the Playwright spec in [`tests/toast.spec.jsx`](tests/toast.spec.jsx) depends on.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Create `lib/api/upload.js` exporting `uploadInvoice(file, { signal })` that POSTs a `FormData` body to `${NEXT_PUBLIC_API_URL}/invoices` and returns the created invoice id/status.
- Replace the two `await new Promise((r) => setTimeout(...))` blocks in `handleSubmit` with the real request, mapping HTTP/network failures to the existing `error` state and `role="alert"` banner.
- Preserve the `FILE_CONSTRAINTS` validation, the `status` state machine, and the disabled/`aria-disabled` logic on `#invoice-upload-btn`.
- Keep success copy "Invoice queued for tokenization. Blockchain confirmation pending." so the existing e2e assertion still passes.
- Surface failures through the existing `ToastProvider` (see [`components/ToastProvider.jsx`](components/ToastProvider.jsx)) in addition to the inline banner.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/upload-02-real-upload-endpoint`
- Implement changes
  - **Write code in:** create [`lib/api/upload.js`](lib/api/upload.js) and update [`components/UploadZone.jsx`](components/UploadZone.jsx).
  - **Write comprehensive tests in:** extend [`components/UploadZone.test.jsx`](components/UploadZone.test.jsx) and create [`lib/api/upload.test.tsx`](lib/api/upload.test.tsx) — mock `fetch`, assert FormData shape, success transition, and error mapping.
  - **Add documentation:** update [`README.md`](README.md) and cross-reference [`WALLET_INTEGRATION_CONTRACT.md`](WALLET_INTEGRATION_CONTRACT.md) where relevant.
  - Add JSDoc on `uploadInvoice` describing the request contract and error semantics.
  - Validate security: enforce the PDF MIME/size checks client-side before sending and never trust the filename for rendering.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, `npm run build`, and `npm run test:e2e`.
- Cover edge cases: 4xx/5xx responses, network failure mid-upload, double-submit prevention, and oversized file rejection before request.
- Include the full `npm test` output and confirmation the Playwright toast spec still passes.

### Example commit message
`feat: wire uploadzone submission to a real invoice upload endpoint`

### Guidelines
- **Minimum 95 percent test coverage** for impacted modules.
- Clear, reviewer-focused documentation.
- **Timeframe: 96 hours.**

### Community & contribution rewards
- 💬 **Join the Liquifact community on Discord for questions, reviews, and faster merges:** https://discord.gg/JrGPH4V3
- ⭐ This is a **GrantFox OSS / Official Campaign** task and **may be rewarded**. When your PR is merged you'll be prompted to rate the project — if this issue and the maintainers helped you ship, we'd be grateful for a **5-star rating**. Clear questions in Discord and tidy, well-tested PRs are the fastest path to a merge and a reward.
++++++
---
type: Feature
title: "Mount the WalletStatus state machine in the app header and remove the dead Connect Wallet button"
labels: type:feature, area:wallet, stack:nextjs, stack:react, stack:typescript, priority:high, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Implement WalletStatus in the shared header across all pages

### Description
[`components/WalletStatus.jsx`](components/WalletStatus.jsx) is a complete six-state wallet UI (with toasts and accessible status announcements) but it is never rendered anywhere — every page ships its own static "Connect Wallet" `<button>` that does nothing, in [`app/page.js`](app/page.js) and [`app/invoices/page.js`](app/invoices/page.js). This issue extracts a shared header and mounts `WalletStatus` so the wallet flow is actually reachable.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Create `components/AppHeader.jsx` containing the LiquiFact wordmark/back link plus the `WalletStatus` component, and use it in [`app/page.js`](app/page.js), [`app/invoices/page.js`](app/invoices/page.js), and the marketplace header in [`app/invest/page.js`](app/invest/page.js).
- Remove the dead static buttons that currently use `copy.layout.connectWallet`.
- Preserve `WalletStatus`'s exported `WALLET_STATES` and its existing `role="status"`/`aria-live` regions; the header must keep keyboard focus styles consistent with the `focus-visible` outline already used on the invoices back link.
- Keep the marketplace's "← LiquiFact" back-link semantics on non-home pages.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/wallet-03-mount-walletstatus-header`
- Implement changes
  - **Write code in:** create [`components/AppHeader.jsx`](components/AppHeader.jsx); update [`app/page.js`](app/page.js), [`app/invoices/page.js`](app/invoices/page.js), and [`app/invest/page.js`](app/invest/page.js).
  - **Write comprehensive tests in:** create [`components/AppHeader.test.tsx`](components/AppHeader.test.tsx) — assert WalletStatus mounts, back link renders only off-home, and no stray static button remains.
  - **Add documentation:** update the "UI Components" section in [`README.md`](README.md) to document `AppHeader`.
  - Add JSDoc/prop documentation for `AppHeader` (e.g. `showBackLink`).
  - Validate a11y: header is a `<header>` landmark with a single accessible name.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: home vs inner-page header variants and focus order through the wallet button.
- Include the full `npm test` output and before/after notes on the removed dead buttons.

### Example commit message
`feat: mount walletstatus in a shared appheader and remove dead connect button`

### Guidelines
- **Minimum 95 percent test coverage** for impacted modules.
- Clear, reviewer-focused documentation.
- **Timeframe: 96 hours.**

### Community & contribution rewards
- 💬 **Join the Liquifact community on Discord for questions, reviews, and faster merges:** https://discord.gg/JrGPH4V3
- ⭐ This is a **GrantFox OSS / Official Campaign** task and **may be rewarded**. When your PR is merged you'll be prompted to rate the project — if this issue and the maintainers helped you ship, we'd be grateful for a **5-star rating**. Clear questions in Discord and tidy, well-tested PRs are the fastest path to a merge and a reward.
++++++
---
type: Feature
title: "Integrate Freighter wallet so WalletStatus connects to a real Stellar account"
labels: type:feature, area:wallet, stack:nextjs, stack:react, stack:typescript, priority:high, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Implement real Freighter wallet connection per the integration contract

### Description
[`components/WalletStatus.jsx`](components/WalletStatus.jsx) simulates connection by picking a random outcome inside a `setTimeout`, with `mockWalletData` and a `// replace with actual wallet integration` comment. [`WALLET_INTEGRATION_CONTRACT.md`](WALLET_INTEGRATION_CONTRACT.md) specifies Freighter as the primary target and lists the required detection, connection, network-verification, and error paths. This issue replaces the mock with a real `@stellar/freighter-api` integration.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Create `lib/wallet/freighter.js` wrapping detection (`isConnected`), connection request, account public key retrieval, and network detection.
- Replace `connectWallet()`/`disconnectWallet()` mock logic so `WALLET_STATES` transitions reflect real outcomes: `NO_WALLET` when Freighter is absent, `WRONG_NETWORK` when on testnet while expecting public, `ERROR` on user rejection.
- Populate `walletData` with the contract shape `{ address, network, balance, walletType }`; format the balance and truncate the address for display as the UI already expects.
- Read the expected network from `NEXT_PUBLIC_STELLAR_NETWORK` (see commented entry in [`.env.local.example`](.env.local.example)) defaulting to `testnet`.
- Keep all existing accessibility regions and toast calls intact.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/wallet-04-freighter-integration`
- Implement changes
  - **Write code in:** create [`lib/wallet/freighter.js`](lib/wallet/freighter.js); update [`components/WalletStatus.jsx`](components/WalletStatus.jsx) and [`.env.local.example`](.env.local.example).
  - **Write comprehensive tests in:** create [`components/WalletStatus.test.tsx`](components/WalletStatus.test.tsx) — mock the freighter wrapper for connect, reject, no-wallet, and wrong-network paths.
  - **Add documentation:** update [`WALLET_INTEGRATION_CONTRACT.md`](WALLET_INTEGRATION_CONTRACT.md) status checklist and [`README.md`](README.md) setup steps.
  - Add JSDoc to the wrapper functions; document the supported network env var.
  - Validate security: verify the address format and network before any UI claims "connected".
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: extension missing, user cancels, testnet mismatch, and rapid connect/disconnect.
- Include the full `npm test` output and security notes on address/network validation.

### Example commit message
`feat: integrate freighter wallet for real stellar account connection`

### Guidelines
- **Minimum 95 percent test coverage** for impacted modules.
- Clear, reviewer-focused documentation.
- **Timeframe: 96 hours.**

### Community & contribution rewards
- 💬 **Join the Liquifact community on Discord for questions, reviews, and faster merges:** https://discord.gg/JrGPH4V3
- ⭐ This is a **GrantFox OSS / Official Campaign** task and **may be rewarded**. When your PR is merged you'll be prompted to rate the project — if this issue and the maintainers helped you ship, we'd be grateful for a **5-star rating**. Clear questions in Discord and tidy, well-tested PRs are the fastest path to a merge and a reward.
++++++
---
type: Feature
title: "Enable the disabled Invest marketplace filters (yield, currency, maturity, sort)"
labels: type:feature, area:invest, stack:nextjs, stack:react, stack:typescript, priority:medium, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Implement functional marketplace filtering and sorting

### Description
The Invest page in [`app/invest/page.js`](app/invest/page.js) renders Yield Range, Currency, Maturity Date, Sort, and Clear Filters as permanently `disabled` buttons with "Soon" badges. [`FILTER_CONTRACTS.md`](FILTER_CONTRACTS.md) already documents the intended query-parameter contract for each. This issue makes the filters interactive and applies them to the invoice list client-side (and via query params once the API client exists).

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Create `components/InvoiceFilters.jsx` implementing the five controls from `FILTER_CONTRACTS.md`, replacing the inline disabled markup.
- Apply filtering/sorting to the loaded invoices in `InvestMarketplace`; keep `getInvoiceLoadAnnouncement` accurate after filtering (announce filtered count).
- Map control state to the documented query params (`yield_min`, `currency`, `maturity_from`, `sort`, etc.) so the future API client can consume them.
- Remove the `aria-label="... (coming soon)"` strings and the "Soon" badges once controls are live.
- Preserve responsive `flex-wrap` layout and the slate/cyan styling.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/invest-05-enable-marketplace-filters`
- Implement changes
  - **Write code in:** create [`components/InvoiceFilters.jsx`](components/InvoiceFilters.jsx); update [`app/invest/page.js`](app/invest/page.js).
  - **Write comprehensive tests in:** create [`components/InvoiceFilters.test.tsx`](components/InvoiceFilters.test.tsx) and extend [`app/invest/page.test.jsx`](app/invest/page.test.jsx).
  - **Add documentation:** update [`FILTER_CONTRACTS.md`](FILTER_CONTRACTS.md) to reflect the now-implemented controls and the README UI section.
  - Add JSDoc/prop docs for `InvoiceFilters` (`onChange`, `value`).
  - Validate a11y: each control has an associated label and reflects pressed/selected state.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: empty results after filtering, clearing filters, and combined filter + sort.
- Include the full `npm test` output and screenshots of active filter states.

### Example commit message
`feat: enable invest marketplace filters and sorting controls`

### Guidelines
- **Minimum 95 percent test coverage** for impacted modules.
- Clear, reviewer-focused documentation.
- **Timeframe: 96 hours.**

### Community & contribution rewards
- 💬 **Join the Liquifact community on Discord for questions, reviews, and faster merges:** https://discord.gg/JrGPH4V3
- ⭐ This is a **GrantFox OSS / Official Campaign** task and **may be rewarded**. When your PR is merged you'll be prompted to rate the project — if this issue and the maintainers helped you ship, we'd be grateful for a **5-star rating**. Clear questions in Discord and tidy, well-tested PRs are the fastest path to a merge and a reward.
++++++
---
type: Feature
title: "Add an invoice detail route with a fund-invoice action for investors"
labels: type:feature, area:invest, stack:nextjs, stack:react, stack:typescript, priority:medium, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Implement an invoice detail page and funding entry point

### Description
The marketplace list items in [`app/invest/page.js`](app/invest/page.js) render issuer, amount, yield, and maturity but are not clickable — there is no detail view and no way to express intent to fund. This issue adds an `/invest/[id]` route that shows full invoice details and a "Fund this invoice" call to action wired to the wallet flow.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Create `app/invest/[id]/page.js` rendering the invoice detail using the same `{ id, issuer, amount, currency, dueDate, yield, status }` contract.
- Make each marketplace `<li>` a `next/link` to its detail route, preserving keyboard focusability.
- Add a "Fund this invoice" button that prompts wallet connection (via the WalletStatus/Freighter flow) when disconnected and shows an educational disclaimer consistent with the existing yield-disclaimer note.
- Add `app/invest/[id]/loading.js` reusing the skeleton aesthetic from [`app/invest/loading.js`](app/invest/loading.js).
- Handle unknown ids with a friendly not-found state.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/invest-06-invoice-detail-route`
- Implement changes
  - **Write code in:** create [`app/invest/[id]/page.js`](app/invest/[id]/page.js) and [`app/invest/[id]/loading.js`](app/invest/[id]/loading.js); update [`app/invest/page.js`](app/invest/page.js).
  - **Write comprehensive tests in:** create [`app/invest/[id]/page.test.tsx`](app/invest/[id]/page.test.tsx).
  - **Add documentation:** update [`README.md`](README.md) project structure with the new route.
  - Add JSDoc on any helper that resolves an invoice by id.
  - Validate a11y: detail headings form a logical outline and the fund button has a clear accessible name.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: missing id, disconnected wallet click, and back navigation.
- Include the full `npm test` output and notes on the funding intent flow.

### Example commit message
`feat: add invoice detail route with fund-invoice action`

### Guidelines
- **Minimum 95 percent test coverage** for impacted modules.
- Clear, reviewer-focused documentation.
- **Timeframe: 96 hours.**

### Community & contribution rewards
- 💬 **Join the Liquifact community on Discord for questions, reviews, and faster merges:** https://discord.gg/JrGPH4V3
- ⭐ This is a **GrantFox OSS / Official Campaign** task and **may be rewarded**. When your PR is merged you'll be prompted to rate the project — if this issue and the maintainers helped you ship, we'd be grateful for a **5-star rating**. Clear questions in Discord and tidy, well-tested PRs are the fastest path to a merge and a reward.
++++++
---
type: Feature
title: "Render a real uploaded-invoices list on the Invoices page instead of upload-only"
labels: type:feature, area:invoices, stack:nextjs, stack:react, stack:typescript, priority:medium, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Implement an uploaded-invoices list on the Invoices page

### Description
[`app/invoices/page.js`](app/invoices/page.js) only renders an `<UploadZone />` and intro copy; the README and `copy.invoices.emptyState` reference a list that does not yet exist. This issue adds a list of the SME's own invoices with their tokenization status below the upload zone, reusing the loading/empty/error patterns already established on the Invest page.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Create `components/InvoiceList.jsx` that renders the SME's invoices with status badges (e.g. Pending tokenization, Tokenized, Funded, Settled).
- Add loading via [`components/InvoiceListSkeleton.jsx`](components/InvoiceListSkeleton.jsx), an empty state using `copy.invoices.emptyState`, and an error state using [`components/ErrorBanner.jsx`](components/ErrorBanner.jsx).
- Load data through the `lib/api` client layer; until the backend exists, accept an injectable loader prop like `InvestMarketplace` does for testability.
- After a successful `UploadZone` submission, optimistically refresh/append the new invoice.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/invoices-07-uploaded-invoice-list`
- Implement changes
  - **Write code in:** create [`components/InvoiceList.jsx`](components/InvoiceList.jsx); update [`app/invoices/page.js`](app/invoices/page.js).
  - **Write comprehensive tests in:** create [`components/InvoiceList.test.tsx`](components/InvoiceList.test.tsx).
  - **Add documentation:** update the README UI section to document `InvoiceList`.
  - Add JSDoc/prop docs (`loadInvoices`, status enum).
  - Validate a11y: the list announces load completion via a polite live region like the marketplace.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: empty list, load error, and post-upload refresh.
- Include the full `npm test` output and notes on the status enum.

### Example commit message
`feat: render uploaded-invoices list on the invoices page`

### Guidelines
- **Minimum 95 percent test coverage** for impacted modules.
- Clear, reviewer-focused documentation.
- **Timeframe: 96 hours.**

### Community & contribution rewards
- 💬 **Join the Liquifact community on Discord for questions, reviews, and faster merges:** https://discord.gg/JrGPH4V3
- ⭐ This is a **GrantFox OSS / Official Campaign** task and **may be rewarded**. When your PR is merged you'll be prompted to rate the project — if this issue and the maintainers helped you ship, we'd be grateful for a **5-star rating**. Clear questions in Discord and tidy, well-tested PRs are the fastest path to a merge and a reward.
++++++
---
type: Feature
title: "Add timeout, retry, and typed error handling to the home page API health check"
labels: type:enhancement, area:home, stack:nextjs, stack:react, stack:typescript, priority:medium, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Harden the home page backend health check

### Description
The `checkApi` handler in [`app/page.js`](app/page.js) does a bare `fetch(${API_URL}/health)` with no timeout, no abort, and no handling for non-200 responses — a hung backend leaves the button stuck on "Checking…" indefinitely and `res.json()` can throw on an HTML error page. This issue makes the health check resilient with a timeout, abort, and structured success/error rendering.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add an `AbortController`-based timeout (e.g. 8s) so the request cannot hang forever.
- Check `res.ok` before parsing and guard `res.json()` so non-JSON responses do not throw uncaught.
- Render a clear connected/degraded/unreachable status rather than dumping raw JSON, while keeping a details disclosure for the raw payload.
- Move the URL/fetch logic into a shared helper in `lib/api` so it can be reused and unit-tested.
- Keep the disabled-while-loading behaviour on the button.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b enhancement/home-08-health-check-hardening`
- Implement changes
  - **Write code in:** update [`app/page.js`](app/page.js); create/extend [`lib/api/health.js`](lib/api/health.js).
  - **Write comprehensive tests in:** create [`app/page.test.tsx`](app/page.test.tsx) and [`lib/api/health.test.tsx`](lib/api/health.test.tsx) — mock `fetch` for ok, non-ok, timeout, and malformed JSON.
  - **Add documentation:** note the health-check behaviour in [`README.md`](README.md).
  - Add JSDoc on the health helper.
  - Validate a11y: status changes are announced politely.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: timeout, 500 with HTML body, and offline.
- Include the full `npm test` output.

### Example commit message
`feat: harden home page health check with timeout and typed errors`

### Guidelines
- **Minimum 95 percent test coverage** for impacted modules.
- Clear, reviewer-focused documentation.
- **Timeframe: 96 hours.**

### Community & contribution rewards
- 💬 **Join the Liquifact community on Discord for questions, reviews, and faster merges:** https://discord.gg/JrGPH4V3
- ⭐ This is a **GrantFox OSS / Official Campaign** task and **may be rewarded**. When your PR is merged you'll be prompted to rate the project — if this issue and the maintainers helped you ship, we'd be grateful for a **5-star rating**. Clear questions in Discord and tidy, well-tested PRs are the fastest path to a merge and a reward.
++++++
---
type: Feature
title: "Add a global App Router error boundary and not-found page"
labels: type:feature, area:routing, stack:nextjs, stack:react, stack:typescript, priority:medium, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Implement global error and not-found boundaries

### Description
The app has route-level `loading.js` files under [`app/invest/loading.js`](app/invest/loading.js) and [`app/invoices/loading.js`](app/invoices/loading.js) but no `error.js` or `not-found.js`, so an unexpected render error or unknown URL falls back to Next.js defaults that clash with the dark slate/cyan theme. This issue adds branded error and 404 boundaries that reuse `ErrorBanner`.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Create `app/error.js` (client component) using [`components/ErrorBanner.jsx`](components/ErrorBanner.jsx) with a reset action and the dark theme background.
- Create `app/not-found.js` with a link back home and consistent styling.
- Optionally add `app/global-error.js` for layout-level failures.
- Reuse `copy/en.js` strings; add any new copy keys there rather than inlining text.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/routing-09-error-notfound-boundaries`
- Implement changes
  - **Write code in:** create [`app/error.js`](app/error.js), [`app/not-found.js`](app/not-found.js); update [`app/copy/en.js`](app/copy/en.js).
  - **Write comprehensive tests in:** create [`app/error.test.tsx`](app/error.test.tsx) and [`app/not-found.test.tsx`](app/not-found.test.tsx).
  - **Add documentation:** document the boundaries in [`README.md`](README.md).
  - Add JSDoc on the reset handler.
  - Validate a11y: error region uses `role="alert"` (already in ErrorBanner) and 404 has a focusable home link.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: reset re-render and unknown route navigation.
- Include the full `npm test` output.

### Example commit message
`feat: add global error boundary and branded not-found page`

### Guidelines
- **Minimum 95 percent test coverage** for impacted modules.
- Clear, reviewer-focused documentation.
- **Timeframe: 96 hours.**

### Community & contribution rewards
- 💬 **Join the Liquifact community on Discord for questions, reviews, and faster merges:** https://discord.gg/JrGPH4V3
- ⭐ This is a **GrantFox OSS / Official Campaign** task and **may be rewarded**. When your PR is merged you'll be prompted to rate the project — if this issue and the maintainers helped you ship, we'd be grateful for a **5-star rating**. Clear questions in Discord and tidy, well-tested PRs are the fastest path to a merge and a reward.
++++++
---
type: Feature
title: "Replace dead footer anchors with real navigation and external links"
labels: type:enhancement, area:footer, stack:nextjs, stack:react, stack:typescript, priority:low, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Improve the Footer with real links

### Description
[`components/Footer.jsx`](components/Footer.jsx) renders Documentation, System Status, and Contact Support as `href="#"` placeholders with a `{/* TODO: Add actual links when ready */}` comment, so all three are dead clicks that scroll to the top. This issue wires them to real destinations and adds the Discord community link.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Replace the three `#` anchors with real targets; external links must use `target="_blank"` with `rel="noopener noreferrer"`.
- Add a Discord community link pointing to https://discord.gg/JrGPH4V3.
- Source link labels/URLs from [`app/copy/en.js`](app/copy/en.js) (extend `copy.footer`) rather than hard-coding.
- Keep the existing focusable padding (`py-3`) and hover styles for accessible tap targets.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b enhancement/footer-10-real-links`
- Implement changes
  - **Write code in:** update [`components/Footer.jsx`](components/Footer.jsx) and [`app/copy/en.js`](app/copy/en.js).
  - **Write comprehensive tests in:** create [`components/Footer.test.tsx`](components/Footer.test.tsx) — assert hrefs, `rel`/`target` on external links, and Discord link presence.
  - **Add documentation:** update the README footer component note.
  - Add JSDoc on any link config.
  - Validate security: every `target="_blank"` carries `rel="noopener noreferrer"`.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: external vs internal links and keyboard focus order.
- Include the full `npm test` output.

### Example commit message
`feat: replace dead footer anchors with real navigation links`

### Guidelines
- **Minimum 95 percent test coverage** for impacted modules.
- Clear, reviewer-focused documentation.
- **Timeframe: 96 hours.**

### Community & contribution rewards
- 💬 **Join the Liquifact community on Discord for questions, reviews, and faster merges:** https://discord.gg/JrGPH4V3
- ⭐ This is a **GrantFox OSS / Official Campaign** task and **may be rewarded**. When your PR is merged you'll be prompted to rate the project — if this issue and the maintainers helped you ship, we'd be grateful for a **5-star rating**. Clear questions in Discord and tidy, well-tested PRs are the fastest path to a merge and a reward.
++++++
---
type: Feature
title: "Add a skip-to-content link and consistent focus-visible styling across pages"
labels: type:a11y, area:navigation, stack:nextjs, stack:react, stack:typescript, priority:medium, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Improve keyboard navigation with a skip link and uniform focus styles

### Description
Only [`app/invoices/page.js`](app/invoices/page.js) defines `focus-visible` outlines; the home links in [`app/page.js`](app/page.js) and the marketplace back link in [`app/invest/page.js`](app/invest/page.js) rely on default focus rings, and there is no skip-to-content link in [`app/layout.js`](app/layout.js). Keyboard and screen-reader users cannot quickly bypass the header. This issue adds a global skip link and standardizes focus styling.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add a visually-hidden-until-focused "Skip to content" link as the first focusable element in [`app/layout.js`](app/layout.js), targeting a `#main-content` landmark added to each page's `<main>`.
- Add the existing cyan `focus-visible` outline pattern to all interactive links/buttons that currently lack it.
- Define reusable focus utilities/classes in [`app/globals.css`](app/globals.css) so styling stays consistent.
- Do not change layout flow for mouse users (skip link only visible on focus).

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b a11y/navigation-11-skip-link-focus`
- Implement changes
  - **Write code in:** update [`app/layout.js`](app/layout.js), [`app/page.js`](app/page.js), [`app/invest/page.js`](app/invest/page.js), [`app/globals.css`](app/globals.css).
  - **Write comprehensive tests in:** create [`app/layout.test.tsx`](app/layout.test.tsx) — assert the skip link renders, targets `#main-content`, and is the first focusable element.
  - **Add documentation:** note the skip link in [`README.md`](README.md).
  - Add comments explaining the focus utility classes.
  - Validate a11y with `jest-axe` on the layout.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: skip link reveals on Tab and moves focus to main.
- Include the full `npm test` output.

### Example commit message
`feat: add skip-to-content link and consistent focus-visible styling`

### Guidelines
- **Minimum 95 percent test coverage** for impacted modules.
- Clear, reviewer-focused documentation.
- **Timeframe: 96 hours.**

### Community & contribution rewards
- 💬 **Join the Liquifact community on Discord for questions, reviews, and faster merges:** https://discord.gg/JrGPH4V3
- ⭐ This is a **GrantFox OSS / Official Campaign** task and **may be rewarded**. When your PR is merged you'll be prompted to rate the project — if this issue and the maintainers helped you ship, we'd be grateful for a **5-star rating**. Clear questions in Discord and tidy, well-tested PRs are the fastest path to a merge and a reward.
++++++
---
type: Feature
title: "Fix the globals.css light/dark mismatch and use Geist instead of the hardcoded Arial fallback"
labels: type:a11y, area:theming, stack:nextjs, stack:react, stack:typescript, priority:medium, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Harden theming so colors and fonts match the intended dark UI

### Description
Every page sets `bg-slate-950 text-slate-100`, but [`app/globals.css`](app/globals.css) declares a white `--background`/dark `--foreground` only via `prefers-color-scheme`, and hard-codes `font-family: Arial, Helvetica, sans-serif` on `body` — overriding the Geist font loaded in [`app/layout.js`](app/layout.js). This causes a flash of wrong background and the wrong typeface. This issue aligns the global theme tokens with the dark UI and the Geist font.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Set the base `body` background/foreground to the slate-950/slate-100 palette the pages assume, removing the white-by-default `:root`.
- Replace the `Arial, Helvetica` `font-family` with `var(--font-geist-sans)` so the loaded font is actually applied.
- Expose the brand cyan and slate values as theme tokens in the `@theme` block (matching the README design-token section) so they are not scattered as literals.
- Verify text/background contrast meets WCAG AA for body and muted (`text-slate-400/500`) text.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b a11y/theming-12-global-color-font-fix`
- Implement changes
  - **Write code in:** update [`app/globals.css`](app/globals.css).
  - **Write comprehensive tests in:** create [`app/globals.contrast.test.tsx`](app/globals.contrast.test.tsx) or document a manual contrast audit; add a `jest-axe` smoke test on the layout.
  - **Add documentation:** reconcile the README "Design Tokens" section with the actual tokens.
  - Add comments mapping tokens to their hex values.
  - Validate a11y: confirm contrast ratios for primary and muted text.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: light and dark `prefers-color-scheme`.
- Include the full `npm test` output and the contrast-ratio table.

### Example commit message
`fix: align global theme tokens and apply geist font in globals.css`

### Guidelines
- **Minimum 95 percent test coverage** for impacted modules.
- Clear, reviewer-focused documentation.
- **Timeframe: 96 hours.**

### Community & contribution rewards
- 💬 **Join the Liquifact community on Discord for questions, reviews, and faster merges:** https://discord.gg/JrGPH4V3
- ⭐ This is a **GrantFox OSS / Official Campaign** task and **may be rewarded**. When your PR is merged you'll be prompted to rate the project — if this issue and the maintainers helped you ship, we'd be grateful for a **5-star rating**. Clear questions in Discord and tidy, well-tested PRs are the fastest path to a merge and a reward.
++++++
---
type: Feature
title: "Give disabled marketplace filter buttons accessible 'coming soon' semantics"
labels: type:a11y, area:invest, stack:nextjs, stack:react, stack:typescript, priority:medium, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Improve accessibility of the disabled marketplace filters

### Description
The filter controls in [`app/invest/page.js`](app/invest/page.js) are `disabled` buttons; disabled elements are removed from the tab order and many screen readers do not announce them, so the visible "Soon" badges convey no information to assistive tech. Until the filters are implemented, this issue makes their unavailable state perceivable and announced. (Supersede when the filters are enabled.)

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Associate each "Soon" badge with its control programmatically (e.g. `aria-describedby`) so the status is announced, not just visually shown.
- Prefer `aria-disabled="true"` with a no-op handler over the native `disabled` attribute where keeping the control discoverable is desired, or wrap the group in a labelled `fieldset` explaining it is a preview.
- Ensure the disabled visual state (opacity 60) still meets contrast for the label text.
- Keep behaviour consistent across all five controls and the Clear Filters button.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b a11y/invest-13-coming-soon-semantics`
- Implement changes
  - **Write code in:** update [`app/invest/page.js`](app/invest/page.js) (or the extracted filter component if present).
  - **Write comprehensive tests in:** create [`app/invest/filters.a11y.test.tsx`](app/invest/filters.a11y.test.tsx) using `jest-axe` and role queries.
  - **Add documentation:** update [`FILTER_CONTRACTS.md`](FILTER_CONTRACTS.md) accessibility section.
  - Add comments explaining the chosen ARIA approach.
  - Validate a11y: no `jest-axe` violations and the "coming soon" status is in the accessibility tree.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: keyboard traversal and screen-reader name/description.
- Include the full `npm test` output.

### Example commit message
`fix: add accessible coming-soon semantics to disabled marketplace filters`

### Guidelines
- **Minimum 95 percent test coverage** for impacted modules.
- Clear, reviewer-focused documentation.
- **Timeframe: 96 hours.**

### Community & contribution rewards
- 💬 **Join the Liquifact community on Discord for questions, reviews, and faster merges:** https://discord.gg/JrGPH4V3
- ⭐ This is a **GrantFox OSS / Official Campaign** task and **may be rewarded**. When your PR is merged you'll be prompted to rate the project — if this issue and the maintainers helped you ship, we'd be grateful for a **5-star rating**. Clear questions in Discord and tidy, well-tested PRs are the fastest path to a merge and a reward.
++++++
---
type: Feature
title: "Reduce motion for spinners and pulse skeletons under prefers-reduced-motion"
labels: type:a11y, area:loading-states, stack:nextjs, stack:react, stack:typescript, priority:low, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Improve motion accessibility for loading indicators

### Description
The app uses `animate-spin` spinners in [`components/UploadZone.jsx`](components/UploadZone.jsx) and [`components/WalletStatus.jsx`](components/WalletStatus.jsx) and `animate-pulse` skeletons in [`components/InvoiceListSkeleton.jsx`](components/InvoiceListSkeleton.jsx), [`app/invest/loading.js`](app/invest/loading.js), and [`app/invoices/loading.js`](app/invoices/loading.js), with no `prefers-reduced-motion` handling. Users who request reduced motion still get continuous animation. This issue honours that preference globally.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add a `@media (prefers-reduced-motion: reduce)` rule in [`app/globals.css`](app/globals.css) that disables or minimizes `animate-spin`/`animate-pulse` and other transitions.
- Ensure loading state remains perceivable without motion (skeletons still visible; spinners replaced with a static indicator if needed).
- Do not change default (motion-allowed) behaviour.
- Keep `aria-busy`/`role="status"` semantics intact so non-visual users are unaffected.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b a11y/loading-states-14-reduced-motion`
- Implement changes
  - **Write code in:** update [`app/globals.css`](app/globals.css).
  - **Write comprehensive tests in:** create [`app/globals.reduced-motion.test.tsx`](app/globals.reduced-motion.test.tsx) or a documented manual matrix; add a `jest-axe` smoke check on a loading view.
  - **Add documentation:** note reduced-motion support in [`README.md`](README.md).
  - Add comments on the media query intent.
  - Validate a11y: confirm content remains understandable with motion off.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: reduced-motion on/off and each animated component.
- Include the full `npm test` output.

### Example commit message
`fix: honor prefers-reduced-motion for spinners and skeletons`

### Guidelines
- **Minimum 95 percent test coverage** for impacted modules.
- Clear, reviewer-focused documentation.
- **Timeframe: 96 hours.**

### Community & contribution rewards
- 💬 **Join the Liquifact community on Discord for questions, reviews, and faster merges:** https://discord.gg/JrGPH4V3
- ⭐ This is a **GrantFox OSS / Official Campaign** task and **may be rewarded**. When your PR is merged you'll be prompted to rate the project — if this issue and the maintainers helped you ship, we'd be grateful for a **5-star rating**. Clear questions in Discord and tidy, well-tested PRs are the fastest path to a merge and a reward.
++++++
---
type: Feature
title: "Add a semantic heading hierarchy and main landmark to the home page"
labels: type:a11y, area:home, stack:nextjs, stack:react, stack:typescript, priority:low, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Improve landmark and heading semantics on the home page

### Description
On [`app/page.js`](app/page.js) the brand "LiquiFact" in the header is a plain `<span>`, the two call-to-action cards are `<a>` blocks wrapping `<h2>`s, and "API status" is also an `<h2>` — so the heading outline and the absence of a navigation landmark can confuse screen-reader users. This issue tidies the home page semantics without changing the visual design.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Ensure a single, sensible `h1` → `h2` outline; the "API status" panel should not compete with the primary CTA headings (consider a non-heading label or correct level).
- Wrap header brand/actions in appropriate landmarks (`<header>`/`<nav>`) with accessible names.
- Give the two CTA cards descriptive accessible names so "For Businesses / For Investors" links are unambiguous out of context.
- Keep the existing Tailwind classes and layout intact.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b a11y/home-15-heading-landmarks`
- Implement changes
  - **Write code in:** update [`app/page.js`](app/page.js); add copy to [`app/copy/en.js`](app/copy/en.js) if labels are needed.
  - **Write comprehensive tests in:** create [`app/page.a11y.test.tsx`](app/page.a11y.test.tsx) using `jest-axe` and heading-order queries.
  - **Add documentation:** note the home page structure in [`README.md`](README.md).
  - Add comments where heading levels change.
  - Validate a11y: no `jest-axe` violations and a logical heading order.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: heading order and landmark uniqueness.
- Include the full `npm test` output.

### Example commit message
`fix: improve home page heading hierarchy and landmarks`

### Guidelines
- **Minimum 95 percent test coverage** for impacted modules.
- Clear, reviewer-focused documentation.
- **Timeframe: 96 hours.**

### Community & contribution rewards
- 💬 **Join the Liquifact community on Discord for questions, reviews, and faster merges:** https://discord.gg/JrGPH4V3
- ⭐ This is a **GrantFox OSS / Official Campaign** task and **may be rewarded**. When your PR is merged you'll be prompted to rate the project — if this issue and the maintainers helped you ship, we'd be grateful for a **5-star rating**. Clear questions in Discord and tidy, well-tested PRs are the fastest path to a merge and a reward.
++++++
---
type: Feature
title: "Add unit tests for the ToastProvider auto-dismiss, pause/resume, and context guard"
labels: type:test, area:toast, stack:nextjs, stack:react, stack:typescript, priority:high, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Test the ToastProvider lifecycle and hook contract

### Description
[`components/ToastProvider.jsx`](components/ToastProvider.jsx) implements timed auto-dismiss (`AUTO_DISMISS_MS`), hover pause/resume via `pauseToast`/`resumeToast`, manual dismissal, and a `useToast` hook that throws when used outside the provider — yet it has zero unit tests. This timer-heavy logic is high-risk for regressions. This issue adds full coverage with fake timers.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Test that `success`/`error`/`info` enqueue toasts with correct variant styling and default titles from `VARIANT_STYLES`.
- Test auto-dismiss after `AUTO_DISMISS_MS` using Jest fake timers, plus pause on `mouseenter` and resume on `mouseleave`.
- Test manual "Close" removal and that `useToast` throws "must be used within a ToastProvider" when unwrapped.
- Verify the live region `role="status"`/`aria-live="polite"` wrapper exists and cleanup clears timers on unmount.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b test/toast-16-toastprovider-coverage`
- Implement changes
  - **Write code in:** no source change expected; if a non-test bug is found, fix it in [`components/ToastProvider.jsx`](components/ToastProvider.jsx).
  - **Write comprehensive tests in:** create [`components/ToastProvider.test.tsx`](components/ToastProvider.test.tsx) with `@testing-library/react`, `user-event`, and fake timers.
  - **Add documentation:** note testing approach in [`README.md`](README.md) if a testing section is added.
  - Add comments clarifying timer manipulation.
  - Validate a11y with a `jest-axe` check on a rendered toast.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: rapid enqueue, hover during dismiss, and unmount mid-timer.
- Include the full `npm test` output with coverage for ToastProvider.

### Example commit message
`test: cover toastprovider auto-dismiss, pause/resume, and hook guard`

### Guidelines
- **Minimum 95 percent test coverage** for impacted modules.
- Clear, reviewer-focused documentation.
- **Timeframe: 96 hours.**

### Community & contribution rewards
- 💬 **Join the Liquifact community on Discord for questions, reviews, and faster merges:** https://discord.gg/JrGPH4V3
- ⭐ This is a **GrantFox OSS / Official Campaign** task and **may be rewarded**. When your PR is merged you'll be prompted to rate the project — if this issue and the maintainers helped you ship, we'd be grateful for a **5-star rating**. Clear questions in Discord and tidy, well-tested PRs are the fastest path to a merge and a reward.
++++++
---
type: Feature
title: "Add behavioral tests for the WalletStatus state machine and toast side effects"
labels: type:test, area:wallet, stack:nextjs, stack:react, stack:typescript, priority:high, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Test the WalletStatus connection state transitions

### Description
[`components/WalletStatus.jsx`](components/WalletStatus.jsx) has only an a11y smoke test in [`components/__tests__/WalletStatus.a11y.test.jsx`](components/__tests__/WalletStatus.a11y.test.jsx); none of its six `WALLET_STATES`, the random-outcome connect simulation, the button label/variant logic, or the toast calls are behaviorally tested. This issue adds deterministic tests by controlling the timer and the random branch.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Use Jest fake timers and a mocked `Math.random` to drive `success`, `error`, and `wrong_network` outcomes deterministically.
- Assert button text/variant, helper text, status-dot class, and the `sr-only` status announcement for each state.
- Assert connect/disconnect transitions and that the `NO_WALLET` "Install Wallet" branch opens the Stellar wallets URL (mock `window.open`).
- Verify toast side effects by rendering within a real `ToastProvider`.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b test/wallet-17-walletstatus-state-machine`
- Implement changes
  - **Write code in:** no source change expected unless a bug is found in [`components/WalletStatus.jsx`](components/WalletStatus.jsx).
  - **Write comprehensive tests in:** create [`components/WalletStatus.test.tsx`](components/WalletStatus.test.tsx).
  - **Add documentation:** update [`WALLET_INTEGRATION_CONTRACT.md`](WALLET_INTEGRATION_CONTRACT.md) testing-requirements checklist.
  - Add comments explaining `Math.random`/timer mocking.
  - Validate a11y: keep the existing axe assertion green.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: all six states, rapid connect/disconnect, and external link branch.
- Include the full `npm test` output with WalletStatus coverage.

### Example commit message
`test: cover walletstatus state machine and toast side effects`

### Guidelines
- **Minimum 95 percent test coverage** for impacted modules.
- Clear, reviewer-focused documentation.
- **Timeframe: 96 hours.**

### Community & contribution rewards
- 💬 **Join the Liquifact community on Discord for questions, reviews, and faster merges:** https://discord.gg/JrGPH4V3
- ⭐ This is a **GrantFox OSS / Official Campaign** task and **may be rewarded**. When your PR is merged you'll be prompted to rate the project — if this issue and the maintainers helped you ship, we'd be grateful for a **5-star rating**. Clear questions in Discord and tidy, well-tested PRs are the fastest path to a merge and a reward.
++++++
---
type: Feature
title: "Add unit tests for the home page API health check rendering"
labels: type:test, area:home, stack:nextjs, stack:react, stack:typescript, priority:medium, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Test the home page Check backend health interaction

### Description
[`app/page.js`](app/page.js) has no unit test. The `checkApi` handler toggles a loading label, renders the health JSON in a `<pre>`, and catches network errors into `{ status: 'error', message }` — all untested. This issue adds coverage with a mocked `fetch`.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Mock `global.fetch` to return a healthy payload and assert the JSON renders and the button label returns from "Checking…" to its idle state.
- Mock a rejected fetch and assert the error object renders with the thrown message.
- Assert the button is disabled while `loading` is true.
- Use `@testing-library/user-event` for the click and `findBy*` queries for async resolution.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b test/home-18-health-check-tests`
- Implement changes
  - **Write code in:** no source change unless a bug is found in [`app/page.js`](app/page.js).
  - **Write comprehensive tests in:** create [`app/page.test.tsx`](app/page.test.tsx).
  - **Add documentation:** note coverage expectations in [`README.md`](README.md).
  - Add comments documenting fetch mocking.
  - Validate a11y: optional `jest-axe` smoke check on the page.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: success, network error, and loading-disabled state.
- Include the full `npm test` output.

### Example commit message
`test: cover home page api health check rendering`

### Guidelines
- **Minimum 95 percent test coverage** for impacted modules.
- Clear, reviewer-focused documentation.
- **Timeframe: 96 hours.**

### Community & contribution rewards
- 💬 **Join the Liquifact community on Discord for questions, reviews, and faster merges:** https://discord.gg/JrGPH4V3
- ⭐ This is a **GrantFox OSS / Official Campaign** task and **may be rewarded**. When your PR is merged you'll be prompted to rate the project — if this issue and the maintainers helped you ship, we'd be grateful for a **5-star rating**. Clear questions in Discord and tidy, well-tested PRs are the fastest path to a merge and a reward.
++++++
---
type: Feature
title: "Add a Playwright end-to-end test for the Invest marketplace load and empty states"
labels: type:test, area:invest, stack:nextjs, stack:react, stack:typescript, priority:medium, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Test the Invest marketplace flow end-to-end

### Description
The only Playwright spec is [`tests/toast.spec.jsx`](tests/toast.spec.jsx) for the upload toast; the Invest marketplace in [`app/invest/page.js`](app/invest/page.js) — with its skeleton-to-list transition and polite `aria-live` announcement — has no e2e coverage. This issue adds a marketplace e2e spec using the existing Playwright config.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Navigate to `/invest`, wait for the skeleton (`aria-busy`/aria-label "Loading investable invoices") to resolve, and assert the three mock invoices render with issuer/amount/yield/maturity.
- Assert the polite status region announces "3 investable invoices loaded".
- Cover the empty state by stubbing the loader/route to return no invoices and asserting `copy.invest.emptyState`.
- Reuse the `baseURL` and `webServer` settings in [`playwright.config.mjs`](playwright.config.mjs); keep specs under `tests/` so Jest continues to ignore them.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b test/invest-19-marketplace-e2e`
- Implement changes
  - **Write code in:** test-only.
  - **Write comprehensive tests in:** create [`tests/invest.spec.jsx`](tests/invest.spec.jsx).
  - **Add documentation:** add the new e2e spec to the README test section.
  - Add comments on any route stubbing used.
  - Validate a11y: optionally assert the status region is present.
- Test and commit

### Test and commit
- Run `npm run lint` and `npm run test:e2e`.
- Cover edge cases: loaded list and empty marketplace.
- Include the Playwright run output (and trace on first retry per config).

### Example commit message
`test: add playwright e2e for invest marketplace load and empty states`

### Guidelines
- **Minimum 95 percent test coverage** for impacted modules.
- Clear, reviewer-focused documentation.
- **Timeframe: 96 hours.**

### Community & contribution rewards
- 💬 **Join the Liquifact community on Discord for questions, reviews, and faster merges:** https://discord.gg/JrGPH4V3
- ⭐ This is a **GrantFox OSS / Official Campaign** task and **may be rewarded**. When your PR is merged you'll be prompted to rate the project — if this issue and the maintainers helped you ship, we'd be grateful for a **5-star rating**. Clear questions in Discord and tidy, well-tested PRs are the fastest path to a merge and a reward.
++++++
---
type: Feature
title: "Expand UploadZone tests to cover drag-and-drop, keyboard activation, and double-submit"
labels: type:test, area:upload, stack:nextjs, stack:react, stack:typescript, priority:medium, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Test UploadZone drag-and-drop and keyboard paths

### Description
[`components/UploadZone.test.jsx`](components/UploadZone.test.jsx) covers basic file validation but not the drag-and-drop handlers (`handleDrop`/`onDragOver`/`onDragLeave`), the keyboard activation (`Enter`/`Space` triggers the hidden input), or the submit state machine's double-submit guard (`status !== 'idle'`). This issue closes those gaps.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Simulate drag-over (border state changes), drop with a valid PDF, and drop with an invalid type, asserting the `role="alert"` message.
- Simulate `Enter` and `Space` on the dropzone `role="button"` and assert it clicks the hidden `#invoice-file-input`.
- Use fake timers to walk `uploading → tokenizing → success` and assert the disabled/`aria-disabled` button cannot submit twice.
- Assert each `role="status"` transition copy matches the strings consumed by the e2e spec.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b test/upload-20-dragdrop-keyboard-coverage`
- Implement changes
  - **Write code in:** test-only unless a bug surfaces in [`components/UploadZone.jsx`](components/UploadZone.jsx).
  - **Write comprehensive tests in:** extend [`components/UploadZone.test.jsx`](components/UploadZone.test.jsx) or add [`components/UploadZone.interactions.test.tsx`](components/UploadZone.interactions.test.tsx).
  - **Add documentation:** none required beyond test comments.
  - Add comments explaining DataTransfer mocking.
  - Validate a11y: keep an axe check on the rendered form.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: invalid drop, oversized drop, keyboard activation, and double-submit.
- Include the full `npm test` output with UploadZone coverage.

### Example commit message
`test: cover uploadzone drag-and-drop, keyboard, and double-submit`

### Guidelines
- **Minimum 95 percent test coverage** for impacted modules.
- Clear, reviewer-focused documentation.
- **Timeframe: 96 hours.**

### Community & contribution rewards
- 💬 **Join the Liquifact community on Discord for questions, reviews, and faster merges:** https://discord.gg/JrGPH4V3
- ⭐ This is a **GrantFox OSS / Official Campaign** task and **may be rewarded**. When your PR is merged you'll be prompted to rate the project — if this issue and the maintainers helped you ship, we'd be grateful for a **5-star rating**. Clear questions in Discord and tidy, well-tested PRs are the fastest path to a merge and a reward.
++++++
---
type: Feature
title: "Add Content-Security-Policy and security response headers via next.config and middleware"
labels: type:security, area:headers, stack:nextjs, stack:react, stack:typescript, priority:high, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Harden HTTP responses with security headers and a CSP

### Description
[`next.config.mjs`](next.config.mjs) is an empty config with no `headers()` function, so the app ships without a Content-Security-Policy, `X-Content-Type-Options`, `Referrer-Policy`, or frame protection. Before wallet and API integration handle financial data, the app needs baseline header hardening. This issue adds security headers and a CSP.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add an async `headers()` to [`next.config.mjs`](next.config.mjs) setting `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY` (or CSP `frame-ancestors`), and a `Permissions-Policy`.
- Define a CSP that allows the app's own origin, the `NEXT_PUBLIC_API_URL` for `connect-src`, and Google Fonts used by Geist; document any required `'unsafe-inline'` for styles with justification.
- Avoid breaking the `fetch` calls to the backend or font loading.
- Keep the config compatible with Next.js 16 App Router.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b security/headers-21-csp-and-headers`
- Implement changes
  - **Write code in:** update [`next.config.mjs`](next.config.mjs) (optionally add `middleware.js` for per-request nonces).
  - **Write comprehensive tests in:** create [`security/headers.test.tsx`](security/headers.test.tsx) asserting the headers config shape, or a documented runtime check via `npm run build && npm run start`.
  - **Add documentation:** document the CSP and `connect-src` allowance in [`README.md`](README.md).
  - Add comments justifying each directive.
  - Validate security: confirm no console CSP violations on each page.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: API origin allowed, fonts load, and framing blocked.
- Include the response-header output and a short threat-model note.

### Example commit message
`feat: add content-security-policy and security response headers`

### Guidelines
- **Minimum 95 percent test coverage** for impacted modules.
- Clear, reviewer-focused documentation.
- **Timeframe: 96 hours.**

### Community & contribution rewards
- 💬 **Join the Liquifact community on Discord for questions, reviews, and faster merges:** https://discord.gg/JrGPH4V3
- ⭐ This is a **GrantFox OSS / Official Campaign** task and **may be rewarded**. When your PR is merged you'll be prompted to rate the project — if this issue and the maintainers helped you ship, we'd be grateful for a **5-star rating**. Clear questions in Discord and tidy, well-tested PRs are the fastest path to a merge and a reward.
++++++
---
type: Feature
title: "Validate and sanitize NEXT_PUBLIC_API_URL before issuing requests"
labels: type:security, area:config, stack:nextjs, stack:react, stack:typescript, priority:medium, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Harden environment configuration for the API base URL

### Description
`NEXT_PUBLIC_API_URL` is read inline in [`app/page.js`](app/page.js) (and documented in [`.env.local.example`](.env.local.example)) and concatenated directly into a `fetch` URL with no validation, so a misconfigured or malicious value (e.g. a `javascript:` or unexpected origin) flows straight into requests. This issue centralizes and validates the env config.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Create `lib/config/env.js` that parses `NEXT_PUBLIC_API_URL`, enforces `http`/`https` and a well-formed origin (via `new URL(...)`), and exports a frozen config object with the `http://localhost:3001` default.
- Throw a clear, early error in development when the value is invalid; never silently fall back in a way that masks misconfiguration.
- Replace the inline `process.env.NEXT_PUBLIC_API_URL || '...'` reads across the codebase with this helper.
- Document the optional `NEXT_PUBLIC_STELLAR_NETWORK` value validation too.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b security/config-22-validate-api-url`
- Implement changes
  - **Write code in:** create [`lib/config/env.js`](lib/config/env.js); update [`app/page.js`](app/page.js) and any other consumers.
  - **Write comprehensive tests in:** create [`lib/config/env.test.tsx`](lib/config/env.test.tsx) — valid, missing, non-URL, and disallowed-scheme cases.
  - **Add documentation:** expand the env section in [`README.md`](README.md) and [`.env.local.example`](.env.local.example).
  - Add JSDoc on the exported config.
  - Validate security: reject non-http(s) schemes and log a safe error.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: empty, malformed, trailing-slash, and disallowed scheme.
- Include the full `npm test` output and a note on the validation rules.

### Example commit message
`feat: validate and centralize NEXT_PUBLIC_API_URL configuration`

### Guidelines
- **Minimum 95 percent test coverage** for impacted modules.
- Clear, reviewer-focused documentation.
- **Timeframe: 96 hours.**

### Community & contribution rewards
- 💬 **Join the Liquifact community on Discord for questions, reviews, and faster merges:** https://discord.gg/JrGPH4V3
- ⭐ This is a **GrantFox OSS / Official Campaign** task and **may be rewarded**. When your PR is merged you'll be prompted to rate the project — if this issue and the maintainers helped you ship, we'd be grateful for a **5-star rating**. Clear questions in Discord and tidy, well-tested PRs are the fastest path to a merge and a reward.
++++++
---
type: Feature
title: "Enforce client-side PDF content validation and safe filename handling in UploadZone"
labels: type:security, area:upload, stack:nextjs, stack:react, stack:typescript, priority:medium, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Harden file validation in the invoice UploadZone

### Description
[`components/UploadZone.jsx`](components/UploadZone.jsx) validates only `f.type === 'application/pdf'` and `f.size`, but the browser-reported MIME type is spoofable and the raw `file.name` is rendered into the DOM. For a financial document upload, content-based checks and safe filename handling reduce the risk of malicious or mislabelled files. This issue strengthens validation.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Verify the PDF magic bytes (`%PDF-`) by reading the first bytes of the file in addition to the MIME/extension check.
- Sanitize/escape `file.name` before display and cap its rendered length to avoid layout/clipboard abuse.
- Keep the existing `FILE_CONSTRAINTS` (size, single file) and the accessible `role="alert"` error messaging.
- Reject zero-byte files and files whose extension and detected content disagree.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b security/upload-23-pdf-content-validation`
- Implement changes
  - **Write code in:** update [`components/UploadZone.jsx`](components/UploadZone.jsx); optionally extract a `lib/validation/pdf.js`.
  - **Write comprehensive tests in:** extend [`components/UploadZone.test.jsx`](components/UploadZone.test.jsx) and create [`lib/validation/pdf.test.tsx`](lib/validation/pdf.test.tsx) — valid PDF bytes, spoofed MIME, zero-byte, and long filename.
  - **Add documentation:** note the validation rules in [`README.md`](README.md).
  - Add JSDoc on the validation helper.
  - Validate security: never execute or trust file content; only inspect bytes.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: spoofed `.pdf`, empty file, and oversized name.
- Include the full `npm test` output and a short threat note.

### Example commit message
`feat: validate pdf magic bytes and sanitize filenames in uploadzone`

### Guidelines
- **Minimum 95 percent test coverage** for impacted modules.
- Clear, reviewer-focused documentation.
- **Timeframe: 96 hours.**

### Community & contribution rewards
- 💬 **Join the Liquifact community on Discord for questions, reviews, and faster merges:** https://discord.gg/JrGPH4V3
- ⭐ This is a **GrantFox OSS / Official Campaign** task and **may be rewarded**. When your PR is merged you'll be prompted to rate the project — if this issue and the maintainers helped you ship, we'd be grateful for a **5-star rating**. Clear questions in Discord and tidy, well-tested PRs are the fastest path to a merge and a reward.
++++++
---
type: Feature
title: "Add automated dependency and secret scanning to the CI workflow"
labels: type:security, area:ci, stack:nextjs, stack:react, stack:typescript, priority:medium, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Harden CI with dependency audit and secret scanning

### Description
[`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs only lint and `npm test`; there is no `npm audit`, no dependency review, and no secret scan. As wallet/API integration adds dependencies and handles financial flows, the pipeline should catch vulnerable packages and leaked secrets. This issue adds those gates.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add an `npm audit --audit-level=high` step (or `actions/dependency-review-action` on PRs) that fails on high/critical advisories.
- Add a secret-scan step (e.g. gitleaks) over the diff.
- Keep the existing lint and test jobs; run new checks in parallel where possible to keep CI fast.
- Document how to triage and waive a false-positive advisory.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b security/ci-24-audit-and-secret-scan`
- Implement changes
  - **Write code in:** update [`.github/workflows/ci.yml`](.github/workflows/ci.yml); optionally add a gitleaks config.
  - **Write comprehensive tests in:** validate by triggering CI on the PR; add a documented local `npm audit` run.
  - **Add documentation:** add a "Security in CI" subsection to [`README.md`](README.md).
  - Add comments in the workflow explaining each gate.
  - Validate security: ensure scans run on pull_request from forks safely.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, `npm run build`, and `npm audit` locally.
- Cover edge cases: clean repo passes; an injected high advisory fails.
- Include the CI run link/output and triage notes.

### Example commit message
`ci: add dependency audit and secret scanning to the workflow`

### Guidelines
- **Minimum 95 percent test coverage** for impacted modules.
- Clear, reviewer-focused documentation.
- **Timeframe: 96 hours.**

### Community & contribution rewards
- 💬 **Join the Liquifact community on Discord for questions, reviews, and faster merges:** https://discord.gg/JrGPH4V3
- ⭐ This is a **GrantFox OSS / Official Campaign** task and **may be rewarded**. When your PR is merged you'll be prompted to rate the project — if this issue and the maintainers helped you ship, we'd be grateful for a **5-star rating**. Clear questions in Discord and tidy, well-tested PRs are the fastest path to a merge and a reward.
++++++
---
type: Feature
title: "Document the lib/api data-fetching contract and frontend-backend integration"
labels: type:docs, area:api, stack:nextjs, stack:react, stack:typescript, priority:medium, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Document the frontend API integration contract

### Description
The README mentions the backend Express API and `NEXT_PUBLIC_API_URL`, but the only real network call is the inline health check in [`app/page.js`](app/page.js), and the invoice data is mocked in [`app/invest/page.js`](app/invest/page.js). There is no document describing the expected endpoints, response shapes, or error conventions for the frontend. This issue creates that contract doc.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Create `docs/api-integration.md` describing the endpoints the frontend expects (`/health`, `/invoices` list, invoice detail, upload) with request/response examples matching the existing mock item contract `{ id, issuer, amount, currency, dueDate, yield, status }`.
- Document error-response conventions and how `ErrorBanner`/`ToastProvider` should surface them.
- Reference the existing `FILTER_CONTRACTS.md` query-param contract and the `NEXT_PUBLIC_API_URL` base.
- Keep it accurate to today's mocked state and clearly mark what is "planned".

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b docs/api-25-integration-contract`
- Implement changes
  - **Write code in:** docs-only.
  - **Write comprehensive tests in:** not applicable; if example JSON is referenced by tests later, keep it copy-pasteable.
  - **Add documentation:** create [`docs/api-integration.md`](docs/api-integration.md) and link it from [`README.md`](README.md).
  - Add a versioned changelog note for the contract.
  - Validate accuracy against the current code paths.
- Test and commit

### Test and commit
- Run `npm run lint` and `npm run build` to confirm docs links/format do not break anything.
- Cover edge cases: ensure example payloads match the rendered fields.
- Include a rendered preview of the new doc.

### Example commit message
`docs: add frontend-backend api integration contract`

### Guidelines
- **Minimum 95 percent test coverage** for impacted modules.
- Clear, reviewer-focused documentation.
- **Timeframe: 96 hours.**

### Community & contribution rewards
- 💬 **Join the Liquifact community on Discord for questions, reviews, and faster merges:** https://discord.gg/JrGPH4V3
- ⭐ This is a **GrantFox OSS / Official Campaign** task and **may be rewarded**. When your PR is merged you'll be prompted to rate the project — if this issue and the maintainers helped you ship, we'd be grateful for a **5-star rating**. Clear questions in Discord and tidy, well-tested PRs are the fastest path to a merge and a reward.
++++++
---
type: Feature
title: "Write a component library reference for the shared UI components"
labels: type:docs, area:components, stack:nextjs, stack:react, stack:typescript, priority:low, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Document the shared UI component library

### Description
The README "UI Components" section briefly lists Footer, ErrorBanner, InvoiceListSkeleton, and WalletStatus, but the props it describes for ErrorBanner (`variant`/`message`) do not match the actual signature in [`components/ErrorBanner.jsx`](components/ErrorBanner.jsx) (`variant: "server"|"validation"`, `title`, `description`, `details`, `actionLabel`, `onAction`, `previewLabel`). This issue produces an accurate component reference and adds the missing components.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Document every component under `components/`: `ErrorBanner`, `Footer`, `InvoiceListSkeleton`, `ToastProvider`/`useToast`, `UploadZone` (and exported `FILE_CONSTRAINTS`/`Spinner`), and `WalletStatus` (and `WALLET_STATES`).
- Correct the inaccurate ErrorBanner props in [`README.md`](README.md).
- For each: purpose, props/exports with types, accessibility notes, and a minimal usage example.
- Note which components are client (`'use client'`) vs server components.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b docs/components-26-component-reference`
- Implement changes
  - **Write code in:** docs-only; optionally add JSDoc to the components to keep docs in sync.
  - **Write comprehensive tests in:** not applicable.
  - **Add documentation:** create [`docs/components.md`](docs/components.md) and fix the [`README.md`](README.md) UI section.
  - Add usage snippets that compile against the real signatures.
  - Validate accuracy by cross-checking each prop against source.
- Test and commit

### Test and commit
- Run `npm run lint` and `npm run build`.
- Cover edge cases: every exported symbol is documented.
- Include a rendered preview of the new doc.

### Example commit message
`docs: add accurate shared component library reference`

### Guidelines
- **Minimum 95 percent test coverage** for impacted modules.
- Clear, reviewer-focused documentation.
- **Timeframe: 96 hours.**

### Community & contribution rewards
- 💬 **Join the Liquifact community on Discord for questions, reviews, and faster merges:** https://discord.gg/JrGPH4V3
- ⭐ This is a **GrantFox OSS / Official Campaign** task and **may be rewarded**. When your PR is merged you'll be prompted to rate the project — if this issue and the maintainers helped you ship, we'd be grateful for a **5-star rating**. Clear questions in Discord and tidy, well-tested PRs are the fastest path to a merge and a reward.
++++++
---
type: Feature
title: "Add a testing guide covering Jest unit tests and Playwright e2e setup"
labels: type:docs, area:testing, stack:nextjs, stack:react, stack:typescript, priority:low, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Document the testing workflow and conventions

### Description
The repo has a real testing setup — Jest with `next/jest` in [`jest.config.js`](jest.config.js), `jest-axe` wired in [`jest.setup.js`](jest.setup.js), and Playwright in [`playwright.config.mjs`](playwright.config.mjs) — but no doc explains how to run, structure, or extend tests, including the important detail that Playwright specs under `tests/` are excluded from Jest. This issue writes that guide.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Explain `npm test` (Jest, jsdom) vs `npm run test:e2e` (Playwright), the `@/` module alias mapping, and the `testPathIgnorePatterns` exclusion of `tests/`.
- Document the `jest-axe` accessibility-assertion pattern used in [`components/__tests__/ErrorBanner.a11y.test.jsx`](components/__tests__/ErrorBanner.a11y.test.jsx).
- Document file-naming conventions (`*.test.jsx`/`*.test.tsx` co-located vs `__tests__/`, and `*.spec.jsx` for e2e under `tests/`).
- Note the CI step in [`.github/workflows/ci.yml`](.github/workflows/ci.yml) that runs tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b docs/testing-27-testing-guide`
- Implement changes
  - **Write code in:** docs-only.
  - **Write comprehensive tests in:** not applicable; ensure example snippets are runnable.
  - **Add documentation:** create [`docs/testing.md`](docs/testing.md) and link from [`README.md`](README.md).
  - Add a troubleshooting subsection (e.g. fake timers, axe matchers).
  - Validate by following the guide on a clean checkout.
- Test and commit

### Test and commit
- Run `npm test` and `npm run test:e2e` to confirm the documented commands work.
- Cover edge cases: ensure the alias and ignore-pattern notes are correct.
- Include the command outputs referenced in the doc.

### Example commit message
`docs: add jest and playwright testing guide`

### Guidelines
- **Minimum 95 percent test coverage** for impacted modules.
- Clear, reviewer-focused documentation.
- **Timeframe: 96 hours.**

### Community & contribution rewards
- 💬 **Join the Liquifact community on Discord for questions, reviews, and faster merges:** https://discord.gg/JrGPH4V3
- ⭐ This is a **GrantFox OSS / Official Campaign** task and **may be rewarded**. When your PR is merged you'll be prompted to rate the project — if this issue and the maintainers helped you ship, we'd be grateful for a **5-star rating**. Clear questions in Discord and tidy, well-tested PRs are the fastest path to a merge and a reward.
++++++
---
type: Feature
title: "Add CONTRIBUTING, issue, and pull request templates for the campaign"
labels: type:docs, area:community, stack:nextjs, stack:react, stack:typescript, priority:low, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Document contribution workflow with templates

### Description
Contribution guidance currently lives only as a section inside [`README.md`](README.md); there is no `CONTRIBUTING.md`, and `.github/` contains only [`.github/workflows/ci.yml`](.github/workflows/ci.yml) — no issue or PR templates. For an open-source bounty campaign this makes onboarding and PR consistency harder. This issue adds the standard community files.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Create `CONTRIBUTING.md` capturing the fork → branch → `npm ci` → lint/test/build → PR flow already described in the README, plus the conventional-commit style.
- Create `.github/PULL_REQUEST_TEMPLATE.md` with a checklist (lint/test/build pass, coverage, a11y, docs updated).
- Create `.github/ISSUE_TEMPLATE/` with a bug report and feature request template.
- Reference the Discord community and the campaign labels.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b docs/community-28-contributing-templates`
- Implement changes
  - **Write code in:** docs-only.
  - **Write comprehensive tests in:** not applicable.
  - **Add documentation:** create [`CONTRIBUTING.md`](CONTRIBUTING.md), [`.github/PULL_REQUEST_TEMPLATE.md`](.github/PULL_REQUEST_TEMPLATE.md), and `.github/ISSUE_TEMPLATE/` files; link from [`README.md`](README.md).
  - Keep checklists aligned with the CI gates.
  - Validate that template front-matter renders on GitHub.
- Test and commit

### Test and commit
- Run `npm run lint` and `npm run build`.
- Cover edge cases: templates render correctly and links resolve.
- Include a rendered preview of the templates.

### Example commit message
`docs: add contributing guide and issue/pr templates`

### Guidelines
- **Minimum 95 percent test coverage** for impacted modules.
- Clear, reviewer-focused documentation.
- **Timeframe: 96 hours.**

### Community & contribution rewards
- 💬 **Join the Liquifact community on Discord for questions, reviews, and faster merges:** https://discord.gg/JrGPH4V3
- ⭐ This is a **GrantFox OSS / Official Campaign** task and **may be rewarded**. When your PR is merged you'll be prompted to rate the project — if this issue and the maintainers helped you ship, we'd be grateful for a **5-star rating**. Clear questions in Discord and tidy, well-tested PRs are the fastest path to a merge and a reward.
++++++
---
type: Feature
title: "Extract a shared invoice card and type so the marketplace and skeleton stay in sync"
labels: type:refactor, area:invest, stack:nextjs, stack:react, stack:typescript, priority:medium, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Refactor the invoice card into a shared, typed component

### Description
The invoice card markup is duplicated as inline JSX in the marketplace list in [`app/invest/page.js`](app/invest/page.js) and mirrored structurally by the placeholder rows in [`components/InvoiceListSkeleton.jsx`](components/InvoiceListSkeleton.jsx), with the `{ id, issuer, amount, currency, dueDate, yield, status }` shape redefined in comments in both files. They can drift apart. This issue extracts a single `InvoiceCard` and a shared invoice type/shape.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Create `components/InvoiceCard.jsx` rendering one invoice (issuer, status badge, amount/currency, yield, maturity) and use it in `InvestMarketplace`.
- Define the invoice shape once in `lib/types/invoice.js` (JSDoc typedef) and reference it from the card, the skeleton, and the API client.
- Keep the skeleton's column widths visually matched to the real card.
- No behavioural/visual change to the rendered marketplace.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b refactor/invest-29-shared-invoice-card`
- Implement changes
  - **Write code in:** create [`components/InvoiceCard.jsx`](components/InvoiceCard.jsx) and [`lib/types/invoice.js`](lib/types/invoice.js); update [`app/invest/page.js`](app/invest/page.js) and [`components/InvoiceListSkeleton.jsx`](components/InvoiceListSkeleton.jsx).
  - **Write comprehensive tests in:** create [`components/InvoiceCard.test.tsx`](components/InvoiceCard.test.tsx); keep [`components/InvoiceListSkeleton.test.jsx`](components/InvoiceListSkeleton.test.jsx) green.
  - **Add documentation:** document `InvoiceCard` in the README UI section.
  - Add a JSDoc typedef for the invoice shape.
  - Validate a11y: card keeps an accessible status label.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: missing optional fields and long issuer names.
- Include the full `npm test` output and a before/after note confirming no visual change.

### Example commit message
`refactor: extract shared invoicecard and invoice type`

### Guidelines
- **Minimum 95 percent test coverage** for impacted modules.
- Clear, reviewer-focused documentation.
- **Timeframe: 96 hours.**

### Community & contribution rewards
- 💬 **Join the Liquifact community on Discord for questions, reviews, and faster merges:** https://discord.gg/JrGPH4V3
- ⭐ This is a **GrantFox OSS / Official Campaign** task and **may be rewarded**. When your PR is merged you'll be prompted to rate the project — if this issue and the maintainers helped you ship, we'd be grateful for a **5-star rating**. Clear questions in Discord and tidy, well-tested PRs are the fastest path to a merge and a reward.
++++++
---
type: Feature
title: "Add OpenGraph/Twitter metadata and a generated icon set to the root layout"
labels: type:enhancement, area:seo, stack:nextjs, stack:react, stack:typescript, priority:low, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Improve discoverability with social metadata and icons

### Description
The root [`app/layout.js`](app/layout.js) exports only `title` and `description` in its `metadata`; there are no OpenGraph or Twitter card fields, no `metadataBase`, and no app icons beyond the default `app/favicon.ico`. Links to LiquiFact shared on social or chat render without a preview image or proper title. This issue completes the metadata for a polished, shareable site.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Extend the `metadata` export with `metadataBase`, `openGraph` (title, description, url, siteName, image), and `twitter` card fields, reusing copy from [`app/copy/en.js`](app/copy/en.js) where sensible.
- Add an OG image (static asset under `public/` or an `app/opengraph-image` route) consistent with the slate/cyan brand.
- Add `app/icon` / apple-touch icon as supported by the App Router metadata API.
- Keep the existing Geist font setup and `lang="en"` on `<html>`.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b enhancement/seo-30-social-metadata-icons`
- Implement changes
  - **Write code in:** update [`app/layout.js`](app/layout.js); add OG image/icon assets under [`public/`](public) or `app/`.
  - **Write comprehensive tests in:** create [`app/layout.metadata.test.tsx`](app/layout.metadata.test.tsx) asserting the exported metadata fields.
  - **Add documentation:** note the social metadata in [`README.md`](README.md).
  - Add comments mapping metadata fields to their source copy.
  - Validate: confirm the OG image resolves and the build emits the icons.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: absolute `metadataBase` URL and image dimensions.
- Include the full `npm test` output and a screenshot of the social preview.

### Example commit message
`feat: add opengraph/twitter metadata and app icons to root layout`

### Guidelines
- **Minimum 95 percent test coverage** for impacted modules.
- Clear, reviewer-focused documentation.
- **Timeframe: 96 hours.**

### Community & contribution rewards
- 💬 **Join the Liquifact community on Discord for questions, reviews, and faster merges:** https://discord.gg/JrGPH4V3
- ⭐ This is a **GrantFox OSS / Official Campaign** task and **may be rewarded**. When your PR is merged you'll be prompted to rate the project — if this issue and the maintainers helped you ship, we'd be grateful for a **5-star rating**. Clear questions in Discord and tidy, well-tested PRs are the fastest path to a merge and a reward.