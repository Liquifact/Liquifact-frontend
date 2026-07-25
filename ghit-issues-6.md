---
type: Feature
title: "Replace InvoiceCard inline amount, date, and yield formatters with the shared lib/format helpers"
labels: type:refactor, area:invoice-card, stack:nextjs, stack:react, stack:typescript, priority:medium, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Replace InvoiceCard inline amount, date, and yield formatters with the shared lib/format helpers

### Description
[`components/InvoiceCard.jsx`](components/InvoiceCard.jsx) defines its own `formatDate`, `formatAmount`, and `formatYield` functions, while a canonical, well-tested implementation already exists in [`lib/format/currency.js`](lib/format/currency.js). Worse, the card body renders the yield with a hand-rolled `` `${yieldPct}%` `` expression that bypasses even its own `formatYield`, so a string like `"8.5%"` becomes `"8.5%%"`. Consolidate on the shared helpers so formatting stays consistent across the card, skeleton, and detail page.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Import `formatCurrency`/`formatAmount` from [`lib/format/currency.js`](lib/format/currency.js) and use them for the amount and yield cells.
- Delete the duplicated local `formatAmount`/`formatYield`; keep date formatting only if no shared date helper exists, otherwise reuse it.
- Fix the `` `${yieldPct}%` `` render so a percent-suffixed string is never double-suffixed.
- Preserve existing markup, column widths, and the `aria-label` composition.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b refactor/invoice-card-shared-formatters`
- Implement changes
  - **Write code in:** [`components/InvoiceCard.jsx`](components/InvoiceCard.jsx), reusing [`lib/format/currency.js`](lib/format/currency.js)
  - **Write comprehensive tests in:** `components/InvoiceCard.test.tsx`
  - **Add documentation:** note the formatter reuse in [`COMPONENTS.md`](COMPONENTS.md)
  - Validate security/a11y: ensure values stay escaped and the visible text matches the `aria-label`.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: `null`/`NaN` amount, numeric vs percent-string yield, and a missing `dueDate`.

### Example commit message
`refactor: render InvoiceCard via shared lib/format helpers with tests`

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
title: "Detect and block funding when Freighter is on an unexpected Stellar network"
labels: type:security, area:wallet, stack:nextjs, stack:react, stack:typescript, priority:high, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Detect and block funding when Freighter is on an unexpected Stellar network

### Description
[`lib/wallet/freighter.js`](lib/wallet/freighter.js) reads the wallet network via `getFreighterNetwork()` but silently defaults to `'public'` on any error and never compares it against the app's configured `NEXT_PUBLIC_STELLAR_NETWORK`. A user connected to mainnet while the app targets testnet (or vice versa) could attempt a funding action against the wrong ledger. Add an explicit network-match check and surface a clear wrong-network state.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add `assertExpectedNetwork()`/`isExpectedNetwork()` in [`lib/wallet/freighter.js`](lib/wallet/freighter.js) comparing `getFreighterNetwork()` against `NEXT_PUBLIC_STELLAR_NETWORK`.
- Do not default-to-`public` on error in a way that masks a mismatch; treat an unreadable network as not-expected.
- Wire the result into the existing `WRONG_NETWORK` wallet state consumed by [`components/WalletStatus.jsx`](components/WalletStatus.jsx).
- Never trigger a funding request while the network is unexpected.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b security/wallet-expected-network-guard`
- Implement changes
  - **Write code in:** [`lib/wallet/freighter.js`](lib/wallet/freighter.js), [`components/WalletStatus.jsx`](components/WalletStatus.jsx)
  - **Write comprehensive tests in:** `lib/wallet/freighter.test.tsx`
  - **Add documentation:** update [`WALLET_INTEGRATION_CONTRACT.md`](WALLET_INTEGRATION_CONTRACT.md)
  - Validate security/a11y: confirm wrong-network blocks actions and the state is announced to assistive tech.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: matching network, mismatched network, and a thrown `getNetworkDetails`.

### Example commit message
`security: block funding on unexpected Freighter network with tests`

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
title: "Add an AbortController-based request timeout to fetchInvestableInvoices"
labels: type:enhancement, area:api-client, stack:nextjs, stack:react, stack:typescript, priority:high, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Add an AbortController-based request timeout to fetchInvestableInvoices

### Description
[`lib/api/invoices.js`](lib/api/invoices.js) issues a bare `fetch` with no timeout, so a hung backend leaves the Invest marketplace spinning indefinitely. The existing `getHealth` path already models timeout handling; bring the same resilience to the invoices client by adding a configurable timeout that aborts the request and throws a typed timeout error, while still honoring a caller-supplied `signal`.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add a `timeoutMs` option (sensible default) to `fetchInvestableInvoices` and abort via `AbortController`, composing with any caller `signal`.
- Throw a distinguishable timeout error so the marketplace can show a retryable banner.
- Preserve existing not-OK, invalid-JSON, and non-array error paths and the field normalization.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b enhancement/api-client-invoices-timeout`
- Implement changes
  - **Write code in:** [`lib/api/invoices.js`](lib/api/invoices.js)
  - **Write comprehensive tests in:** `lib/api/invoices.test.ts`
  - **Add documentation:** update [`docs`](docs) data-fetching notes
  - Validate security/a11y: ensure aborted requests do not leak state and errors are user-safe.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: timeout fired, caller-abort, OK response, and non-array payload.

### Example commit message
`feat: add request timeout to fetchInvestableInvoices with tests`

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
title: "Add a status-legend filter chip row to the Invest marketplace using StatusPill tones"
labels: type:feature, area:marketplace, stack:nextjs, stack:react, stack:typescript, priority:medium, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Add a status-legend filter chip row to the Invest marketplace using StatusPill tones

### Description
The Invest marketplace renders invoice statuses through [`components/StatusPill.jsx`](components/StatusPill.jsx) but offers no way to filter the list by status. Add a compact, toggleable chip row above the list that lets investors narrow results to one or more statuses, reusing the canonical vocabulary and tones from [`lib/types/invoice.js`](lib/types/invoice.js).

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Derive the chip set from `INVOICE_STATUSES` so it never drifts from the pill mapping.
- Toggling a chip filters the visible invoices; multiple selections union together; clearing shows all.
- Each chip is a real `button` with `aria-pressed`; selection is keyboard operable.
- Integrate with the existing filter/derivation flow in [`app/invest/page.js`](app/invest/page.js) without breaking search.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/marketplace-status-legend-filter`
- Implement changes
  - **Write code in:** [`app/invest/page.js`](app/invest/page.js), [`components/InvoiceFilters.jsx`](components/InvoiceFilters.jsx)
  - **Write comprehensive tests in:** `components/InvoiceFilters.test.jsx`
  - **Add documentation:** update [`COMPONENTS.md`](COMPONENTS.md)
  - Validate security/a11y: verify `aria-pressed` semantics and visible focus.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: no selection, single status, multi-status union, and an unknown status value.

### Example commit message
`feat: add status-legend filter chips to the marketplace with tests`

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
title: "Add a print stylesheet so investors can print or PDF an invoice detail page"
labels: type:feature, area:invoice-detail, stack:nextjs, stack:react, stack:typescript, priority:low, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Add a print stylesheet so investors can print or PDF an invoice detail page

### Description
The invoice detail route [`app/invest/[id]/page.js`](app/invest/[id]/page.js) is built for the dark on-screen theme and prints poorly: dark backgrounds waste ink and interactive chrome (wallet button, nav) appears on paper. Add a print stylesheet and a "Print / Save PDF" action so investors can produce a clean record of an invoice.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add `@media print` rules in [`app/globals.css`](app/globals.css) that hide nav/wallet/footer chrome and switch to a light, ink-friendly layout.
- Add a "Print" button on the detail page that calls `window.print()`.
- Keep the printed output to the invoice's core fields (issuer, amount, yield, maturity, status).

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/invoice-detail-print-stylesheet`
- Implement changes
  - **Write code in:** [`app/invest/[id]/page.js`](app/invest/[id]/page.js), [`app/globals.css`](app/globals.css)
  - **Write comprehensive tests in:** `app/invest/[id]/page.test.tsx`
  - **Add documentation:** note the print behavior in [`COMPONENTS.md`](COMPONENTS.md)
  - Validate security/a11y: ensure the print button is labeled and reachable by keyboard.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: print button invokes `window.print`, and chrome is marked no-print.

### Example commit message
`feat: add print stylesheet and print action to invoice detail with tests`

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
title: "Document every NEXT_PUBLIC_ and Stellar environment variable in a single reference"
labels: type:docs, area:configuration, stack:nextjs, stack:react, stack:typescript, priority:medium, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Document every NEXT_PUBLIC_ and Stellar environment variable in a single reference

### Description
Environment variables are referenced across [`lib/api/invoices.js`](lib/api/invoices.js), [`app/sitemap.js`](app/sitemap.js), [`lib/wallet/freighter.js`](lib/wallet/freighter.js), and [`lib/config/env.js`](lib/config/env.js), and [`.env.local.example`](.env.local.example) lists a subset, but there is no single authoritative table explaining each variable, its default, and which feature breaks without it. Add a configuration reference and reconcile it against `.env.local.example`.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Produce a `docs/configuration.md` table: variable, purpose, default, required-vs-optional, consuming module.
- Cover `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SITE_URL`, and `NEXT_PUBLIC_STELLAR_NETWORK` at minimum; audit the code for any others.
- Ensure [`.env.local.example`](.env.local.example) matches the documented set exactly (no orphans either way).

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b docs/configuration-env-reference`
- Implement changes
  - **Write code in:** documentation only; reconcile [`.env.local.example`](.env.local.example)
  - **Write comprehensive tests in:** `lib/config/env.test.tsx` (assert documented defaults match `lib/config/env.js`)
  - **Add documentation:** add `docs/configuration.md` and link it from [`README.md`](README.md)
  - Validate security/a11y: confirm no secrets are documented as public env vars.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: missing optional var falls back to its documented default.

### Example commit message
`docs: add environment-variable configuration reference and reconcile example`

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
title: "Announce wallet connect and disconnect transitions through a polite live region"
labels: type:a11y, area:wallet, stack:nextjs, stack:react, stack:typescript, priority:medium, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Announce wallet connect and disconnect transitions through a polite live region

### Description
[`components/WalletStatus.jsx`](components/WalletStatus.jsx) changes its visible label as the wallet moves between disconnected, connecting, connected, and error states, but a screen-reader user gets no spoken confirmation when a connection completes or drops. Add a dedicated polite live region that announces each meaningful transition once.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add an `aria-live="polite"` status region that announces transitions (e.g., "Wallet connected", "Wallet disconnected", "Wallet connection failed").
- Announce only on actual state change; avoid repeated or duplicate announcements on re-render.
- Do not announce the full public key; keep announcements concise and non-sensitive.
- Build on the existing `WALLET_STATES`/state machine in [`components/WalletContext.jsx`](components/WalletContext.jsx).

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b a11y/wallet-status-live-announcements`
- Implement changes
  - **Write code in:** [`components/WalletStatus.jsx`](components/WalletStatus.jsx)
  - **Write comprehensive tests in:** `components/WalletStatus.test.tsx`
  - **Add documentation:** update [`WALLET_INTEGRATION_CONTRACT.md`](WALLET_INTEGRATION_CONTRACT.md)
  - Validate security/a11y: run `jest-axe` and verify single-announcement-per-transition behavior.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: connect, disconnect, error, and a no-op re-render.

### Example commit message
`a11y: announce wallet connection transitions via live region with tests`

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
title: "Add unit tests for the lib/format/invoice formatAmount and formatYield helpers"
labels: type:test, area:formatting, stack:nextjs, stack:react, stack:typescript, priority:medium, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Add unit tests for the lib/format/invoice formatAmount and formatYield helpers

### Description
[`lib/format/invoice.js`](lib/format/invoice.js) exposes `formatAmount` and `formatYield`, but the helpers have thin coverage and contain a latent quirk: `formatAmount` accepts a `currency` argument that it then ignores, and `formatYield` blindly interpolates without guarding `null`/`NaN`. Lock the current contract down with tests so any future change (or the noted cleanups) is intentional.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Test `formatAmount` grouping output, zero, negative, and the currently-ignored `currency` parameter.
- Test `formatYield` for integers, decimals, and document behavior on `null`/`undefined`/`NaN`.
- Keep tests deterministic across locales by asserting on structure, not a hard-coded separator where the platform may vary.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b test/format-invoice-helpers`
- Implement changes
  - **Write code in:** test-only; optionally add `null`/`NaN` guards to [`lib/format/invoice.js`](lib/format/invoice.js) if it tightens the contract
  - **Write comprehensive tests in:** `lib/format/invoice.test.tsx`
  - **Add documentation:** note the helper contract in [`COMPONENTS.md`](COMPONENTS.md)
  - Validate security/a11y: ensure output is plain display-safe text.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: zero, negative, large numbers, and invalid inputs.

### Example commit message
`test: cover lib/format/invoice formatAmount and formatYield helpers`

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
title: "Add a copy-to-clipboard share link to the invoice detail page"
labels: type:feature, area:invoice-detail, stack:nextjs, stack:react, stack:typescript, priority:low, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Add a copy-to-clipboard share link to the invoice detail page

### Description
There is no quick way to share a specific invoice from [`app/invest/[id]/page.js`](app/invest/[id]/page.js); a user has to copy the URL from the address bar. Add a "Copy link" button that copies the canonical invoice URL to the clipboard and confirms the action, so investors can share an invoice directly.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add a "Copy link" button that writes the absolute invoice URL via the Clipboard API, with a graceful fallback when unavailable.
- Show transient confirmation feedback (reuse the existing toast system if present) without a layout shift.
- Build the URL from the route `id` plus the site base; do not hard-code a host.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/invoice-detail-copy-share-link`
- Implement changes
  - **Write code in:** [`app/invest/[id]/page.js`](app/invest/[id]/page.js), reusing [`components/ToastProvider.jsx`](components/ToastProvider.jsx)
  - **Write comprehensive tests in:** `app/invest/[id]/page.test.tsx`
  - **Add documentation:** update [`COMPONENTS.md`](COMPONENTS.md)
  - Validate security/a11y: ensure the button is labeled and confirmation is announced.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: clipboard success, clipboard rejection/fallback, and missing route id.

### Example commit message
`feat: add copy-share-link action to invoice detail page with tests`

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
title: "Add compact-notation support to formatCurrency for large invoice amounts"
labels: type:enhancement, area:formatting, stack:nextjs, stack:react, stack:typescript, priority:low, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Add compact-notation support to formatCurrency for large invoice amounts

### Description
[`lib/format/currency.js`](lib/format/currency.js) always renders the full grouped amount, which overflows the narrow Amount column on [`components/InvoiceCard.jsx`](components/InvoiceCard.jsx) for large invoices (e.g., `1,250,000.00 USD`). Add an opt-in compact mode (`1.25M`) via `Intl.NumberFormat` `notation: "compact"`, with the full value preserved in a `title`/`aria-label` for precision.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add a `compact` option to `formatCurrency`/`formatAmount` that uses `notation: "compact"` and falls back to the standard formatter on unsupported environments.
- Keep the existing default behavior unchanged when `compact` is not requested.
- When used on the card, expose the full value to assistive tech and on hover.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b enhancement/format-currency-compact-notation`
- Implement changes
  - **Write code in:** [`lib/format/currency.js`](lib/format/currency.js), [`components/InvoiceCard.jsx`](components/InvoiceCard.jsx)
  - **Write comprehensive tests in:** `lib/format/currency.test.tsx`
  - **Add documentation:** update [`COMPONENTS.md`](COMPONENTS.md)
  - Validate security/a11y: ensure full precision is available to screen readers.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: thousands, millions, fractional, and invalid inputs.

### Example commit message
`feat: add compact-notation option to formatCurrency with tests`

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
title: "Extract a shared formatInvoiceDate helper and remove the per-component date logic"
labels: type:refactor, area:formatting, stack:nextjs, stack:react, stack:typescript, priority:medium, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Extract a shared formatInvoiceDate helper and remove the per-component date logic

### Description
Date rendering is duplicated and inconsistent: [`components/InvoiceCard.jsx`](components/InvoiceCard.jsx) has a local `formatDate` with its own fallback, while the maturity badge and detail page format dates independently. Extract a single `formatInvoiceDate` helper under `lib/format/` with consistent fallback and invalid-date handling, and reuse it everywhere a `dueDate` is shown.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add `formatInvoiceDate(value, options)` in a new `lib/format/date.js` returning a stable fallback for missing/unparseable input.
- Replace the local `formatDate` in [`components/InvoiceCard.jsx`](components/InvoiceCard.jsx) and any other inline date formatting.
- Keep output locale-aware and deterministic for tests by allowing an explicit locale/timezone in options.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b refactor/shared-invoice-date-helper`
- Implement changes
  - **Write code in:** `lib/format/date.js`, [`components/InvoiceCard.jsx`](components/InvoiceCard.jsx)
  - **Write comprehensive tests in:** `lib/format/date.test.tsx`
  - **Add documentation:** update [`COMPONENTS.md`](COMPONENTS.md)
  - Validate security/a11y: ensure date text stays plain and escaped.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: valid ISO date, `undefined`, empty string, and an unparseable string.

### Example commit message
`refactor: centralize invoice date formatting in a shared helper with tests`

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
title: "Centralize backend base-URL resolution into a single getApiBaseUrl helper"
labels: type:refactor, area:api-client, stack:nextjs, stack:react, stack:typescript, priority:medium, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Centralize backend base-URL resolution into a single getApiBaseUrl helper

### Description
The pattern `process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"` is duplicated across the API layer (for example in [`lib/api/invoices.js`](lib/api/invoices.js) and the health/upload paths), each re-implementing trailing-slash trimming. Extract a single `getApiBaseUrl()` in [`lib/config/env.js`](lib/config/env.js) that resolves, validates, and normalizes the base URL once.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add `getApiBaseUrl()` that reads `NEXT_PUBLIC_API_URL`, applies the localhost fallback, and strips trailing slashes.
- Reject obviously invalid values (non-http(s) schemes) rather than building broken request URLs.
- Replace the inline resolution in every API client so the logic lives in one place.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b refactor/api-base-url-resolver`
- Implement changes
  - **Write code in:** [`lib/config/env.js`](lib/config/env.js), [`lib/api/invoices.js`](lib/api/invoices.js), [`lib/api/health.js`](lib/api/health.js)
  - **Write comprehensive tests in:** `lib/config/env.test.tsx`
  - **Add documentation:** update [`docs`](docs) integration notes
  - Validate security/a11y: ensure only safe http(s) origins are accepted.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: unset env, trailing slashes, and an invalid scheme.

### Example commit message
`refactor: centralize API base-URL resolution in getApiBaseUrl with tests`

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
title: "Add an end-to-end test for connecting Freighter with a mocked wallet provider"
labels: type:test, area:wallet, stack:nextjs, stack:react, stack:typescript, priority:high, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Add an end-to-end test for connecting Freighter with a mocked wallet provider

### Description
The wallet connect path spans [`components/WalletStatus.jsx`](components/WalletStatus.jsx), [`components/WalletContext.jsx`](components/WalletContext.jsx), and [`lib/wallet/freighter.js`](lib/wallet/freighter.js), but there is no end-to-end test that drives the full connect flow in a browser. Add a Playwright test that mocks the `@stellar/freighter-api` surface and verifies the UI transitions from disconnected to connected and renders a truncated address.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Inject a mock Freighter provider (via init script / `__mocks__`) exposing `isConnected`, `requestAccess`, and `getNetworkDetails`.
- Assert the connect button advances through connecting and lands on connected with the truncated public key shown.
- Cover the rejection path so a denied `requestAccess` surfaces an error state.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b test/e2e-freighter-connect-flow`
- Implement changes
  - **Write code in:** Playwright spec under [`tests`](tests); reuse [`__mocks__`](__mocks__)
  - **Write comprehensive tests in:** `tests/wallet-connect.spec.tsx`
  - **Add documentation:** update [`TESTING.md`](TESTING.md)
  - Validate security/a11y: ensure no real wallet keys are used in the mock.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: successful connect, user rejection, and an already-connected session.

### Example commit message
`test: add Playwright e2e for the Freighter connect flow with a mocked provider`

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
title: "Add a frontend ARCHITECTURE guide mapping the App Router routes and data flow"
labels: type:docs, area:architecture, stack:nextjs, stack:react, stack:typescript, priority:medium, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Add a frontend ARCHITECTURE guide mapping the App Router routes and data flow

### Description
New contributors must reverse-engineer how data flows from [`lib/api`](lib/api) through the App Router pages ([`app/page.js`](app/page.js), [`app/invest/page.js`](app/invest/page.js), [`app/invest/[id]/page.js`](app/invest/[id]/page.js), [`app/invoices/page.js`](app/invoices/page.js)) into the shared components. Add an architecture guide that maps routes, the mock-vs-live data layers, and where wallet state lives.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Document each App Router route, its loading/error files, and which `lib/api` client it consumes.
- Explain the mock-data layer ([`app/invest/lib.js`](app/invest/lib.js)) vs the live client ([`lib/api/invoices.js`](lib/api/invoices.js)) and the migration boundary.
- Include a simple route-to-component diagram and where wallet/context providers sit in [`app/layout.js`](app/layout.js).

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b docs/frontend-architecture-guide`
- Implement changes
  - **Write code in:** documentation only
  - **Write comprehensive tests in:** n/a — add a link-check note; if a doc test harness exists, assert referenced files exist
  - **Add documentation:** add `docs/architecture.md` and link it from [`README.md`](README.md)
  - Validate security/a11y: ensure no secrets or private endpoints are documented.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: verify every referenced path in the guide actually exists.

### Example commit message
`docs: add frontend architecture and data-flow guide`

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
title: "Show a Stellar network badge in the app header reflecting the configured environment"
labels: type:feature, area:wallet, stack:nextjs, stack:react, stack:typescript, priority:low, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Show a Stellar network badge in the app header reflecting the configured environment

### Description
Investors cannot tell at a glance whether they are interacting with testnet or mainnet. Add a small network badge in the header (alongside [`components/WalletStatus.jsx`](components/WalletStatus.jsx)) that reflects `NEXT_PUBLIC_STELLAR_NETWORK`, and visually distinguishes testnet so users are never confused about which ledger they are on.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Read the configured network via [`lib/config/env.js`](lib/config/env.js) and render a labeled badge (e.g., "Testnet").
- Apply a distinct, non-color-only treatment for non-mainnet so testnet is unmistakable.
- Place the badge near the wallet status in the header without disrupting existing layout or focus order.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/header-network-badge`
- Implement changes
  - **Write code in:** [`app/layout.js`](app/layout.js), [`components/WalletStatus.jsx`](components/WalletStatus.jsx)
  - **Write comprehensive tests in:** `components/WalletStatus.test.tsx`
  - **Add documentation:** update [`WALLET_INTEGRATION_CONTRACT.md`](WALLET_INTEGRATION_CONTRACT.md)
  - Validate security/a11y: ensure the badge has a text label, not color alone.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: testnet, mainnet/public, and an unset network value.

### Example commit message
`feat: add a Stellar network badge to the app header with tests`

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
title: "Add tests asserting fetchInvestableInvoices normalizes and defaults every invoice field"
labels: type:test, area:api-client, stack:nextjs, stack:react, stack:typescript, priority:medium, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Add tests asserting fetchInvestableInvoices normalizes and defaults every invoice field

### Description
[`lib/api/invoices.js`](lib/api/invoices.js) maps each raw payload entry to the UI contract `{ id, issuer, amount, currency, dueDate, yield, status }`, defaulting missing fields to `null` and guarding against non-array payloads. This normalization is load-bearing for the marketplace but is under-tested. Add focused tests that pin the field defaulting and error behavior so a backend shape change is caught early.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Assert that partial invoice objects get every missing field defaulted to `null`.
- Assert the `yield` rename mapping (`yield` in, `yield` out) and that unknown extra fields are dropped.
- Assert the not-OK, invalid-JSON, and non-array error paths throw the documented messages.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b test/api-invoices-normalization`
- Implement changes
  - **Write code in:** test-only against [`lib/api/invoices.js`](lib/api/invoices.js)
  - **Write comprehensive tests in:** `lib/api/invoices.test.ts`
  - **Add documentation:** note the normalization contract in [`docs`](docs)
  - Validate security/a11y: ensure malformed payloads cannot inject unexpected fields downstream.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: empty array, partial objects, `null` entries, and a non-array body.

### Example commit message
`test: pin fetchInvestableInvoices field normalization and error paths`

### Guidelines
- **Minimum 95 percent test coverage** for impacted modules.
- Clear, reviewer-focused documentation.
- **Timeframe: 96 hours.**

### Community & contribution rewards
- 💬 **Join the Liquifact community on Discord for questions, reviews, and faster merges:** https://discord.gg/JrGPH4V3
- ⭐ This is a **GrantFox OSS / Official Campaign** task and **may be rewarded**. When your PR is merged you'll be prompted to rate the project — if this issue and the maintainers helped you ship, we'd be grateful for a **5-star rating**. Clear questions in Discord and tidy, well-tested PRs are the fastest path to a merge and a reward.
