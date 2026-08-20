---
type: Feature
title: "Add keyboard shortcuts to marketplace"
labels: type:feature, area:marketplace, stack:nextjs, stack:react, stack:typescript, priority:medium, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Shortcuts for marketplace

### Description
marketplace's common actions require the mouse. This issue adds discoverable keyboard shortcuts.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add keyboard shortcuts for marketplace's primary actions with a discoverable hint; avoid clashing with browser/native keys.
- Respect input focus (don't fire while typing).
- Cover the shortcuts in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/marketplace-71-shortcuts`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: fires when idle, ignored while typing.
- Include the full test output in the PR description.

### Example commit message
`feat(marketplace): add keyboard shortcuts`

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
title: "Add high-contrast mode support to marketplace"
labels: type:a11y, area:marketplace, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Contrast for marketplace

### Description
marketplace may not meet contrast needs in high-contrast mode. This issue adds support.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Ensure marketplace honors forced-colors/high-contrast mode with sufficient contrast and visible focus.
- No layout regression in normal mode.
- Verify with an a11y check if available.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b a11y/marketplace-71-contrast`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: forced-colors readable, focus visible.
- Include the full test output in the PR description.

### Example commit message
`a11y(marketplace): support high-contrast mode`

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
title: "Add tests for marketplace keyboard navigation"
labels: type:test, area:marketplace, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Test marketplace keys

### Description
marketplace's keyboard navigation (tab order, arrow keys) isn't tested. This issue adds coverage.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add tests asserting marketplace supports logical tab order and expected arrow/enter/escape behavior.
- Deterministic; no real timers.
- Do not change behaviour unless a defect is found.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b test/marketplace-71-keynav`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: tab order, arrows, enter, escape.
- Include the full test output in the PR description.

### Example commit message
`test(marketplace): cover keyboard navigation`

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
title: "Add a skeleton loading state to marketplace"
labels: type:feature, area:marketplace, stack:nextjs, stack:react, stack:typescript, priority:low, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Skeleton for marketplace

### Description
marketplace shows a blank/spinner while loading. This issue adds a skeleton placeholder.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add a skeleton placeholder matching marketplace's layout during load, swapped for content when ready.
- Announce loading to AT; no layout shift.
- Cover the loading->loaded transition in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/marketplace-72-skeleton`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: skeleton on load, content when ready, no shift.
- Include the full test output in the PR description.

### Example commit message
`feat(marketplace): add skeleton loading state`

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
title: "Add a theming guide for marketplace"
labels: type:docs, area:marketplace, stack:nextjs, stack:react, stack:typescript, priority:low, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Theme marketplace

### Description
marketplace's theming/token usage isn't documented. This issue adds a short guide.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add a docs entry explaining how marketplace consumes theme tokens and how to customize them.
- Keep accurate to the current tokens.
- Link from the docs index.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b docs/marketplace-71-theming`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: n/a — verify tokens against source.
- Include the full test output in the PR description.

### Example commit message
`docs(marketplace): add theming guide`

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
title: "Add keyboard shortcuts to invoice-detail"
labels: type:feature, area:invoice-detail, stack:nextjs, stack:react, stack:typescript, priority:medium, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Shortcuts for invoice-detail

### Description
invoice-detail's common actions require the mouse. This issue adds discoverable keyboard shortcuts.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add keyboard shortcuts for invoice-detail's primary actions with a discoverable hint; avoid clashing with browser/native keys.
- Respect input focus (don't fire while typing).
- Cover the shortcuts in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/invoice-detail-71-shortcuts`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: fires when idle, ignored while typing.
- Include the full test output in the PR description.

### Example commit message
`feat(invoice-detail): add keyboard shortcuts`

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
title: "Add high-contrast mode support to invoice-detail"
labels: type:a11y, area:invoice-detail, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Contrast for invoice-detail

### Description
invoice-detail may not meet contrast needs in high-contrast mode. This issue adds support.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Ensure invoice-detail honors forced-colors/high-contrast mode with sufficient contrast and visible focus.
- No layout regression in normal mode.
- Verify with an a11y check if available.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b a11y/invoice-detail-71-contrast`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: forced-colors readable, focus visible.
- Include the full test output in the PR description.

### Example commit message
`a11y(invoice-detail): support high-contrast mode`

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
title: "Add tests for invoice-detail keyboard navigation"
labels: type:test, area:invoice-detail, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Test invoice-detail keys

### Description
invoice-detail's keyboard navigation (tab order, arrow keys) isn't tested. This issue adds coverage.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add tests asserting invoice-detail supports logical tab order and expected arrow/enter/escape behavior.
- Deterministic; no real timers.
- Do not change behaviour unless a defect is found.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b test/invoice-detail-71-keynav`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: tab order, arrows, enter, escape.
- Include the full test output in the PR description.

### Example commit message
`test(invoice-detail): cover keyboard navigation`

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
title: "Add a skeleton loading state to invoice-detail"
labels: type:feature, area:invoice-detail, stack:nextjs, stack:react, stack:typescript, priority:low, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Skeleton for invoice-detail

### Description
invoice-detail shows a blank/spinner while loading. This issue adds a skeleton placeholder.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add a skeleton placeholder matching invoice-detail's layout during load, swapped for content when ready.
- Announce loading to AT; no layout shift.
- Cover the loading->loaded transition in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/invoice-detail-72-skeleton`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: skeleton on load, content when ready, no shift.
- Include the full test output in the PR description.

### Example commit message
`feat(invoice-detail): add skeleton loading state`

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
title: "Add a theming guide for invoice-detail"
labels: type:docs, area:invoice-detail, stack:nextjs, stack:react, stack:typescript, priority:low, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Theme invoice-detail

### Description
invoice-detail's theming/token usage isn't documented. This issue adds a short guide.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add a docs entry explaining how invoice-detail consumes theme tokens and how to customize them.
- Keep accurate to the current tokens.
- Link from the docs index.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b docs/invoice-detail-71-theming`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: n/a — verify tokens against source.
- Include the full test output in the PR description.

### Example commit message
`docs(invoice-detail): add theming guide`

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
title: "Add keyboard shortcuts to upload"
labels: type:feature, area:upload, stack:nextjs, stack:react, stack:typescript, priority:medium, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Shortcuts for upload

### Description
upload's common actions require the mouse. This issue adds discoverable keyboard shortcuts.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add keyboard shortcuts for upload's primary actions with a discoverable hint; avoid clashing with browser/native keys.
- Respect input focus (don't fire while typing).
- Cover the shortcuts in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/upload-71-shortcuts`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: fires when idle, ignored while typing.
- Include the full test output in the PR description.

### Example commit message
`feat(upload): add keyboard shortcuts`

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
title: "Add high-contrast mode support to upload"
labels: type:a11y, area:upload, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Contrast for upload

### Description
upload may not meet contrast needs in high-contrast mode. This issue adds support.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Ensure upload honors forced-colors/high-contrast mode with sufficient contrast and visible focus.
- No layout regression in normal mode.
- Verify with an a11y check if available.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b a11y/upload-71-contrast`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: forced-colors readable, focus visible.
- Include the full test output in the PR description.

### Example commit message
`a11y(upload): support high-contrast mode`

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
title: "Add tests for upload keyboard navigation"
labels: type:test, area:upload, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Test upload keys

### Description
upload's keyboard navigation (tab order, arrow keys) isn't tested. This issue adds coverage.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add tests asserting upload supports logical tab order and expected arrow/enter/escape behavior.
- Deterministic; no real timers.
- Do not change behaviour unless a defect is found.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b test/upload-71-keynav`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: tab order, arrows, enter, escape.
- Include the full test output in the PR description.

### Example commit message
`test(upload): cover keyboard navigation`

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
title: "Add a skeleton loading state to upload"
labels: type:feature, area:upload, stack:nextjs, stack:react, stack:typescript, priority:low, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Skeleton for upload

### Description
upload shows a blank/spinner while loading. This issue adds a skeleton placeholder.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add a skeleton placeholder matching upload's layout during load, swapped for content when ready.
- Announce loading to AT; no layout shift.
- Cover the loading->loaded transition in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/upload-72-skeleton`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: skeleton on load, content when ready, no shift.
- Include the full test output in the PR description.

### Example commit message
`feat(upload): add skeleton loading state`

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
title: "Add a theming guide for upload"
labels: type:docs, area:upload, stack:nextjs, stack:react, stack:typescript, priority:low, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Theme upload

### Description
upload's theming/token usage isn't documented. This issue adds a short guide.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add a docs entry explaining how upload consumes theme tokens and how to customize them.
- Keep accurate to the current tokens.
- Link from the docs index.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b docs/upload-71-theming`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: n/a — verify tokens against source.
- Include the full test output in the PR description.

### Example commit message
`docs(upload): add theming guide`

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
title: "Add keyboard shortcuts to wallet"
labels: type:feature, area:wallet, stack:nextjs, stack:react, stack:typescript, priority:medium, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Shortcuts for wallet

### Description
wallet's common actions require the mouse. This issue adds discoverable keyboard shortcuts.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add keyboard shortcuts for wallet's primary actions with a discoverable hint; avoid clashing with browser/native keys.
- Respect input focus (don't fire while typing).
- Cover the shortcuts in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/wallet-71-shortcuts`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: fires when idle, ignored while typing.
- Include the full test output in the PR description.

### Example commit message
`feat(wallet): add keyboard shortcuts`

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
title: "Add high-contrast mode support to wallet"
labels: type:a11y, area:wallet, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Contrast for wallet

### Description
wallet may not meet contrast needs in high-contrast mode. This issue adds support.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Ensure wallet honors forced-colors/high-contrast mode with sufficient contrast and visible focus.
- No layout regression in normal mode.
- Verify with an a11y check if available.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b a11y/wallet-71-contrast`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: forced-colors readable, focus visible.
- Include the full test output in the PR description.

### Example commit message
`a11y(wallet): support high-contrast mode`

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
title: "Add tests for wallet keyboard navigation"
labels: type:test, area:wallet, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Test wallet keys

### Description
wallet's keyboard navigation (tab order, arrow keys) isn't tested. This issue adds coverage.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add tests asserting wallet supports logical tab order and expected arrow/enter/escape behavior.
- Deterministic; no real timers.
- Do not change behaviour unless a defect is found.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b test/wallet-71-keynav`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: tab order, arrows, enter, escape.
- Include the full test output in the PR description.

### Example commit message
`test(wallet): cover keyboard navigation`

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
title: "Add a skeleton loading state to wallet"
labels: type:feature, area:wallet, stack:nextjs, stack:react, stack:typescript, priority:low, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Skeleton for wallet

### Description
wallet shows a blank/spinner while loading. This issue adds a skeleton placeholder.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add a skeleton placeholder matching wallet's layout during load, swapped for content when ready.
- Announce loading to AT; no layout shift.
- Cover the loading->loaded transition in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/wallet-72-skeleton`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: skeleton on load, content when ready, no shift.
- Include the full test output in the PR description.

### Example commit message
`feat(wallet): add skeleton loading state`

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
title: "Add a theming guide for wallet"
labels: type:docs, area:wallet, stack:nextjs, stack:react, stack:typescript, priority:low, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Theme wallet

### Description
wallet's theming/token usage isn't documented. This issue adds a short guide.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add a docs entry explaining how wallet consumes theme tokens and how to customize them.
- Keep accurate to the current tokens.
- Link from the docs index.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b docs/wallet-71-theming`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: n/a — verify tokens against source.
- Include the full test output in the PR description.

### Example commit message
`docs(wallet): add theming guide`

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
title: "Add keyboard shortcuts to settings"
labels: type:feature, area:settings, stack:nextjs, stack:react, stack:typescript, priority:medium, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Shortcuts for settings

### Description
settings's common actions require the mouse. This issue adds discoverable keyboard shortcuts.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add keyboard shortcuts for settings's primary actions with a discoverable hint; avoid clashing with browser/native keys.
- Respect input focus (don't fire while typing).
- Cover the shortcuts in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/settings-71-shortcuts`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: fires when idle, ignored while typing.
- Include the full test output in the PR description.

### Example commit message
`feat(settings): add keyboard shortcuts`

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
title: "Add high-contrast mode support to settings"
labels: type:a11y, area:settings, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Contrast for settings

### Description
settings may not meet contrast needs in high-contrast mode. This issue adds support.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Ensure settings honors forced-colors/high-contrast mode with sufficient contrast and visible focus.
- No layout regression in normal mode.
- Verify with an a11y check if available.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b a11y/settings-71-contrast`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: forced-colors readable, focus visible.
- Include the full test output in the PR description.

### Example commit message
`a11y(settings): support high-contrast mode`

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
title: "Add tests for settings keyboard navigation"
labels: type:test, area:settings, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Test settings keys

### Description
settings's keyboard navigation (tab order, arrow keys) isn't tested. This issue adds coverage.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add tests asserting settings supports logical tab order and expected arrow/enter/escape behavior.
- Deterministic; no real timers.
- Do not change behaviour unless a defect is found.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b test/settings-71-keynav`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: tab order, arrows, enter, escape.
- Include the full test output in the PR description.

### Example commit message
`test(settings): cover keyboard navigation`

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
title: "Add a skeleton loading state to settings"
labels: type:feature, area:settings, stack:nextjs, stack:react, stack:typescript, priority:low, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Skeleton for settings

### Description
settings shows a blank/spinner while loading. This issue adds a skeleton placeholder.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add a skeleton placeholder matching settings's layout during load, swapped for content when ready.
- Announce loading to AT; no layout shift.
- Cover the loading->loaded transition in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/settings-72-skeleton`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: skeleton on load, content when ready, no shift.
- Include the full test output in the PR description.

### Example commit message
`feat(settings): add skeleton loading state`

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
title: "Add a theming guide for settings"
labels: type:docs, area:settings, stack:nextjs, stack:react, stack:typescript, priority:low, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Theme settings

### Description
settings's theming/token usage isn't documented. This issue adds a short guide.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add a docs entry explaining how settings consumes theme tokens and how to customize them.
- Keep accurate to the current tokens.
- Link from the docs index.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b docs/settings-71-theming`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: n/a — verify tokens against source.
- Include the full test output in the PR description.

### Example commit message
`docs(settings): add theming guide`

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
title: "Add keyboard shortcuts to theme"
labels: type:feature, area:theme, stack:nextjs, stack:react, stack:typescript, priority:medium, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Shortcuts for theme

### Description
theme's common actions require the mouse. This issue adds discoverable keyboard shortcuts.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add keyboard shortcuts for theme's primary actions with a discoverable hint; avoid clashing with browser/native keys.
- Respect input focus (don't fire while typing).
- Cover the shortcuts in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/theme-71-shortcuts`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: fires when idle, ignored while typing.
- Include the full test output in the PR description.

### Example commit message
`feat(theme): add keyboard shortcuts`

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
title: "Add high-contrast mode support to theme"
labels: type:a11y, area:theme, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Contrast for theme

### Description
theme may not meet contrast needs in high-contrast mode. This issue adds support.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Ensure theme honors forced-colors/high-contrast mode with sufficient contrast and visible focus.
- No layout regression in normal mode.
- Verify with an a11y check if available.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b a11y/theme-71-contrast`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: forced-colors readable, focus visible.
- Include the full test output in the PR description.

### Example commit message
`a11y(theme): support high-contrast mode`

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
title: "Add tests for theme keyboard navigation"
labels: type:test, area:theme, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Test theme keys

### Description
theme's keyboard navigation (tab order, arrow keys) isn't tested. This issue adds coverage.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add tests asserting theme supports logical tab order and expected arrow/enter/escape behavior.
- Deterministic; no real timers.
- Do not change behaviour unless a defect is found.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b test/theme-71-keynav`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: tab order, arrows, enter, escape.
- Include the full test output in the PR description.

### Example commit message
`test(theme): cover keyboard navigation`

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
title: "Add a skeleton loading state to theme"
labels: type:feature, area:theme, stack:nextjs, stack:react, stack:typescript, priority:low, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Skeleton for theme

### Description
theme shows a blank/spinner while loading. This issue adds a skeleton placeholder.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add a skeleton placeholder matching theme's layout during load, swapped for content when ready.
- Announce loading to AT; no layout shift.
- Cover the loading->loaded transition in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/theme-72-skeleton`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: skeleton on load, content when ready, no shift.
- Include the full test output in the PR description.

### Example commit message
`feat(theme): add skeleton loading state`

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
title: "Add a theming guide for theme"
labels: type:docs, area:theme, stack:nextjs, stack:react, stack:typescript, priority:low, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Theme theme

### Description
theme's theming/token usage isn't documented. This issue adds a short guide.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add a docs entry explaining how theme consumes theme tokens and how to customize them.
- Keep accurate to the current tokens.
- Link from the docs index.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b docs/theme-71-theming`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: n/a — verify tokens against source.
- Include the full test output in the PR description.

### Example commit message
`docs(theme): add theming guide`

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
title: "Add keyboard shortcuts to dashboard"
labels: type:feature, area:dashboard, stack:nextjs, stack:react, stack:typescript, priority:medium, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Shortcuts for dashboard

### Description
dashboard's common actions require the mouse. This issue adds discoverable keyboard shortcuts.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add keyboard shortcuts for dashboard's primary actions with a discoverable hint; avoid clashing with browser/native keys.
- Respect input focus (don't fire while typing).
- Cover the shortcuts in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/dashboard-71-shortcuts`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: fires when idle, ignored while typing.
- Include the full test output in the PR description.

### Example commit message
`feat(dashboard): add keyboard shortcuts`

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
title: "Add high-contrast mode support to dashboard"
labels: type:a11y, area:dashboard, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Contrast for dashboard

### Description
dashboard may not meet contrast needs in high-contrast mode. This issue adds support.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Ensure dashboard honors forced-colors/high-contrast mode with sufficient contrast and visible focus.
- No layout regression in normal mode.
- Verify with an a11y check if available.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b a11y/dashboard-71-contrast`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: forced-colors readable, focus visible.
- Include the full test output in the PR description.

### Example commit message
`a11y(dashboard): support high-contrast mode`

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
title: "Add tests for dashboard keyboard navigation"
labels: type:test, area:dashboard, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Test dashboard keys

### Description
dashboard's keyboard navigation (tab order, arrow keys) isn't tested. This issue adds coverage.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add tests asserting dashboard supports logical tab order and expected arrow/enter/escape behavior.
- Deterministic; no real timers.
- Do not change behaviour unless a defect is found.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b test/dashboard-71-keynav`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: tab order, arrows, enter, escape.
- Include the full test output in the PR description.

### Example commit message
`test(dashboard): cover keyboard navigation`

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
title: "Add a skeleton loading state to dashboard"
labels: type:feature, area:dashboard, stack:nextjs, stack:react, stack:typescript, priority:low, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Skeleton for dashboard

### Description
dashboard shows a blank/spinner while loading. This issue adds a skeleton placeholder.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add a skeleton placeholder matching dashboard's layout during load, swapped for content when ready.
- Announce loading to AT; no layout shift.
- Cover the loading->loaded transition in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/dashboard-72-skeleton`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: skeleton on load, content when ready, no shift.
- Include the full test output in the PR description.

### Example commit message
`feat(dashboard): add skeleton loading state`

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
title: "Add a theming guide for dashboard"
labels: type:docs, area:dashboard, stack:nextjs, stack:react, stack:typescript, priority:low, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Theme dashboard

### Description
dashboard's theming/token usage isn't documented. This issue adds a short guide.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add a docs entry explaining how dashboard consumes theme tokens and how to customize them.
- Keep accurate to the current tokens.
- Link from the docs index.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b docs/dashboard-71-theming`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: n/a — verify tokens against source.
- Include the full test output in the PR description.

### Example commit message
`docs(dashboard): add theming guide`

### Guidelines
- **Minimum 95 percent test coverage** for impacted modules.
- Clear, reviewer-focused documentation.
- **Timeframe: 96 hours.**

### Community & contribution rewards
- 💬 **Join the Liquifact community on Discord:** https://discord.gg/JrGPH4V3
- ⭐ This is a **GrantFox OSS / Official Campaign** task and **may be rewarded**. When your PR is merged you'll be prompted to rate the project — a **5-star rating** is much appreciated.
