---
type: Feature
title: "Add a My Fundings history view backed by a persisted local store"
labels: type:feature, area:portfolio, stack:nextjs, stack:react, stack:typescript, priority:medium, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Give investors a persisted history of their fundings

### Description
Once a user funds an invoice there is nowhere to see what they've funded — the action is fire-and-forget. This issue adds a `My Fundings` page that lists prior funding actions from a small persisted local store, sortable by date and amount, so users have a durable record until a real backend exists.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add a typed `lib/fundingsStore.ts` (namespaced `localStorage`, SSR-guarded, try/catch with empty-array fallback) exposing `listFundings`/`recordFunding`.
- Add an `app/fundings/page.js` (or the project's route convention) rendering the list with a client sort control (date, amount) and an empty state.
- Record a funding entry when the fund action completes, reusing the existing wallet/toast flow.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/portfolio-01-my-fundings`
- Implement changes
  - **Write code in:** create `lib/fundingsStore.ts` and the fundings route; wire the record call into the existing fund handler.
  - **Write comprehensive tests in:** store round-trip, corrupt JSON, SSR no-op; page empty state and sort.
  - **Add documentation:** note the storage key/shape in `docs/`.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm run format:check`, `npm test`, and `npm run build`.
- Cover edge cases: empty store, corrupt value, sort stability.
- Include the full `npm test` output in the PR description.

### Example commit message
`feat(portfolio): add persisted My Fundings history view`

### Guidelines
- **Minimum 95 percent test coverage** for impacted modules.
- Clear, reviewer-focused documentation.
- **Timeframe: 96 hours.**

### Community & contribution rewards
- 💬 **Join the Liquifact community on Discord:** https://discord.gg/JrGPH4V3
- ⭐ This is a **GrantFox OSS / Official Campaign** task and **may be rewarded**. When your PR is merged you'll be prompted to rate the project — a **5-star rating** is much appreciated.
++++++
---
type: Feature
title: "Announce marketplace filter result counts through an aria-live region"
labels: type:a11y, area:marketplace, stack:nextjs, stack:react, priority:high, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Announce filtered result counts to assistive technology

### Description
When a user changes the marketplace search or filters, the visible result count updates silently, so screen-reader users get no feedback. This issue adds a polite `aria-live` region announcing the new count.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add a visually-styled-but-SR-friendly live region (e.g. `role="status"` / `aria-live="polite"`) to the marketplace results area that updates with the filtered count.
- Debounce announcements so rapid typing does not spam the SR queue; announce the final count.
- Do not change the filtering logic itself.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b a11y/marketplace-01-live-count`
- Implement changes
  - **Write code in:** the marketplace results component.
  - **Write comprehensive tests in:** assert the live region text updates on filter change (React Testing Library).
- Test and commit

### Test and commit
- Run `npm run lint`, `npm run format:check`, `npm test`, and `npm run build`.
- Cover edge cases: zero results, single result, rapid successive changes.
- Include the full `npm test` output in the PR description.

### Example commit message
`a11y(marketplace): announce filtered result counts`

### Guidelines
- **Minimum 95 percent test coverage** for impacted modules.
- Clear, reviewer-focused notes on the a11y behaviour.
- **Timeframe: 96 hours.**

### Community & contribution rewards
- 💬 **Join the Liquifact community on Discord:** https://discord.gg/JrGPH4V3
- ⭐ This is a **GrantFox OSS / Official Campaign** task and **may be rewarded**. When your PR is merged you'll be prompted to rate the project — a **5-star rating** is much appreciated.
++++++
---
type: Feature
title: "Add a copy-to-clipboard control for the connected wallet address with a toast"
labels: type:feature, area:wallet, stack:nextjs, stack:react, priority:medium, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Let users copy their connected wallet address

### Description
The connected wallet address is displayed truncated but cannot be copied. This issue adds a copy button next to the address that writes the full address to the clipboard and confirms via the existing toast system, with a textarea fallback for non-secure contexts.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add a copy control to the wallet status UI; copy the full (untruncated) address.
- Use the Clipboard API with a documented fallback; show success/error toasts using the existing provider.
- Ensure the control has an accessible label and keyboard operability.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/wallet-01-copy-address`
- Implement changes
  - **Write code in:** the wallet status component; reuse any existing clipboard helper.
  - **Write comprehensive tests in:** success path, clipboard-throws fallback, accessible name.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm run format:check`, `npm test`, and `npm run build`.
- Cover edge cases: clipboard unavailable, write rejected.
- Include the full `npm test` output in the PR description.

### Example commit message
`feat(wallet): add copy-to-clipboard for the connected address`

### Guidelines
- **Minimum 95 percent test coverage** for impacted modules.
- Clear, reviewer-focused documentation.
- **Timeframe: 96 hours.**

### Community & contribution rewards
- 💬 **Join the Liquifact community on Discord:** https://discord.gg/JrGPH4V3
- ⭐ This is a **GrantFox OSS / Official Campaign** task and **may be rewarded**. When your PR is merged you'll be prompted to rate the project — a **5-star rating** is much appreciated.
++++++
---
type: Feature
title: "Add unit tests for the FundAmountInput validation, precision, and expected-yield derivation"
labels: type:test, area:invest, stack:nextjs, stack:react, priority:high, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Strengthen tests for the partial-funding amount input

### Description
The `FundAmountInput` component validates amounts against a maximum, enforces per-currency decimal precision, and derives an expected yield. This issue broadens its test coverage around the validation boundaries and the yield math.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add tests in `components/` for: empty/required, non-positive, exceeds-balance, precision-exceeded, and a valid amount showing the derived expected yield.
- Assert error messages come from the copy dictionary (no hard-coded strings) and that the submit is blocked while invalid.
- Do not change component behaviour unless a test uncovers a real defect (note it if so).

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b test/invest-01-fund-amount-input`
- Implement changes
  - **Write comprehensive tests in:** `components/FundAmountInput.test.tsx` (extend it).
- Test and commit

### Test and commit
- Run `npm run lint`, `npm run format:check`, `npm test`, and `npm run build`.
- Cover edge cases: zero, negative, one-cent-over-max, too-many-decimals per currency.
- Include the full `npm test` output in the PR description.

### Example commit message
`test(invest): cover FundAmountInput validation and yield math`

### Guidelines
- **Minimum 95 percent test coverage** for the component.
- Clear, reviewer-focused test names.
- **Timeframe: 96 hours.**

### Community & contribution rewards
- 💬 **Join the Liquifact community on Discord:** https://discord.gg/JrGPH4V3
- ⭐ This is a **GrantFox OSS / Official Campaign** task and **may be rewarded**. When your PR is merged you'll be prompted to rate the project — a **5-star rating** is much appreciated.
++++++
---
type: Feature
title: "Add a Clear all filters control to the marketplace toolbar"
labels: type:feature, area:marketplace, stack:nextjs, stack:react, priority:low, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Let users reset every marketplace filter at once

### Description
Clearing the marketplace search and each active filter chip individually is tedious. This issue adds a single `Clear all filters` control that resets the search term and all filters, shown only when at least one filter is active.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add the control to the marketplace toolbar; hide it when no filter/search is active.
- Reset all filter state and the search term in one action; keep focus management sensible (return focus to the search input).
- Reuse existing filter state; do not fork the state model.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/marketplace-01-clear-filters`
- Implement changes
  - **Write code in:** the marketplace toolbar/filter component.
  - **Write comprehensive tests in:** control hidden when inactive, resets all filters + search, focus returns to search.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm run format:check`, `npm test`, and `npm run build`.
- Cover edge cases: no active filters, multiple active filters + search.
- Include the full `npm test` output in the PR description.

### Example commit message
`feat(marketplace): add Clear all filters control`

### Guidelines
- **Minimum 95 percent test coverage** for impacted modules.
- Clear, reviewer-focused documentation.
- **Timeframe: 96 hours.**

### Community & contribution rewards
- 💬 **Join the Liquifact community on Discord:** https://discord.gg/JrGPH4V3
- ⭐ This is a **GrantFox OSS / Official Campaign** task and **may be rewarded**. When your PR is merged you'll be prompted to rate the project — a **5-star rating** is much appreciated.
++++++
---
type: Feature
title: "Centralize currency and percent formatting options into a single formatting config"
labels: type:refactor, area:format, stack:nextjs, stack:typescript, priority:medium, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Single source of truth for number formatting options

### Description
Currency and percent formatting options (locale, min/max fraction digits) are sprinkled across call sites in `lib/format`, risking drift. This issue centralizes them into one config object the format helpers consume.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Introduce a single formatting config (locale + per-kind digit options) in `lib/format` and have `formatCurrency`/`formatAmount` read from it.
- Output must be unchanged for existing inputs — this is a refactor, verified by the existing format tests.
- No new dependencies.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b refactor/format-01-central-config`
- Implement changes
  - **Write code in:** `lib/format/`.
  - **Write comprehensive tests in:** assert unchanged output for currency/percent across a table of inputs.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm run format:check`, `npm test`, and `npm run build`.
- Confirm no output change via a before/after snapshot table.
- Include the full `npm test` output in the PR description.

### Example commit message
`refactor(format): centralize currency/percent options`

### Guidelines
- **Minimum 95 percent test coverage** for impacted modules.
- Clear, reviewer-focused documentation.
- **Timeframe: 96 hours.**

### Community & contribution rewards
- 💬 **Join the Liquifact community on Discord:** https://discord.gg/JrGPH4V3
- ⭐ This is a **GrantFox OSS / Official Campaign** task and **may be rewarded**. When your PR is merged you'll be prompted to rate the project — a **5-star rating** is much appreciated.
++++++
---
type: Feature
title: "Document the invoice mock-data contract and how to swap in a real API"
labels: type:docs, area:data, stack:nextjs, priority:low, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Document the invoice data contract and the API swap path

### Description
Invoice data currently comes from an in-repo mock (`getInvoiceById`, `fetchInvestableInvoices`). Contributors need to know the exact shape and where to swap in a real API. This issue documents the contract.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add `docs/invoice-data.md` documenting the invoice object shape (every field, types, formatted vs raw values like `amount` vs `amountValue`), the mock module location, and the single seam to replace for a real API.
- Keep it accurate to the current mock — read the lib module first.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b docs/data-01-invoice-contract`
- Implement changes
  - **Add documentation:** create `docs/invoice-data.md`.
- Test and commit

### Test and commit
- Run `npm run build` to confirm nothing else drifted.
- Cross-check each documented field against the mock source.
- Note in the PR how you verified the shape.

### Example commit message
`docs(data): document the invoice mock-data contract`

### Guidelines
- Clear, reviewer-focused documentation.
- **Timeframe: 96 hours.**

### Community & contribution rewards
- 💬 **Join the Liquifact community on Discord:** https://discord.gg/JrGPH4V3
- ⭐ This is a **GrantFox OSS / Official Campaign** task and **may be rewarded**. When your PR is merged you'll be prompted to rate the project — a **5-star rating** is much appreciated.
++++++
---
type: Feature
title: "Add an empty and error state to the marketplace when no invoices load"
labels: type:feature, area:marketplace, stack:nextjs, stack:react, priority:medium, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Give the marketplace explicit empty and error states

### Description
When the marketplace has no investable invoices — or the load fails — the grid renders blank with no guidance. This issue adds distinct empty and error states with a retry affordance on error.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add an empty state (no invoices available) and an error state (load failed) to the marketplace, distinct from the loading skeleton.
- The error state offers a retry that re-runs the fetch; both states are accessible (announced, focusable retry).
- Reuse the existing fetch state model; do not introduce a parallel one.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/marketplace-02-empty-error`
- Implement changes
  - **Write code in:** the marketplace page/results component.
  - **Write comprehensive tests in:** empty renders guidance, error renders retry, retry re-fetches.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm run format:check`, `npm test`, and `npm run build`.
- Cover edge cases: empty vs error vs loading are mutually exclusive.
- Include the full `npm test` output in the PR description.

### Example commit message
`feat(marketplace): add empty and error states with retry`

### Guidelines
- **Minimum 95 percent test coverage** for impacted modules.
- Clear, reviewer-focused documentation.
- **Timeframe: 96 hours.**

### Community & contribution rewards
- 💬 **Join the Liquifact community on Discord:** https://discord.gg/JrGPH4V3
- ⭐ This is a **GrantFox OSS / Official Campaign** task and **may be rewarded**. When your PR is merged you'll be prompted to rate the project — a **5-star rating** is much appreciated.
