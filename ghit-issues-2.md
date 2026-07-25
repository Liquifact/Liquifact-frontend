---
type: Feature
title: "Persist wallet connection across reloads with a WalletProvider context"
labels: type:feature, area:wallet, stack:nextjs, stack:react, stack:typescript, priority:high, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Implement a shared WalletProvider that persists the connection across reloads

### Description
[`components/WalletStatus.jsx`](components/WalletStatus.jsx) keeps `walletState`/`walletData` in local component state, so the connection is lost on every navigation or page refresh and cannot be read by other components (e.g. a future "Fund this invoice" button or the Invoices page header). This issue introduces a `WalletProvider` React context that owns the wallet state, rehydrates it from storage on mount, and exposes a `useWallet()` hook.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Create `components/WalletProvider.jsx` exporting `WalletProvider` and a `useWallet()` hook returning `{ state, walletData, connect, disconnect }`, reusing the existing `WALLET_STATES` enum from [`components/WalletStatus.jsx`](components/WalletStatus.jsx).
- Persist a minimal, non-sensitive snapshot (connection intent + truncated address + network) via `localStorage` and rehydrate on mount; never persist secrets or full balances.
- Refactor `WalletStatus` to consume `useWallet()` instead of its internal `useState`, keeping all existing accessibility regions and toast calls intact.
- Mount `WalletProvider` once in [`app/layout.js`](app/layout.js) inside the existing `ToastProvider`.
- Guard against SSR by reading storage only after mount (no `window` access during render).

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/wallet-01-walletprovider-persistence`
- Implement changes
  - **Write code in:** create [`components/WalletProvider.jsx`](components/WalletProvider.jsx); update [`components/WalletStatus.jsx`](components/WalletStatus.jsx) and [`app/layout.js`](app/layout.js).
  - **Write comprehensive tests in:** create [`components/WalletProvider.test.tsx`](components/WalletProvider.test.tsx) — assert rehydration, disconnect clears storage, and `useWallet` throws outside the provider.
  - **Add documentation:** document `WalletProvider`/`useWallet` in [`README.md`](README.md) and cross-reference [`WALLET_INTEGRATION_CONTRACT.md`](WALLET_INTEGRATION_CONTRACT.md).
  - Add JSDoc to the hook and provider props.
  - Validate security: never persist private keys or full balances; sanitize values read back from storage.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: corrupt storage payload, SSR render, and rehydrate-then-disconnect.
- Include the full `npm test` output and a note on what is persisted.

### Example commit message
`feat: persist wallet connection via a shared walletprovider context`

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
title: "Add a client-side search box to filter the Invest marketplace by issuer"
labels: type:feature, area:invest, stack:nextjs, stack:react, stack:typescript, priority:medium, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Implement an issuer search field on the Invest marketplace

### Description
The marketplace list in [`app/invest/page.js`](app/invest/page.js) renders every loaded invoice with no way to find a specific issuer; as the list grows beyond the three mock entries this becomes unusable. This issue adds a debounced search input that filters the rendered invoices by issuer name and keeps the polite `aria-live` announcement accurate.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add a labelled search `<input type="search">` above the list that filters `invoices` by case-insensitive substring match on `issuer`.
- Debounce the input (e.g. 200ms) so filtering does not thrash on every keystroke.
- Update `getInvoiceLoadAnnouncement` usage so the status region announces the filtered count (e.g. "2 of 3 invoices match"), and show a distinct "no matches" state separate from the empty-marketplace state.
- Preserve the loading/error/empty branches and the slate/cyan styling; clearing the field restores the full list.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/invest-02-issuer-search`
- Implement changes
  - **Write code in:** update [`app/invest/page.js`](app/invest/page.js); optionally extract a `components/InvoiceSearch.jsx`.
  - **Write comprehensive tests in:** extend [`app/invest/page.test.jsx`](app/invest/page.test.jsx) and/or create [`components/InvoiceSearch.test.tsx`](components/InvoiceSearch.test.tsx) — assert filtering, debounce, no-match state, and clear.
  - **Add documentation:** note the search behaviour in [`README.md`](README.md).
  - Add JSDoc on any extracted search component.
  - Validate a11y: the input has an associated label and the filtered count is announced politely.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: empty query, no matches, whitespace-only query, and rapid typing.
- Include the full `npm test` output.

### Example commit message
`feat: add issuer search box to the invest marketplace`

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
title: "Add pagination or load-more to the Invest marketplace list"
labels: type:feature, area:invest, stack:nextjs, stack:react, stack:typescript, priority:medium, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Implement pagination for the marketplace invoice list

### Description
[`app/invest/page.js`](app/invest/page.js) maps the entire invoice array into a single `<ul>` with no paging or windowing, so a real backend returning hundreds of invoices would render an unbounded DOM and a long, unscannable list. This issue adds page-size-bounded rendering with an accessible "Load more" (or numbered pages) control.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Render at most `PAGE_SIZE` (e.g. 10) invoices at a time and expose a "Load more" button (or prev/next page controls) that reveals the next batch.
- Keep the polite status region accurate ("Showing N of M invoices"); announce when more results are appended.
- Reset paging when filters/search change (coordinate with the existing list rendering so the change is non-breaking if those features land later).
- Preserve loading/empty/error branches and keyboard focus on the control after each load.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/invest-03-marketplace-pagination`
- Implement changes
  - **Write code in:** update [`app/invest/page.js`](app/invest/page.js); optionally extract a `components/Pagination.jsx`.
  - **Write comprehensive tests in:** extend [`app/invest/page.test.jsx`](app/invest/page.test.jsx) — assert initial page size, load-more appends, and the count announcement.
  - **Add documentation:** note paging behaviour in [`README.md`](README.md).
  - Add JSDoc on any pagination helper/component.
  - Validate a11y: the control has a clear accessible name and focus is managed after load.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: fewer items than a page, exact page boundary, and last page.
- Include the full `npm test` output.

### Example commit message
`feat: paginate the invest marketplace invoice list`

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
title: "Show a determinate progress bar during invoice upload in UploadZone"
labels: type:enhancement, area:upload, stack:nextjs, stack:react, stack:typescript, priority:medium, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Add an accessible upload progress indicator to UploadZone

### Description
[`components/UploadZone.jsx`](components/UploadZone.jsx) only shows an indeterminate spinner with "Uploading invoice..." during the `uploading` status; the user gets no sense of how far along a large (up to 10 MB) PDF upload is. This issue adds a determinate progress bar driven by upload progress events, with proper ARIA so screen-reader users hear progress too.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Render a `role="progressbar"` element with `aria-valuemin`/`aria-valuemax`/`aria-valuenow` and a visible percentage during the `uploading` status.
- Accept an injectable `onProgress`-style callback (or progress prop) so the bar can be driven by a real `XMLHttpRequest`/fetch-stream progress source later and tested deterministically now.
- Fall back to the existing indeterminate spinner when progress is unknown; keep the `tokenizing` and `success` copy unchanged so the e2e spec in [`tests/toast.spec.jsx`](tests/toast.spec.jsx) still passes.
- Respect `prefers-reduced-motion` for any bar transition.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b enhancement/upload-04-progress-bar`
- Implement changes
  - **Write code in:** update [`components/UploadZone.jsx`](components/UploadZone.jsx); optionally extract a `components/ProgressBar.jsx`.
  - **Write comprehensive tests in:** extend [`components/UploadZone.test.jsx`](components/UploadZone.test.jsx) — assert progressbar ARIA values update and the indeterminate fallback.
  - **Add documentation:** note the progress UI in [`README.md`](README.md).
  - Add JSDoc on the progress prop/callback.
  - Validate a11y: progressbar exposes value text and does not steal focus.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, `npm run build`, and `npm run test:e2e`.
- Cover edge cases: 0%, 100%, unknown-progress fallback, and reduced motion.
- Include the full `npm test` output and confirmation the toast e2e still passes.

### Example commit message
`feat: add accessible upload progress bar to uploadzone`

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
title: "Allow resetting UploadZone to upload another invoice after success"
labels: type:enhancement, area:upload, stack:nextjs, stack:react, stack:typescript, priority:medium, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Add an "Upload another" reset flow to UploadZone

### Description
After a successful submission [`components/UploadZone.jsx`](components/UploadZone.jsx) stays in the `success` status with the previous file still selected, and the submit button relabels to "Upload & Tokenize Invoice" while still pointing at the already-submitted file — there is no clean way to start a fresh upload without reloading the page. This issue adds an explicit reset that clears the file, error, and status back to `idle`.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add an "Upload another invoice" button shown in the `success` state that resets `file`, `error`, and `status` to their initial values and clears the file `<input>`.
- Move focus to the dropzone after reset so keyboard users can immediately start again.
- Keep the existing status copy and `role="status"`/`role="alert"` regions; the success message should clear on reset.
- Do not change the disabled/`aria-disabled` logic on `#invoice-upload-btn` for the idle/processing states.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b enhancement/upload-05-reset-flow`
- Implement changes
  - **Write code in:** update [`components/UploadZone.jsx`](components/UploadZone.jsx).
  - **Write comprehensive tests in:** extend [`components/UploadZone.test.jsx`](components/UploadZone.test.jsx) — assert reset clears file/status and restores focus.
  - **Add documentation:** note the reset flow in [`README.md`](README.md).
  - Add comments explaining the focus-management choice.
  - Validate a11y: focus lands on a sensible target after reset.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: reset after success, reset clears stale error, and re-upload after reset.
- Include the full `npm test` output.

### Example commit message
`feat: add upload-another reset flow to uploadzone`

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
title: "Cap the toast stack and de-duplicate repeated messages in ToastProvider"
labels: type:enhancement, area:toast, stack:nextjs, stack:react, stack:typescript, priority:medium, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Bound the toast queue and collapse duplicates

### Description
[`components/ToastProvider.jsx`](components/ToastProvider.jsx) prepends every new toast to an unbounded array (`[toast, ...current]`) with no limit and no de-duplication, so a retry loop or rapid wallet errors (see the random-outcome flow in [`components/WalletStatus.jsx`](components/WalletStatus.jsx)) can stack dozens of identical toasts and cover the viewport. This issue caps the visible stack and collapses duplicates.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add a `MAX_TOASTS` limit (e.g. 3); when exceeded, drop the oldest toast and clear its timer in `timers`.
- De-duplicate by `variant + title + message`: if an identical toast is already visible, refresh its auto-dismiss timer instead of adding a new one.
- Preserve the public `success`/`error`/`info` API, the `AUTO_DISMISS_MS` behaviour, and pause/resume on hover.
- Keep the `role="status"`/`aria-live="polite"` live region and ensure timer cleanup remains leak-free.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b enhancement/toast-06-cap-and-dedupe`
- Implement changes
  - **Write code in:** update [`components/ToastProvider.jsx`](components/ToastProvider.jsx).
  - **Write comprehensive tests in:** create [`components/ToastProvider.dedupe.test.tsx`](components/ToastProvider.dedupe.test.tsx) using fake timers — assert cap eviction, duplicate collapse, and no timer leaks.
  - **Add documentation:** note the queue limits in [`README.md`](README.md).
  - Add JSDoc/comments on `MAX_TOASTS` and the dedupe key.
  - Validate a11y: stacked toasts remain individually dismissible.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: burst of identical toasts, cap eviction during hover-pause, and unmount mid-timer.
- Include the full `npm test` output.

### Example commit message
`feat: cap toast stack and de-duplicate repeated messages`

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
title: "Make the marketplace error state retryable with a working ErrorBanner action"
labels: type:enhancement, area:invest, stack:nextjs, stack:react, stack:typescript, priority:medium, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Wire a retry action into the Invest marketplace error state

### Description
When `loadInvoices` rejects, [`app/invest/page.js`](app/invest/page.js) renders an `ErrorBanner` with only `title`/`description`/`previewLabel` — but [`components/ErrorBanner.jsx`](components/ErrorBanner.jsx) already supports `actionLabel`/`onAction`, which is unused here. The user has no way to recover except a full page reload. This issue adds a "Try again" action that re-runs the load.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Refactor `InvestMarketplace` so the load logic is callable on demand (e.g. a `reload()` that resets state to loading and re-invokes `loadInvoices`).
- Pass `actionLabel="Try again"` and `onAction={reload}` to the `ErrorBanner` so the existing action button is used.
- Reset `loadError`, set `invoices` back to `null` (loading), and re-announce via the polite status region on retry.
- Continue to honour the `AbortController`/`isActive` cancellation so a retry does not race a stale request.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b enhancement/invest-07-retryable-error`
- Implement changes
  - **Write code in:** update [`app/invest/page.js`](app/invest/page.js).
  - **Write comprehensive tests in:** extend [`app/invest/page.test.jsx`](app/invest/page.test.jsx) — fail then succeed on retry, assert the loading skeleton reappears and the list renders.
  - **Add documentation:** note the retry behaviour in [`README.md`](README.md).
  - Add comments on the reload/abort interaction.
  - Validate a11y: the retry button has a clear accessible name and focus is sensible after retry.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: retry-after-failure success, retry-then-failure, and rapid double retry.
- Include the full `npm test` output.

### Example commit message
`feat: add retry action to the invest marketplace error state`

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
title: "Add a responsive mobile navigation menu to the app header"
labels: type:feature, area:navigation, stack:nextjs, stack:react, stack:typescript, priority:medium, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Implement a responsive header navigation for small screens

### Description
The headers in [`app/page.js`](app/page.js), [`app/invoices/page.js`](app/invoices/page.js), and [`app/invest/page.js`](app/invest/page.js) place the brand and a "Connect Wallet" button in a single flex row with no links to the Invoices/Invest sections and no mobile menu — on narrow viewports there is no navigation affordance at all. This issue adds an accessible responsive nav with a disclosure menu on mobile.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Create `components/NavMenu.jsx` with links to Home, Invoices (`/invoices`), and Invest (`/invest`), rendered inline on desktop and behind an accessible toggle button (`aria-expanded`, `aria-controls`) on mobile.
- Mark the current route as `aria-current="page"`.
- Close the menu on `Escape` and on navigation, and trap/return focus appropriately when open.
- Keep the existing slate/cyan styling and the brand wordmark/back-link semantics; do not duplicate the static Connect Wallet button (reference the wallet UI rather than re-adding dead buttons).

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/navigation-08-responsive-nav`
- Implement changes
  - **Write code in:** create [`components/NavMenu.jsx`](components/NavMenu.jsx); update the page headers in [`app/page.js`](app/page.js), [`app/invoices/page.js`](app/invoices/page.js), and [`app/invest/page.js`](app/invest/page.js).
  - **Write comprehensive tests in:** create [`components/NavMenu.test.tsx`](components/NavMenu.test.tsx) — assert toggle, `aria-expanded`, Escape-to-close, and `aria-current`.
  - **Add documentation:** document `NavMenu` in [`README.md`](README.md).
  - Add JSDoc on the component props.
  - Validate a11y: menu is keyboard-operable with no `jest-axe` violations.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: open/close, Escape, current-route marking, and focus return.
- Include the full `npm test` output.

### Example commit message
`feat: add responsive mobile navigation menu to the header`

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
title: "Externalize copy into a typed i18n dictionary and remove inline strings"
labels: type:refactor, area:i18n, stack:nextjs, stack:react, stack:typescript, priority:medium, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Centralize UI copy and remove hard-coded strings

### Description
[`app/copy/en.js`](app/copy/en.js) holds some strings, but many user-facing strings are still inlined: the marketplace yield disclaimer and filter labels in [`app/invest/page.js`](app/invest/page.js), the upload status copy in [`components/UploadZone.jsx`](components/UploadZone.jsx), and the wallet helper texts in [`components/WalletStatus.jsx`](components/WalletStatus.jsx). This drift makes copy edits and future localization error-prone. This issue moves all visible strings into the dictionary and gives it a typed shape.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Extend [`app/copy/en.js`](app/copy/en.js) with keys for the upload statuses, wallet states/helper texts, marketplace filter labels, and the yield disclaimer.
- Replace the inline literals in the components/pages above with dictionary lookups.
- Add a JSDoc `@typedef` (or a `copy.types.js`) describing the dictionary shape so missing keys are catchable.
- No visible copy or behaviour change — strings must render identically.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b refactor/i18n-09-externalize-copy`
- Implement changes
  - **Write code in:** update [`app/copy/en.js`](app/copy/en.js), [`app/invest/page.js`](app/invest/page.js), [`components/UploadZone.jsx`](components/UploadZone.jsx), [`components/WalletStatus.jsx`](components/WalletStatus.jsx).
  - **Write comprehensive tests in:** create [`app/copy/en.test.tsx`](app/copy/en.test.tsx) asserting key presence, and snapshot-check a couple of components for unchanged text.
  - **Add documentation:** document the copy/i18n convention in [`README.md`](README.md).
  - Add a JSDoc typedef for the dictionary.
  - Validate: grep confirms no remaining inline user-facing strings in the touched files.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: every referenced key exists; rendered text is byte-identical.
- Include the full `npm test` output and a before/after string inventory.

### Example commit message
`refactor: externalize ui copy into a typed dictionary`

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
title: "Lazy-load WalletStatus to keep wallet code off the initial bundle"
labels: type:refactor, area:performance, stack:nextjs, stack:react, stack:typescript, priority:low, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Code-split the wallet UI with dynamic import

### Description
[`components/WalletStatus.jsx`](components/WalletStatus.jsx) is a client component that will soon pull in the Stellar/Freighter SDK, yet once mounted in the shared header it would ship in the first-load JS of every route — including the static home page that does not need wallet logic immediately. This issue lazy-loads the wallet UI so it is fetched on demand without blocking initial render.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Use `next/dynamic` to load `WalletStatus` (with `ssr: false` where appropriate) behind a small static placeholder that matches its dimensions to avoid layout shift.
- Keep the exported `WALLET_STATES` import path stable for tests.
- Ensure the accessible status region still mounts once the chunk loads and that no hydration warnings appear.
- Document the measured first-load JS impact (before/after) using `npm run build` output.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b refactor/performance-10-lazy-walletstatus`
- Implement changes
  - **Write code in:** update the header/consumer that renders `WalletStatus` (e.g. [`app/page.js`](app/page.js)) to use a dynamic import wrapper.
  - **Write comprehensive tests in:** create [`components/WalletStatus.lazy.test.tsx`](components/WalletStatus.lazy.test.tsx) — assert the placeholder renders then the wallet UI appears.
  - **Add documentation:** note the code-splitting decision in [`README.md`](README.md) with before/after bundle numbers.
  - Add comments explaining the `ssr`/placeholder choice.
  - Validate: no CLS from the placeholder swap.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: placeholder dimensions, hydration, and lazy mount.
- Include the `npm run build` first-load JS comparison.

### Example commit message
`perf: lazy-load walletstatus to reduce initial bundle`

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
title: "Extract a shared Button component to unify variants and focus styles"
labels: type:refactor, area:components, stack:nextjs, stack:react, stack:typescript, priority:medium, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Refactor duplicated button markup into a shared Button

### Description
Button styling is copy-pasted across the app with subtly different focus rings: the cyan pill in [`app/page.js`](app/page.js), the disabled filter buttons in [`app/invest/page.js`](app/invest/page.js), the submit button and `Spinner` in [`components/UploadZone.jsx`](components/UploadZone.jsx), the variant switch in [`components/WalletStatus.jsx`](components/WalletStatus.jsx), and the action button in [`components/ErrorBanner.jsx`](components/ErrorBanner.jsx). They diverge (`focus:ring` vs `focus-visible:outline`), which is exactly the inconsistency a shared component prevents. This issue introduces a single `Button`.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Create `components/Button.jsx` supporting `variant` (`primary`/`secondary`/`warning`/`external`/`danger`), `loading` (renders the shared spinner), `disabled`, and forwarded props/`ref`.
- Apply one consistent `focus-visible` outline across all variants.
- Migrate the buttons in the files above to use `Button` without visual regressions.
- Export the shared `Spinner` from `Button` (or a `components/Spinner.jsx`) and stop redefining the inline SVG in `WalletStatus`/`UploadZone`.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b refactor/components-11-shared-button`
- Implement changes
  - **Write code in:** create [`components/Button.jsx`](components/Button.jsx) (and optionally [`components/Spinner.jsx`](components/Spinner.jsx)); update the consumers listed above.
  - **Write comprehensive tests in:** create [`components/Button.test.tsx`](components/Button.test.tsx) — assert variants, disabled/loading, and focus styles.
  - **Add documentation:** document `Button` in [`README.md`](README.md) UI section.
  - Add JSDoc on the props.
  - Validate a11y: focus-visible outline meets contrast; loading sets `aria-busy`.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: each variant, loading state, and disabled state.
- Include the full `npm test` output and a before/after note confirming no visual change.

### Example commit message
`refactor: extract shared button and spinner components`

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
title: "Add behavioral unit tests for the ErrorBanner component"
labels: type:test, area:error-banner, stack:nextjs, stack:react, stack:typescript, priority:medium, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Test the ErrorBanner variants and action behaviour

### Description
[`components/ErrorBanner.jsx`](components/ErrorBanner.jsx) has only an a11y smoke test in [`components/__tests__/ErrorBanner.a11y.test.jsx`](components/__tests__/ErrorBanner.a11y.test.jsx); its `variant` label switch (`server` vs `validation`), conditional `details`, and the `actionLabel`/`onAction` button are not behaviorally tested. This issue adds full coverage of its rendering contract.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Assert `variantLabel` renders "Server error" for `server`/default and "Validation error" for `validation`.
- Assert `title`/`description`/`previewLabel` render, that `details` only renders when provided, and that the action button appears only when `actionLabel` is set and calls `onAction` on click.
- Assert the `role="alert"`/`aria-live="assertive"` container is present.
- Use `@testing-library/user-event` for the action click.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b test/error-banner-12-behavioral-coverage`
- Implement changes
  - **Write code in:** no source change unless a bug is found in [`components/ErrorBanner.jsx`](components/ErrorBanner.jsx).
  - **Write comprehensive tests in:** create [`components/ErrorBanner.test.tsx`](components/ErrorBanner.test.tsx).
  - **Add documentation:** none beyond test comments.
  - Add comments documenting the variant matrix.
  - Validate a11y: keep an axe check alongside the behavioral assertions.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: missing `details`, missing `actionLabel`, and both variants.
- Include the full `npm test` output with ErrorBanner coverage.

### Example commit message
`test: cover errorbanner variants and action behaviour`

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
title: "Add unit tests for the getInvoiceLoadAnnouncement helper and InvestMarketplace states"
labels: type:test, area:invest, stack:nextjs, stack:react, stack:typescript, priority:medium, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Test the marketplace announcement helper and load states

### Description
[`app/invest/page.js`](app/invest/page.js) exports `getInvoiceLoadAnnouncement` and an injectable `InvestMarketplace`, but [`app/invest/page.test.jsx`](app/invest/page.test.jsx) does not cover the helper's branches directly nor the abort/unmount path in the effect. This issue adds focused coverage for the pure helper and the loading/empty/error/non-array states.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Unit-test `getInvoiceLoadAnnouncement` for: non-array input, empty array, and N>0 (assert exact strings "No invoices available" / "N investable invoices loaded").
- Test `InvestMarketplace` with injected loaders that resolve to a list, an empty array, a non-array (coerced to `[]`), and a rejected promise (error banner + announcement).
- Assert the skeleton renders while the loader is pending and that unmount during a pending load does not throw or set state (the `isActive` guard).
- Reuse the injectable `loadInvoices` prop already used by the existing test.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b test/invest-13-announcement-and-states`
- Implement changes
  - **Write code in:** no source change unless a bug is found in [`app/invest/page.js`](app/invest/page.js).
  - **Write comprehensive tests in:** extend [`app/invest/page.test.jsx`](app/invest/page.test.jsx) or create [`app/invest/announcement.test.tsx`](app/invest/announcement.test.tsx).
  - **Add documentation:** none beyond test comments.
  - Add comments explaining the unmount-during-fetch assertion.
  - Validate a11y: assert the polite status region content for each state.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: non-array, empty, populated, rejected, and unmount-mid-load.
- Include the full `npm test` output with invest coverage.

### Example commit message
`test: cover getinvoiceloadannouncement and marketplace load states`

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
title: "Add unit tests for the InvoiceListSkeleton row count and loading semantics"
labels: type:test, area:loading-states, stack:nextjs, stack:react, stack:typescript, priority:low, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Test the InvoiceListSkeleton rendering contract

### Description
[`components/InvoiceListSkeleton.jsx`](components/InvoiceListSkeleton.jsx) renders `rows` placeholder list items with `aria-busy="true"` and an "Loading investable invoices" label, but [`components/InvoiceListSkeleton.test.jsx`](components/InvoiceListSkeleton.test.jsx) is thin. This issue ensures the row count, default, and loading semantics are locked in so the skeleton stays in sync with the real card layout.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Assert the component renders exactly `rows` `<li>` items and falls back to the documented default when `rows` is omitted.
- Assert the list carries `aria-busy="true"` and the `aria-label` "Loading investable invoices".
- Assert each row contains the issuer/status and amount/yield/maturity placeholder blocks so a future card refactor cannot silently drop columns.
- Cover `rows={0}` (no items, list still present).

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b test/loading-states-14-skeleton-coverage`
- Implement changes
  - **Write code in:** no source change unless a bug is found in [`components/InvoiceListSkeleton.jsx`](components/InvoiceListSkeleton.jsx).
  - **Write comprehensive tests in:** extend [`components/InvoiceListSkeleton.test.jsx`](components/InvoiceListSkeleton.test.jsx) or create [`components/InvoiceListSkeleton.contract.test.tsx`](components/InvoiceListSkeleton.contract.test.tsx).
  - **Add documentation:** none beyond test comments.
  - Add comments clarifying the placeholder-structure assertions.
  - Validate a11y: assert `aria-busy` and the loading label.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: default rows, custom rows, and `rows={0}`.
- Include the full `npm test` output.

### Example commit message
`test: cover invoicelistskeleton row count and loading semantics`

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
title: "Add unit tests for the Invoices page upload integration and header"
labels: type:test, area:invoices, stack:nextjs, stack:react, stack:typescript, priority:medium, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Test the Invoices page rendering and UploadZone wiring

### Description
[`app/invoices/page.js`](app/invoices/page.js) renders the title, subtext, back link, a Connect Wallet button, and an `<UploadZone />`, but has no unit test, so a broken copy key, a missing UploadZone mount, or a regressed back-link `focus-visible` style would go unnoticed. This issue adds coverage for the page composition.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Assert the heading and subtext from `copy.invoices` render and the "← LiquiFact" link points to `/`.
- Assert the `UploadZone` form mounts (e.g. the `#invoice-file-input` and `#invoice-upload-btn` are present).
- Assert the back link carries the `focus-visible` outline classes that distinguish this page from the others.
- Keep the test resilient to `UploadZone` internals by querying roles/ids rather than implementation details.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b test/invoices-15-page-coverage`
- Implement changes
  - **Write code in:** no source change unless a bug is found in [`app/invoices/page.js`](app/invoices/page.js).
  - **Write comprehensive tests in:** create [`app/invoices/page.test.tsx`](app/invoices/page.test.tsx).
  - **Add documentation:** none beyond test comments.
  - Add comments on how UploadZone is queried.
  - Validate a11y: optional `jest-axe` smoke check on the page.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: copy rendering, UploadZone mount, and back-link target.
- Include the full `npm test` output.

### Example commit message
`test: cover the invoices page composition and uploadzone wiring`

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
title: "Make WalletStatus open the wallet install page safely via rel=noopener"
labels: type:security, area:wallet, stack:nextjs, stack:react, stack:typescript, priority:medium, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Harden the external wallet-install navigation in WalletStatus

### Description
In the `NO_WALLET` state, [`components/WalletStatus.jsx`](components/WalletStatus.jsx) opens the install page with `window.open('https://www.stellar.org/wallets', '_blank')` — without the `noopener,noreferrer` window features, the opened tab can access `window.opener` (reverse-tabnabbing), and an untrusted URL would flow straight through. This issue makes the external navigation safe and centralizes the allowed destination.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Pass `'noopener,noreferrer'` as the `window.open` features argument and null the returned reference's `opener` as a defensive fallback.
- Move the install URL into a single trusted constant (or [`app/copy/en.js`](app/copy/en.js)) and validate it is an `https:` origin before opening.
- Preserve the `WALLET_STATES.NO_WALLET` button behaviour and accessibility.
- Audit any other `window.open`/external anchors introduced here for the same protection.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b security/wallet-16-safe-external-open`
- Implement changes
  - **Write code in:** update [`components/WalletStatus.jsx`](components/WalletStatus.jsx); add the URL constant where appropriate.
  - **Write comprehensive tests in:** create [`components/WalletStatus.external.test.tsx`](components/WalletStatus.external.test.tsx) — mock `window.open` and assert the features string and URL.
  - **Add documentation:** note the external-link policy in [`README.md`](README.md).
  - Add comments explaining the tabnabbing mitigation.
  - Validate security: confirm `noopener` is set and only `https:` URLs are opened.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: correct features argument and rejected non-https URL.
- Include the full `npm test` output and a short threat note.

### Example commit message
`fix: open wallet install page with noopener to prevent tabnabbing`

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
title: "Bound and safely render the backend health JSON on the home page"
labels: type:security, area:home, stack:nextjs, stack:react, stack:typescript, priority:medium, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Harden how the home page renders untrusted health responses

### Description
[`app/page.js`](app/page.js) takes whatever the backend returns from `/health` and dumps it via `JSON.stringify(health, null, 2)` into a `<pre>` with `overflow-auto` — an attacker-controlled or compromised backend could return an enormous payload (DoS via giant render) or deeply nested data that bloats the page. While React escapes text, the size and shape are unbounded. This issue bounds and sanitizes what is rendered.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Cap the rendered payload size (e.g. truncate the stringified output to a max length with an explicit "…(truncated)" marker) and limit object depth before display.
- Render a small set of recognized fields (e.g. `status`, `message`, `version`) in a structured way and keep the raw payload behind a collapsible `<details>` rather than always-expanded.
- Never render the response as HTML; keep it as text content only.
- Coordinate gracefully with the health-check helper if present, without duplicating fetch logic.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b security/home-17-bounded-health-render`
- Implement changes
  - **Write code in:** update [`app/page.js`](app/page.js); optionally add a `lib/format/safeJson.js` helper.
  - **Write comprehensive tests in:** create [`app/page.health-render.test.tsx`](app/page.health-render.test.tsx) and/or [`lib/format/safeJson.test.tsx`](lib/format/safeJson.test.tsx) — assert truncation, depth limit, and recognized-field rendering.
  - **Add documentation:** note the bounded rendering in [`README.md`](README.md).
  - Add JSDoc on the formatting helper.
  - Validate security: confirm large/nested payloads cannot blow up the DOM.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: huge string, deep nesting, and a normal healthy payload.
- Include the full `npm test` output and a short note on the limits chosen.

### Example commit message
`fix: bound and safely render backend health json on the home page`

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
title: "Add a Dependabot config and lockfile-integrity check for the frontend"
labels: type:security, area:dependencies, stack:nextjs, stack:react, stack:typescript, priority:low, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Automate dependency updates with Dependabot and a lockfile check

### Description
The repo pins `next`, `react`, and a set of dev tooling in [`package.json`](package.json) with a committed `package-lock.json`, but there is no `.github/dependabot.yml` and CI ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) runs `npm ci` without verifying the lockfile is in sync. Without automated updates, security patches for Next.js/React/Playwright land late. This issue adds Dependabot and a lockfile-drift guard.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add `.github/dependabot.yml` configuring weekly `npm` ecosystem updates (and `github-actions` ecosystem) grouped sensibly to limit PR noise.
- Add a CI step asserting `package-lock.json` is in sync (e.g. `npm ci` fails on drift, or an explicit `npm install --package-lock-only` diff check) so PRs cannot merge with a stale lockfile.
- Keep existing lint/test jobs intact.
- Document how to review and merge Dependabot PRs against the campaign workflow.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b security/dependencies-18-dependabot-lockfile`
- Implement changes
  - **Write code in:** create [`.github/dependabot.yml`](.github/dependabot.yml); update [`.github/workflows/ci.yml`](.github/workflows/ci.yml).
  - **Write comprehensive tests in:** validate via a CI run on the PR; add a documented local lockfile-drift command.
  - **Add documentation:** add a "Dependency updates" subsection to [`README.md`](README.md).
  - Add comments in the workflow explaining the lockfile gate.
  - Validate security: ensure the config does not auto-merge without review.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, `npm run build`, and `npm ci` locally.
- Cover edge cases: clean lockfile passes; an intentionally drifted lockfile fails CI.
- Include the CI run link/output.

### Example commit message
`ci: add dependabot config and lockfile-integrity check`

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
title: "Fix the inaccurate README project structure, component props, and design tokens"
labels: type:docs, area:readme, stack:nextjs, stack:react, stack:typescript, priority:medium, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Correct the README to match the actual codebase

### Description
[`README.md`](README.md) is out of sync with the code in several places: the "Project structure" tree omits `components/`, `app/copy/`, and the test/Playwright setup; the **CI/CD** section lists "Lint" and "Build" but the workflow actually runs lint and `npm test` (accessibility), not build; the `WalletStatus` props are documented as a `status` prop it does not accept; `ErrorBanner` props are wrong (it has `variant`/`title`/`description`/`details`/`actionLabel`/`onAction`/`previewLabel`, not `message`); and the Design Tokens claim Geist is imported via `@fontsource/geist` when [`app/layout.js`](app/layout.js) uses `next/font/google`. This issue makes the README accurate.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Update the project-structure tree to reflect real folders/files (`components/`, `app/copy/en.js`, `tests/`, `jest.config.js`, `playwright.config.mjs`, `next.config.mjs`).
- Fix the CI/CD section to match [`.github/workflows/ci.yml`](.github/workflows/ci.yml) (lint + accessibility tests).
- Correct the `WalletStatus` and `ErrorBanner` prop docs against their real signatures.
- Fix the Design Tokens section: Geist via `next/font/google`, and reconcile the listed color hexes with the actual slate/cyan palette.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b docs/readme-19-accuracy-fixes`
- Implement changes
  - **Write code in:** docs-only.
  - **Write comprehensive tests in:** not applicable; cross-check every claim against source.
  - **Add documentation:** update [`README.md`](README.md).
  - Add a short "last verified against commit" note.
  - Validate accuracy by diffing each statement against the corresponding file.
- Test and commit

### Test and commit
- Run `npm run lint` and `npm run build` to confirm nothing breaks.
- Cover edge cases: every documented prop/path exists in the code.
- Include a rendered preview of the corrected sections.

### Example commit message
`docs: correct readme structure, component props, and design tokens`

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
title: "Add an accessibility statement documenting the app's a11y commitments"
labels: type:docs, area:accessibility, stack:nextjs, stack:react, stack:typescript, priority:low, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Document the accessibility approach and known gaps

### Description
The codebase invests heavily in accessibility — `jest-axe` wired in [`jest.setup.js`](jest.setup.js), `role="status"`/`aria-live` regions in [`components/UploadZone.jsx`](components/UploadZone.jsx), [`components/WalletStatus.jsx`](components/WalletStatus.jsx), and [`app/invest/page.js`](app/invest/page.js), and a CI step literally named "Test Accessibility" in [`.github/workflows/ci.yml`](.github/workflows/ci.yml) — but there is no document explaining the standards targeted, the testing approach, or the known gaps (e.g. disabled filter buttons, motion handling). This issue writes an accessibility statement.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Create `docs/accessibility.md` stating the target standard (WCAG 2.1 AA), the keyboard/screen-reader patterns used, and how `jest-axe` is run in CI.
- List known limitations and link to the relevant components/issues (disabled "Soon" filters, reduced-motion handling, focus styles).
- Provide a contributor checklist for keeping new UI accessible (labels, landmarks, focus, live regions, contrast).
- Link the statement from [`README.md`](README.md).

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b docs/accessibility-20-a11y-statement`
- Implement changes
  - **Write code in:** docs-only.
  - **Write comprehensive tests in:** not applicable; ensure referenced patterns exist in code.
  - **Add documentation:** create [`docs/accessibility.md`](docs/accessibility.md) and link from [`README.md`](README.md).
  - Add a maintenance note on updating the statement when a11y issues close.
  - Validate accuracy against the current components and CI.
- Test and commit

### Test and commit
- Run `npm run lint` and `npm run build`.
- Cover edge cases: every referenced pattern and CI step is accurate.
- Include a rendered preview of the new doc.

### Example commit message
`docs: add accessibility statement and contributor checklist`

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
title: "Document environment variables and add the missing test/test:e2e to the README scripts"
labels: type:docs, area:configuration, stack:nextjs, stack:react, stack:typescript, priority:low, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Document env vars and align the README command reference

### Description
[`.env.local.example`](.env.local.example) defines `NEXT_PUBLIC_API_URL` (and a commented `NEXT_PUBLIC_STELLAR_NETWORK`), but [`README.md`](README.md) only mentions `NEXT_PUBLIC_API_URL` in passing and its Development command table omits `npm test` even though [`package.json`](package.json) defines it (and CI runs it). This issue creates a clear environment-variable reference and aligns the documented scripts with the real ones.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add an "Environment variables" table to [`README.md`](README.md) listing each var, whether it is required, its default, and what reads it (link to [`app/page.js`](app/page.js) for the API URL and [`WALLET_INTEGRATION_CONTRACT.md`](WALLET_INTEGRATION_CONTRACT.md) for the network).
- Add `npm test` (Jest/jsdom) to the Development command table alongside `test:e2e`.
- Ensure [`.env.local.example`](.env.local.example) and the README stay consistent (same var names/defaults).
- Note that `NEXT_PUBLIC_*` values are exposed to the client and must not hold secrets.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b docs/configuration-21-env-and-scripts`
- Implement changes
  - **Write code in:** docs-only; optionally clarify comments in [`.env.local.example`](.env.local.example).
  - **Write comprehensive tests in:** not applicable; verify documented defaults match the code fallbacks.
  - **Add documentation:** update [`README.md`](README.md) and [`.env.local.example`](.env.local.example).
  - Add a security note on `NEXT_PUBLIC_` exposure.
  - Validate accuracy against `package.json` scripts and the env reads in code.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: documented defaults match `app/page.js`; every script in the table exists.
- Include a rendered preview of the env section.

### Example commit message
`docs: document environment variables and align readme scripts`

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
title: "Give the toast close button reliable Escape-to-dismiss and focus handling"
labels: type:a11y, area:toast, stack:nextjs, stack:react, stack:typescript, priority:medium, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Improve keyboard accessibility of toast notifications

### Description
Toasts in [`components/ToastProvider.jsx`](components/ToastProvider.jsx) can only be dismissed by clicking "Close" or waiting for the timer; there is no keyboard shortcut to dismiss, and hovering pauses the timer but focusing (keyboard equivalent of hover) does not — so a keyboard user reading a toast can have it disappear mid-read. This issue adds keyboard parity: pause on focus, dismiss on Escape, and sensible focus return.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Pause/resume the auto-dismiss timer on `focus`/`blur` of the toast (mirroring the existing `mouseenter`/`mouseleave` pause/resume) so focusing a toast does not let it vanish.
- Allow `Escape` to dismiss the focused toast.
- Ensure the "Close" button and toast are reachable in a sensible tab order and that focus moves to a safe element after dismissal (no focus loss to `body`).
- Keep the `role="status"`/`aria-live="polite"` region and all existing variant styling.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b a11y/toast-22-keyboard-dismiss`
- Implement changes
  - **Write code in:** update [`components/ToastProvider.jsx`](components/ToastProvider.jsx).
  - **Write comprehensive tests in:** create [`components/ToastProvider.keyboard.test.tsx`](components/ToastProvider.keyboard.test.tsx) using `user-event` and fake timers — assert focus pauses the timer, Escape dismisses, and focus return.
  - **Add documentation:** note the keyboard behaviour in [`README.md`](README.md).
  - Add comments on the focus/blur pause parity.
  - Validate a11y: no `jest-axe` violations and keyboard-operable dismissal.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: focus-pause, Escape dismiss, and focus return after close.
- Include the full `npm test` output.

### Example commit message
`fix: add escape-to-dismiss and focus pause to toast notifications`

### Guidelines
- **Minimum 95 percent test coverage** for impacted modules.
- Clear, reviewer-focused documentation.
- **Timeframe: 96 hours.**

### Community & contribution rewards
- 💬 **Join the Liquifact community on Discord for questions, reviews, and faster merges:** https://discord.gg/JrGPH4V3
- ⭐ This is a **GrantFox OSS / Official Campaign** task and **may be rewarded**. When your PR is merged you'll be prompted to rate the project — if this issue and the maintainers helped you ship, we'd be grateful for a **5-star rating**. Clear questions in Discord and tidy, well-tested PRs are the fastest path to a merge and a reward.
