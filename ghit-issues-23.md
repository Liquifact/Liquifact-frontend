---
type: Feature
title: "Add optimistic UI updates to the marketplace actions"
labels: type:feature, area:marketplace, stack:nextjs, stack:react, stack:typescript, priority:medium, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Optimistic marketplace updates

### Description
marketplace actions wait for the server before reflecting changes, feeling sluggish. This issue adds optimistic updates with rollback on failure.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Apply marketplace changes optimistically and roll back with an error toast if the request fails.
- Keep the UI consistent on concurrent actions.
- Cover success and rollback in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/marketplace-21-optimistic`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: success commit, failure rollback, concurrent actions.
- Include the full test output in the PR description.

### Example commit message
`feat(marketplace): add optimistic updates`

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
title: "Add focus management on marketplace route and dialog transitions"
labels: type:a11y, area:marketplace, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Manage focus for marketplace

### Description
Focus is lost on marketplace route/dialog transitions, disorienting keyboard and screen-reader users. This issue adds proper focus management.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Move focus to a sensible target on marketplace open/route-change and restore it on close.
- Trap focus in marketplace dialogs; no visual change.
- Add focus-behaviour tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b a11y/marketplace-21-focus`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: open moves focus, close restores, dialog trap.
- Include the full test output in the PR description.

### Example commit message
`a11y(marketplace): manage focus on transitions`

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
title: "Add snapshot/structure tests for the marketplace rendered output"
labels: type:test, area:marketplace, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Snapshot marketplace output

### Description
The marketplace rendered structure isn't guarded, so regressions slip in. This issue adds stable structure/snapshot tests.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add snapshot or structural assertions for marketplace's key states; keep them deterministic (no timestamps/random).
- Update intentionally when output changes.
- Cover loaded and empty states.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b test/marketplace-21-snapshot`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: loaded, empty, error structure.
- Include the full test output in the PR description.

### Example commit message
`test(marketplace): add structural snapshot tests`

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
title: "Add a command-palette entry for marketplace"
labels: type:feature, area:marketplace, stack:nextjs, stack:react, stack:typescript, priority:low, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Expose marketplace in the command palette

### Description
Power users can't reach marketplace from the command palette. This issue registers an accessible palette entry.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Register a command-palette action that navigates to / triggers marketplace, with a clear label and keywords.
- Keyboard-operable; no duplicate entries.
- Cover registration and activation in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/marketplace-22-palette`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: activation navigates, label searchable.
- Include the full test output in the PR description.

### Example commit message
`feat(marketplace): add command-palette entry`

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
title: "Add a usage guide for the marketplace components"
labels: type:docs, area:marketplace, stack:nextjs, stack:react, stack:typescript, priority:low, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Document marketplace usage

### Description
The marketplace components lack a usage guide with examples. This issue adds one.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add a docs entry with marketplace component examples, props, and common patterns.
- Keep it accurate to the current API.
- Link from the docs index.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b docs/marketplace-21-usage`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: n/a — verify examples compile.
- Include the full test output in the PR description.

### Example commit message
`docs(marketplace): add a usage guide`

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
title: "Add optimistic UI updates to the invoice-detail actions"
labels: type:feature, area:invoice-detail, stack:nextjs, stack:react, stack:typescript, priority:medium, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Optimistic invoice-detail updates

### Description
invoice-detail actions wait for the server before reflecting changes, feeling sluggish. This issue adds optimistic updates with rollback on failure.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Apply invoice-detail changes optimistically and roll back with an error toast if the request fails.
- Keep the UI consistent on concurrent actions.
- Cover success and rollback in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/invoice-detail-21-optimistic`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: success commit, failure rollback, concurrent actions.
- Include the full test output in the PR description.

### Example commit message
`feat(invoice-detail): add optimistic updates`

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
title: "Add focus management on invoice-detail route and dialog transitions"
labels: type:a11y, area:invoice-detail, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Manage focus for invoice-detail

### Description
Focus is lost on invoice-detail route/dialog transitions, disorienting keyboard and screen-reader users. This issue adds proper focus management.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Move focus to a sensible target on invoice-detail open/route-change and restore it on close.
- Trap focus in invoice-detail dialogs; no visual change.
- Add focus-behaviour tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b a11y/invoice-detail-21-focus`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: open moves focus, close restores, dialog trap.
- Include the full test output in the PR description.

### Example commit message
`a11y(invoice-detail): manage focus on transitions`

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
title: "Add snapshot/structure tests for the invoice-detail rendered output"
labels: type:test, area:invoice-detail, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Snapshot invoice-detail output

### Description
The invoice-detail rendered structure isn't guarded, so regressions slip in. This issue adds stable structure/snapshot tests.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add snapshot or structural assertions for invoice-detail's key states; keep them deterministic (no timestamps/random).
- Update intentionally when output changes.
- Cover loaded and empty states.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b test/invoice-detail-21-snapshot`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: loaded, empty, error structure.
- Include the full test output in the PR description.

### Example commit message
`test(invoice-detail): add structural snapshot tests`

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
title: "Add a command-palette entry for invoice-detail"
labels: type:feature, area:invoice-detail, stack:nextjs, stack:react, stack:typescript, priority:low, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Expose invoice-detail in the command palette

### Description
Power users can't reach invoice-detail from the command palette. This issue registers an accessible palette entry.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Register a command-palette action that navigates to / triggers invoice-detail, with a clear label and keywords.
- Keyboard-operable; no duplicate entries.
- Cover registration and activation in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/invoice-detail-22-palette`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: activation navigates, label searchable.
- Include the full test output in the PR description.

### Example commit message
`feat(invoice-detail): add command-palette entry`

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
title: "Add a usage guide for the invoice-detail components"
labels: type:docs, area:invoice-detail, stack:nextjs, stack:react, stack:typescript, priority:low, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Document invoice-detail usage

### Description
The invoice-detail components lack a usage guide with examples. This issue adds one.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add a docs entry with invoice-detail component examples, props, and common patterns.
- Keep it accurate to the current API.
- Link from the docs index.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b docs/invoice-detail-21-usage`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: n/a — verify examples compile.
- Include the full test output in the PR description.

### Example commit message
`docs(invoice-detail): add a usage guide`

### Guidelines
- **Minimum 95 percent test coverage** for impacted modules.
- Clear, reviewer-focused documentation.
- **Timeframe: 96 hours.**

### Community & contribution rewards
- 💬 **Join the Liquifact community on Discord:** https://discord.gg/JrGPH4V3
- ⭐ This is a **GrantFox OSS / Official Campaign** task and **may be rewarded**. When your PR is merged you'll be prompted to rate the project — a **5-star rating** is much appreciated.
