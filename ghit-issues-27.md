---
type: Feature
title: "Add optimistic UI updates to marketplace mutations"
labels: type:feature, area:marketplace, stack:nextjs, stack:react, stack:typescript, priority:medium, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Optimistic marketplace

### Description
marketplace mutations wait for the server before updating the UI, feeling sluggish. This issue adds optimistic updates with rollback.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Apply marketplace mutations optimistically and roll back on error with a clear message.
- Guard against stale overwrites.
- Cover success and rollback in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/marketplace-61-optimistic`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: success keeps update, error rolls back.
- Include the full test output in the PR description.

### Example commit message
`feat(marketplace): optimistic updates`

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
title: "Add focus-trap and escape handling to marketplace modals"
labels: type:a11y, area:marketplace, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Trap focus in marketplace

### Description
marketplace modals don't trap focus or close on escape, hurting keyboard/AT users. This issue fixes both.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Trap focus within open marketplace modals, restore focus to the trigger on close, and close on Escape.
- No visual change.
- Cover trap, escape, and focus-restore in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b a11y/marketplace-61-focustrap`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: focus trapped, escape closes, focus restored.
- Include the full test output in the PR description.

### Example commit message
`a11y(marketplace): add modal focus trap`

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
title: "Add tests for marketplace form validation messages"
labels: type:test, area:marketplace, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Test marketplace validation

### Description
marketplace's inline form validation messages aren't tested. This issue adds coverage.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add tests asserting marketplace shows the right validation message per invalid field and clears it on fix.
- Deterministic; no real network.
- Do not change behaviour unless a defect is found.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b test/marketplace-61-formval`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: per-field message, clears on fix.
- Include the full test output in the PR description.

### Example commit message
`test(marketplace): cover form validation`

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
title: "Add a relative 'last updated' timestamp to marketplace"
labels: type:feature, area:marketplace, stack:nextjs, stack:react, stack:typescript, priority:low, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Timestamp marketplace

### Description
marketplace doesn't show how fresh its data is. This issue adds a relative last-updated indicator.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Show a relative last-updated timestamp on marketplace that updates as time passes; use a stable formatter.
- Accessible text alternative with the absolute time.
- Cover formatting in tests with a fixed clock.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/marketplace-62-updatedts`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: just now, minutes, hours with fixed clock.
- Include the full test output in the PR description.

### Example commit message
`feat(marketplace): add last-updated timestamp`

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
title: "Add usage examples for the marketplace hooks"
labels: type:docs, area:marketplace, stack:nextjs, stack:react, stack:typescript, priority:low, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Document marketplace hooks

### Description
marketplace's custom hooks lack usage examples. This issue adds a concise reference.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add a docs entry with usage examples for the marketplace hooks (inputs, returns, states).
- Keep accurate to the current signatures.
- Link from the docs index.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b docs/marketplace-61-hooks`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: n/a — verify against source.
- Include the full test output in the PR description.

### Example commit message
`docs(marketplace): document hooks`

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
title: "Add optimistic UI updates to invoice-detail mutations"
labels: type:feature, area:invoice-detail, stack:nextjs, stack:react, stack:typescript, priority:medium, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Optimistic invoice-detail

### Description
invoice-detail mutations wait for the server before updating the UI, feeling sluggish. This issue adds optimistic updates with rollback.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Apply invoice-detail mutations optimistically and roll back on error with a clear message.
- Guard against stale overwrites.
- Cover success and rollback in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/invoice-detail-61-optimistic`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: success keeps update, error rolls back.
- Include the full test output in the PR description.

### Example commit message
`feat(invoice-detail): optimistic updates`

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
title: "Add focus-trap and escape handling to invoice-detail modals"
labels: type:a11y, area:invoice-detail, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Trap focus in invoice-detail

### Description
invoice-detail modals don't trap focus or close on escape, hurting keyboard/AT users. This issue fixes both.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Trap focus within open invoice-detail modals, restore focus to the trigger on close, and close on Escape.
- No visual change.
- Cover trap, escape, and focus-restore in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b a11y/invoice-detail-61-focustrap`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: focus trapped, escape closes, focus restored.
- Include the full test output in the PR description.

### Example commit message
`a11y(invoice-detail): add modal focus trap`

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
title: "Add tests for invoice-detail form validation messages"
labels: type:test, area:invoice-detail, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Test invoice-detail validation

### Description
invoice-detail's inline form validation messages aren't tested. This issue adds coverage.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add tests asserting invoice-detail shows the right validation message per invalid field and clears it on fix.
- Deterministic; no real network.
- Do not change behaviour unless a defect is found.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b test/invoice-detail-61-formval`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: per-field message, clears on fix.
- Include the full test output in the PR description.

### Example commit message
`test(invoice-detail): cover form validation`

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
title: "Add a relative 'last updated' timestamp to invoice-detail"
labels: type:feature, area:invoice-detail, stack:nextjs, stack:react, stack:typescript, priority:low, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Timestamp invoice-detail

### Description
invoice-detail doesn't show how fresh its data is. This issue adds a relative last-updated indicator.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Show a relative last-updated timestamp on invoice-detail that updates as time passes; use a stable formatter.
- Accessible text alternative with the absolute time.
- Cover formatting in tests with a fixed clock.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/invoice-detail-62-updatedts`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: just now, minutes, hours with fixed clock.
- Include the full test output in the PR description.

### Example commit message
`feat(invoice-detail): add last-updated timestamp`

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
title: "Add usage examples for the invoice-detail hooks"
labels: type:docs, area:invoice-detail, stack:nextjs, stack:react, stack:typescript, priority:low, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Document invoice-detail hooks

### Description
invoice-detail's custom hooks lack usage examples. This issue adds a concise reference.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add a docs entry with usage examples for the invoice-detail hooks (inputs, returns, states).
- Keep accurate to the current signatures.
- Link from the docs index.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b docs/invoice-detail-61-hooks`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: n/a — verify against source.
- Include the full test output in the PR description.

### Example commit message
`docs(invoice-detail): document hooks`

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
title: "Add optimistic UI updates to upload mutations"
labels: type:feature, area:upload, stack:nextjs, stack:react, stack:typescript, priority:medium, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Optimistic upload

### Description
upload mutations wait for the server before updating the UI, feeling sluggish. This issue adds optimistic updates with rollback.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Apply upload mutations optimistically and roll back on error with a clear message.
- Guard against stale overwrites.
- Cover success and rollback in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/upload-61-optimistic`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: success keeps update, error rolls back.
- Include the full test output in the PR description.

### Example commit message
`feat(upload): optimistic updates`

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
title: "Add focus-trap and escape handling to upload modals"
labels: type:a11y, area:upload, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Trap focus in upload

### Description
upload modals don't trap focus or close on escape, hurting keyboard/AT users. This issue fixes both.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Trap focus within open upload modals, restore focus to the trigger on close, and close on Escape.
- No visual change.
- Cover trap, escape, and focus-restore in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b a11y/upload-61-focustrap`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: focus trapped, escape closes, focus restored.
- Include the full test output in the PR description.

### Example commit message
`a11y(upload): add modal focus trap`

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
title: "Add tests for upload form validation messages"
labels: type:test, area:upload, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Test upload validation

### Description
upload's inline form validation messages aren't tested. This issue adds coverage.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add tests asserting upload shows the right validation message per invalid field and clears it on fix.
- Deterministic; no real network.
- Do not change behaviour unless a defect is found.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b test/upload-61-formval`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: per-field message, clears on fix.
- Include the full test output in the PR description.

### Example commit message
`test(upload): cover form validation`

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
title: "Add a relative 'last updated' timestamp to upload"
labels: type:feature, area:upload, stack:nextjs, stack:react, stack:typescript, priority:low, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Timestamp upload

### Description
upload doesn't show how fresh its data is. This issue adds a relative last-updated indicator.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Show a relative last-updated timestamp on upload that updates as time passes; use a stable formatter.
- Accessible text alternative with the absolute time.
- Cover formatting in tests with a fixed clock.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/upload-62-updatedts`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: just now, minutes, hours with fixed clock.
- Include the full test output in the PR description.

### Example commit message
`feat(upload): add last-updated timestamp`

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
title: "Add usage examples for the upload hooks"
labels: type:docs, area:upload, stack:nextjs, stack:react, stack:typescript, priority:low, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Document upload hooks

### Description
upload's custom hooks lack usage examples. This issue adds a concise reference.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add a docs entry with usage examples for the upload hooks (inputs, returns, states).
- Keep accurate to the current signatures.
- Link from the docs index.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b docs/upload-61-hooks`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: n/a — verify against source.
- Include the full test output in the PR description.

### Example commit message
`docs(upload): document hooks`

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
title: "Add optimistic UI updates to wallet mutations"
labels: type:feature, area:wallet, stack:nextjs, stack:react, stack:typescript, priority:medium, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Optimistic wallet

### Description
wallet mutations wait for the server before updating the UI, feeling sluggish. This issue adds optimistic updates with rollback.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Apply wallet mutations optimistically and roll back on error with a clear message.
- Guard against stale overwrites.
- Cover success and rollback in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/wallet-61-optimistic`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: success keeps update, error rolls back.
- Include the full test output in the PR description.

### Example commit message
`feat(wallet): optimistic updates`

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
title: "Add focus-trap and escape handling to wallet modals"
labels: type:a11y, area:wallet, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Trap focus in wallet

### Description
wallet modals don't trap focus or close on escape, hurting keyboard/AT users. This issue fixes both.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Trap focus within open wallet modals, restore focus to the trigger on close, and close on Escape.
- No visual change.
- Cover trap, escape, and focus-restore in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b a11y/wallet-61-focustrap`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: focus trapped, escape closes, focus restored.
- Include the full test output in the PR description.

### Example commit message
`a11y(wallet): add modal focus trap`

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
title: "Add tests for wallet form validation messages"
labels: type:test, area:wallet, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Test wallet validation

### Description
wallet's inline form validation messages aren't tested. This issue adds coverage.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add tests asserting wallet shows the right validation message per invalid field and clears it on fix.
- Deterministic; no real network.
- Do not change behaviour unless a defect is found.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b test/wallet-61-formval`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: per-field message, clears on fix.
- Include the full test output in the PR description.

### Example commit message
`test(wallet): cover form validation`

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
title: "Add a relative 'last updated' timestamp to wallet"
labels: type:feature, area:wallet, stack:nextjs, stack:react, stack:typescript, priority:low, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Timestamp wallet

### Description
wallet doesn't show how fresh its data is. This issue adds a relative last-updated indicator.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Show a relative last-updated timestamp on wallet that updates as time passes; use a stable formatter.
- Accessible text alternative with the absolute time.
- Cover formatting in tests with a fixed clock.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/wallet-62-updatedts`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: just now, minutes, hours with fixed clock.
- Include the full test output in the PR description.

### Example commit message
`feat(wallet): add last-updated timestamp`

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
title: "Add usage examples for the wallet hooks"
labels: type:docs, area:wallet, stack:nextjs, stack:react, stack:typescript, priority:low, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Document wallet hooks

### Description
wallet's custom hooks lack usage examples. This issue adds a concise reference.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add a docs entry with usage examples for the wallet hooks (inputs, returns, states).
- Keep accurate to the current signatures.
- Link from the docs index.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b docs/wallet-61-hooks`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: n/a — verify against source.
- Include the full test output in the PR description.

### Example commit message
`docs(wallet): document hooks`

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
title: "Add optimistic UI updates to settings mutations"
labels: type:feature, area:settings, stack:nextjs, stack:react, stack:typescript, priority:medium, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Optimistic settings

### Description
settings mutations wait for the server before updating the UI, feeling sluggish. This issue adds optimistic updates with rollback.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Apply settings mutations optimistically and roll back on error with a clear message.
- Guard against stale overwrites.
- Cover success and rollback in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/settings-61-optimistic`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: success keeps update, error rolls back.
- Include the full test output in the PR description.

### Example commit message
`feat(settings): optimistic updates`

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
title: "Add focus-trap and escape handling to settings modals"
labels: type:a11y, area:settings, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Trap focus in settings

### Description
settings modals don't trap focus or close on escape, hurting keyboard/AT users. This issue fixes both.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Trap focus within open settings modals, restore focus to the trigger on close, and close on Escape.
- No visual change.
- Cover trap, escape, and focus-restore in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b a11y/settings-61-focustrap`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: focus trapped, escape closes, focus restored.
- Include the full test output in the PR description.

### Example commit message
`a11y(settings): add modal focus trap`

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
title: "Add tests for settings form validation messages"
labels: type:test, area:settings, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Test settings validation

### Description
settings's inline form validation messages aren't tested. This issue adds coverage.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add tests asserting settings shows the right validation message per invalid field and clears it on fix.
- Deterministic; no real network.
- Do not change behaviour unless a defect is found.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b test/settings-61-formval`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: per-field message, clears on fix.
- Include the full test output in the PR description.

### Example commit message
`test(settings): cover form validation`

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
title: "Add a relative 'last updated' timestamp to settings"
labels: type:feature, area:settings, stack:nextjs, stack:react, stack:typescript, priority:low, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Timestamp settings

### Description
settings doesn't show how fresh its data is. This issue adds a relative last-updated indicator.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Show a relative last-updated timestamp on settings that updates as time passes; use a stable formatter.
- Accessible text alternative with the absolute time.
- Cover formatting in tests with a fixed clock.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/settings-62-updatedts`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: just now, minutes, hours with fixed clock.
- Include the full test output in the PR description.

### Example commit message
`feat(settings): add last-updated timestamp`

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
title: "Add usage examples for the settings hooks"
labels: type:docs, area:settings, stack:nextjs, stack:react, stack:typescript, priority:low, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Document settings hooks

### Description
settings's custom hooks lack usage examples. This issue adds a concise reference.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add a docs entry with usage examples for the settings hooks (inputs, returns, states).
- Keep accurate to the current signatures.
- Link from the docs index.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b docs/settings-61-hooks`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: n/a — verify against source.
- Include the full test output in the PR description.

### Example commit message
`docs(settings): document hooks`

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
title: "Add optimistic UI updates to theme mutations"
labels: type:feature, area:theme, stack:nextjs, stack:react, stack:typescript, priority:medium, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Optimistic theme

### Description
theme mutations wait for the server before updating the UI, feeling sluggish. This issue adds optimistic updates with rollback.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Apply theme mutations optimistically and roll back on error with a clear message.
- Guard against stale overwrites.
- Cover success and rollback in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/theme-61-optimistic`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: success keeps update, error rolls back.
- Include the full test output in the PR description.

### Example commit message
`feat(theme): optimistic updates`

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
title: "Add focus-trap and escape handling to theme modals"
labels: type:a11y, area:theme, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Trap focus in theme

### Description
theme modals don't trap focus or close on escape, hurting keyboard/AT users. This issue fixes both.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Trap focus within open theme modals, restore focus to the trigger on close, and close on Escape.
- No visual change.
- Cover trap, escape, and focus-restore in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b a11y/theme-61-focustrap`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: focus trapped, escape closes, focus restored.
- Include the full test output in the PR description.

### Example commit message
`a11y(theme): add modal focus trap`

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
title: "Add tests for theme form validation messages"
labels: type:test, area:theme, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Test theme validation

### Description
theme's inline form validation messages aren't tested. This issue adds coverage.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add tests asserting theme shows the right validation message per invalid field and clears it on fix.
- Deterministic; no real network.
- Do not change behaviour unless a defect is found.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b test/theme-61-formval`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: per-field message, clears on fix.
- Include the full test output in the PR description.

### Example commit message
`test(theme): cover form validation`

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
title: "Add a relative 'last updated' timestamp to theme"
labels: type:feature, area:theme, stack:nextjs, stack:react, stack:typescript, priority:low, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Timestamp theme

### Description
theme doesn't show how fresh its data is. This issue adds a relative last-updated indicator.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Show a relative last-updated timestamp on theme that updates as time passes; use a stable formatter.
- Accessible text alternative with the absolute time.
- Cover formatting in tests with a fixed clock.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/theme-62-updatedts`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: just now, minutes, hours with fixed clock.
- Include the full test output in the PR description.

### Example commit message
`feat(theme): add last-updated timestamp`

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
title: "Add usage examples for the theme hooks"
labels: type:docs, area:theme, stack:nextjs, stack:react, stack:typescript, priority:low, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Document theme hooks

### Description
theme's custom hooks lack usage examples. This issue adds a concise reference.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add a docs entry with usage examples for the theme hooks (inputs, returns, states).
- Keep accurate to the current signatures.
- Link from the docs index.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b docs/theme-61-hooks`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: n/a — verify against source.
- Include the full test output in the PR description.

### Example commit message
`docs(theme): document hooks`

### Guidelines
- **Minimum 95 percent test coverage** for impacted modules.
- Clear, reviewer-focused documentation.
- **Timeframe: 96 hours.**

### Community & contribution rewards
- 💬 **Join the Liquifact community on Discord:** https://discord.gg/JrGPH4V3
- ⭐ This is a **GrantFox OSS / Official Campaign** task and **may be rewarded**. When your PR is merged you'll be prompted to rate the project — a **5-star rating** is much appreciated.
