---
type: Feature
title: "Add a numeric currency and amount formatter utility with locale-aware grouping"
labels: type:feature, area:formatting, stack:nextjs, stack:react, stack:typescript, priority:medium, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Add a numeric currency and amount formatter utility with locale-aware grouping

### Description
Invoice amounts and yields are rendered as raw numbers in several components. Add a small, well-tested `formatCurrency`/`formatAmount` utility under `lib/format/` that wraps `Intl.NumberFormat`, supports a configurable currency code, and degrades gracefully for `null`/`NaN` inputs.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Implement `formatCurrency(value, { currency, locale })` and `formatAmount(value)` returning safe strings for invalid input.
- Reuse the helper in the Invest marketplace cards and the invoice detail page.
- No new runtime dependencies; use the platform `Intl` API.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/formatting-locale-currency-formatter`
- Implement changes
  - **Write code in:** [`lib/format/`](lib/format/), [`app/invest/page.js`](app/invest/page.js), [`app/invest/[id]/page.js`](app/invest/[id]/page.js)
  - **Write comprehensive tests in:** `lib/format/currency.test.tsx`
  - **Add documentation:** note the helper in [`COMPONENTS.md`](COMPONENTS.md)
  - Validate security/a11y: ensure no unescaped values are injected and formatted text remains screen-reader friendly.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.

### Example commit message
`feat: add locale-aware currency and amount formatter with tests`

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
title: "Add a relative-time 'days until maturity' badge to invoice cards"
labels: type:feature, area:invest, stack:nextjs, stack:react, stack:typescript, priority:medium, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Add a relative-time 'days until maturity' badge to invoice cards

### Description
Investors need to see how soon an invoice matures. Add a derived "matures in N days" badge to each marketplace card, computed from the invoice maturity date, with a distinct style when overdue.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Compute days-to-maturity from a stable reference date passed in (avoid `Date.now()` directly in render for testability).
- Render "Overdue" styling for past dates and "Matures today" for zero.
- Keep the badge purely presentational and accessible.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/invest-maturity-badge`
- Implement changes
  - **Write code in:** [`components/InvoiceList.jsx`](components/InvoiceList.jsx), [`app/invest/lib.js`](app/invest/lib.js)
  - **Write comprehensive tests in:** `components/InvoiceList.maturity.test.tsx`
  - **Add documentation:** update [`COMPONENTS.md`](COMPONENTS.md)
  - Validate security/a11y: badge must convey overdue state with text, not color alone.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.

### Example commit message
`feat: add days-until-maturity badge to invoice cards`

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
title: "Add an empty-state illustration and call-to-action to the Invoices page"
labels: type:enhancement, area:invoices, stack:nextjs, stack:react, stack:typescript, priority:low, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Add an empty-state illustration and call-to-action to the Invoices page

### Description
When no invoices have been uploaded, the Invoices page should show a friendly empty state with an inline SVG illustration and a clear "Upload your first invoice" call-to-action instead of a blank region.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add a reusable `EmptyState` component (icon slot, title, description, action).
- Use it on the Invoices page when the list is empty.
- Inline SVG must be decorative with `aria-hidden`.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b enhancement/invoices-empty-state`
- Implement changes
  - **Write code in:** [`components/EmptyState.jsx`](components/EmptyState.jsx), [`app/invoices/page.js`](app/invoices/page.js)
  - **Write comprehensive tests in:** `components/EmptyState.test.tsx`
  - **Add documentation:** update [`COMPONENTS.md`](COMPONENTS.md)
  - Validate security/a11y: action focusable, illustration hidden from AT.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.

### Example commit message
`feat: add empty-state component and use it on the invoices page`

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
title: "Add a maximum upload file-size guard with a friendly error in UploadZone"
labels: type:feature, area:upload, stack:nextjs, stack:react, stack:typescript, priority:high, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Add a maximum upload file-size guard with a friendly error in UploadZone

### Description
UploadZone accepts files without bounding their size, allowing oversized payloads to be sent to the backend. Add a configurable max-size check that rejects too-large files before upload and shows an inline, accessible error.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add a `MAX_UPLOAD_BYTES` constant and validate `file.size` before fetch.
- Show the limit in the rejection message (e.g. "Max 10 MB").
- Reject before any network call is made.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/upload-max-file-size-guard`
- Implement changes
  - **Write code in:** [`components/UploadZone.jsx`](components/UploadZone.jsx)
  - **Write comprehensive tests in:** `components/UploadZone.size.test.tsx`
  - **Add documentation:** update [`COMPONENTS.md`](COMPONENTS.md)
  - Validate security/a11y: error announced via `role="alert"`; no fetch on oversized file.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.

### Example commit message
`feat: reject oversized uploads in UploadZone with accessible error`

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
title: "Add a sort-direction toggle to the marketplace amount and yield columns"
labels: type:feature, area:invest, stack:nextjs, stack:react, stack:typescript, priority:medium, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Add a sort-direction toggle to the marketplace amount and yield columns

### Description
The marketplace supports a single sort order. Add an ascending/descending toggle so investors can reverse the order for amount and yield, with the current direction reflected in `aria-sort`.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add a `direction` ('asc'|'desc') to the sort state and a toggle control.
- Apply direction in the comparator used by the visible-list derivation.
- Reflect direction with `aria-sort` on the active control.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/invest-sort-direction-toggle`
- Implement changes
  - **Write code in:** [`components/InvoiceFilters.jsx`](components/InvoiceFilters.jsx), [`app/invest/page.js`](app/invest/page.js)
  - **Write comprehensive tests in:** `components/InvoiceFilters.sortdir.test.tsx`
  - **Add documentation:** update [`FILTER_CONTRACTS.md`](FILTER_CONTRACTS.md)
  - Validate security/a11y: `aria-sort` updates correctly.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.

### Example commit message
`feat: add ascending/descending sort toggle to marketplace`

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
title: "Sync marketplace search and filter state to the URL query string"
labels: type:feature, area:invest, stack:nextjs, stack:react, stack:typescript, priority:medium, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Sync marketplace search and filter state to the URL query string

### Description
Filter and search selections are lost on reload and cannot be shared. Persist them to the URL via `useSearchParams`/`router.replace` so the marketplace view is bookmarkable and shareable.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Serialize search term, sort, and active filters to query params.
- Hydrate initial state from the URL on mount.
- Use `replace` (not `push`) to avoid history spam.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/invest-url-state-sync`
- Implement changes
  - **Write code in:** [`app/invest/page.js`](app/invest/page.js), [`components/InvoiceSearch.jsx`](components/InvoiceSearch.jsx)
  - **Write comprehensive tests in:** `app/invest/url-state.test.tsx`
  - **Add documentation:** update [`FILTER_CONTRACTS.md`](FILTER_CONTRACTS.md)
  - Validate security/a11y: sanitize values read from the URL.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.

### Example commit message
`feat: persist marketplace search and filters in the URL`

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
title: "Add a global keyboard shortcut to focus the marketplace search box"
labels: type:enhancement, area:a11y, stack:nextjs, stack:react, stack:typescript, priority:low, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Add a global keyboard shortcut to focus the marketplace search box

### Description
Add a "/" keyboard shortcut that moves focus to the marketplace search input (ignoring keystrokes when already in a field), with a visible hint in the placeholder.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Bind a window keydown listener that focuses the search input on "/".
- Ignore the shortcut when an input/textarea/contenteditable is focused.
- Clean up the listener on unmount.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b enhancement/a11y-search-shortcut`
- Implement changes
  - **Write code in:** [`components/InvoiceSearch.jsx`](components/InvoiceSearch.jsx)
  - **Write comprehensive tests in:** `components/InvoiceSearch.shortcut.test.tsx`
  - **Add documentation:** update [`COMPONENTS.md`](COMPONENTS.md)
  - Validate security/a11y: shortcut does not trap or interfere with typing.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.

### Example commit message
`feat: add "/" shortcut to focus marketplace search`

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
title: "Add a results-count and active-filter summary line to the marketplace"
labels: type:enhancement, area:invest, stack:nextjs, stack:react, stack:typescript, priority:low, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Add a results-count and active-filter summary line to the marketplace

### Description
Show a concise "Showing X of Y invoices" line with active-filter chips above the marketplace list so investors understand the current view and can clear filters individually.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Render visible vs total counts from the filtered derivation.
- Show removable chips for each active filter; "Clear all" resets state.
- Use a polite live region so updates are announced.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b enhancement/invest-results-summary`
- Implement changes
  - **Write code in:** [`app/invest/page.js`](app/invest/page.js), [`components/InvoiceFilters.jsx`](components/InvoiceFilters.jsx)
  - **Write comprehensive tests in:** `app/invest/results-summary.test.tsx`
  - **Add documentation:** update [`FILTER_CONTRACTS.md`](FILTER_CONTRACTS.md)
  - Validate security/a11y: single non-competing live region.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.

### Example commit message
`feat: add results-count and active-filter summary to marketplace`

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
title: "Add a useLocalStorage hook with SSR-safe hydration and JSON guarding"
labels: type:refactor, area:hooks, stack:nextjs, stack:react, stack:typescript, priority:medium, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Add a useLocalStorage hook with SSR-safe hydration and JSON guarding

### Description
Several features need persistence. Add a reusable `useLocalStorage` hook that reads after mount (avoiding hydration mismatch), guards `JSON.parse`, and writes through to storage, so wallet/preferences code can share one implementation.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Return `[value, setValue]` with a typed default; never read storage during render.
- Swallow parse and quota errors and fall back to the default.
- No SSR access to `window`/`localStorage`.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b refactor/use-local-storage-hook`
- Implement changes
  - **Write code in:** [`lib/hooks/useLocalStorage.js`](lib/hooks/useLocalStorage.js)
  - **Write comprehensive tests in:** `lib/hooks/useLocalStorage.test.tsx`
  - **Add documentation:** update [`COMPONENTS.md`](COMPONENTS.md)
  - Validate security/a11y: guard against malformed stored JSON.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.

### Example commit message
`refactor: add SSR-safe useLocalStorage hook with JSON guarding`

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
title: "Add a light/dark theme toggle persisted across sessions"
labels: type:feature, area:theming, stack:nextjs, stack:react, stack:typescript, priority:medium, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Add a light/dark theme toggle persisted across sessions

### Description
The app is dark-by-default with no user control. Add a header theme toggle that switches between light, dark, and system, applies a `data-theme` attribute, and persists the choice without a flash of incorrect theme.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Toggle cycles light/dark/system and persists the preference.
- Apply the theme via a `data-theme` attribute consumed by CSS tokens.
- Avoid hydration flash with an inline pre-paint script.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/theming-toggle`
- Implement changes
  - **Write code in:** [`components/ThemeToggle.jsx`](components/ThemeToggle.jsx), [`app/layout.js`](app/layout.js), [`app/globals.css`](app/globals.css)
  - **Write comprehensive tests in:** `components/ThemeToggle.test.tsx`
  - **Add documentation:** update [`COMPONENTS.md`](COMPONENTS.md)
  - Validate security/a11y: toggle has accessible state and labels.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.

### Example commit message
`feat: add persisted light/dark/system theme toggle`

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
title: "Add a confirmation dialog before submitting an invoice funding action"
labels: type:feature, area:invest, stack:nextjs, stack:react, stack:typescript, priority:high, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Add a confirmation dialog before submitting an invoice funding action

### Description
Funding an invoice is irreversible but currently fires immediately. Add an accessible confirmation modal that summarizes the invoice and amount before the fund action proceeds, with focus trapping and Escape-to-cancel.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add a reusable `ConfirmDialog` (role="dialog", labelled, focus-trapped).
- Gate the fund action behind confirmation; cancel restores prior focus.
- Escape and backdrop click cancel.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/invest-fund-confirm-dialog`
- Implement changes
  - **Write code in:** [`components/ConfirmDialog.jsx`](components/ConfirmDialog.jsx), [`app/invest/[id]/page.js`](app/invest/[id]/page.js)
  - **Write comprehensive tests in:** `components/ConfirmDialog.test.tsx`
  - **Add documentation:** update [`COMPONENTS.md`](COMPONENTS.md)
  - Validate security/a11y: focus trap and `aria-modal` correctness.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.

### Example commit message
`feat: add confirmation dialog before invoice funding`

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
title: "Add a client-side error logging boundary that reports to a pluggable sink"
labels: type:feature, area:observability, stack:nextjs, stack:react, stack:typescript, priority:medium, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Add a client-side error logging boundary that reports to a pluggable sink

### Description
Runtime errors caught by the App Router error boundary are not recorded. Add a small logging adapter (no third-party dependency) the boundary calls, defaulting to `console.error` and overridable via an injected reporter for future telemetry.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Define a `reportError(error, context)` adapter with a default console sink.
- Call it from the global error boundary with route context.
- Keep the interface testable by allowing injection.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/observability-error-reporter`
- Implement changes
  - **Write code in:** [`lib/observability/reportError.js`](lib/observability/reportError.js), [`app/error.js`](app/error.js)
  - **Write comprehensive tests in:** `lib/observability/reportError.test.tsx`
  - **Add documentation:** add [`docs/observability.md`](docs/observability.md)
  - Validate security/a11y: never log secrets or PII by default.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.

### Example commit message
`feat: add pluggable client error reporter wired into the error boundary`

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
title: "Add a retry-with-backoff wrapper for the lib/api fetch helpers"
labels: type:enhancement, area:api, stack:nextjs, stack:react, stack:typescript, priority:medium, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Add a retry-with-backoff wrapper for the lib/api fetch helpers

### Description
Transient network failures surface immediately. Add a small `fetchWithRetry` utility with exponential backoff and a max-attempts cap, then use it in the health and future API clients.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Retry only on network errors and 5xx; never on 4xx.
- Configurable attempts and base delay; honor an abort signal.
- Deterministic in tests via an injectable delay function.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b enhancement/api-fetch-with-retry`
- Implement changes
  - **Write code in:** [`lib/api/fetchWithRetry.js`](lib/api/fetchWithRetry.js), [`lib/api/health.js`](lib/api/health.js)
  - **Write comprehensive tests in:** `lib/api/fetchWithRetry.test.tsx`
  - **Add documentation:** update [`docs/api-integration.md`](docs/api-integration.md)
  - Validate security/a11y: do not retry non-idempotent mutations by default.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.

### Example commit message
`feat: add fetchWithRetry backoff helper and use it in health client`

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
title: "Add a bundle-size budget check to CI with size-limit"
labels: type:performance, area:ci, stack:nextjs, stack:react, stack:typescript, priority:medium, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Add a bundle-size budget check to CI with size-limit

### Description
There is no guardrail against bundle bloat. Add a `size-limit` configuration and a CI step that fails when the first-load JS for key routes exceeds a defined budget.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Define budgets for the home, invest, and invoices entry chunks.
- Run the check in CI and fail on regression.
- Document how to update budgets intentionally.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b performance/ci-bundle-size-budget`
- Implement changes
  - **Write code in:** [`.size-limit.json`](.size-limit.json), [`.github/workflows/size.yml`](.github/workflows/size.yml), [`package.json`](package.json)
  - **Write comprehensive tests in:** `scripts/size-limit.test.tsx`
  - **Add documentation:** update [`docs/performance.md`](docs/performance.md)
  - Validate security/a11y: pin action versions by SHA.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.

### Example commit message
`perf: add size-limit budgets and CI gate`

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
title: "Add a Lighthouse CI workflow with performance and a11y thresholds"
labels: type:performance, area:ci, stack:nextjs, stack:react, stack:typescript, priority:medium, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Add a Lighthouse CI workflow with performance and a11y thresholds

### Description
Add a Lighthouse CI job that builds the app, runs against the home and invest routes, and asserts minimum performance and accessibility scores to catch regressions in PRs.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Configure `lhci` assertions for performance and accessibility.
- Run on PRs against a production build.
- Upload reports as workflow artifacts.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b performance/lighthouse-ci`
- Implement changes
  - **Write code in:** [`lighthouserc.json`](lighthouserc.json), [`.github/workflows/lighthouse.yml`](.github/workflows/lighthouse.yml)
  - **Write comprehensive tests in:** `scripts/lighthouse-config.test.tsx`
  - **Add documentation:** update [`docs/performance.md`](docs/performance.md)
  - Validate security/a11y: enforce minimum a11y score.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.

### Example commit message
`perf: add Lighthouse CI with performance and a11y thresholds`

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
title: "Add a typed invoice status enum and status pill component"
labels: type:refactor, area:invest, stack:nextjs, stack:react, stack:typescript, priority:medium, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Add a typed invoice status enum and status pill component

### Description
Invoice status is represented by ad-hoc strings. Introduce a typed status enum (e.g. Open, Funded, Settled, Overdue) and a `StatusPill` component that maps each status to consistent label and styling.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Define the status union and a label/style map in one place.
- Render `StatusPill` on cards and the detail page.
- Unknown statuses fall back to a neutral pill, never crash.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b refactor/invoice-status-enum-pill`
- Implement changes
  - **Write code in:** [`components/StatusPill.jsx`](components/StatusPill.jsx), [`app/invest/lib.js`](app/invest/lib.js)
  - **Write comprehensive tests in:** `components/StatusPill.test.tsx`
  - **Add documentation:** update [`COMPONENTS.md`](COMPONENTS.md)
  - Validate security/a11y: status conveyed by text, not color alone.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.

### Example commit message
`refactor: add typed invoice status enum and StatusPill`

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
title: "Render the invoice detail page yield and amount as a structured definition list"
labels: type:a11y, area:invest, stack:nextjs, stack:react, stack:typescript, priority:medium, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Render the invoice detail page yield and amount as a structured definition list

### Description
The invoice detail facts are laid out as plain divs. Convert the key/value facts (issuer, amount, yield, maturity) into a semantic `<dl>` so assistive technology can navigate term/definition pairs.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Use `<dl>`/`<dt>`/`<dd>` for the fact list.
- Keep existing styling; no visual regression.
- Verify with `jest-axe` that there are no new violations.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b a11y/invest-detail-definition-list`
- Implement changes
  - **Write code in:** [`app/invest/[id]/page.js`](app/invest/[id]/page.js)
  - **Write comprehensive tests in:** `app/invest/[id]/detail.a11y.test.tsx`
  - **Add documentation:** update [`docs/accessibility.md`](docs/accessibility.md)
  - Validate security/a11y: axe-clean definition list.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.

### Example commit message
`a11y: render invoice detail facts as a semantic definition list`

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
title: "Add unit tests for the InvoiceFilters currency and yield range predicates"
labels: type:test, area:invest, stack:nextjs, stack:react, stack:typescript, priority:medium, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Add unit tests for the InvoiceFilters currency and yield range predicates

### Description
The filter predicates lack focused coverage of boundary behavior. Add unit tests asserting inclusive/exclusive bounds, empty-filter passthrough, and combined-predicate intersection on a fixture set.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Cover yield-range lower/upper boundaries and currency equality.
- Assert that empty filters pass all invoices through.
- Assert combined filters intersect correctly.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b test/invoice-filters-predicates`
- Implement changes
  - **Write code in:** test-only; touch [`components/InvoiceFilters.jsx`](components/InvoiceFilters.jsx) only if a predicate must be exported.
  - **Write comprehensive tests in:** `components/InvoiceFilters.predicates.test.tsx`
  - **Add documentation:** update [`FILTER_CONTRACTS.md`](FILTER_CONTRACTS.md)
  - Validate security/a11y: n/a; assert deterministic outputs.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.

### Example commit message
`test: cover InvoiceFilters currency and yield range predicates`

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
title: "Add unit tests for the Footer external-link rel and href safety"
labels: type:test, area:footer, stack:nextjs, stack:react, stack:typescript, priority:low, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Add unit tests for the Footer external-link rel and href safety

### Description
Add tests verifying that every external Footer link opens with `rel="noopener noreferrer"`, that internal links use the Next `Link`, and that there are no `javascript:` or empty hrefs.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Assert external anchors include `noopener noreferrer`.
- Assert no `href="#"` placeholders remain.
- Assert internal navigation uses client-side links.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b test/footer-link-safety`
- Implement changes
  - **Write code in:** test-only; touch [`components/Footer.jsx`](components/Footer.jsx) only if a fix is required.
  - **Write comprehensive tests in:** `components/Footer.linksafety.test.tsx`
  - **Add documentation:** update [`COMPONENTS.md`](COMPONENTS.md)
  - Validate security/a11y: confirm no tabnabbing vector remains.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.

### Example commit message
`test: verify footer external-link rel and href safety`

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
title: "Add unit tests for the safeJson truncation and depth-limit behavior"
labels: type:test, area:formatting, stack:nextjs, stack:react, stack:typescript, priority:medium, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Add unit tests for the safeJson truncation and depth-limit behavior

### Description
The `lib/format/safeJson` helper guards rendering of backend JSON but lacks edge coverage. Add tests for oversized payload truncation, deeply nested objects, circular references, and non-serializable values.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Cover truncation at the size cap and a clear truncation marker.
- Cover circular references and functions/symbols.
- Cover empty and primitive inputs.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b test/safejson-edge-cases`
- Implement changes
  - **Write code in:** test-only; touch [`lib/format/safeJson.js`](lib/format/safeJson.js) only if a defect is found.
  - **Write comprehensive tests in:** `lib/format/safeJson.edge.test.tsx`
  - **Add documentation:** update [`docs/api-integration.md`](docs/api-integration.md)
  - Validate security/a11y: confirm no unbounded output reaches the DOM.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.

### Example commit message
`test: cover safeJson truncation, depth, and circular-reference paths`

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
title: "Add a Playwright e2e test for the theme toggle persistence across reloads"
labels: type:test, area:e2e, stack:nextjs, stack:react, stack:typescript, priority:low, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Add a Playwright e2e test for the theme toggle persistence across reloads

### Description
Add an end-to-end test that toggles the theme, reloads the page, and asserts the chosen theme is restored without a flash, complementing the unit tests for the toggle component.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Toggle to a non-default theme and assert `data-theme`.
- Reload and assert the theme persists.
- Assert no console errors during the flow.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b test/e2e-theme-persistence`
- Implement changes
  - **Write code in:** test-only Playwright spec.
  - **Write comprehensive tests in:** `tests/e2e/theme-persistence.spec.ts`
  - **Add documentation:** update [`TESTING.md`](TESTING.md)
  - Validate security/a11y: assert focus is preserved across reload.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.

### Example commit message
`test: add e2e coverage for theme toggle persistence`

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
title: "Add a Playwright e2e test for the marketplace search and filter URL sharing"
labels: type:test, area:e2e, stack:nextjs, stack:react, stack:typescript, priority:medium, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Add a Playwright e2e test for the marketplace search and filter URL sharing

### Description
Add an end-to-end test that applies a search term and filters, copies the resulting URL, opens it in a fresh page, and asserts the same filtered view is reconstructed.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Apply search and at least one filter; capture the URL.
- Visit the URL in a clean context and assert hydrated state.
- Assert the visible results match the filtered subset.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b test/e2e-marketplace-url-sharing`
- Implement changes
  - **Write code in:** test-only Playwright spec.
  - **Write comprehensive tests in:** `tests/e2e/marketplace-url.spec.ts`
  - **Add documentation:** update [`TESTING.md`](TESTING.md)
  - Validate security/a11y: assert sanitized params do not inject markup.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.

### Example commit message
`test: add e2e coverage for marketplace URL state sharing`

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
title: "Add a no-dangerouslySetInnerHTML ESLint rule and audit existing usage"
labels: type:security, area:lint, stack:nextjs, stack:react, stack:typescript, priority:high, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Add a no-dangerouslySetInnerHTML ESLint rule and audit existing usage

### Description
Prevent accidental introduction of raw HTML injection by adding a lint rule that disallows `dangerouslySetInnerHTML` (with an explicit allowlist), and audit the codebase to ensure no current usage is unsafe.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add a `react/no-danger` (or equivalent) rule set to error.
- Audit and document any required, reviewed exceptions.
- CI lint fails on new violations.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b security/lint-no-dangerous-html`
- Implement changes
  - **Write code in:** [`eslint.config.mjs`](eslint.config.mjs)
  - **Write comprehensive tests in:** `tests/lint/no-danger.test.tsx`
  - **Add documentation:** update [`security/`](security/) notes
  - Validate security/a11y: confirm zero unsanitized HTML sinks remain.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.

### Example commit message
`security: forbid dangerouslySetInnerHTML via ESLint and audit usage`

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
title: "Add a Cross-Origin-Opener-Policy and COEP header configuration"
labels: type:security, area:headers, stack:nextjs, stack:react, stack:typescript, priority:medium, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Add a Cross-Origin-Opener-Policy and COEP header configuration

### Description
Harden the app against cross-origin attacks by adding `Cross-Origin-Opener-Policy` and a compatible `Cross-Origin-Resource-Policy` via `next.config` headers, verifying the wallet popup flow still works.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add COOP `same-origin` and an appropriate CORP value.
- Verify external wallet/install links still function.
- Document any required exceptions.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b security/coop-corp-headers`
- Implement changes
  - **Write code in:** [`next.config.mjs`](next.config.mjs)
  - **Write comprehensive tests in:** `tests/security/coop-headers.test.tsx`
  - **Add documentation:** update [`security/`](security/) notes
  - Validate security/a11y: confirm headers present on all routes.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.

### Example commit message
`security: add COOP and CORP response headers`

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
title: "Validate and clamp the page-size and page-number query params on the marketplace"
labels: type:security, area:invest, stack:nextjs, stack:react, stack:typescript, priority:medium, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Validate and clamp the page-size and page-number query params on the marketplace

### Description
Once filters live in the URL, pagination params become user-controlled. Validate and clamp `page` and `pageSize` to safe bounds to prevent out-of-range rendering or excessive list sizes.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Coerce params to integers and clamp to `[1, max]`.
- Fall back to defaults for missing or malformed values.
- Never render beyond the available item count.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b security/marketplace-pagination-clamp`
- Implement changes
  - **Write code in:** [`components/Pagination.jsx`](components/Pagination.jsx), [`app/invest/page.js`](app/invest/page.js)
  - **Write comprehensive tests in:** `components/Pagination.clamp.test.tsx`
  - **Add documentation:** update [`FILTER_CONTRACTS.md`](FILTER_CONTRACTS.md)
  - Validate security/a11y: malformed input cannot cause large allocations.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.

### Example commit message
`security: validate and clamp marketplace pagination params`

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
title: "Add a documented design-token reference table for colors, spacing, and radii"
labels: type:docs, area:design-system, stack:nextjs, stack:react, stack:typescript, priority:low, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Add a documented design-token reference table for colors, spacing, and radii

### Description
There is no single reference for the Tailwind `@theme` tokens. Add a documentation page listing each token, its value, and intended usage so contributors stop hardcoding values.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Enumerate color, spacing, radius, and typography tokens.
- Show light/dark values where they differ.
- Link the doc from the README.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b docs/design-tokens-reference`
- Implement changes
  - **Write code in:** docs-only; read tokens from [`app/globals.css`](app/globals.css).
  - **Write comprehensive tests in:** `app/globals.tokens-doc.test.tsx` (assert documented tokens exist).
  - **Add documentation:** add [`docs/design-tokens.md`](docs/design-tokens.md)
  - Validate security/a11y: note contrast-compliant pairings.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.

### Example commit message
`docs: add design-token reference for colors, spacing, and radii`

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
title: "Document the wallet integration contract and state machine in a developer guide"
labels: type:docs, area:wallet, stack:nextjs, stack:react, stack:typescript, priority:medium, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Document the wallet integration contract and state machine in a developer guide

### Description
The wallet flow spans several components and a contract file. Add a developer guide that diagrams the wallet state machine (Disconnected → Connecting → Connected/Error/WrongNetwork) and documents the public hook API for contributors.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Diagram each state and its transitions and triggers.
- Document the wallet hook's public surface and events.
- Cross-link from the existing wallet contract file.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b docs/wallet-state-machine-guide`
- Implement changes
  - **Write code in:** docs-only; reference [`components/WalletProvider.jsx`](components/WalletProvider.jsx) and [`WALLET_INTEGRATION_CONTRACT.md`](WALLET_INTEGRATION_CONTRACT.md).
  - **Write comprehensive tests in:** `components/WalletProvider.docparity.test.tsx` (assert documented states exist).
  - **Add documentation:** add [`docs/wallet-guide.md`](docs/wallet-guide.md)
  - Validate security/a11y: document safe handling of account data.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.

### Example commit message
`docs: add wallet state-machine and hook API developer guide`

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
title: "Add a local development setup and troubleshooting guide"
labels: type:docs, area:onboarding, stack:nextjs, stack:react, stack:typescript, priority:low, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Add a local development setup and troubleshooting guide

### Description
New contributors hit common setup snags. Add a concise getting-started guide covering Node version, install, dev server, running tests and e2e, and the most frequent troubleshooting steps.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Document required Node version and install/run commands.
- Include unit and Playwright e2e instructions.
- List common failures and fixes (ports, browsers, env).

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b docs/dev-setup-guide`
- Implement changes
  - **Write code in:** docs-only; reference [`package.json`](package.json) scripts.
  - **Write comprehensive tests in:** `scripts/dev-guide-scripts.test.tsx` (assert documented scripts exist).
  - **Add documentation:** add [`docs/getting-started.md`](docs/getting-started.md)
  - Validate security/a11y: avoid committing secrets in examples.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.

### Example commit message
`docs: add local development setup and troubleshooting guide`

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
title: "Extract the marketplace filtering logic into a pure useInvoiceFilters hook"
labels: type:refactor, area:invest, stack:nextjs, stack:react, stack:typescript, priority:medium, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Extract the marketplace filtering logic into a pure useInvoiceFilters hook

### Description
Filtering, searching, and sorting are entangled in the page component. Extract them into a pure, testable `useInvoiceFilters` hook so the view stays presentational and the logic gains direct unit coverage.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Hook takes invoices + filter state and returns the visible list.
- No DOM or side effects in the hook; pure derivation.
- Page consumes the hook with no behavior change.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b refactor/use-invoice-filters-hook`
- Implement changes
  - **Write code in:** [`lib/hooks/useInvoiceFilters.js`](lib/hooks/useInvoiceFilters.js), [`app/invest/page.js`](app/invest/page.js)
  - **Write comprehensive tests in:** `lib/hooks/useInvoiceFilters.test.tsx`
  - **Add documentation:** update [`FILTER_CONTRACTS.md`](FILTER_CONTRACTS.md)
  - Validate security/a11y: no regression in announced result counts.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.

### Example commit message
`refactor: extract useInvoiceFilters hook from the marketplace page`

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
title: "Consolidate Spinner and skeleton loaders into a single Loader primitive"
labels: type:refactor, area:ui, stack:nextjs, stack:react, stack:typescript, priority:low, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Consolidate Spinner and skeleton loaders into a single Loader primitive

### Description
Loading UI is spread across `Spinner` and route-level loading files with inconsistent semantics. Introduce a single `Loader` primitive supporting spinner and skeleton variants with consistent ARIA, and adopt it in the loading states.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Provide `variant="spinner"|"skeleton"` with shared a11y semantics.
- Replace direct `Spinner` usage where a unified loader fits.
- Preserve `prefers-reduced-motion` behavior.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b refactor/loader-primitive`
- Implement changes
  - **Write code in:** [`components/Loader.jsx`](components/Loader.jsx), [`components/Spinner.jsx`](components/Spinner.jsx), [`app/invest/loading.js`](app/invest/loading.js)
  - **Write comprehensive tests in:** `components/Loader.test.tsx`
  - **Add documentation:** update [`COMPONENTS.md`](COMPONENTS.md)
  - Validate security/a11y: consistent `aria-busy`/labels across variants.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.

### Example commit message
`refactor: unify loaders into a single Loader primitive`

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
title: "Add a high-contrast focus ring audit across interactive components"
labels: type:a11y, area:focus, stack:nextjs, stack:react, stack:typescript, priority:medium, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Add a high-contrast focus ring audit across interactive components

### Description
Focus visibility is inconsistent across buttons, links, and inputs. Audit interactive components and ensure a consistent, high-contrast `focus-visible` ring that meets contrast requirements in both themes.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Standardize a `focus-visible` ring token across components.
- Verify contrast against background in light and dark.
- Add tests asserting focusable elements receive the ring class.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b a11y/focus-ring-audit`
- Implement changes
  - **Write code in:** [`app/globals.css`](app/globals.css), [`components/Button.jsx`](components/Button.jsx), [`components/NavMenu.jsx`](components/NavMenu.jsx)
  - **Write comprehensive tests in:** `components/focus-ring.a11y.test.tsx`
  - **Add documentation:** update [`docs/accessibility.md`](docs/accessibility.md)
  - Validate security/a11y: contrast-compliant focus indicator.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.

### Example commit message
`a11y: standardize high-contrast focus rings across components`

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
title: "Announce pagination page changes with an accessible status region"
labels: type:a11y, area:invest, stack:nextjs, stack:react, stack:typescript, priority:medium, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Announce pagination page changes with an accessible status region

### Description
When the page changes, screen-reader users get no positional feedback. Add a single polite status region announcing "Page X of Y, showing items A–B" on navigation, coordinated with the existing list announcement to avoid double-speak.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- One polite live region for pagination position.
- Coordinate with the marketplace list announcer to avoid overlap.
- Announce only on actual page change.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b a11y/pagination-status-announce`
- Implement changes
  - **Write code in:** [`components/Pagination.jsx`](components/Pagination.jsx)
  - **Write comprehensive tests in:** `components/Pagination.announce.test.tsx`
  - **Add documentation:** update [`docs/accessibility.md`](docs/accessibility.md)
  - Validate security/a11y: no competing live regions.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.

### Example commit message
`a11y: announce pagination position via a polite status region`

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
title: "Virtualize the marketplace list to keep large result sets responsive"
labels: type:performance, area:invest, stack:nextjs, stack:react, stack:typescript, priority:medium, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Virtualize the marketplace list to keep large result sets responsive

### Description
Rendering hundreds of invoice cards inflates the DOM. Add windowed virtualization to the marketplace list so only visible rows mount, while preserving keyboard navigation and the existing live-region announcements.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Mount only visible items plus a small overscan buffer.
- Preserve tab order and focus when scrolling.
- Keep announcements accurate (visible vs total).

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b performance/invest-list-virtualization`
- Implement changes
  - **Write code in:** [`components/InvoiceList.jsx`](components/InvoiceList.jsx)
  - **Write comprehensive tests in:** `components/InvoiceList.virtual.test.tsx`
  - **Add documentation:** update [`docs/performance.md`](docs/performance.md)
  - Validate security/a11y: keyboard and AT navigation preserved.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.

### Example commit message
`perf: virtualize the marketplace invoice list`

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
title: "Add a breadcrumb trail to the invoice detail page"
labels: type:enhancement, area:navigation, stack:nextjs, stack:react, stack:typescript, priority:low, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Add a breadcrumb trail to the invoice detail page

### Description
The detail page offers no clear path back to the marketplace. Add an accessible breadcrumb (Home / Invest / Invoice #id) using a `nav` landmark with `aria-current` on the final crumb.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Render breadcrumbs in a `nav` with an accessible label.
- Mark the current page with `aria-current="page"`.
- Use Next `Link` for internal crumbs.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b enhancement/invest-breadcrumbs`
- Implement changes
  - **Write code in:** [`components/Breadcrumbs.jsx`](components/Breadcrumbs.jsx), [`app/invest/[id]/page.js`](app/invest/[id]/page.js)
  - **Write comprehensive tests in:** `components/Breadcrumbs.test.tsx`
  - **Add documentation:** update [`COMPONENTS.md`](COMPONENTS.md)
  - Validate security/a11y: correct landmark and `aria-current`.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.

### Example commit message
`feat: add accessible breadcrumbs to invoice detail page`

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
title: "Add JSON-LD structured data for invoice detail pages"
labels: type:feature, area:seo, stack:nextjs, stack:react, stack:typescript, priority:low, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Add JSON-LD structured data for invoice detail pages

### Description
Improve discoverability by emitting JSON-LD structured data on invoice detail pages describing the offering, with values sanitized and only safe public fields exposed.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Generate a typed JSON-LD object from public invoice fields.
- Inject via a `<script type="application/ld+json">` from server output.
- Never expose internal or sensitive identifiers.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/seo-invoice-jsonld`
- Implement changes
  - **Write code in:** [`app/invest/[id]/page.js`](app/invest/[id]/page.js), [`lib/seo/invoiceJsonLd.js`](lib/seo/invoiceJsonLd.js)
  - **Write comprehensive tests in:** `lib/seo/invoiceJsonLd.test.tsx`
  - **Add documentation:** update [`docs/api-integration.md`](docs/api-integration.md)
  - Validate security/a11y: escape values; no PII in output.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.

### Example commit message
`feat: add sanitized JSON-LD structured data to invoice detail pages`

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
title: "Add a request-cancellation guard to the home page health check on unmount"
labels: type:enhancement, area:api, stack:nextjs, stack:react, stack:typescript, priority:medium, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Add a request-cancellation guard to the home page health check on unmount

### Description
The home page health check can resolve after the component unmounts, risking a state-update-on-unmounted warning. Add an `AbortController` and a mounted guard so the request is cancelled and late updates are ignored.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Abort the in-flight health request on unmount.
- Ignore state updates after unmount.
- Treat abort as a non-error (no toast/banner).

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b enhancement/health-abort-on-unmount`
- Implement changes
  - **Write code in:** [`lib/api/health.js`](lib/api/health.js), [`app/page.js`](app/page.js)
  - **Write comprehensive tests in:** `app/page.health-abort.test.tsx`
  - **Add documentation:** update [`docs/api-integration.md`](docs/api-integration.md)
  - Validate security/a11y: abort does not surface a false error.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.

### Example commit message
`feat: abort home page health check on unmount to avoid late updates`

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
title: "Add a typed env-var loader with build-time validation"
labels: type:refactor, area:config, stack:nextjs, stack:react, stack:typescript, priority:medium, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Add a typed env-var loader with build-time validation

### Description
Environment variables are read ad hoc with no validation. Add a single typed `env` module that validates required `NEXT_PUBLIC_*` variables at startup and exposes them through a typed accessor, failing fast on misconfiguration.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Centralize and validate `NEXT_PUBLIC_API_URL` and related vars.
- Throw a clear error listing missing/invalid variables.
- Only expose `NEXT_PUBLIC_*` to client code.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b refactor/typed-env-loader`
- Implement changes
  - **Write code in:** [`lib/config/env.js`](lib/config/env.js)
  - **Write comprehensive tests in:** `lib/config/env.test.tsx`
  - **Add documentation:** update [`README.md`](README.md) environment section.
  - Validate security/a11y: never expose server-only secrets to the client.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.

### Example commit message
`refactor: add typed env loader with build-time validation`

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
title: "Add a copy-issuer-address button with truncation to the marketplace cards"
labels: type:enhancement, area:invest, stack:nextjs, stack:react, stack:typescript, priority:low, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Add a copy-issuer-address button with truncation to the marketplace cards

### Description
Issuer addresses are long and hard to use. Add a truncated address display with a copy button on each marketplace card, mirroring the connected-wallet copy pattern, with success feedback.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Truncate to head/tail form (e.g. `GABC…WXYZ`).
- Copy the full address to clipboard with a guarded fallback.
- Provide an accessible label and copy confirmation.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b enhancement/invest-copy-issuer-address`
- Implement changes
  - **Write code in:** [`components/InvoiceList.jsx`](components/InvoiceList.jsx), [`lib/format/`](lib/format/)
  - **Write comprehensive tests in:** `components/InvoiceList.copyaddress.test.tsx`
  - **Add documentation:** update [`COMPONENTS.md`](COMPONENTS.md)
  - Validate security/a11y: copy only the displayed address; label the button.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.

### Example commit message
`feat: add copyable truncated issuer address to marketplace cards`

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
title: "Add a contrast-ratio unit test harness for theme token pairings"
labels: type:test, area:theming, stack:nextjs, stack:react, stack:typescript, priority:medium, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Add a contrast-ratio unit test harness for theme token pairings

### Description
Color regressions can silently break contrast. Add a unit test harness that computes WCAG contrast ratios for the documented foreground/background token pairings and fails when any drops below AA.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Compute contrast ratios for defined token pairs in both themes.
- Fail when normal-text pairs fall below 4.5:1 (3:1 for large text).
- Source token values from the stylesheet, not duplicated constants.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b test/theme-contrast-harness`
- Implement changes
  - **Write code in:** test-only; read tokens from [`app/globals.css`](app/globals.css).
  - **Write comprehensive tests in:** `app/globals.contrast-ratio.test.tsx`
  - **Add documentation:** update [`docs/accessibility.md`](docs/accessibility.md)
  - Validate security/a11y: enforce AA thresholds programmatically.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.

### Example commit message
`test: add WCAG contrast-ratio harness for theme tokens`

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
title: "Add a contributor PR checklist that enforces tests, a11y, and docs"
labels: type:docs, area:process, stack:nextjs, stack:react, stack:typescript, priority:low, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Add a contributor PR checklist that enforces tests, a11y, and docs

### Description
Add a structured pull-request checklist (tests added, coverage met, a11y verified, docs updated, lint/build green) so campaign contributions arrive review-ready and maintainers merge faster.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add checkboxes for tests, coverage, a11y, docs, and build/lint.
- Link to TESTING and accessibility docs.
- Keep it concise and skimmable.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b docs/pr-checklist`
- Implement changes
  - **Write code in:** docs-only; reference [`CONTRIBUTING.md`](CONTRIBUTING.md) and [`TESTING.md`](TESTING.md).
  - **Write comprehensive tests in:** `scripts/pr-checklist.test.tsx` (assert required sections exist).
  - **Add documentation:** add [`.github/pull_request_template.md`](.github/pull_request_template.md)
  - Validate security/a11y: include the a11y verification item.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.

### Example commit message
`docs: add contributor PR checklist template`

### Guidelines
- **Minimum 95 percent test coverage** for impacted modules.
- Clear, reviewer-focused documentation.
- **Timeframe: 96 hours.**

### Community & contribution rewards
- 💬 **Join the Liquifact community on Discord for questions, reviews, and faster merges:** https://discord.gg/JrGPH4V3
- ⭐ This is a **GrantFox OSS / Official Campaign** task and **may be rewarded**. When your PR is merged you'll be prompted to rate the project — if this issue and the maintainers helped you ship, we'd be grateful for a **5-star rating**. Clear questions in Discord and tidy, well-tested PRs are the fastest path to a merge and a reward.
