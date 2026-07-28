---
type: Feature
title: "Add inline edit mode to marketplace rows"
labels: type:feature, area:marketplace, stack:nextjs, stack:react, stack:typescript, priority:medium, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Inline edit for marketplace

### Description
Editing marketplace requires navigating away. This issue adds inline row editing with save/cancel.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add inline edit with save/cancel to marketplace rows; validate before save and announce the result.
- Keyboard-accessible; escape cancels.
- Cover edit, save, cancel, and validation in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/marketplace-41-inline-edit`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: edit, save, cancel, invalid blocks save.
- Include the full test output in the PR description.

### Example commit message
`feat(marketplace): add inline edit mode`

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
title: "Announce marketplace async action results via a live region"
labels: type:a11y, area:marketplace, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Announce marketplace results

### Description
marketplace async actions complete silently for screen-reader users. This issue adds polite live-region announcements.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Announce success/failure of marketplace async actions via a polite live region; debounce rapid ones.
- No visual change; verify with an a11y check if available.
- Cover the announcement in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b a11y/marketplace-41-live`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: success announced, failure announced, debounced.
- Include the full test output in the PR description.

### Example commit message
`a11y(marketplace): announce async results`

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
title: "Add tests for marketplace pagination / load-more behavior"
labels: type:test, area:marketplace, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Test marketplace paging

### Description
marketplace's pagination/load-more isn't tested for boundaries. This issue adds coverage.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add tests for marketplace's first page, load-more append, end-of-list, and reset-on-filter behaviors.
- Deterministic; no real network.
- Do not change behaviour unless a defect is found.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b test/marketplace-41-paging`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: first page, load more, end, reset.
- Include the full test output in the PR description.

### Example commit message
`test(marketplace): cover pagination behavior`

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
title: "Add a density toggle to the marketplace view"
labels: type:feature, area:marketplace, stack:nextjs, stack:react, stack:typescript, priority:low, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Density toggle for marketplace

### Description
marketplace has a single spacing. This issue adds a persisted compact/comfortable density toggle.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add a density toggle persisted to a namespaced, SSR-guarded key; apply to marketplace spacing and restore on mount.
- Fallback safely on invalid stored values.
- Cover toggle + persistence in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/marketplace-42-density`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: toggle changes density, persists, invalid falls back.
- Include the full test output in the PR description.

### Example commit message
`feat(marketplace): add density toggle`

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
title: "Add a data-flow diagram for marketplace"
labels: type:docs, area:marketplace, stack:nextjs, stack:react, stack:typescript, priority:low, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Diagram marketplace flow

### Description
New contributors lack a visual of how marketplace loads and renders data. This issue adds a diagram + notes.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add a docs section with a mermaid/ASCII diagram of marketplace's data flow (fetch -> transform -> render).
- Keep it accurate to the code.
- Link from the docs index.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b docs/marketplace-41-diagram`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: n/a — verify against code.
- Include the full test output in the PR description.

### Example commit message
`docs(marketplace): add data-flow diagram`

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
title: "Add inline edit mode to invoice-detail rows"
labels: type:feature, area:invoice-detail, stack:nextjs, stack:react, stack:typescript, priority:medium, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Inline edit for invoice-detail

### Description
Editing invoice-detail requires navigating away. This issue adds inline row editing with save/cancel.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add inline edit with save/cancel to invoice-detail rows; validate before save and announce the result.
- Keyboard-accessible; escape cancels.
- Cover edit, save, cancel, and validation in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/invoice-detail-41-inline-edit`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: edit, save, cancel, invalid blocks save.
- Include the full test output in the PR description.

### Example commit message
`feat(invoice-detail): add inline edit mode`

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
title: "Announce invoice-detail async action results via a live region"
labels: type:a11y, area:invoice-detail, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Announce invoice-detail results

### Description
invoice-detail async actions complete silently for screen-reader users. This issue adds polite live-region announcements.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Announce success/failure of invoice-detail async actions via a polite live region; debounce rapid ones.
- No visual change; verify with an a11y check if available.
- Cover the announcement in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b a11y/invoice-detail-41-live`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: success announced, failure announced, debounced.
- Include the full test output in the PR description.

### Example commit message
`a11y(invoice-detail): announce async results`

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
title: "Add tests for invoice-detail pagination / load-more behavior"
labels: type:test, area:invoice-detail, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Test invoice-detail paging

### Description
invoice-detail's pagination/load-more isn't tested for boundaries. This issue adds coverage.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add tests for invoice-detail's first page, load-more append, end-of-list, and reset-on-filter behaviors.
- Deterministic; no real network.
- Do not change behaviour unless a defect is found.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b test/invoice-detail-41-paging`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: first page, load more, end, reset.
- Include the full test output in the PR description.

### Example commit message
`test(invoice-detail): cover pagination behavior`

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
title: "Add a density toggle to the invoice-detail view"
labels: type:feature, area:invoice-detail, stack:nextjs, stack:react, stack:typescript, priority:low, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Density toggle for invoice-detail

### Description
invoice-detail has a single spacing. This issue adds a persisted compact/comfortable density toggle.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add a density toggle persisted to a namespaced, SSR-guarded key; apply to invoice-detail spacing and restore on mount.
- Fallback safely on invalid stored values.
- Cover toggle + persistence in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/invoice-detail-42-density`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: toggle changes density, persists, invalid falls back.
- Include the full test output in the PR description.

### Example commit message
`feat(invoice-detail): add density toggle`

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
title: "Add a data-flow diagram for invoice-detail"
labels: type:docs, area:invoice-detail, stack:nextjs, stack:react, stack:typescript, priority:low, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Diagram invoice-detail flow

### Description
New contributors lack a visual of how invoice-detail loads and renders data. This issue adds a diagram + notes.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add a docs section with a mermaid/ASCII diagram of invoice-detail's data flow (fetch -> transform -> render).
- Keep it accurate to the code.
- Link from the docs index.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b docs/invoice-detail-41-diagram`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: n/a — verify against code.
- Include the full test output in the PR description.

### Example commit message
`docs(invoice-detail): add data-flow diagram`

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
title: "Add inline edit mode to upload rows"
labels: type:feature, area:upload, stack:nextjs, stack:react, stack:typescript, priority:medium, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Inline edit for upload

### Description
Editing upload requires navigating away. This issue adds inline row editing with save/cancel.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add inline edit with save/cancel to upload rows; validate before save and announce the result.
- Keyboard-accessible; escape cancels.
- Cover edit, save, cancel, and validation in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/upload-41-inline-edit`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: edit, save, cancel, invalid blocks save.
- Include the full test output in the PR description.

### Example commit message
`feat(upload): add inline edit mode`

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
title: "Announce upload async action results via a live region"
labels: type:a11y, area:upload, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Announce upload results

### Description
upload async actions complete silently for screen-reader users. This issue adds polite live-region announcements.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Announce success/failure of upload async actions via a polite live region; debounce rapid ones.
- No visual change; verify with an a11y check if available.
- Cover the announcement in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b a11y/upload-41-live`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: success announced, failure announced, debounced.
- Include the full test output in the PR description.

### Example commit message
`a11y(upload): announce async results`

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
title: "Add tests for upload pagination / load-more behavior"
labels: type:test, area:upload, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Test upload paging

### Description
upload's pagination/load-more isn't tested for boundaries. This issue adds coverage.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add tests for upload's first page, load-more append, end-of-list, and reset-on-filter behaviors.
- Deterministic; no real network.
- Do not change behaviour unless a defect is found.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b test/upload-41-paging`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: first page, load more, end, reset.
- Include the full test output in the PR description.

### Example commit message
`test(upload): cover pagination behavior`

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
title: "Add a density toggle to the upload view"
labels: type:feature, area:upload, stack:nextjs, stack:react, stack:typescript, priority:low, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Density toggle for upload

### Description
upload has a single spacing. This issue adds a persisted compact/comfortable density toggle.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add a density toggle persisted to a namespaced, SSR-guarded key; apply to upload spacing and restore on mount.
- Fallback safely on invalid stored values.
- Cover toggle + persistence in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/upload-42-density`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: toggle changes density, persists, invalid falls back.
- Include the full test output in the PR description.

### Example commit message
`feat(upload): add density toggle`

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
title: "Add a data-flow diagram for upload"
labels: type:docs, area:upload, stack:nextjs, stack:react, stack:typescript, priority:low, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Diagram upload flow

### Description
New contributors lack a visual of how upload loads and renders data. This issue adds a diagram + notes.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add a docs section with a mermaid/ASCII diagram of upload's data flow (fetch -> transform -> render).
- Keep it accurate to the code.
- Link from the docs index.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b docs/upload-41-diagram`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: n/a — verify against code.
- Include the full test output in the PR description.

### Example commit message
`docs(upload): add data-flow diagram`

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
title: "Add inline edit mode to wallet rows"
labels: type:feature, area:wallet, stack:nextjs, stack:react, stack:typescript, priority:medium, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Inline edit for wallet

### Description
Editing wallet requires navigating away. This issue adds inline row editing with save/cancel.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add inline edit with save/cancel to wallet rows; validate before save and announce the result.
- Keyboard-accessible; escape cancels.
- Cover edit, save, cancel, and validation in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/wallet-41-inline-edit`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: edit, save, cancel, invalid blocks save.
- Include the full test output in the PR description.

### Example commit message
`feat(wallet): add inline edit mode`

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
title: "Announce wallet async action results via a live region"
labels: type:a11y, area:wallet, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Announce wallet results

### Description
wallet async actions complete silently for screen-reader users. This issue adds polite live-region announcements.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Announce success/failure of wallet async actions via a polite live region; debounce rapid ones.
- No visual change; verify with an a11y check if available.
- Cover the announcement in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b a11y/wallet-41-live`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: success announced, failure announced, debounced.
- Include the full test output in the PR description.

### Example commit message
`a11y(wallet): announce async results`

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
title: "Add tests for wallet pagination / load-more behavior"
labels: type:test, area:wallet, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Test wallet paging

### Description
wallet's pagination/load-more isn't tested for boundaries. This issue adds coverage.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add tests for wallet's first page, load-more append, end-of-list, and reset-on-filter behaviors.
- Deterministic; no real network.
- Do not change behaviour unless a defect is found.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b test/wallet-41-paging`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: first page, load more, end, reset.
- Include the full test output in the PR description.

### Example commit message
`test(wallet): cover pagination behavior`

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
title: "Add a density toggle to the wallet view"
labels: type:feature, area:wallet, stack:nextjs, stack:react, stack:typescript, priority:low, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Density toggle for wallet

### Description
wallet has a single spacing. This issue adds a persisted compact/comfortable density toggle.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add a density toggle persisted to a namespaced, SSR-guarded key; apply to wallet spacing and restore on mount.
- Fallback safely on invalid stored values.
- Cover toggle + persistence in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/wallet-42-density`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: toggle changes density, persists, invalid falls back.
- Include the full test output in the PR description.

### Example commit message
`feat(wallet): add density toggle`

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
title: "Add a data-flow diagram for wallet"
labels: type:docs, area:wallet, stack:nextjs, stack:react, stack:typescript, priority:low, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Diagram wallet flow

### Description
New contributors lack a visual of how wallet loads and renders data. This issue adds a diagram + notes.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add a docs section with a mermaid/ASCII diagram of wallet's data flow (fetch -> transform -> render).
- Keep it accurate to the code.
- Link from the docs index.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b docs/wallet-41-diagram`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: n/a — verify against code.
- Include the full test output in the PR description.

### Example commit message
`docs(wallet): add data-flow diagram`

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
title: "Add inline edit mode to settings rows"
labels: type:feature, area:settings, stack:nextjs, stack:react, stack:typescript, priority:medium, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Inline edit for settings

### Description
Editing settings requires navigating away. This issue adds inline row editing with save/cancel.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add inline edit with save/cancel to settings rows; validate before save and announce the result.
- Keyboard-accessible; escape cancels.
- Cover edit, save, cancel, and validation in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/settings-41-inline-edit`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: edit, save, cancel, invalid blocks save.
- Include the full test output in the PR description.

### Example commit message
`feat(settings): add inline edit mode`

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
title: "Announce settings async action results via a live region"
labels: type:a11y, area:settings, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Announce settings results

### Description
settings async actions complete silently for screen-reader users. This issue adds polite live-region announcements.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Announce success/failure of settings async actions via a polite live region; debounce rapid ones.
- No visual change; verify with an a11y check if available.
- Cover the announcement in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b a11y/settings-41-live`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: success announced, failure announced, debounced.
- Include the full test output in the PR description.

### Example commit message
`a11y(settings): announce async results`

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
title: "Add tests for settings pagination / load-more behavior"
labels: type:test, area:settings, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Test settings paging

### Description
settings's pagination/load-more isn't tested for boundaries. This issue adds coverage.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add tests for settings's first page, load-more append, end-of-list, and reset-on-filter behaviors.
- Deterministic; no real network.
- Do not change behaviour unless a defect is found.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b test/settings-41-paging`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: first page, load more, end, reset.
- Include the full test output in the PR description.

### Example commit message
`test(settings): cover pagination behavior`

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
title: "Add a density toggle to the settings view"
labels: type:feature, area:settings, stack:nextjs, stack:react, stack:typescript, priority:low, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Density toggle for settings

### Description
settings has a single spacing. This issue adds a persisted compact/comfortable density toggle.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add a density toggle persisted to a namespaced, SSR-guarded key; apply to settings spacing and restore on mount.
- Fallback safely on invalid stored values.
- Cover toggle + persistence in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/settings-42-density`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: toggle changes density, persists, invalid falls back.
- Include the full test output in the PR description.

### Example commit message
`feat(settings): add density toggle`

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
title: "Add a data-flow diagram for settings"
labels: type:docs, area:settings, stack:nextjs, stack:react, stack:typescript, priority:low, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Diagram settings flow

### Description
New contributors lack a visual of how settings loads and renders data. This issue adds a diagram + notes.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add a docs section with a mermaid/ASCII diagram of settings's data flow (fetch -> transform -> render).
- Keep it accurate to the code.
- Link from the docs index.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b docs/settings-41-diagram`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: n/a — verify against code.
- Include the full test output in the PR description.

### Example commit message
`docs(settings): add data-flow diagram`

### Guidelines
- **Minimum 95 percent test coverage** for impacted modules.
- Clear, reviewer-focused documentation.
- **Timeframe: 96 hours.**

### Community & contribution rewards
- 💬 **Join the Liquifact community on Discord:** https://discord.gg/JrGPH4V3
- ⭐ This is a **GrantFox OSS / Official Campaign** task and **may be rewarded**. When your PR is merged you'll be prompted to rate the project — a **5-star rating** is much appreciated.
