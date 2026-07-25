---
type: Feature
title: "Set aria-busy on the marketplace during loading"
labels: type:a11y, area:marketplace, stack:nextjs, stack:react, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Signal loading to assistive tech

### Description
The marketplace does not expose a busy state while invoices load, so screen-reader users are not told it is loading. This issue sets aria-busy during fetches.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Set aria-busy=true on the results region while loading and clear it when settled.
- Do not change the visual skeleton.
- Verify with an automated a11y assertion if available.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b a11y/marketplace-02-aria-busy`
- Implement changes
  - **Write code in:** the marketplace results component.
  - **Write comprehensive tests in:** busy during load, cleared on success and on error.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm run format:check`, `npm test`, and `npm run build`.
- Cover edge cases: fast load, error load.
- Include the full test output in the PR description.

### Example commit message
`a11y(marketplace): set aria-busy during loading`

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
title: "Extract a useDebouncedValue hook shared by search inputs"
labels: type:refactor, area:hooks, stack:typescript, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Deduplicate debounce logic

### Description
Search inputs re-implement debouncing inline. This issue extracts a reusable useDebouncedValue hook and adopts it.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add a `useDebouncedValue` hook and adopt it in the search inputs that currently inline debouncing.
- Behaviour unchanged; same delay and trailing semantics.
- Clean up timers on unmount.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b refactor/hooks-01-use-debounced-value`
- Implement changes
  - **Write code in:** create the hook; update the search inputs.
  - **Write comprehensive tests in:** value updates after delay, rapid changes coalesce, cleanup on unmount.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm run format:check`, `npm test`, and `npm run build`.
- Cover edge cases: immediate unmount, rapid successive changes.
- Include the full test output in the PR description.

### Example commit message
`refactor(hooks): extract useDebouncedValue`

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
title: "Add tests for the currency formatter edge cases"
labels: type:test, area:format, stack:typescript, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Harden the currency formatter tests

### Description
The currency formatter handles many inputs but its edge cases are under-tested. This issue adds focused tests.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add tests for zero, negatives, large values, missing currency, and the invalid-value fallback.
- Drive the pure formatter directly.
- Do not change behaviour unless a defect is found (note it).

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b test/format-01-currency-edges`
- Implement changes
  - **Write comprehensive tests in:** the format helpers test suite.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm run format:check`, `npm test`, and `npm run build`.
- Cover edge cases: zero, negative, NaN, missing currency.
- Include the full test output in the PR description.

### Example commit message
`test(format): cover currency formatter edges`

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
title: "Add a print and save-PDF action to the invoice detail page"
labels: type:feature, area:invoice-detail, stack:nextjs, stack:react, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Let users print or save an invoice

### Description
The invoice detail page cannot be printed cleanly. This issue adds a print/save-PDF action plus a print stylesheet so the printed page is tidy.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add an accessible print action invoking the browser print flow; add a print stylesheet hiding non-content chrome.
- Do not change the on-screen layout.
- Keep the action keyboard-operable.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/detail-01-print`
- Implement changes
  - **Write code in:** the invoice detail page + a print stylesheet.
  - **Write comprehensive tests in:** action triggers print, non-content is print-hidden.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm run format:check`, `npm test`, and `npm run build`.
- Cover edge cases: very long invoice, missing optional fields.
- Include the full test output in the PR description.

### Example commit message
`feat(detail): add print/save-PDF action`

### Guidelines
- **Minimum 95 percent test coverage** for impacted modules.
- Clear, reviewer-focused documentation.
- **Timeframe: 96 hours.**

### Community & contribution rewards
- 💬 **Join the Liquifact community on Discord:** https://discord.gg/JrGPH4V3
- ⭐ This is a **GrantFox OSS / Official Campaign** task and **may be rewarded**. When your PR is merged you'll be prompted to rate the project — a **5-star rating** is much appreciated.
