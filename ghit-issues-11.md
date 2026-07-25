---
type: Feature
title: "Add a sort control to the marketplace (yield, amount, maturity)"
labels: type:feature, area:marketplace, stack:nextjs, stack:react, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Let investors sort the marketplace

### Description
The marketplace can be filtered but not sorted, so investors cannot rank invoices by the metrics they care about. This issue adds an accessible sort control.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add a sort control offering yield, amount, and maturity (asc/desc); sort the currently filtered set client-side.
- Keep the control accessible (labelled, keyboard-operable) and announce the applied sort.
- Reuse the existing marketplace state.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/marketplace-03-sort`
- Implement changes
  - **Write code in:** the marketplace toolbar/results component.
  - **Write comprehensive tests in:** each sort key orders correctly, direction toggles, stable with filters.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm run format:check`, `npm test`, and `npm run build`.
- Cover edge cases: ties on the sort key, empty list, sort then filter.
- Include the full test output in the PR description.

### Example commit message
`feat(marketplace): add yield/amount/maturity sort`

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
title: "Expose aria-pressed state on the theme toggle"
labels: type:a11y, area:theme, stack:nextjs, stack:react, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Make the theme toggle state programmatic

### Description
The theme toggle does not expose its pressed state, so assistive tech cannot tell whether dark mode is active. This issue adds the correct ARIA state.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Set aria-pressed (or an equivalent accessible state) on the theme toggle reflecting the active theme.
- Do not change the visual toggle behaviour.
- Verify with an automated a11y assertion if the suite has one.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b a11y/theme-01-aria-pressed`
- Implement changes
  - **Write code in:** the theme toggle component.
  - **Write comprehensive tests in:** state reflects light vs dark and updates on toggle.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm run format:check`, `npm test`, and `npm run build`.
- Cover edge cases: system-preference auto mode, initial mount state.
- Include the full test output in the PR description.

### Example commit message
`a11y(theme): expose aria-pressed on the toggle`

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
title: "Add tests for the marketplace sort ordering"
labels: type:test, area:marketplace, stack:typescript, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Cover the marketplace sort logic

### Description
The marketplace sort logic (once added or where present) needs deterministic tests around ordering and tie-breaks. This issue adds them.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add tests asserting ordering by each sort key and direction, plus a stable tie-break.
- Drive via the pure sort helper if one exists; otherwise via the rendered list.
- Do not change behaviour unless a defect is found (note it).

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b test/marketplace-02-sort`
- Implement changes
  - **Write comprehensive tests in:** the marketplace test suite.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm run format:check`, `npm test`, and `npm run build`.
- Cover edge cases: equal keys, single item, empty.
- Include the full test output in the PR description.

### Example commit message
`test(marketplace): cover sort ordering`

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
title: "Show a truncated wallet balance with a full-value tooltip"
labels: type:feature, area:wallet, stack:nextjs, stack:react, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Display the wallet balance compactly

### Description
The connected wallet balance, when shown, is not formatted for scannability. This issue renders a compact balance with the exact value available on hover/focus.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Render a compact balance and expose the precise value via title/aria so nothing is lost.
- Handle the no-balance/disconnected state gracefully.
- Reuse existing formatting helpers.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/wallet-02-balance-tooltip`
- Implement changes
  - **Write code in:** the wallet status component.
  - **Write comprehensive tests in:** compact render, full value in title, disconnected state.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm run format:check`, `npm test`, and `npm run build`.
- Cover edge cases: zero balance, very large balance, disconnected.
- Include the full test output in the PR description.

### Example commit message
`feat(wallet): show compact balance with full-value tooltip`

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
title: "Add a typed ApiError class to the fetch layer"
labels: type:refactor, area:api, stack:typescript, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Give API failures a typed shape

### Description
API errors are thrown as generic errors, making handling and messaging inconsistent. This issue introduces a typed `ApiError` carrying status and requestId.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add an `ApiError` class (status, code, requestId, message) thrown by the fetch layer; adopt it at call sites.
- Behaviour unchanged for callers that only read message; richer handling optional.
- No new dependencies.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b refactor/api-01-typed-error`
- Implement changes
  - **Write code in:** the fetch/api module; update call sites.
  - **Write comprehensive tests in:** ApiError carries status/requestId, non-JSON error handled.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm run format:check`, `npm test`, and `npm run build`.
- Cover edge cases: timeout, non-JSON body, missing requestId.
- Include the full test output in the PR description.

### Example commit message
`refactor(api): add typed ApiError class`

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
title: "Add a component testing guide for contributors"
labels: type:docs, area:testing, stack:nextjs, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Document how to test components

### Description
Contributors lack a guide for the project's component testing conventions (RTL, jsdom env, mocking wallet/toast). This issue adds one.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add `docs/testing.md` covering the test setup, common mocks (wallet, toast, clipboard), the jsdom URL convention, and how to run unit vs a11y tests.
- Keep it accurate — read the existing tests and jest config first.
- Link from the docs index if one exists.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b docs/testing-01-component-guide`
- Implement changes
  - **Add documentation:** create `docs/testing.md`.
- Test and commit

### Test and commit
- Run `npm run build`.
- Cover edge cases: n/a — verify commands against package.json scripts.
- Include the full test output in the PR description.

### Example commit message
`docs(testing): add a component testing guide`

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
title: "Add drag-over visual feedback to the invoice upload zone"
labels: type:feature, area:upload, stack:nextjs, stack:react, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Signal drag-and-drop readiness

### Description
The upload zone does not visibly respond while a file is dragged over it, hurting discoverability. This issue adds accessible drag-over feedback.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add a visible (and SR-conveyed) active state while a file is dragged over the drop zone; clear it on leave/drop.
- Do not change the upload/validation logic.
- Keep keyboard/browse fallback intact.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/upload-01-dragover`
- Implement changes
  - **Write code in:** the upload zone component.
  - **Write comprehensive tests in:** dragenter sets active, dragleave/drop clears it.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm run format:check`, `npm test`, and `npm run build`.
- Cover edge cases: drag leave without drop, multiple rapid dragenter.
- Include the full test output in the PR description.

### Example commit message
`feat(upload): add drag-over feedback to the upload zone`

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
title: "Add a keyboard shortcut to focus the marketplace search"
labels: type:feature, area:marketplace, stack:nextjs, stack:react, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Speed up search with a shortcut

### Description
Power users want to jump straight to marketplace search without reaching for the mouse. This issue adds a discoverable focus shortcut.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Bind a documented shortcut (for example /) to focus the marketplace search input when the marketplace is visible.
- Do not intercept the key while typing in another field; expose the shortcut in any help affordance.
- Keep it accessible and non-conflicting.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/marketplace-04-search-shortcut`
- Implement changes
  - **Write code in:** the marketplace search/toolbar component.
  - **Write comprehensive tests in:** shortcut focuses search, ignored while typing elsewhere.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm run format:check`, `npm test`, and `npm run build`.
- Cover edge cases: focus already in an input, shortcut on other routes.
- Include the full test output in the PR description.

### Example commit message
`feat(marketplace): add focus-search keyboard shortcut`

### Guidelines
- **Minimum 95 percent test coverage** for impacted modules.
- Clear, reviewer-focused documentation.
- **Timeframe: 96 hours.**

### Community & contribution rewards
- 💬 **Join the Liquifact community on Discord:** https://discord.gg/JrGPH4V3
- ⭐ This is a **GrantFox OSS / Official Campaign** task and **may be rewarded**. When your PR is merged you'll be prompted to rate the project — a **5-star rating** is much appreciated.
