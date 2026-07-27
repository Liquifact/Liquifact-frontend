---
type: Feature
title: "Add a CSV/JSON export button to marketplace"
labels: type:feature, area:marketplace, stack:nextjs, stack:react, stack:typescript, priority:medium, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Export marketplace

### Description
Users can't export marketplace data. This issue adds a client-side CSV/JSON export of the current view.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Export the currently filtered marketplace view as CSV and JSON with safe escaping; trigger a client download.
- Accessible control; no server round-trip.
- Cover escaping, filter-respect, and empty view in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/marketplace-51-export`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: escaping, respects filter, empty view.
- Include the full test output in the PR description.

### Example commit message
`feat(marketplace): add CSV/JSON export`

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
title: "Add descriptive labels and roles to marketplace icon buttons"
labels: type:a11y, area:marketplace, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Label marketplace icon buttons

### Description
marketplace's icon-only buttons lack accessible names. This issue adds labels and correct roles.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Give every icon-only marketplace control an accessible name (aria-label) and correct role; no visual change.
- Verify with an a11y check if available.
- Cover accessible names in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b a11y/marketplace-51-iconlabels`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: each icon button has an accessible name.
- Include the full test output in the PR description.

### Example commit message
`a11y(marketplace): label icon buttons`

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
title: "Add tests for marketplace empty/loading/error state transitions"
labels: type:test, area:marketplace, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Test marketplace states

### Description
marketplace's state transitions (loading->success/empty/error) aren't fully tested. This issue adds coverage.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add tests asserting marketplace renders the right UI for loading, empty, error, and success, and transitions correctly.
- Deterministic; mutually-exclusive states.
- Do not change behaviour unless a defect is found.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b test/marketplace-51-states`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: loading, empty, error, success exclusivity.
- Include the full test output in the PR description.

### Example commit message
`test(marketplace): cover state transitions`

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
title: "Add a copy-to-clipboard affordance to marketplace identifiers"
labels: type:feature, area:marketplace, stack:nextjs, stack:react, stack:typescript, priority:low, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Copy marketplace ids

### Description
marketplace identifiers can't be copied easily. This issue adds a copy control with a toast and fallback.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add an accessible copy control for marketplace identifiers; Clipboard API with a documented fallback and a toast.
- Keyboard-operable with a clear label.
- Cover success and fallback in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/marketplace-52-copyid`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: success, clipboard-unavailable fallback.
- Include the full test output in the PR description.

### Example commit message
`feat(marketplace): add copy-to-clipboard for ids`

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
title: "Add a component API reference for marketplace"
labels: type:docs, area:marketplace, stack:nextjs, stack:react, stack:typescript, priority:low, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Reference marketplace API

### Description
marketplace's component props/API aren't documented. This issue adds a concise reference.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add a docs entry listing marketplace's components, props, and a minimal usage example.
- Keep accurate to the current API.
- Link from the docs index.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b docs/marketplace-51-apiref`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: n/a — verify props against source.
- Include the full test output in the PR description.

### Example commit message
`docs(marketplace): add component API reference`

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
title: "Add a CSV/JSON export button to invoice-detail"
labels: type:feature, area:invoice-detail, stack:nextjs, stack:react, stack:typescript, priority:medium, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Export invoice-detail

### Description
Users can't export invoice-detail data. This issue adds a client-side CSV/JSON export of the current view.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Export the currently filtered invoice-detail view as CSV and JSON with safe escaping; trigger a client download.
- Accessible control; no server round-trip.
- Cover escaping, filter-respect, and empty view in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/invoice-detail-51-export`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: escaping, respects filter, empty view.
- Include the full test output in the PR description.

### Example commit message
`feat(invoice-detail): add CSV/JSON export`

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
title: "Add descriptive labels and roles to invoice-detail icon buttons"
labels: type:a11y, area:invoice-detail, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Label invoice-detail icon buttons

### Description
invoice-detail's icon-only buttons lack accessible names. This issue adds labels and correct roles.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Give every icon-only invoice-detail control an accessible name (aria-label) and correct role; no visual change.
- Verify with an a11y check if available.
- Cover accessible names in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b a11y/invoice-detail-51-iconlabels`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: each icon button has an accessible name.
- Include the full test output in the PR description.

### Example commit message
`a11y(invoice-detail): label icon buttons`

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
title: "Add tests for invoice-detail empty/loading/error state transitions"
labels: type:test, area:invoice-detail, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Test invoice-detail states

### Description
invoice-detail's state transitions (loading->success/empty/error) aren't fully tested. This issue adds coverage.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add tests asserting invoice-detail renders the right UI for loading, empty, error, and success, and transitions correctly.
- Deterministic; mutually-exclusive states.
- Do not change behaviour unless a defect is found.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b test/invoice-detail-51-states`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: loading, empty, error, success exclusivity.
- Include the full test output in the PR description.

### Example commit message
`test(invoice-detail): cover state transitions`

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
title: "Add a copy-to-clipboard affordance to invoice-detail identifiers"
labels: type:feature, area:invoice-detail, stack:nextjs, stack:react, stack:typescript, priority:low, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Copy invoice-detail ids

### Description
invoice-detail identifiers can't be copied easily. This issue adds a copy control with a toast and fallback.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add an accessible copy control for invoice-detail identifiers; Clipboard API with a documented fallback and a toast.
- Keyboard-operable with a clear label.
- Cover success and fallback in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/invoice-detail-52-copyid`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: success, clipboard-unavailable fallback.
- Include the full test output in the PR description.

### Example commit message
`feat(invoice-detail): add copy-to-clipboard for ids`

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
title: "Add a component API reference for invoice-detail"
labels: type:docs, area:invoice-detail, stack:nextjs, stack:react, stack:typescript, priority:low, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Reference invoice-detail API

### Description
invoice-detail's component props/API aren't documented. This issue adds a concise reference.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add a docs entry listing invoice-detail's components, props, and a minimal usage example.
- Keep accurate to the current API.
- Link from the docs index.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b docs/invoice-detail-51-apiref`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: n/a — verify props against source.
- Include the full test output in the PR description.

### Example commit message
`docs(invoice-detail): add component API reference`

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
title: "Add a CSV/JSON export button to upload"
labels: type:feature, area:upload, stack:nextjs, stack:react, stack:typescript, priority:medium, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Export upload

### Description
Users can't export upload data. This issue adds a client-side CSV/JSON export of the current view.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Export the currently filtered upload view as CSV and JSON with safe escaping; trigger a client download.
- Accessible control; no server round-trip.
- Cover escaping, filter-respect, and empty view in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/upload-51-export`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: escaping, respects filter, empty view.
- Include the full test output in the PR description.

### Example commit message
`feat(upload): add CSV/JSON export`

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
title: "Add descriptive labels and roles to upload icon buttons"
labels: type:a11y, area:upload, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Label upload icon buttons

### Description
upload's icon-only buttons lack accessible names. This issue adds labels and correct roles.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Give every icon-only upload control an accessible name (aria-label) and correct role; no visual change.
- Verify with an a11y check if available.
- Cover accessible names in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b a11y/upload-51-iconlabels`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: each icon button has an accessible name.
- Include the full test output in the PR description.

### Example commit message
`a11y(upload): label icon buttons`

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
title: "Add tests for upload empty/loading/error state transitions"
labels: type:test, area:upload, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Test upload states

### Description
upload's state transitions (loading->success/empty/error) aren't fully tested. This issue adds coverage.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add tests asserting upload renders the right UI for loading, empty, error, and success, and transitions correctly.
- Deterministic; mutually-exclusive states.
- Do not change behaviour unless a defect is found.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b test/upload-51-states`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: loading, empty, error, success exclusivity.
- Include the full test output in the PR description.

### Example commit message
`test(upload): cover state transitions`

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
title: "Add a copy-to-clipboard affordance to upload identifiers"
labels: type:feature, area:upload, stack:nextjs, stack:react, stack:typescript, priority:low, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Copy upload ids

### Description
upload identifiers can't be copied easily. This issue adds a copy control with a toast and fallback.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add an accessible copy control for upload identifiers; Clipboard API with a documented fallback and a toast.
- Keyboard-operable with a clear label.
- Cover success and fallback in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/upload-52-copyid`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: success, clipboard-unavailable fallback.
- Include the full test output in the PR description.

### Example commit message
`feat(upload): add copy-to-clipboard for ids`

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
title: "Add a component API reference for upload"
labels: type:docs, area:upload, stack:nextjs, stack:react, stack:typescript, priority:low, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Reference upload API

### Description
upload's component props/API aren't documented. This issue adds a concise reference.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add a docs entry listing upload's components, props, and a minimal usage example.
- Keep accurate to the current API.
- Link from the docs index.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b docs/upload-51-apiref`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: n/a — verify props against source.
- Include the full test output in the PR description.

### Example commit message
`docs(upload): add component API reference`

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
title: "Add a CSV/JSON export button to wallet"
labels: type:feature, area:wallet, stack:nextjs, stack:react, stack:typescript, priority:medium, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Export wallet

### Description
Users can't export wallet data. This issue adds a client-side CSV/JSON export of the current view.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Export the currently filtered wallet view as CSV and JSON with safe escaping; trigger a client download.
- Accessible control; no server round-trip.
- Cover escaping, filter-respect, and empty view in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/wallet-51-export`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: escaping, respects filter, empty view.
- Include the full test output in the PR description.

### Example commit message
`feat(wallet): add CSV/JSON export`

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
title: "Add descriptive labels and roles to wallet icon buttons"
labels: type:a11y, area:wallet, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Label wallet icon buttons

### Description
wallet's icon-only buttons lack accessible names. This issue adds labels and correct roles.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Give every icon-only wallet control an accessible name (aria-label) and correct role; no visual change.
- Verify with an a11y check if available.
- Cover accessible names in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b a11y/wallet-51-iconlabels`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: each icon button has an accessible name.
- Include the full test output in the PR description.

### Example commit message
`a11y(wallet): label icon buttons`

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
title: "Add tests for wallet empty/loading/error state transitions"
labels: type:test, area:wallet, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Test wallet states

### Description
wallet's state transitions (loading->success/empty/error) aren't fully tested. This issue adds coverage.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add tests asserting wallet renders the right UI for loading, empty, error, and success, and transitions correctly.
- Deterministic; mutually-exclusive states.
- Do not change behaviour unless a defect is found.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b test/wallet-51-states`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: loading, empty, error, success exclusivity.
- Include the full test output in the PR description.

### Example commit message
`test(wallet): cover state transitions`

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
title: "Add a copy-to-clipboard affordance to wallet identifiers"
labels: type:feature, area:wallet, stack:nextjs, stack:react, stack:typescript, priority:low, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Copy wallet ids

### Description
wallet identifiers can't be copied easily. This issue adds a copy control with a toast and fallback.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add an accessible copy control for wallet identifiers; Clipboard API with a documented fallback and a toast.
- Keyboard-operable with a clear label.
- Cover success and fallback in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/wallet-52-copyid`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: success, clipboard-unavailable fallback.
- Include the full test output in the PR description.

### Example commit message
`feat(wallet): add copy-to-clipboard for ids`

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
title: "Add a component API reference for wallet"
labels: type:docs, area:wallet, stack:nextjs, stack:react, stack:typescript, priority:low, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Reference wallet API

### Description
wallet's component props/API aren't documented. This issue adds a concise reference.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add a docs entry listing wallet's components, props, and a minimal usage example.
- Keep accurate to the current API.
- Link from the docs index.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b docs/wallet-51-apiref`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: n/a — verify props against source.
- Include the full test output in the PR description.

### Example commit message
`docs(wallet): add component API reference`

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
title: "Add a CSV/JSON export button to settings"
labels: type:feature, area:settings, stack:nextjs, stack:react, stack:typescript, priority:medium, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Export settings

### Description
Users can't export settings data. This issue adds a client-side CSV/JSON export of the current view.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Export the currently filtered settings view as CSV and JSON with safe escaping; trigger a client download.
- Accessible control; no server round-trip.
- Cover escaping, filter-respect, and empty view in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/settings-51-export`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: escaping, respects filter, empty view.
- Include the full test output in the PR description.

### Example commit message
`feat(settings): add CSV/JSON export`

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
title: "Add descriptive labels and roles to settings icon buttons"
labels: type:a11y, area:settings, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Label settings icon buttons

### Description
settings's icon-only buttons lack accessible names. This issue adds labels and correct roles.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Give every icon-only settings control an accessible name (aria-label) and correct role; no visual change.
- Verify with an a11y check if available.
- Cover accessible names in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b a11y/settings-51-iconlabels`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: each icon button has an accessible name.
- Include the full test output in the PR description.

### Example commit message
`a11y(settings): label icon buttons`

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
title: "Add tests for settings empty/loading/error state transitions"
labels: type:test, area:settings, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Test settings states

### Description
settings's state transitions (loading->success/empty/error) aren't fully tested. This issue adds coverage.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add tests asserting settings renders the right UI for loading, empty, error, and success, and transitions correctly.
- Deterministic; mutually-exclusive states.
- Do not change behaviour unless a defect is found.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b test/settings-51-states`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: loading, empty, error, success exclusivity.
- Include the full test output in the PR description.

### Example commit message
`test(settings): cover state transitions`

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
title: "Add a copy-to-clipboard affordance to settings identifiers"
labels: type:feature, area:settings, stack:nextjs, stack:react, stack:typescript, priority:low, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Copy settings ids

### Description
settings identifiers can't be copied easily. This issue adds a copy control with a toast and fallback.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add an accessible copy control for settings identifiers; Clipboard API with a documented fallback and a toast.
- Keyboard-operable with a clear label.
- Cover success and fallback in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/settings-52-copyid`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: success, clipboard-unavailable fallback.
- Include the full test output in the PR description.

### Example commit message
`feat(settings): add copy-to-clipboard for ids`

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
title: "Add a component API reference for settings"
labels: type:docs, area:settings, stack:nextjs, stack:react, stack:typescript, priority:low, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Reference settings API

### Description
settings's component props/API aren't documented. This issue adds a concise reference.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add a docs entry listing settings's components, props, and a minimal usage example.
- Keep accurate to the current API.
- Link from the docs index.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b docs/settings-51-apiref`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: n/a — verify props against source.
- Include the full test output in the PR description.

### Example commit message
`docs(settings): add component API reference`

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
title: "Add a CSV/JSON export button to theme"
labels: type:feature, area:theme, stack:nextjs, stack:react, stack:typescript, priority:medium, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Export theme

### Description
Users can't export theme data. This issue adds a client-side CSV/JSON export of the current view.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Export the currently filtered theme view as CSV and JSON with safe escaping; trigger a client download.
- Accessible control; no server round-trip.
- Cover escaping, filter-respect, and empty view in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/theme-51-export`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: escaping, respects filter, empty view.
- Include the full test output in the PR description.

### Example commit message
`feat(theme): add CSV/JSON export`

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
title: "Add descriptive labels and roles to theme icon buttons"
labels: type:a11y, area:theme, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Label theme icon buttons

### Description
theme's icon-only buttons lack accessible names. This issue adds labels and correct roles.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Give every icon-only theme control an accessible name (aria-label) and correct role; no visual change.
- Verify with an a11y check if available.
- Cover accessible names in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b a11y/theme-51-iconlabels`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: each icon button has an accessible name.
- Include the full test output in the PR description.

### Example commit message
`a11y(theme): label icon buttons`

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
title: "Add tests for theme empty/loading/error state transitions"
labels: type:test, area:theme, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Test theme states

### Description
theme's state transitions (loading->success/empty/error) aren't fully tested. This issue adds coverage.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add tests asserting theme renders the right UI for loading, empty, error, and success, and transitions correctly.
- Deterministic; mutually-exclusive states.
- Do not change behaviour unless a defect is found.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b test/theme-51-states`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: loading, empty, error, success exclusivity.
- Include the full test output in the PR description.

### Example commit message
`test(theme): cover state transitions`

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
title: "Add a copy-to-clipboard affordance to theme identifiers"
labels: type:feature, area:theme, stack:nextjs, stack:react, stack:typescript, priority:low, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Copy theme ids

### Description
theme identifiers can't be copied easily. This issue adds a copy control with a toast and fallback.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add an accessible copy control for theme identifiers; Clipboard API with a documented fallback and a toast.
- Keyboard-operable with a clear label.
- Cover success and fallback in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/theme-52-copyid`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: success, clipboard-unavailable fallback.
- Include the full test output in the PR description.

### Example commit message
`feat(theme): add copy-to-clipboard for ids`

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
title: "Add a component API reference for theme"
labels: type:docs, area:theme, stack:nextjs, stack:react, stack:typescript, priority:low, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Reference theme API

### Description
theme's component props/API aren't documented. This issue adds a concise reference.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add a docs entry listing theme's components, props, and a minimal usage example.
- Keep accurate to the current API.
- Link from the docs index.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b docs/theme-51-apiref`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: n/a — verify props against source.
- Include the full test output in the PR description.

### Example commit message
`docs(theme): add component API reference`

### Guidelines
- **Minimum 95 percent test coverage** for impacted modules.
- Clear, reviewer-focused documentation.
- **Timeframe: 96 hours.**

### Community & contribution rewards
- 💬 **Join the Liquifact community on Discord:** https://discord.gg/JrGPH4V3
- ⭐ This is a **GrantFox OSS / Official Campaign** task and **may be rewarded**. When your PR is merged you'll be prompted to rate the project — a **5-star rating** is much appreciated.
