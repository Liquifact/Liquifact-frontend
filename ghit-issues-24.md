---
type: Feature
title: "Add a bulk-select and bulk-action toolbar to marketplace"
labels: type:feature, area:marketplace, stack:nextjs, stack:react, stack:typescript, priority:medium, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Bulk actions for marketplace

### Description
Users act on marketplace items one at a time. This issue adds multi-select with a bulk-action toolbar.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add row selection and a bulk-action toolbar (e.g. delete/export) to marketplace; keyboard-accessible with a select-all.
- Confirm destructive bulk actions; announce results.
- Cover select, bulk action, and clear in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/marketplace-31-bulk`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: select-all, partial select, bulk action, clear.
- Include the full test output in the PR description.

### Example commit message
`feat(marketplace): add bulk-select toolbar`

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
title: "Add reduced-motion and high-contrast support to marketplace"
labels: type:a11y, area:marketplace, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Respect motion/contrast prefs in marketplace

### Description
marketplace ignores prefers-reduced-motion and high-contrast, excluding some users. This issue adds support.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Honor prefers-reduced-motion (disable non-essential animation) and ensure high-contrast legibility in marketplace.
- No layout regressions; verify with an a11y check if available.
- Cover the reduced-motion branch in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b a11y/marketplace-31-motion`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: reduced-motion disables animation, contrast legible.
- Include the full test output in the PR description.

### Example commit message
`a11y(marketplace): reduced-motion + high-contrast`

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
title: "Add interaction tests for marketplace error recovery"
labels: type:test, area:marketplace, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Test marketplace error recovery

### Description
marketplace's error-recovery flows (retry, dismiss) aren't tested. This issue adds interaction tests.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add tests driving marketplace into an error state and asserting retry recovers and dismiss clears it.
- Deterministic; no real network.
- Do not change behaviour unless a defect is found.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b test/marketplace-31-recovery`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: error shows, retry recovers, dismiss clears.
- Include the full test output in the PR description.

### Example commit message
`test(marketplace): cover error recovery`

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
title: "Persist marketplace filter and sort state in the URL query"
labels: type:feature, area:marketplace, stack:nextjs, stack:react, stack:typescript, priority:medium, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## URL-persist marketplace state

### Description
marketplace filter/sort resets on reload and can't be shared via link. This issue persists it in the URL query.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Reflect marketplace filter/sort in URL query params and restore from them on load; keep it shareable/back-button friendly.
- Debounce updates; validate incoming params.
- Cover round-trip and invalid params in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/marketplace-32-urlstate`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: restore from URL, invalid params ignored, shareable.
- Include the full test output in the PR description.

### Example commit message
`feat(marketplace): persist filter/sort in URL`

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
title: "Add accessibility notes for the marketplace components"
labels: type:docs, area:marketplace, stack:nextjs, stack:react, stack:typescript, priority:low, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## A11y notes for marketplace

### Description
marketplace's accessibility contract (roles, keyboard, focus) is undocumented. This issue documents it.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add a docs section describing marketplace's roles, keyboard interactions, and focus behaviour for future contributors.
- Keep it accurate to the components.
- Link from the docs index.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b docs/marketplace-31-a11ynotes`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: n/a — verify against components.
- Include the full test output in the PR description.

### Example commit message
`docs(marketplace): add accessibility notes`

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
title: "Add a bulk-select and bulk-action toolbar to invoice-detail"
labels: type:feature, area:invoice-detail, stack:nextjs, stack:react, stack:typescript, priority:medium, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Bulk actions for invoice-detail

### Description
Users act on invoice-detail items one at a time. This issue adds multi-select with a bulk-action toolbar.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add row selection and a bulk-action toolbar (e.g. delete/export) to invoice-detail; keyboard-accessible with a select-all.
- Confirm destructive bulk actions; announce results.
- Cover select, bulk action, and clear in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/invoice-detail-31-bulk`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: select-all, partial select, bulk action, clear.
- Include the full test output in the PR description.

### Example commit message
`feat(invoice-detail): add bulk-select toolbar`

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
title: "Add reduced-motion and high-contrast support to invoice-detail"
labels: type:a11y, area:invoice-detail, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Respect motion/contrast prefs in invoice-detail

### Description
invoice-detail ignores prefers-reduced-motion and high-contrast, excluding some users. This issue adds support.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Honor prefers-reduced-motion (disable non-essential animation) and ensure high-contrast legibility in invoice-detail.
- No layout regressions; verify with an a11y check if available.
- Cover the reduced-motion branch in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b a11y/invoice-detail-31-motion`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: reduced-motion disables animation, contrast legible.
- Include the full test output in the PR description.

### Example commit message
`a11y(invoice-detail): reduced-motion + high-contrast`

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
title: "Add interaction tests for invoice-detail error recovery"
labels: type:test, area:invoice-detail, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Test invoice-detail error recovery

### Description
invoice-detail's error-recovery flows (retry, dismiss) aren't tested. This issue adds interaction tests.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add tests driving invoice-detail into an error state and asserting retry recovers and dismiss clears it.
- Deterministic; no real network.
- Do not change behaviour unless a defect is found.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b test/invoice-detail-31-recovery`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: error shows, retry recovers, dismiss clears.
- Include the full test output in the PR description.

### Example commit message
`test(invoice-detail): cover error recovery`

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
title: "Persist invoice-detail filter and sort state in the URL query"
labels: type:feature, area:invoice-detail, stack:nextjs, stack:react, stack:typescript, priority:medium, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## URL-persist invoice-detail state

### Description
invoice-detail filter/sort resets on reload and can't be shared via link. This issue persists it in the URL query.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Reflect invoice-detail filter/sort in URL query params and restore from them on load; keep it shareable/back-button friendly.
- Debounce updates; validate incoming params.
- Cover round-trip and invalid params in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/invoice-detail-32-urlstate`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: restore from URL, invalid params ignored, shareable.
- Include the full test output in the PR description.

### Example commit message
`feat(invoice-detail): persist filter/sort in URL`

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
title: "Add accessibility notes for the invoice-detail components"
labels: type:docs, area:invoice-detail, stack:nextjs, stack:react, stack:typescript, priority:low, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## A11y notes for invoice-detail

### Description
invoice-detail's accessibility contract (roles, keyboard, focus) is undocumented. This issue documents it.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add a docs section describing invoice-detail's roles, keyboard interactions, and focus behaviour for future contributors.
- Keep it accurate to the components.
- Link from the docs index.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b docs/invoice-detail-31-a11ynotes`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: n/a — verify against components.
- Include the full test output in the PR description.

### Example commit message
`docs(invoice-detail): add accessibility notes`

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
title: "Add a bulk-select and bulk-action toolbar to upload"
labels: type:feature, area:upload, stack:nextjs, stack:react, stack:typescript, priority:medium, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Bulk actions for upload

### Description
Users act on upload items one at a time. This issue adds multi-select with a bulk-action toolbar.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add row selection and a bulk-action toolbar (e.g. delete/export) to upload; keyboard-accessible with a select-all.
- Confirm destructive bulk actions; announce results.
- Cover select, bulk action, and clear in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/upload-31-bulk`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: select-all, partial select, bulk action, clear.
- Include the full test output in the PR description.

### Example commit message
`feat(upload): add bulk-select toolbar`

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
title: "Add reduced-motion and high-contrast support to upload"
labels: type:a11y, area:upload, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Respect motion/contrast prefs in upload

### Description
upload ignores prefers-reduced-motion and high-contrast, excluding some users. This issue adds support.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Honor prefers-reduced-motion (disable non-essential animation) and ensure high-contrast legibility in upload.
- No layout regressions; verify with an a11y check if available.
- Cover the reduced-motion branch in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b a11y/upload-31-motion`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: reduced-motion disables animation, contrast legible.
- Include the full test output in the PR description.

### Example commit message
`a11y(upload): reduced-motion + high-contrast`

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
title: "Add interaction tests for upload error recovery"
labels: type:test, area:upload, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Test upload error recovery

### Description
upload's error-recovery flows (retry, dismiss) aren't tested. This issue adds interaction tests.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add tests driving upload into an error state and asserting retry recovers and dismiss clears it.
- Deterministic; no real network.
- Do not change behaviour unless a defect is found.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b test/upload-31-recovery`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: error shows, retry recovers, dismiss clears.
- Include the full test output in the PR description.

### Example commit message
`test(upload): cover error recovery`

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
title: "Persist upload filter and sort state in the URL query"
labels: type:feature, area:upload, stack:nextjs, stack:react, stack:typescript, priority:medium, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## URL-persist upload state

### Description
upload filter/sort resets on reload and can't be shared via link. This issue persists it in the URL query.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Reflect upload filter/sort in URL query params and restore from them on load; keep it shareable/back-button friendly.
- Debounce updates; validate incoming params.
- Cover round-trip and invalid params in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/upload-32-urlstate`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: restore from URL, invalid params ignored, shareable.
- Include the full test output in the PR description.

### Example commit message
`feat(upload): persist filter/sort in URL`

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
title: "Add accessibility notes for the upload components"
labels: type:docs, area:upload, stack:nextjs, stack:react, stack:typescript, priority:low, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## A11y notes for upload

### Description
upload's accessibility contract (roles, keyboard, focus) is undocumented. This issue documents it.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add a docs section describing upload's roles, keyboard interactions, and focus behaviour for future contributors.
- Keep it accurate to the components.
- Link from the docs index.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b docs/upload-31-a11ynotes`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: n/a — verify against components.
- Include the full test output in the PR description.

### Example commit message
`docs(upload): add accessibility notes`

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
title: "Add a bulk-select and bulk-action toolbar to wallet"
labels: type:feature, area:wallet, stack:nextjs, stack:react, stack:typescript, priority:medium, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Bulk actions for wallet

### Description
Users act on wallet items one at a time. This issue adds multi-select with a bulk-action toolbar.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add row selection and a bulk-action toolbar (e.g. delete/export) to wallet; keyboard-accessible with a select-all.
- Confirm destructive bulk actions; announce results.
- Cover select, bulk action, and clear in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/wallet-31-bulk`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: select-all, partial select, bulk action, clear.
- Include the full test output in the PR description.

### Example commit message
`feat(wallet): add bulk-select toolbar`

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
title: "Add reduced-motion and high-contrast support to wallet"
labels: type:a11y, area:wallet, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Respect motion/contrast prefs in wallet

### Description
wallet ignores prefers-reduced-motion and high-contrast, excluding some users. This issue adds support.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Honor prefers-reduced-motion (disable non-essential animation) and ensure high-contrast legibility in wallet.
- No layout regressions; verify with an a11y check if available.
- Cover the reduced-motion branch in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b a11y/wallet-31-motion`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: reduced-motion disables animation, contrast legible.
- Include the full test output in the PR description.

### Example commit message
`a11y(wallet): reduced-motion + high-contrast`

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
title: "Add interaction tests for wallet error recovery"
labels: type:test, area:wallet, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Test wallet error recovery

### Description
wallet's error-recovery flows (retry, dismiss) aren't tested. This issue adds interaction tests.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add tests driving wallet into an error state and asserting retry recovers and dismiss clears it.
- Deterministic; no real network.
- Do not change behaviour unless a defect is found.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b test/wallet-31-recovery`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: error shows, retry recovers, dismiss clears.
- Include the full test output in the PR description.

### Example commit message
`test(wallet): cover error recovery`

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
title: "Persist wallet filter and sort state in the URL query"
labels: type:feature, area:wallet, stack:nextjs, stack:react, stack:typescript, priority:medium, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## URL-persist wallet state

### Description
wallet filter/sort resets on reload and can't be shared via link. This issue persists it in the URL query.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Reflect wallet filter/sort in URL query params and restore from them on load; keep it shareable/back-button friendly.
- Debounce updates; validate incoming params.
- Cover round-trip and invalid params in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/wallet-32-urlstate`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: restore from URL, invalid params ignored, shareable.
- Include the full test output in the PR description.

### Example commit message
`feat(wallet): persist filter/sort in URL`

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
title: "Add accessibility notes for the wallet components"
labels: type:docs, area:wallet, stack:nextjs, stack:react, stack:typescript, priority:low, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## A11y notes for wallet

### Description
wallet's accessibility contract (roles, keyboard, focus) is undocumented. This issue documents it.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add a docs section describing wallet's roles, keyboard interactions, and focus behaviour for future contributors.
- Keep it accurate to the components.
- Link from the docs index.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b docs/wallet-31-a11ynotes`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: n/a — verify against components.
- Include the full test output in the PR description.

### Example commit message
`docs(wallet): add accessibility notes`

### Guidelines
- **Minimum 95 percent test coverage** for impacted modules.
- Clear, reviewer-focused documentation.
- **Timeframe: 96 hours.**

### Community & contribution rewards
- 💬 **Join the Liquifact community on Discord:** https://discord.gg/JrGPH4V3
- ⭐ This is a **GrantFox OSS / Official Campaign** task and **may be rewarded**. When your PR is merged you'll be prompted to rate the project — a **5-star rating** is much appreciated.
