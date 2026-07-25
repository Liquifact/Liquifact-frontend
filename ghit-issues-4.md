---
type: Feature
title: "Consolidate the duplicate WalletProvider and WalletContext into a single wallet module"
labels: type:refactor, area:wallet, stack:nextjs, stack:react, stack:typescript, priority:high, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Unify the two competing wallet providers into one source of truth

### Description
The repo ships two separate, incompatible wallet context implementations: [`components/WalletProvider.jsx`](components/WalletProvider.jsx) exposes `useWallet()` returning `{ state, walletData, connect, disconnect }` with localStorage rehydration, while [`components/WalletContext.jsx`](components/WalletContext.jsx) exposes `useWallet()` returning `{ walletState, walletData, error, connectWallet, disconnectWallet }`. [`app/layout.js`](app/layout.js) mounts `WalletProvider` from `WalletContext`, but consumers like [`app/invest/[id]/page.js`](app/invest/[id]/page.js) destructure `walletState`/`connectWallet`. Having two providers with the same hook name is a latent footgun. This issue consolidates them into one canonical module.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Pick one canonical file (keep the persistence-capable `WalletProvider.jsx` implementation) and delete or re-export the other so only one `useWallet()`/`WALLET_STATES` exists.
- Settle on a single hook shape and update every consumer ([`app/invest/[id]/page.js`](app/invest/[id]/page.js), [`app/layout.js`](app/layout.js), and any `@/components/WalletContext` import) to match.
- Preserve localStorage rehydration, toast side effects, and `WALLET_STATES`.
- Update all imports app-wide; no dangling references to the removed file.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b refactor/wallet-01-consolidate-providers`
- Implement changes
  - **Write code in:** keep [`components/WalletProvider.jsx`](components/WalletProvider.jsx); remove/redirect [`components/WalletContext.jsx`](components/WalletContext.jsx); update [`app/layout.js`](app/layout.js) and [`app/invest/[id]/page.js`](app/invest/[id]/page.js).
  - **Write comprehensive tests in:** create [`components/WalletProvider.consolidation.test.tsx`](components/WalletProvider.consolidation.test.tsx) — assert a single hook shape and that all consumers resolve it.
  - **Add documentation:** update [`README.md`](README.md) and [`WALLET_INTEGRATION_CONTRACT.md`](WALLET_INTEGRATION_CONTRACT.md) to reference one provider.
  - Add JSDoc on the canonical hook/provider.
  - Validate: grep confirms no `WalletContext` imports remain.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: every consumer compiles and the hook returns one stable shape.
- Include the full `npm test` output and a before/after import inventory.

### Example commit message
`refactor: consolidate duplicate wallet providers into one module`

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
title: "Fix WalletStatus to import Button and use the correct getStateConfig keys"
labels: type:refactor, area:wallet, stack:nextjs, stack:react, stack:typescript, priority:high, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Repair the broken Button usage and config key mismatch in WalletStatus

### Description
[`components/WalletStatus.jsx`](components/WalletStatus.jsx) renders `<Button variant={config.variant} loading={config.loading} ...>` but (1) never imports `Button` from [`components/Button.jsx`](components/Button.jsx), and (2) `getStateConfig` returns `buttonVariant`/`buttonText` keys, not `variant`/`loading` — so `config.variant` and `config.loading` are always `undefined`. The component as written would throw at runtime. This issue wires the import and aligns the prop names so the wallet button renders the right variant and loading state.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add `import Button from './Button';` (and remove the leftover inline spinner SVG now that `Button` renders its own `Spinner` via `loading`).
- Map `getStateConfig`'s `buttonVariant` to the `Button` `variant` prop and derive `loading` from the `connecting` state.
- Reconcile `WalletStatus`'s local `WALLET_STATES`/mock with the canonical wallet provider once consolidated (coordinate with the provider-unification work).
- Keep the `sr-only` `role="status"` live region and `aria-describedby` helper text intact.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b refactor/wallet-02-fix-button-config`
- Implement changes
  - **Write code in:** update [`components/WalletStatus.jsx`](components/WalletStatus.jsx).
  - **Write comprehensive tests in:** extend [`components/WalletStatus.test.tsx`](components/WalletStatus.test.tsx) — assert each state renders the correct Button variant and loading spinner.
  - **Add documentation:** note the fix in [`README.md`](README.md) UI section.
  - Add JSDoc/comments on the config-to-prop mapping.
  - Validate a11y: connecting state sets `aria-busy` via Button.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: every `WALLET_STATES` variant and the connecting spinner.
- Include the full `npm test` output.

### Example commit message
`fix: import button and align getstateconfig keys in walletstatus`

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
title: "Repair the broken Invest page: undefined filter state and missing InvoiceSearch import"
labels: type:refactor, area:invest, stack:nextjs, stack:react, stack:typescript, priority:high, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Fix the runtime references and dead code in the Invest marketplace page

### Description
[`app/invest/page.js`](app/invest/page.js) is currently broken in several ways: `getInvoiceLoadAnnouncement` references `filterActive` and `filteredCount` that are never defined; the JSX renders `<InvoiceSearch />` without importing it; and the file both `import { loadMockInvoices } from "./lib"` and redefines a local `loadMockInvoices` plus a duplicate `MOCK_INVOICES`. This issue cleans up the merge artifacts so the page compiles and the search wiring actually works.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Remove the duplicate local `MOCK_INVOICES` and `loadMockInvoices`; rely solely on the imports from [`app/invest/lib.js`](app/invest/lib.js).
- Import `InvoiceSearch` from [`components/InvoiceSearch.jsx`](components/InvoiceSearch.jsx).
- Fix `getInvoiceLoadAnnouncement` so it does not reference undefined `filterActive`/`filteredCount`; either pass the filter state in or compute the filtered count from `searchQuery`/`debouncedQuery` already in state.
- Actually apply `debouncedQuery` to filter `visibleInvoices` by issuer (the state exists but is unused), and keep the polite status announcement accurate.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b refactor/invest-03-fix-broken-page`
- Implement changes
  - **Write code in:** update [`app/invest/page.js`](app/invest/page.js).
  - **Write comprehensive tests in:** extend [`app/invest/page.test.jsx`](app/invest/page.test.jsx) — assert search filters the list and the announcement reports the filtered count.
  - **Add documentation:** note the search/announcement behaviour in [`README.md`](README.md).
  - Add comments explaining the announcement signature.
  - Validate a11y: filtered count announced via the polite region.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: no matches, cleared query, and full list.
- Include the full `npm test` output.

### Example commit message
`fix: repair undefined filter state and missing imports on invest page`

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
title: "Fix the missing NavMenu import on the home page"
labels: type:refactor, area:home, stack:nextjs, stack:react, stack:typescript, priority:high, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Import NavMenu so the home page renders without a ReferenceError

### Description
[`app/page.js`](app/page.js) renders `<NavMenu />` at the top of the layout but never imports it, so the home page throws a `NavMenu is not defined` ReferenceError at render. This issue adds the missing import and verifies the home page mounts the shared navigation.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add `import NavMenu from "../components/NavMenu";` (matching the path style already used by [`app/invoices/page.js`](app/invoices/page.js)).
- Confirm `NavMenu` is the single header for the home page and there is no leftover duplicate header markup.
- Keep the existing hero, CTA cards, and API-status panel intact.
- Verify no hydration warnings from the lazy `WalletStatusLazy` inside `NavMenu`.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b refactor/home-04-fix-navmenu-import`
- Implement changes
  - **Write code in:** update [`app/page.js`](app/page.js).
  - **Write comprehensive tests in:** create [`app/page.navmenu.test.tsx`](app/page.navmenu.test.tsx) — assert the navigation landmark renders and links to Home/Invoices/Invest exist.
  - **Add documentation:** note the home page header composition in [`README.md`](README.md).
  - Add a comment referencing the shared NavMenu.
  - Validate a11y: a single `<nav>`/`<header>` landmark with an accessible name.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: NavMenu mounts, links resolve.
- Include the full `npm test` output.

### Example commit message
`fix: import navmenu on the home page`

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
title: "Fix the Invoices page: missing Link import and replace the dead static Connect Wallet button"
labels: type:refactor, area:invoices, stack:nextjs, stack:react, stack:typescript, priority:high, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Repair the Invoices page header and mount the shared NavMenu

### Description
[`app/invoices/page.js`](app/invoices/page.js) imports `NavMenu` but never renders it, instead hand-rolling a header that uses `<Link>` without importing it (a `Link is not defined` ReferenceError) and a static "Connect Wallet" `<button>` that does nothing. This issue fixes the broken import and replaces the dead header with the shared `NavMenu`.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Replace the bespoke header with the imported `<NavMenu />` so the page uses the same navigation and real wallet UI as the home page.
- Remove the dead static "Connect Wallet" button (it uses `copy.invoices.connectWallet` and has no handler).
- If the bespoke header is kept for any reason, add the missing `import Link from "next/link";`.
- Preserve the page title/subtext and the `<UploadZone />` mount.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b refactor/invoices-05-fix-header`
- Implement changes
  - **Write code in:** update [`app/invoices/page.js`](app/invoices/page.js).
  - **Write comprehensive tests in:** extend [`app/invoices/page.test.tsx`](app/invoices/page.test.tsx) — assert NavMenu renders and no stray static Connect Wallet button remains.
  - **Add documentation:** note the unified header in [`README.md`](README.md).
  - Add a comment referencing NavMenu reuse.
  - Validate a11y: one header landmark; back link is keyboard focusable.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: header renders, UploadZone mounts, no dead button.
- Include the full `npm test` output.

### Example commit message
`fix: use navmenu and import link on the invoices page`

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
title: "Fix ErrorBanner so it honors actionLabel and the error variant label"
labels: type:refactor, area:error-banner, stack:nextjs, stack:react, stack:typescript, priority:high, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Make ErrorBanner render the passed actionLabel and correct variant label

### Description
[`components/ErrorBanner.jsx`](components/ErrorBanner.jsx) accepts an `actionLabel` prop but the action button hard-codes the text "Retry", ignoring `actionLabel` entirely. Its `variantLabel` only special-cases `"validation"`, so callers passing `variant="error"` (e.g. [`app/invest/page.js`](app/invest/page.js) and [`app/invest/[id]/page.js`](app/invest/[id]/page.js)) get the misleading label "Server error". This issue fixes both so the component renders what callers ask for.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Render `{actionLabel}` (not the literal "Retry") inside the action `Button`, keeping `onAction` wired.
- Map `variant` to a correct label, including an `"error"` case, so the displayed label matches the caller's intent (or document the allowed variant set).
- Keep `previewLabel`, `role="alert"`/`aria-live="assertive"`, and conditional `details` behaviour unchanged.
- Audit existing callers and adjust any that now show a different (correct) label.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b refactor/error-banner-06-actionlabel-variant`
- Implement changes
  - **Write code in:** update [`components/ErrorBanner.jsx`](components/ErrorBanner.jsx).
  - **Write comprehensive tests in:** create [`components/ErrorBanner.action.test.tsx`](components/ErrorBanner.action.test.tsx) — assert the rendered button text equals `actionLabel` and the variant label matrix.
  - **Add documentation:** document the variant set in [`COMPONENTS.md`](COMPONENTS.md).
  - Add JSDoc on the props.
  - Validate a11y: action button has an accessible name from `actionLabel`.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: custom actionLabel, no actionLabel, server/validation/error variants.
- Include the full `npm test` output.

### Example commit message
`fix: render actionlabel and correct variant label in errorbanner`

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
title: "Define the missing API_URL constant in UploadZone before the upload fetch"
labels: type:refactor, area:upload, stack:nextjs, stack:react, stack:typescript, priority:high, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Fix the undefined API_URL reference in the UploadZone submit handler

### Description
`handleSubmit` in [`components/UploadZone.jsx`](components/UploadZone.jsx) calls `fetch(`${API_URL}/invoices`, ...)`, but `API_URL` is never imported or declared in the module, so submitting an invoice throws `API_URL is not defined`. Other files (e.g. [`app/page.js`](app/page.js)) read `process.env.NEXT_PUBLIC_API_URL` with a localhost fallback. This issue defines the base URL consistently so the upload request actually fires.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Derive the base URL from `process.env.NEXT_PUBLIC_API_URL` with the `http://localhost:3001` fallback, matching the home page, ideally via a shared helper in `lib/api`.
- Keep the multipart `FormData` body, the `!res.ok` error mapping, the `tokenizing`→`success` transition, and existing status copy unchanged.
- Ensure the e2e toast spec in [`tests/toast.spec.jsx`](tests/toast.spec.jsx) still passes (mock the network where needed).
- Add an `AbortController` so an unmount mid-upload does not set state on an unmounted component.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b refactor/upload-07-define-api-url`
- Implement changes
  - **Write code in:** update [`components/UploadZone.jsx`](components/UploadZone.jsx); optionally add a shared base-URL helper in `lib/api`.
  - **Write comprehensive tests in:** extend [`components/UploadZone.test.jsx`](components/UploadZone.test.jsx) — mock `fetch`, assert the request URL and success/error transitions.
  - **Add documentation:** note the env var usage in [`README.md`](README.md).
  - Add JSDoc/comments on the URL source.
  - Validate security: only the configured origin is used for the request.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, `npm run build`, and `npm run test:e2e`.
- Cover edge cases: success, non-2xx, network error, and unmount mid-upload.
- Include the full `npm test` output and e2e confirmation.

### Example commit message
`fix: define api_url base in uploadzone submit handler`

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
title: "Align the invoice-detail Fund button with the consolidated wallet hook API"
labels: type:refactor, area:invest, stack:nextjs, stack:react, stack:typescript, priority:high, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Fix the wallet hook destructuring in the invoice detail page

### Description
[`app/invest/[id]/page.js`](app/invest/[id]/page.js) destructures `{ walletState, connectWallet }` from `useWallet()`, but the canonical persistence-capable provider in [`components/WalletProvider.jsx`](components/WalletProvider.jsx) returns `{ state, walletData, connect, disconnect }`. Depending on which provider is mounted, `walletState`/`connectWallet` are `undefined`, so the "Fund this invoice" gating and the connect call silently break. This issue aligns the detail page with one hook shape.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Destructure the hook fields that actually exist on the canonical provider and update `handleFund`/`isFundingDisabled` accordingly.
- Import `WALLET_STATES` from the same module that backs `useWallet()` (avoid mixing `@/components/WalletContext` and `WalletProvider`).
- Keep the disabled-while-connecting and disconnected-prompts-connect behaviour and the educational disclaimer.
- Coordinate with the provider-consolidation work so the import path is stable.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b refactor/invest-08-detail-wallet-hook`
- Implement changes
  - **Write code in:** update [`app/invest/[id]/page.js`](app/invest/[id]/page.js).
  - **Write comprehensive tests in:** extend [`app/invest/[id]/page.test.tsx`](app/invest/[id]/page.test.tsx) — assert the Fund button prompts connect when disconnected and disables while connecting.
  - **Add documentation:** note the funding-intent flow in [`README.md`](README.md).
  - Add comments on the wallet gating.
  - Validate a11y: the Fund button keeps a clear accessible name.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: disconnected, connecting, connected, and no-wallet states.
- Include the full `npm test` output.

### Example commit message
`fix: align invoice-detail fund button with the wallet hook api`

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
title: "Remove duplicated MOCK_INVOICES by sourcing all mock data from app/invest/lib.js"
labels: type:refactor, area:invest, stack:nextjs, stack:react, stack:typescript, priority:medium, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Single-source the mock invoice fixtures

### Description
The same `MOCK_INVOICES` array and a `loadMockInvoices` helper are defined twice — in [`app/invest/lib.js`](app/invest/lib.js) (the canonical, test-aware version reading `window.__TEST_MOCK_INVOICES__`) and again inline in [`app/invest/page.js`](app/invest/page.js). Duplicated fixtures drift apart over time and the detail-by-id lookup in `lib.js` already depends on the canonical array. This issue removes the inline copy so there is one source of truth.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Delete the inline `MOCK_INVOICES`/`loadMockInvoices`/`DEV_DELAY` from [`app/invest/page.js`](app/invest/page.js) and use only the exports from [`app/invest/lib.js`](app/invest/lib.js).
- Confirm `getInvoiceById` in `lib.js` resolves the detail route against the same array.
- No behaviour change to the rendered marketplace or the test hook `window.__TEST_MOCK_INVOICES__`.
- Add a short comment marking `lib.js` as the single mock-data source until the API client lands.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b refactor/invest-09-dedupe-mock-data`
- Implement changes
  - **Write code in:** update [`app/invest/page.js`](app/invest/page.js); keep [`app/invest/lib.js`](app/invest/lib.js) canonical.
  - **Write comprehensive tests in:** extend [`app/invest/page.test.jsx`](app/invest/page.test.jsx) — assert the list renders from the shared fixture.
  - **Add documentation:** note the single mock source in [`docs/api-integration.md`](docs/api-integration.md).
  - Add comments on the test hook.
  - Validate: grep confirms only one `MOCK_INVOICES` definition.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: list render, detail lookup, and the test hook override.
- Include the full `npm test` output.

### Example commit message
`refactor: single-source mock invoices from app/invest/lib.js`

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
title: "Migrate WalletStatus and remaining buttons to the shared Button focus-visible styles"
labels: type:refactor, area:components, stack:nextjs, stack:react, stack:typescript, priority:medium, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Finish the shared-Button migration and remove leftover focus:ring styles

### Description
A shared [`components/Button.jsx`](components/Button.jsx) exists with a unified `focus-visible:outline` treatment, yet several buttons still use the older divergent `focus:ring` pattern: the home API-status button in [`app/page.js`](app/page.js), the Fund button in [`app/invest/[id]/page.js`](app/invest/[id]/page.js), the disabled filter buttons in [`app/invest/page.js`](app/invest/page.js), and the inline `getButtonStyles` in [`components/WalletStatus.jsx`](components/WalletStatus.jsx). This issue completes the migration so focus styling is consistent everywhere.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Replace the remaining hand-styled buttons with `<Button>` (or its variants), deleting `getButtonStyles` from `WalletStatus`.
- Ensure every interactive button uses the cyan `focus-visible:outline` from `Button` rather than `focus:ring`.
- No visual regression beyond the intentional focus-style unification; preserve disabled/loading semantics.
- Keep the disabled filter buttons' "coming soon" affordance (coordinate with any a11y work on those controls).

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b refactor/components-10-finish-button-migration`
- Implement changes
  - **Write code in:** update [`app/page.js`](app/page.js), [`app/invest/[id]/page.js`](app/invest/[id]/page.js), [`app/invest/page.js`](app/invest/page.js), [`components/WalletStatus.jsx`](components/WalletStatus.jsx).
  - **Write comprehensive tests in:** extend [`components/Button.test.tsx`](components/Button.test.tsx) and add focus-style assertions where buttons were migrated.
  - **Add documentation:** update [`COMPONENTS.md`](COMPONENTS.md) Button section.
  - Add comments where a bespoke button was replaced.
  - Validate a11y: focus outline meets contrast across variants.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: each variant, disabled, loading, and focus visibility.
- Include the full `npm test` output and a before/after note.

### Example commit message
`refactor: migrate remaining buttons to the shared button component`

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
title: "Add an aria-label and screen-reader title to the UploadZone Spinner SVG"
labels: type:a11y, area:upload, stack:nextjs, stack:react, stack:typescript, priority:low, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Give loading spinners an accessible name

### Description
The `Spinner` components in [`components/UploadZone.jsx`](components/UploadZone.jsx), [`components/Spinner.jsx`](components/Spinner.jsx), and the inline SVG fallback are marked `aria-hidden="true"`. That is fine when wrapped in a `role="status"` text region, but the submit button renders a bare `<Spinner />` next to text with no status text of its own, so assistive tech announces only the static button label during processing. This issue ensures the loading state is consistently perceivable.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Confirm every spinner usage is paired with an `aria-busy` host or a `role="status"` text node; where a spinner stands alone, add an accessible loading label.
- Keep decorative spinners `aria-hidden` only when their loading meaning is conveyed elsewhere.
- Do not introduce double announcements (avoid both `aria-busy` and a redundant live region announcing simultaneously).
- Respect `prefers-reduced-motion` already handled globally.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b a11y/upload-11-spinner-label`
- Implement changes
  - **Write code in:** update [`components/UploadZone.jsx`](components/UploadZone.jsx) and [`components/Spinner.jsx`](components/Spinner.jsx) as needed.
  - **Write comprehensive tests in:** extend [`components/UploadZone.test.jsx`](components/UploadZone.test.jsx) — assert a loading state is announced during `uploading`/`tokenizing`.
  - **Add documentation:** note the spinner a11y pattern in [`docs/accessibility.md`](docs/accessibility.md).
  - Add comments on the chosen pattern.
  - Validate a11y with `jest-axe` on a loading render.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: standalone spinner and spinner-in-status-region.
- Include the full `npm test` output.

### Example commit message
`fix: give loading spinners an accessible name`

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
title: "Mark the NavMenu mobile dropdown inert while hidden and manage focus into the panel"
labels: type:a11y, area:navigation, stack:nextjs, stack:react, stack:typescript, priority:medium, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Improve focus management for the NavMenu mobile disclosure

### Description
[`components/NavMenu.jsx`](components/NavMenu.jsx) toggles the mobile dropdown with `aria-expanded`/`aria-controls` and closes on Escape, but it only conditionally renders the panel (`{open && ...}`) and does not move focus into the opened menu or trap focus within it, so keyboard users must tab back through the page to reach the links. This issue adds focus-into-panel behaviour and a focus-return guarantee.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- On open, move focus to the first menu link (or the panel) and return focus to the toggle on close (Escape and selection already partially do this).
- Keep the click-outside-to-close and `aria-current="page"` behaviour intact.
- Ensure the desktop nav (md+) is unaffected.
- Avoid focus-trap on desktop where links are always visible.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b a11y/navigation-12-mobile-focus`
- Implement changes
  - **Write code in:** update [`components/NavMenu.jsx`](components/NavMenu.jsx).
  - **Write comprehensive tests in:** extend [`components/NavMenu.test.jsx`](components/NavMenu.test.jsx) — assert focus moves into the panel on open and returns to the toggle on close.
  - **Add documentation:** note the focus behaviour in [`docs/accessibility.md`](docs/accessibility.md).
  - Add comments on the focus-management approach.
  - Validate a11y with `jest-axe` on the open menu.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: open via keyboard, Escape, click-outside, and selection.
- Include the full `npm test` output.

### Example commit message
`fix: manage focus into and out of the navmenu mobile dropdown`

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
title: "Give the InvoiceSearch clear button reliable focus return after clearing"
labels: type:a11y, area:invest, stack:nextjs, stack:react, stack:typescript, priority:low, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Return focus to the search input after the clear button removes itself

### Description
In [`components/InvoiceSearch.jsx`](components/InvoiceSearch.jsx) the "Clear" button only renders when `value` is truthy. Clicking it sets the value to empty, which immediately unmounts the button, dropping focus to `<body>` — a keyboard/screen-reader user loses their place. This issue restores focus to the search input after clearing.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- After `onChange('')` clears the field, move focus back to the `#issuer-search` input.
- Keep the existing `type="search"`, the `sr-only` label, and the slate/cyan styling.
- Do not interfere with native search-field clear affordances.
- Ensure the change is non-breaking for the controlled `value`/`onChange` contract used by [`app/invest/page.js`](app/invest/page.js).

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b a11y/invest-13-search-clear-focus`
- Implement changes
  - **Write code in:** update [`components/InvoiceSearch.jsx`](components/InvoiceSearch.jsx).
  - **Write comprehensive tests in:** create [`components/InvoiceSearch.test.tsx`](components/InvoiceSearch.test.tsx) — assert focus returns to the input after clear.
  - **Add documentation:** note the behaviour in [`COMPONENTS.md`](COMPONENTS.md).
  - Add comments on the focus-restore choice.
  - Validate a11y: the input keeps an associated label.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: clear via mouse and keyboard; empty-value state.
- Include the full `npm test` output.

### Example commit message
`fix: restore focus to search input after clearing in invoicesearch`

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
title: "Fix the Pagination double live-region announcement that competes with the page status"
labels: type:a11y, area:invest, stack:nextjs, stack:react, stack:typescript, priority:medium, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Resolve duplicate polite announcements between Pagination and the marketplace

### Description
[`components/Pagination.jsx`](components/Pagination.jsx) renders a visible count with `aria-live="polite"` `aria-atomic="true"`, while [`app/invest/page.js`](app/invest/page.js) also pushes "Showing N of M" into its own `sr-only` `role="status"` region via `getPaginationAnnouncement`. After "Load more", both regions announce the same change, producing a double announcement. This issue removes the redundancy so screen-reader users hear the update once.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Choose a single source for the count announcement: either keep the Pagination live region and stop pushing the duplicate string into the page status, or make Pagination's count non-live and let the page status own the announcement.
- Keep the visible count for sighted users in either case.
- Preserve focus restoration to the "Load more" button after each load.
- Document the chosen single-announcement pattern.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b a11y/invest-14-pagination-single-announce`
- Implement changes
  - **Write code in:** update [`components/Pagination.jsx`](components/Pagination.jsx) and/or [`app/invest/page.js`](app/invest/page.js).
  - **Write comprehensive tests in:** create [`components/Pagination.test.tsx`](components/Pagination.test.tsx) — assert exactly one live region announces the count change.
  - **Add documentation:** note the pattern in [`docs/accessibility.md`](docs/accessibility.md).
  - Add comments explaining the single-announcer decision.
  - Validate a11y with `jest-axe` on the paginated list.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: load-more, last page, and single-item list.
- Include the full `npm test` output.

### Example commit message
`fix: remove duplicate pagination live-region announcement`

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
title: "Add a stable key to InvoiceListSkeleton rows instead of the array index"
labels: type:refactor, area:loading-states, stack:nextjs, stack:react, stack:typescript, priority:low, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Replace index keys in the skeleton placeholder rows

### Description
[`components/InvoiceListSkeleton.jsx`](components/InvoiceListSkeleton.jsx) maps `Array.from({ length: rows })` and uses the array index `i` as the React `key`. While benign for a static skeleton, the project lints against array-index keys elsewhere and the pattern can cause subtle reconciliation issues if rows ever become dynamic. This issue switches to stable, descriptive keys.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Generate a stable key per row (e.g. a deterministic `skeleton-row-${n}` derived once) rather than the bare index, or use a keyed array built up front.
- Keep `aria-busy="true"`, the "Loading investable invoices" label, and the row placeholder structure identical.
- No visual change.
- Confirm the skeleton still mirrors the real card column layout.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b refactor/loading-states-15-skeleton-keys`
- Implement changes
  - **Write code in:** update [`components/InvoiceListSkeleton.jsx`](components/InvoiceListSkeleton.jsx).
  - **Write comprehensive tests in:** extend [`components/InvoiceListSkeleton.test.jsx`](components/InvoiceListSkeleton.test.jsx) — assert row count and loading semantics unchanged.
  - **Add documentation:** none beyond code comments.
  - Add a comment explaining the key strategy.
  - Validate a11y: `aria-busy` and label preserved.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: default rows, custom rows, `rows={0}`.
- Include the full `npm test` output.

### Example commit message
`refactor: use stable keys for invoicelistskeleton rows`

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
title: "Add a sortable, comparable amount and yield model to invoice fixtures"
labels: type:enhancement, area:invest, stack:nextjs, stack:react, stack:typescript, priority:medium, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Store numeric amount and yield alongside the display strings

### Description
The invoice fixtures in [`app/invest/lib.js`](app/invest/lib.js) carry `amount: "12,500"` and `yield: "8.2%"` as pre-formatted strings. Any future sort or filter (best yield, amount range — see the disabled controls in [`app/invest/page.js`](app/invest/page.js)) cannot compare these without re-parsing locale-formatted text. This issue adds machine-comparable numeric fields while keeping the display strings.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Extend each fixture with numeric `amountValue` (e.g. 12500) and `yieldValue` (e.g. 8.2) plus the existing display fields, and centralize a formatter for the display strings.
- Add a `lib/format/invoice.js` (or similar) with `formatAmount`/`formatYield` so the UI derives display from the numbers.
- Keep the public item contract documented in [`docs/api-integration.md`](docs/api-integration.md) backward compatible.
- No visual change to the current marketplace render.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b enhancement/invest-16-numeric-fixtures`
- Implement changes
  - **Write code in:** update [`app/invest/lib.js`](app/invest/lib.js); create a small format helper.
  - **Write comprehensive tests in:** create [`lib/format/invoice.test.tsx`](lib/format/invoice.test.tsx) — assert formatting and that numeric fields sort correctly.
  - **Add documentation:** update the contract in [`docs/api-integration.md`](docs/api-integration.md).
  - Add JSDoc on the formatters.
  - Validate: rendered strings are byte-identical to today.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: thousands separators, decimal yields, and zero values.
- Include the full `npm test` output.

### Example commit message
`feat: add numeric amount and yield fields to invoice fixtures`

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
title: "Add a loading and error skeleton to the home page API-status panel"
labels: type:enhancement, area:home, stack:nextjs, stack:react, stack:typescript, priority:low, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Render a structured health result instead of a bare status line

### Description
[`app/page.js`](app/page.js) shows the health result as a `Status:` line, a raw `message`, and a `<details>` `<pre>` of `health.details`. There is no visual treatment for the `degraded`/`unreachable` statuses returned by [`lib/api/health.js`](lib/api/health.js), and nothing distinguishes a healthy backend from a timeout beyond the text. This issue renders a clear, color-coded status card for each health state.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Map `getHealth`'s `connected`/`degraded`/`unreachable` statuses to distinct visual states (e.g. green/amber/red badges) with appropriate copy.
- Keep the raw payload behind the existing `<details>` disclosure.
- Maintain the disabled-while-loading button and the polite `role="status"` announcement.
- Source any new copy from [`app/copy/en.js`](app/copy/en.js) rather than inlining strings.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b enhancement/home-17-health-status-card`
- Implement changes
  - **Write code in:** update [`app/page.js`](app/page.js) and [`app/copy/en.js`](app/copy/en.js).
  - **Write comprehensive tests in:** extend [`app/page.test.tsx`](app/page.test.tsx) — assert each status renders its distinct state.
  - **Add documentation:** note the status states in [`README.md`](README.md).
  - Add comments on the status mapping.
  - Validate a11y: status changes announced; badges are not color-only (include text).
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: connected, degraded, unreachable, and details disclosure.
- Include the full `npm test` output.

### Example commit message
`feat: render a structured health status card on the home page`

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
title: "Show a connection error banner in WalletStatus for the ERROR and WRONG_NETWORK states"
labels: type:enhancement, area:wallet, stack:nextjs, stack:react, stack:typescript, priority:medium, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Surface wallet connection errors inline, not just via toast

### Description
[`components/WalletStatus.jsx`](components/WalletStatus.jsx) stores an `error` string for the `ERROR`/`WRONG_NETWORK` states and shows it as helper text, but the toast is the only prominent feedback and it auto-dismisses after a few seconds. Once it disappears, a user who looked away has no persistent indication of what went wrong. This issue adds an inline, persistent error affordance for failed connections.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Render a compact, persistent error indicator (reusing [`components/ErrorBanner.jsx`](components/ErrorBanner.jsx) or a small inline variant) while the wallet is in `ERROR`/`WRONG_NETWORK`.
- Clear the inline error on a successful reconnect or disconnect.
- Keep the existing toast and `sr-only` `role="status"` announcement; avoid double-announcing.
- Source copy from `copy.wallet` in [`app/copy/en.js`](app/copy/en.js).

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b enhancement/wallet-18-inline-connection-error`
- Implement changes
  - **Write code in:** update [`components/WalletStatus.jsx`](components/WalletStatus.jsx).
  - **Write comprehensive tests in:** extend [`components/WalletStatus.test.tsx`](components/WalletStatus.test.tsx) — assert the inline error appears for failed states and clears on recovery.
  - **Add documentation:** update [`WALLET_INTEGRATION_CONTRACT.md`](WALLET_INTEGRATION_CONTRACT.md).
  - Add comments on the error lifecycle.
  - Validate a11y: error is in the accessibility tree without redundant announcements.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: error then retry-success, wrong-network then switch, disconnect clears.
- Include the full `npm test` output.

### Example commit message
`feat: surface inline wallet connection errors in walletstatus`

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
title: "Add a copyable, full-address tooltip to the connected WalletStatus display"
labels: type:enhancement, area:wallet, stack:nextjs, stack:react, stack:typescript, priority:low, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Let users copy their full Stellar address from the wallet display

### Description
When connected, [`components/WalletStatus.jsx`](components/WalletStatus.jsx) shows only the truncated address (e.g. `GABC...XYZ123`) and a balance. There is no way to view or copy the full public key, which users need to receive funds or verify the account. This issue adds a copy-to-clipboard control with accessible feedback.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add a "Copy address" button next to the truncated address that copies the full public key via the Clipboard API, with a graceful fallback when unavailable.
- Announce success ("Address copied") through the existing toast/`role="status"` mechanism.
- Only show the control in the `CONNECTED` state; never expose secrets.
- Keep the truncated display and balance layout intact.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b enhancement/wallet-19-copy-address`
- Implement changes
  - **Write code in:** update [`components/WalletStatus.jsx`](components/WalletStatus.jsx).
  - **Write comprehensive tests in:** extend [`components/WalletStatus.test.tsx`](components/WalletStatus.test.tsx) — mock `navigator.clipboard`, assert copy and the announcement.
  - **Add documentation:** note the copy affordance in [`COMPONENTS.md`](COMPONENTS.md).
  - Add comments on the clipboard fallback.
  - Validate a11y: button has a clear name; success is announced.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: clipboard available/unavailable and rapid copies.
- Include the full `npm test` output.

### Example commit message
`feat: add copy-address control to the connected wallet display`

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
title: "Add an Open Graph image and per-page metadata for invest and invoices routes"
labels: type:enhancement, area:seo, stack:nextjs, stack:react, stack:typescript, priority:low, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Provide route-specific metadata and a shareable OG image

### Description
[`app/layout.js`](app/layout.js) defines a single global `metadata` title/description, but the Invest and Invoices routes inherit it verbatim and there is no Open Graph image, so shared links render generically. This issue adds per-route metadata and a generated OG image.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add route-level `metadata` (or `generateMetadata`) to the Invest and Invoices pages with distinct titles/descriptions.
- Add an `opengraph-image` (static or `app/opengraph-image.js`) reflecting the LiquiFact brand and dark theme.
- Keep the global defaults in `layout.js` as fallbacks.
- Ensure the App Router metadata API is used correctly for client vs server components.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b enhancement/seo-20-route-metadata-og`
- Implement changes
  - **Write code in:** update [`app/invest/page.js`](app/invest/page.js) and [`app/invoices/page.js`](app/invoices/page.js) (or add metadata via a server wrapper); add an OG image route.
  - **Write comprehensive tests in:** create [`app/metadata.test.tsx`](app/metadata.test.tsx) — assert each route exports distinct metadata.
  - **Add documentation:** note the metadata strategy in [`README.md`](README.md).
  - Add comments on client/server metadata constraints.
  - Validate: build emits the OG image and metadata tags.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: each route's title/description and OG image presence.
- Include the full `npm test` output and the build metadata summary.

### Example commit message
`feat: add per-route metadata and an open graph image`

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
title: "Add the missing dark-by-default color tokens and verify the @theme inline values"
labels: type:enhancement, area:theming, stack:nextjs, stack:react, stack:typescript, priority:low, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Complete the theming tokens and reconcile the documented hex values

### Description
[`app/globals.css`](app/globals.css) defines `--color-bg: #0f0f0f` commented as "slate-950" and `--color-primary: #06b6d4` commented "cyan-400", but Tailwind's slate-950 is `#020617` and cyan-400 is `#22d3ee` (`#06b6d4` is cyan-500) — the comments and values disagree. The `prefers-color-scheme: light` block is also empty. This issue corrects the tokens so they match the names and the README design tokens.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Fix the token values (or the comments) so each token's name, hex, and the README "Design Tokens" section agree.
- Either implement an intentional light-scheme behaviour or remove the empty media block and document that the app is hard-themed dark.
- Confirm `--color-foreground`/`--color-muted` meet WCAG AA contrast on `--color-bg`.
- No unintended visual regression on existing pages.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b enhancement/theming-21-color-tokens`
- Implement changes
  - **Write code in:** update [`app/globals.css`](app/globals.css).
  - **Write comprehensive tests in:** extend [`app/globals.theme-tokens.test.tsx`](app/globals.theme-tokens.test.tsx) and [`app/globals.contrast.test.tsx`](app/globals.contrast.test.tsx).
  - **Add documentation:** reconcile the README "Design Tokens" table.
  - Add comments mapping each token to its Tailwind name and hex.
  - Validate a11y: contrast ratios for primary and muted text.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: each token resolves; contrast holds.
- Include the full `npm test` output and a contrast table.

### Example commit message
`fix: correct theming color tokens to match their names and docs`

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
title: "Add a TypeScript typecheck step to CI and run the e2e suite"
labels: type:test, area:ci, stack:nextjs, stack:react, stack:typescript, priority:medium, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Strengthen CI with typechecking and end-to-end coverage

### Description
[`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs lint, build, and `npm test --silent` (mislabeled "Test Accessibility"), but never runs the Playwright e2e suite that exists ([`tests/toast.spec.jsx`](tests/toast.spec.jsx), [`tests/invest.spec.jsx`](tests/invest.spec.jsx)) and never typechecks despite a [`tsconfig.json`](tsconfig.json). Regressions in e2e flows or types can land unnoticed. This issue adds a typecheck step and an e2e job.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add a `typecheck` script (`tsc --noEmit`) to [`package.json`](package.json) and a CI step that runs it.
- Add a CI job (or step) that installs Playwright browsers and runs `npm run test:e2e`, uploading the report on failure.
- Rename the misleading "Test Accessibility" step to reflect that it runs the full Jest suite.
- Keep the existing lint/build/test steps and the Node 20 + npm cache setup.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b test/ci-22-typecheck-and-e2e`
- Implement changes
  - **Write code in:** update [`.github/workflows/ci.yml`](.github/workflows/ci.yml) and [`package.json`](package.json).
  - **Write comprehensive tests in:** validate via a CI run; ensure `tsc --noEmit` passes on the current tree.
  - **Add documentation:** update the scripts/CI section in [`README.md`](README.md) and [`TESTING.md`](TESTING.md).
  - Add comments in the workflow explaining each job.
  - Validate: e2e job caches/install Playwright correctly.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, `npm run build`, and `npm run test:e2e` locally.
- Cover edge cases: a deliberate type error fails CI; e2e runs headless.
- Include the CI run link/output.

### Example commit message
`ci: add typecheck step and run the playwright e2e suite`

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
title: "Add a CI coverage gate enforcing the 95 percent threshold"
labels: type:test, area:ci, stack:nextjs, stack:react, stack:typescript, priority:medium, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Enforce the campaign's 95 percent coverage target in CI

### Description
Every campaign issue asks for "Minimum 95 percent test coverage," but [`jest.config.js`](jest.config.js) sets no `coverageThreshold` and [`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs `npm test` without `--coverage`, so the bar is never enforced. This issue wires a coverage gate so PRs that drop below the threshold fail.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add a `coverageThreshold` (global, e.g. 95% statements/branches/functions/lines, tuned to the current achievable baseline) in [`jest.config.js`](jest.config.js).
- Add a `test:coverage` script and a CI step running `jest --coverage` that fails on threshold breach.
- Upload or summarize the coverage report as a CI artifact/step summary.
- Document how contributors run coverage locally in [`TESTING.md`](TESTING.md).

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b test/ci-23-coverage-gate`
- Implement changes
  - **Write code in:** update [`jest.config.js`](jest.config.js), [`package.json`](package.json), and [`.github/workflows/ci.yml`](.github/workflows/ci.yml).
  - **Write comprehensive tests in:** validate via a CI run; ensure existing tests meet the chosen baseline.
  - **Add documentation:** add a coverage section to [`TESTING.md`](TESTING.md).
  - Add comments on the threshold rationale.
  - Validate: an artificially under-covered module fails the gate locally.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, `npm run build`, and `jest --coverage` locally.
- Cover edge cases: passing baseline and an intentional drop below threshold.
- Include the coverage summary output.

### Example commit message
`ci: enforce a 95 percent jest coverage threshold`

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
title: "Add Prettier and a CI format-check to standardize code style"
labels: type:refactor, area:tooling, stack:nextjs, stack:react, stack:typescript, priority:low, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Introduce Prettier with a CI format gate

### Description
The codebase mixes quote styles and indentation — e.g. [`app/invest/page.js`](app/invest/page.js) has misaligned `<Button>` blocks and [`app/page.js`](app/page.js) uses single and double quotes inconsistently — because there is no formatter. ESLint runs in CI but does not format. This issue adds Prettier and a CI check so style stays consistent.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add Prettier as a dev dependency with a `.prettierrc` and `.prettierignore` aligned to the existing Next/ESLint conventions.
- Add `format` and `format:check` scripts to [`package.json`](package.json) and a CI step running `format:check`.
- Run a one-time format pass (kept as a separate, clearly-labeled commit) so the gate passes.
- Ensure Prettier and `eslint-config-next` do not conflict.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b refactor/tooling-24-prettier`
- Implement changes
  - **Write code in:** add config files; update [`package.json`](package.json) and [`.github/workflows/ci.yml`](.github/workflows/ci.yml).
  - **Write comprehensive tests in:** validate via `format:check` in CI.
  - **Add documentation:** add a formatting section to [`CONTRIBUTING.md`](CONTRIBUTING.md).
  - Add comments in config where conventions deviate from defaults.
  - Validate: `format:check` passes on the formatted tree.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, `npm run build`, and `npm run format:check`.
- Cover edge cases: an unformatted file fails the check.
- Include the CI run output.

### Example commit message
`chore: add prettier and a ci format-check`

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
title: "Add unit tests for the WalletProvider snapshot sanitization and rehydration"
labels: type:test, area:wallet, stack:nextjs, stack:react, stack:typescript, priority:high, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Test the localStorage sanitize/rehydrate logic in WalletProvider

### Description
[`components/WalletProvider.jsx`](components/WalletProvider.jsx) exports security-critical helpers — `sanitizeSnapshot`, `readStoredSnapshot`, `writeStoredSnapshot`, `clearStoredSnapshot`, and `truncateAddress` — that reject corrupt payloads, secret-key-shaped addresses, and wrong versions/networks. These guards must not regress. This issue adds focused tests for the persistence layer.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Test `sanitizeSnapshot` rejects: wrong `version`, non-persistable `state`, empty/over-long `address`, invalid `network`, and secret-key-shaped addresses (`S...` length ≥ 56).
- Test `truncateAddress` for short, long, and non-string inputs.
- Test `readStoredSnapshot`/`writeStoredSnapshot`/`clearStoredSnapshot` against a mocked `localStorage`, including corrupt JSON and SSR (no `window`).
- Test the provider rehydrates a valid snapshot once on mount and that `disconnect` clears storage.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b test/wallet-25-snapshot-sanitization`
- Implement changes
  - **Write code in:** no source change unless a bug is found in [`components/WalletProvider.jsx`](components/WalletProvider.jsx).
  - **Write comprehensive tests in:** extend [`components/WalletProvider.test.tsx`](components/WalletProvider.test.tsx).
  - **Add documentation:** note the persistence guarantees in [`WALLET_INTEGRATION_CONTRACT.md`](WALLET_INTEGRATION_CONTRACT.md).
  - Add comments on the secret-key rejection rule.
  - Validate security: confirm no secret-shaped value is ever rehydrated.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: corrupt storage, SSR, wrong version/network, and secret-shaped address.
- Include the full `npm test` output with WalletProvider coverage.

### Example commit message
`test: cover walletprovider snapshot sanitization and rehydration`

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
title: "Add unit tests for the getHealth timeout, degraded, and malformed-JSON paths"
labels: type:test, area:home, stack:nextjs, stack:react, stack:typescript, priority:medium, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Cover every branch of the health-check helper

### Description
[`lib/api/health.js`](lib/api/health.js) normalizes the backend `/health` response into `connected`/`degraded`/`unreachable` with an `AbortController` timeout and a JSON-then-text payload fallback. [`lib/api/health.test.tsx`](lib/api/health.test.tsx) exists but the timeout abort path, the non-ok "degraded" branch, and the JSON-parse-fails-then-text fallback deserve explicit coverage. This issue locks in all branches.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Test the `connected` branch (ok + JSON) and the `degraded` branch (non-ok + payload).
- Test the JSON-parse failure falling back to `res.text()`, and text-parse failure → `null`.
- Test the `AbortError` timeout path returns `unreachable` "Health check timed out" using fake timers.
- Test a generic network rejection returns `unreachable` with the error message and that the timeout is always cleared.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b test/home-26-health-branches`
- Implement changes
  - **Write code in:** no source change unless a bug is found in [`lib/api/health.js`](lib/api/health.js).
  - **Write comprehensive tests in:** extend [`lib/api/health.test.tsx`](lib/api/health.test.tsx).
  - **Add documentation:** note the health contract in [`docs/api-integration.md`](docs/api-integration.md).
  - Add comments on the timer mocking.
  - Validate: every return shape is asserted.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: ok JSON, non-ok, malformed JSON, timeout, network error.
- Include the full `npm test` output with health coverage.

### Example commit message
`test: cover gethealth timeout, degraded, and fallback paths`

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
title: "Add unit tests for the Pagination load-more visibility and count rendering"
labels: type:test, area:invest, stack:nextjs, stack:react, stack:typescript, priority:low, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Test the Pagination component rendering contract

### Description
[`components/Pagination.jsx`](components/Pagination.jsx) hides the "Load more" button once `shown >= total`, pluralizes "invoice(s)", forwards a ref for focus, and calls `onLoadMore` on click — but it has no dedicated test file. This issue adds coverage so the control's visibility and count logic stay correct.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Assert the button renders when `shown < total` and is absent when `shown === total`.
- Assert the count text shows "Showing N of M invoice(s)" with correct singular/plural for `total === 1`.
- Assert `onLoadMore` fires on click and the forwarded ref points at the button.
- Assert the polite count region exists (coordinate with the duplicate-announcement fix).

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b test/invest-27-pagination-tests`
- Implement changes
  - **Write code in:** no source change unless a bug is found in [`components/Pagination.jsx`](components/Pagination.jsx).
  - **Write comprehensive tests in:** create [`components/Pagination.test.tsx`](components/Pagination.test.tsx).
  - **Add documentation:** none beyond test comments.
  - Add comments on the ref-forwarding assertion.
  - Validate a11y: the load-more button has a clear accessible name.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: `total === 1`, exact boundary, and all-shown.
- Include the full `npm test` output.

### Example commit message
`test: cover pagination load-more visibility and count`

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
title: "Add unit tests for the WalletStatusLazy placeholder and dynamic mount"
labels: type:test, area:wallet, stack:nextjs, stack:react, stack:typescript, priority:low, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Test the lazy wallet placeholder swaps to the real component

### Description
[`components/WalletStatusLazy.jsx`](components/WalletStatusLazy.jsx) renders an `aria-hidden` `data-testid="wallet-status-placeholder"` while the `WalletStatus` chunk loads via `next/dynamic({ ssr: false })`. The existing [`components/WalletStatus.lazy.test.tsx`](components/WalletStatus.lazy.test.tsx) should fully assert the placeholder-then-component swap and the no-CLS dimensions. This issue ensures the lazy boundary is covered.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Assert the placeholder renders first with the documented `h-12 w-80` footprint and `aria-hidden="true"`.
- Assert the real `WalletStatus` (its `role="status"` live region) mounts after the dynamic import resolves.
- Assert no hydration warnings are logged during the swap.
- Keep the test resilient to `WalletStatus` internals by querying roles/test ids.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b test/wallet-28-lazy-placeholder`
- Implement changes
  - **Write code in:** no source change unless a bug is found in [`components/WalletStatusLazy.jsx`](components/WalletStatusLazy.jsx).
  - **Write comprehensive tests in:** extend [`components/WalletStatus.lazy.test.tsx`](components/WalletStatus.lazy.test.tsx).
  - **Add documentation:** note the lazy boundary in [`COMPONENTS.md`](COMPONENTS.md).
  - Add comments on resolving the dynamic import in tests.
  - Validate a11y: placeholder is hidden; real component exposes the status region.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: placeholder render, post-resolve mount, no console warnings.
- Include the full `npm test` output.

### Example commit message
`test: cover walletstatuslazy placeholder and dynamic mount`

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
title: "Add unit tests for getInvoiceById and the loadMockInvoices test hook"
labels: type:test, area:invest, stack:nextjs, stack:react, stack:typescript, priority:low, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Test the invoice fixture lookup and the test-override loader

### Description
[`app/invest/lib.js`](app/invest/lib.js) exports `getInvoiceById(id)` (used by the detail route) and `loadMockInvoices()` which short-circuits to `window.__TEST_MOCK_INVOICES__` when present. Neither has direct unit coverage, so a regression in id resolution or the test hook would only surface indirectly. This issue adds focused tests for the data layer.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Test `getInvoiceById` returns the matching fixture for a known id and `undefined` for an unknown id.
- Test `loadMockInvoices` resolves the override array when `window.__TEST_MOCK_INVOICES__` is set, and the default fixtures otherwise.
- Test the resolved item shape matches the documented `{ id, issuer, amount, currency, dueDate, yield, status }` contract.
- Keep the tests environment-agnostic (guard `window`).

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b test/invest-29-lib-data-layer`
- Implement changes
  - **Write code in:** no source change unless a bug is found in [`app/invest/lib.js`](app/invest/lib.js).
  - **Write comprehensive tests in:** create [`app/invest/lib.test.tsx`](app/invest/lib.test.tsx).
  - **Add documentation:** note the test hook in [`docs/api-integration.md`](docs/api-integration.md).
  - Add comments on the window override.
  - Validate: item shape assertions cover all contract keys.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: known id, unknown id, override set/unset.
- Include the full `npm test` output.

### Example commit message
`test: cover getinvoicebyid and the loadmockinvoices test hook`

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
title: "Add an end-to-end test for the invoice detail funding flow"
labels: type:test, area:invest, stack:nextjs, stack:react, stack:typescript, priority:medium, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Cover the marketplace-to-detail-to-fund journey with Playwright

### Description
There are e2e specs for toasts and the marketplace ([`tests/toast.spec.jsx`](tests/toast.spec.jsx), [`tests/invest.spec.jsx`](tests/invest.spec.jsx)) but none for the invoice detail route at [`app/invest/[id]/page.js`](app/invest/[id]/page.js), including the "Fund this invoice" gating against wallet state and the not-found path. This issue adds an end-to-end test for that journey.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Drive: load `/invest`, open a detail page, and assert the summary `<dl>` renders the invoice fields.
- Assert the Fund button prompts wallet connection when disconnected and is disabled while connecting (use the `window.__TEST_MOCK_INVOICES__` hook for deterministic data).
- Assert navigating to an unknown id renders the not-found state ([`app/invest/[id]/not-found.js`](app/invest/[id]/not-found.js)).
- Keep the spec deterministic (no reliance on random wallet outcomes; stub where needed).

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b test/invest-30-detail-e2e`
- Implement changes
  - **Write code in:** no source change expected.
  - **Write comprehensive tests in:** create [`tests/invest-detail.spec.jsx`](tests/invest-detail.spec.jsx).
  - **Add documentation:** note the e2e flow in [`TESTING.md`](TESTING.md).
  - Add comments on the deterministic data hook.
  - Validate a11y: assert the detail headings and Fund button name.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, `npm run build`, and `npm run test:e2e`.
- Cover edge cases: known invoice, unknown id, disconnected fund click.
- Include the Playwright report summary.

### Example commit message
`test: add e2e coverage for the invoice detail funding flow`

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
title: "Add a CodeQL static analysis workflow for the frontend"
labels: type:security, area:ci, stack:nextjs, stack:react, stack:typescript, priority:medium, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Add JavaScript/TypeScript static analysis with CodeQL

### Description
CI ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) runs lint/build/test, but there is no static security analysis scanning for injection, unsafe DOM usage, or tainted-data flows — relevant given the app renders backend `/health` payloads and handles file uploads. This issue adds a CodeQL workflow to catch security issues automatically.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add `.github/workflows/codeql.yml` scanning the `javascript-typescript` language on push/PR to `main` and a weekly schedule.
- Use the default security-and-quality query suite; upload results to the Security tab.
- Keep runtime reasonable (autobuild or no-build mode appropriate for a Next.js app).
- Document how to triage CodeQL alerts in the campaign workflow.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b security/ci-31-codeql`
- Implement changes
  - **Write code in:** create [`.github/workflows/codeql.yml`](.github/workflows/codeql.yml).
  - **Write comprehensive tests in:** validate via a CI run that the analysis completes.
  - **Add documentation:** add a "Static analysis" subsection to [`README.md`](README.md).
  - Add comments in the workflow on the query suite choice.
  - Validate security: confirm results upload and the job is required on PRs.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build` locally; rely on CI for CodeQL.
- Cover edge cases: clean scan passes; a planted unsafe pattern is flagged.
- Include the CI run link/output.

### Example commit message
`ci: add codeql static analysis workflow`

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
title: "Add a magic-number check that PDF uploads are real PDFs before submission"
labels: type:security, area:upload, stack:nextjs, stack:react, stack:typescript, priority:medium, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Verify the %PDF magic bytes, not just the reported MIME type

### Description
[`components/UploadZone.jsx`](components/UploadZone.jsx) validates uploads by checking `f.type === 'application/pdf'` and the size, but the browser-reported `type` is trivially spoofable (it derives from extension/OS). A file renamed to `.pdf` with arbitrary content passes today. This issue reads the file header and confirms the `%PDF-` signature before allowing submission.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Before enabling submit, read the first bytes of the selected file (e.g. via `file.slice(0, 5).arrayBuffer()`) and confirm they equal `%PDF-`.
- Reject with the existing `role="alert"` error pattern and clear, non-technical copy when the signature is missing.
- Keep the MIME and size checks as a fast first pass; the magic-number check is the authoritative gate.
- Do not block the UI thread; perform the read asynchronously and handle read errors.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b security/upload-32-pdf-magic-bytes`
- Implement changes
  - **Write code in:** update [`components/UploadZone.jsx`](components/UploadZone.jsx); optionally a `lib/validation/pdf.js` helper.
  - **Write comprehensive tests in:** extend [`components/UploadZone.test.jsx`](components/UploadZone.test.jsx) and/or create [`lib/validation/pdf.test.tsx`](lib/validation/pdf.test.tsx) — assert real-PDF passes and spoofed file fails.
  - **Add documentation:** note the validation in [`README.md`](README.md).
  - Add JSDoc on the signature check.
  - Validate security: a non-PDF with a `.pdf` name and `application/pdf` type is rejected.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, `npm run build`, and `npm run test:e2e`.
- Cover edge cases: valid PDF, spoofed type, empty file, and read failure.
- Include the full `npm test` output and a short threat note.

### Example commit message
`fix: validate pdf magic bytes before allowing upload submission`

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
title: "Add subresource and external-origin safety to wallet install links"
labels: type:security, area:wallet, stack:nextjs, stack:react, stack:typescript, priority:low, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Centralize and validate all external destinations used by the wallet UI

### Description
The wallet UI navigates to external destinations (e.g. the Stellar wallets page in [`components/WalletStatus.jsx`](components/WalletStatus.jsx) and `helperNoWallet` guidance). As the Freighter integration and footer links grow, external URLs risk being scattered and unvalidated. This issue centralizes the allowed external destinations into a single validated registry.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Create a `lib/links.js` registry of allowed external URLs (wallet install, docs, status, Discord), each asserted to be an `https:` origin at module load.
- Update [`components/WalletStatus.jsx`](components/WalletStatus.jsx) and any external anchors to read from the registry rather than inline string literals.
- Ensure every external `window.open`/anchor uses `noopener,noreferrer` (coordinate with existing external-link work, do not duplicate it).
- Reject/throw on a non-https entry so a typo cannot ship an insecure link.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b security/wallet-33-external-link-registry`
- Implement changes
  - **Write code in:** create [`lib/links.js`](lib/links.js); update [`components/WalletStatus.jsx`](components/WalletStatus.jsx).
  - **Write comprehensive tests in:** create [`lib/links.test.tsx`](lib/links.test.tsx) — assert all entries are https and a non-https entry is rejected.
  - **Add documentation:** note the registry in [`README.md`](README.md).
  - Add JSDoc on the registry shape.
  - Validate security: no inline external URL literals remain in the wallet UI.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: valid https entry, rejected non-https entry, and consumer usage.
- Include the full `npm test` output.

### Example commit message
`fix: centralize and validate external wallet links`

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
title: "Add a Permissions-Policy and Referrer-Policy via next.config headers"
labels: type:security, area:headers, stack:nextjs, stack:react, stack:typescript, priority:medium, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Restrict browser features and referrer leakage at the framework level

### Description
[`next.config.mjs`](next.config.mjs) is empty (`/* config options here */`), so the app sends no `Permissions-Policy` or `Referrer-Policy` headers. The app has no need for camera, microphone, or geolocation, and external wallet links should not leak full referrers. This issue adds a focused `headers()` config restricting unused browser features and tightening referrer behaviour.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add a `headers()` entry in [`next.config.mjs`](next.config.mjs) sending `Permissions-Policy` denying unused features (camera, microphone, geolocation, payment as appropriate) and `Referrer-Policy: strict-origin-when-cross-origin`.
- Apply to all routes; do not break the existing pages or the lazy wallet chunk.
- Coordinate with (do not duplicate) any existing CSP/security-header work; this issue scopes Permissions-Policy and Referrer-Policy specifically.
- Document the chosen policy and rationale.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b security/headers-34-permissions-referrer`
- Implement changes
  - **Write code in:** update [`next.config.mjs`](next.config.mjs).
  - **Write comprehensive tests in:** create [`next.config.headers.test.tsx`](next.config.headers.test.tsx) — assert the `headers()` output includes the expected directives, or document a verified header dump.
  - **Add documentation:** add a "Security headers" subsection to [`README.md`](README.md).
  - Add comments explaining each directive.
  - Validate security: confirm headers present on a built response.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: each route receives the headers; no feature the app needs is blocked.
- Include the full `npm test` output and a header dump.

### Example commit message
`feat: add permissions-policy and referrer-policy headers`

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
title: "Document the dual mock-data layer and the API migration plan in api-integration.md"
labels: type:docs, area:api-integration, stack:nextjs, stack:react, stack:typescript, priority:medium, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Document how mock data is wired and how it will be replaced

### Description
[`docs/api-integration.md`](docs/api-integration.md) exists, but the current mock data flow is non-obvious: [`app/invest/lib.js`](app/invest/lib.js) is the fixture source with a `window.__TEST_MOCK_INVOICES__` test hook, [`lib/api/health.js`](lib/api/health.js) is the only real fetch helper, and [`components/UploadZone.jsx`](components/UploadZone.jsx) posts to `${API_URL}/invoices`. This issue documents the data layer and the path to a real backend so contributors stop duplicating fixtures.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Document the invoice item contract `{ id, issuer, amount, currency, dueDate, yield, status }` and where it is produced/consumed.
- Document the `window.__TEST_MOCK_INVOICES__` test hook and the `NEXT_PUBLIC_API_URL` env var.
- Describe the migration plan: which mock functions become real `lib/api` clients and the expected response shapes for `/invoices` and `/health`.
- Cross-reference the relevant source files so the doc stays discoverable.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b docs/api-integration-35-data-layer`
- Implement changes
  - **Write code in:** no source change; documentation only.
  - **Write comprehensive tests in:** add a doc-link/lint check if the repo has one, otherwise verify links manually.
  - **Add documentation:** update [`docs/api-integration.md`](docs/api-integration.md) and cross-link from [`README.md`](README.md).
  - Add example request/response snippets.
  - Validate: every referenced file path exists.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: all file references resolve; the contract table is complete.
- Include the rendered doc diff.

### Example commit message
`docs: document the mock data layer and api migration plan`

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
title: "Document the known component duplication and import hazards in COMPONENTS.md"
labels: type:docs, area:components, stack:nextjs, stack:react, stack:typescript, priority:low, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Catalog the wallet/provider duplication and broken imports for contributors

### Description
[`COMPONENTS.md`](COMPONENTS.md) describes the UI library but does not warn contributors about the live hazards: two `useWallet()` providers ([`components/WalletProvider.jsx`](components/WalletProvider.jsx) and [`components/WalletContext.jsx`](components/WalletContext.jsx)), `WalletStatus` not importing `Button`, and pages referencing unimported symbols. This issue documents the current state so contributors do not unknowingly build on broken code.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add a "Known issues / migration in progress" section enumerating the duplicated wallet providers and the conflicting hook shapes.
- Document which provider is canonical (link the consolidation issue) and the correct `useWallet()` return shape.
- Note the components that need fixing (WalletStatus Button import, invest page imports) with file links, marking them as tracked.
- Keep existing component descriptions accurate; correct any that no longer match the source.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b docs/components-36-known-hazards`
- Implement changes
  - **Write code in:** no source change; documentation only.
  - **Write comprehensive tests in:** none beyond verifying file links resolve.
  - **Add documentation:** update [`COMPONENTS.md`](COMPONENTS.md).
  - Add a short status table.
  - Validate: every linked path exists.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: links resolve; descriptions match source.
- Include the rendered doc diff.

### Example commit message
`docs: catalog wallet provider duplication and import hazards`

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
title: "Add a sitemap and robots route for the public marketing pages"
labels: type:enhancement, area:seo, stack:nextjs, stack:react, stack:typescript, priority:low, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Generate sitemap.xml and robots.txt via the App Router metadata files

### Description
The app has public routes (`/`, `/invoices`, `/invest`) but no `app/sitemap.js` or `app/robots.js`, so search engines have no canonical crawl map and no explicit crawl policy. This issue adds the App Router metadata files to expose a sitemap and robots policy.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add `app/sitemap.js` listing the public routes with sensible `changeFrequency`/`priority`.
- Add `app/robots.js` allowing indexing of public pages and pointing at the sitemap; exclude any non-public/preview routes.
- Use a base URL from `process.env` (e.g. `NEXT_PUBLIC_SITE_URL`) with a sensible default and document it in [`.env.local.example`](.env.local.example).
- Keep dynamic detail routes out of the static sitemap until the API exists (or generate them later).

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b enhancement/seo-37-sitemap-robots`
- Implement changes
  - **Write code in:** create [`app/sitemap.js`](app/sitemap.js) and [`app/robots.js`](app/robots.js); update [`.env.local.example`](.env.local.example).
  - **Write comprehensive tests in:** create [`app/sitemap.test.tsx`](app/sitemap.test.tsx) — assert the public routes are listed and robots references the sitemap.
  - **Add documentation:** note SEO files in [`README.md`](README.md).
  - Add comments on the base-URL env var.
  - Validate: build emits sitemap.xml and robots.txt.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: each public route present; non-public routes excluded.
- Include the full `npm test` output and the generated file paths.

### Example commit message
`feat: add sitemap and robots routes for public pages`

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
title: "Memoize the InvestMarketplace filtered/visible invoice derivation"
labels: type:performance, area:invest, stack:nextjs, stack:react, stack:typescript, priority:low, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Avoid re-deriving the visible invoice list on every render

### Description
`InvestMarketplace` in [`app/invest/page.js`](app/invest/page.js) recomputes `visibleInvoices` (and, once fixed, the issuer-filtered list) on every render via inline `Array.slice`/filtering. As filtering and pagination compose, this recomputation runs even when unrelated state (e.g. `statusMessage`) changes. This issue memoizes the derivation so it only recomputes when its inputs change.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Wrap the filter + slice pipeline in `useMemo` keyed on `invoices`, `debouncedQuery`, and `visibleCount`.
- Keep the announcement and pagination counts consistent with the memoized result.
- No behaviour change; purely a render-efficiency improvement.
- Verify no stale-closure bugs in the load-more focus handler.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b performance/invest-38-memoize-derivation`
- Implement changes
  - **Write code in:** update [`app/invest/page.js`](app/invest/page.js).
  - **Write comprehensive tests in:** extend [`app/invest/page.test.jsx`](app/invest/page.test.jsx) — assert filtered/paginated output is correct across state changes.
  - **Add documentation:** note the memoization in code comments.
  - Add comments on the memo dependency list.
  - Validate: output identical to the non-memoized version.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: filter change, load-more, and unrelated state updates.
- Include the full `npm test` output.

### Example commit message
`perf: memoize the invest marketplace visible-invoice derivation`

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
title: "Debounce the InvoiceSearch input to avoid per-keystroke parent re-renders"
labels: type:performance, area:invest, stack:nextjs, stack:react, stack:typescript, priority:low, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Wire the unused debouncedQuery so filtering does not run on every keystroke

### Description
[`app/invest/page.js`](app/invest/page.js) keeps both `searchQuery` and `debouncedQuery` state, but `debouncedQuery` is never set or used and [`components/InvoiceSearch.jsx`](components/InvoiceSearch.jsx) calls `onChange` on every keystroke. Filtering on each character (once the search is wired) is wasteful for larger lists. This issue adds a debounce so filtering runs on settled input.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add a debounce (e.g. 200ms) updating `debouncedQuery` from `searchQuery`, cancelling the timer on rapid input and on unmount.
- Drive the filtering and the announcement from `debouncedQuery`, not the raw input.
- Keep the input fully controlled and responsive (the text field updates instantly; only filtering is debounced).
- Coordinate with the issue that repairs the broken filter state so this builds on a compiling page.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b performance/invest-39-debounce-search`
- Implement changes
  - **Write code in:** update [`app/invest/page.js`](app/invest/page.js).
  - **Write comprehensive tests in:** extend [`app/invest/page.test.jsx`](app/invest/page.test.jsx) using fake timers — assert filtering waits for the debounce and cleans up.
  - **Add documentation:** note the debounce in [`README.md`](README.md).
  - Add comments on the timer cleanup.
  - Validate a11y: announcement reflects the debounced result.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: rapid typing, clear, and unmount mid-debounce.
- Include the full `npm test` output.

### Example commit message
`perf: debounce invoice search filtering via debouncedquery`

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
title: "Memoize the ToastProvider context value and split it into a stable actions object"
labels: type:performance, area:toast, stack:nextjs, stack:react, stack:typescript, priority:low, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN
assignees: ''
---

## Keep toast consumers from re-rendering on unrelated toast changes

### Description
[`components/ToastProvider.jsx`](components/ToastProvider.jsx) already memoizes its `value`, but that value only exposes the `success`/`error`/`info` action functions while the toast list lives in local state — good. However, the `addToast` callback and the effect that wires timers re-run on every `toasts` change, and consumers that only need to *trigger* toasts have no separation from the rendering of the toast stack. This issue verifies and tightens the provider so triggering a toast does not cause action-only consumers to re-render.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Confirm the exposed `value` (the actions) is referentially stable across toast list changes; if not, restructure so action identity does not change when `toasts` changes.
- Keep `AUTO_DISMISS_MS`, pause/resume on hover, manual close, and the `role="status"`/`aria-live` live region intact.
- Avoid timer leaks; the cleanup must remain correct after refactor.
- Add a render-count assertion proving an action-only consumer does not re-render when a toast appears/dismisses.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b performance/toast-40-stable-actions`
- Implement changes
  - **Write code in:** update [`components/ToastProvider.jsx`](components/ToastProvider.jsx).
  - **Write comprehensive tests in:** create [`components/ToastProvider.perf.test.tsx`](components/ToastProvider.perf.test.tsx) using a render counter and fake timers.
  - **Add documentation:** note the context design in [`COMPONENTS.md`](COMPONENTS.md).
  - Add comments on the stable-identity reasoning.
  - Validate a11y: live region and dismissal behaviour unchanged.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: action-only consumer render count, auto-dismiss, and hover pause.
- Include the full `npm test` output.

### Example commit message
`perf: stabilize toastprovider action identity to cut re-renders`

### Guidelines
- **Minimum 95 percent test coverage** for impacted modules.
- Clear, reviewer-focused documentation.
- **Timeframe: 96 hours.**

### Community & contribution rewards
- 💬 **Join the Liquifact community on Discord for questions, reviews, and faster merges:** https://discord.gg/JrGPH4V3
- ⭐ This is a **GrantFox OSS / Official Campaign** task and **may be rewarded**. When your PR is merged you'll be prompted to rate the project — if this issue and the maintainers helped you ship, we'd be grateful for a **5-star rating**. Clear questions in Discord and tidy, well-tested PRs are the fastest path to a merge and a reward.