---
type: Feature
title: "Add a loading skeleton to the marketplace view"
labels: type:feature, area:marketplace, stack:nextjs, stack:react, stack:typescript, priority:medium, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Add a marketplace loading skeleton

### Description
The marketplace view shows nothing (or a spinner) while loading, causing layout shift. This issue adds a content-shaped skeleton.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Render a skeleton matching the marketplace layout during load; swap to content on settle.
- Mark it aria-hidden and expose a busy state; no layout shift.
- Cover the skeleton in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/marketplace-11-skeleton`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: fast load, slow load, error replaces skeleton.
- Include the full test output in the PR description.

### Example commit message
`feat(marketplace): add loading skeleton`

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
title: "Make the marketplace controls fully keyboard-operable"
labels: type:a11y, area:marketplace, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Keyboard-operate marketplace

### Description
Some marketplace controls are mouse-only. This issue ensures full keyboard operation with a sensible focus order.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Ensure every interactive marketplace control is reachable and operable by keyboard with a logical focus order.
- Add visible focus styles; do not change visual layout.
- Add tests for keyboard activation.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b a11y/marketplace-11-keyboard`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: tab order, Enter/Space activation, focus visible.
- Include the full test output in the PR description.

### Example commit message
`a11y(marketplace): full keyboard operability`

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
title: "Add client-side validation and inline errors to the marketplace inputs"
labels: type:feature, area:marketplace, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Validate marketplace inputs

### Description
The marketplace inputs accept invalid values silently. This issue adds client-side validation with accessible inline errors.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Validate marketplace inputs and show accessible inline errors (aria-describedby); block submit while invalid.
- Do not weaken any server-side checks; mirror them client-side.
- Cover valid/invalid paths in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/marketplace-12-validation`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: empty, out-of-range, format error, valid submit.
- Include the full test output in the PR description.

### Example commit message
`feat(marketplace): add client-side validation`

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
title: "Wrap the marketplace section in an error boundary with a retry"
labels: type:refactor, area:marketplace, stack:nextjs, stack:react, stack:typescript, priority:medium, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Guard marketplace with an error boundary

### Description
An unexpected render error in marketplace currently blanks the page. This issue wraps it in an error boundary with a retry.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add an error boundary around the marketplace section that shows an accessible fallback with a retry.
- Log the error via the existing seam; do not swallow it silently.
- Cover the fallback and retry in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b refactor/marketplace-11-error-boundary`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: child throws, retry re-renders, normal render unaffected.
- Include the full test output in the PR description.

### Example commit message
`refactor(marketplace): add error boundary with retry`

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
title: "Add automated accessibility (jest-axe) tests for the marketplace view"
labels: type:test, area:marketplace, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## A11y-test the marketplace view

### Description
The marketplace view lacks automated accessibility assertions. This issue adds jest-axe checks.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add jest-axe assertions for the marketplace view's key states (loaded, empty, error).
- Fix any violations surfaced, or document why they are acceptable.
- Keep the test deterministic.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b test/marketplace-11-axe`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: loaded, empty, error states pass axe.
- Include the full test output in the PR description.

### Example commit message
`test(marketplace): add jest-axe accessibility tests`

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
title: "Add a loading skeleton to the invoice-detail view"
labels: type:feature, area:invoice-detail, stack:nextjs, stack:react, stack:typescript, priority:medium, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Add a invoice-detail loading skeleton

### Description
The invoice-detail view shows nothing (or a spinner) while loading, causing layout shift. This issue adds a content-shaped skeleton.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Render a skeleton matching the invoice-detail layout during load; swap to content on settle.
- Mark it aria-hidden and expose a busy state; no layout shift.
- Cover the skeleton in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/invoice-detail-11-skeleton`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: fast load, slow load, error replaces skeleton.
- Include the full test output in the PR description.

### Example commit message
`feat(invoice-detail): add loading skeleton`

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
title: "Make the invoice-detail controls fully keyboard-operable"
labels: type:a11y, area:invoice-detail, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Keyboard-operate invoice-detail

### Description
Some invoice-detail controls are mouse-only. This issue ensures full keyboard operation with a sensible focus order.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Ensure every interactive invoice-detail control is reachable and operable by keyboard with a logical focus order.
- Add visible focus styles; do not change visual layout.
- Add tests for keyboard activation.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b a11y/invoice-detail-11-keyboard`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: tab order, Enter/Space activation, focus visible.
- Include the full test output in the PR description.

### Example commit message
`a11y(invoice-detail): full keyboard operability`

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
title: "Add client-side validation and inline errors to the invoice-detail inputs"
labels: type:feature, area:invoice-detail, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Validate invoice-detail inputs

### Description
The invoice-detail inputs accept invalid values silently. This issue adds client-side validation with accessible inline errors.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Validate invoice-detail inputs and show accessible inline errors (aria-describedby); block submit while invalid.
- Do not weaken any server-side checks; mirror them client-side.
- Cover valid/invalid paths in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/invoice-detail-12-validation`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: empty, out-of-range, format error, valid submit.
- Include the full test output in the PR description.

### Example commit message
`feat(invoice-detail): add client-side validation`

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
title: "Wrap the invoice-detail section in an error boundary with a retry"
labels: type:refactor, area:invoice-detail, stack:nextjs, stack:react, stack:typescript, priority:medium, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Guard invoice-detail with an error boundary

### Description
An unexpected render error in invoice-detail currently blanks the page. This issue wraps it in an error boundary with a retry.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add an error boundary around the invoice-detail section that shows an accessible fallback with a retry.
- Log the error via the existing seam; do not swallow it silently.
- Cover the fallback and retry in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b refactor/invoice-detail-11-error-boundary`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: child throws, retry re-renders, normal render unaffected.
- Include the full test output in the PR description.

### Example commit message
`refactor(invoice-detail): add error boundary with retry`

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
title: "Add automated accessibility (jest-axe) tests for the invoice-detail view"
labels: type:test, area:invoice-detail, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## A11y-test the invoice-detail view

### Description
The invoice-detail view lacks automated accessibility assertions. This issue adds jest-axe checks.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add jest-axe assertions for the invoice-detail view's key states (loaded, empty, error).
- Fix any violations surfaced, or document why they are acceptable.
- Keep the test deterministic.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b test/invoice-detail-11-axe`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: loaded, empty, error states pass axe.
- Include the full test output in the PR description.

### Example commit message
`test(invoice-detail): add jest-axe accessibility tests`

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
title: "Add a loading skeleton to the upload view"
labels: type:feature, area:upload, stack:nextjs, stack:react, stack:typescript, priority:medium, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Add a upload loading skeleton

### Description
The upload view shows nothing (or a spinner) while loading, causing layout shift. This issue adds a content-shaped skeleton.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Render a skeleton matching the upload layout during load; swap to content on settle.
- Mark it aria-hidden and expose a busy state; no layout shift.
- Cover the skeleton in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/upload-11-skeleton`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: fast load, slow load, error replaces skeleton.
- Include the full test output in the PR description.

### Example commit message
`feat(upload): add loading skeleton`

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
title: "Make the upload controls fully keyboard-operable"
labels: type:a11y, area:upload, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Keyboard-operate upload

### Description
Some upload controls are mouse-only. This issue ensures full keyboard operation with a sensible focus order.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Ensure every interactive upload control is reachable and operable by keyboard with a logical focus order.
- Add visible focus styles; do not change visual layout.
- Add tests for keyboard activation.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b a11y/upload-11-keyboard`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: tab order, Enter/Space activation, focus visible.
- Include the full test output in the PR description.

### Example commit message
`a11y(upload): full keyboard operability`

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
title: "Add client-side validation and inline errors to the upload inputs"
labels: type:feature, area:upload, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Validate upload inputs

### Description
The upload inputs accept invalid values silently. This issue adds client-side validation with accessible inline errors.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Validate upload inputs and show accessible inline errors (aria-describedby); block submit while invalid.
- Do not weaken any server-side checks; mirror them client-side.
- Cover valid/invalid paths in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/upload-12-validation`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: empty, out-of-range, format error, valid submit.
- Include the full test output in the PR description.

### Example commit message
`feat(upload): add client-side validation`

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
title: "Wrap the upload section in an error boundary with a retry"
labels: type:refactor, area:upload, stack:nextjs, stack:react, stack:typescript, priority:medium, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Guard upload with an error boundary

### Description
An unexpected render error in upload currently blanks the page. This issue wraps it in an error boundary with a retry.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add an error boundary around the upload section that shows an accessible fallback with a retry.
- Log the error via the existing seam; do not swallow it silently.
- Cover the fallback and retry in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b refactor/upload-11-error-boundary`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: child throws, retry re-renders, normal render unaffected.
- Include the full test output in the PR description.

### Example commit message
`refactor(upload): add error boundary with retry`

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
title: "Add automated accessibility (jest-axe) tests for the upload view"
labels: type:test, area:upload, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## A11y-test the upload view

### Description
The upload view lacks automated accessibility assertions. This issue adds jest-axe checks.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add jest-axe assertions for the upload view's key states (loaded, empty, error).
- Fix any violations surfaced, or document why they are acceptable.
- Keep the test deterministic.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b test/upload-11-axe`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: loaded, empty, error states pass axe.
- Include the full test output in the PR description.

### Example commit message
`test(upload): add jest-axe accessibility tests`

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
title: "Add a loading skeleton to the wallet view"
labels: type:feature, area:wallet, stack:nextjs, stack:react, stack:typescript, priority:medium, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Add a wallet loading skeleton

### Description
The wallet view shows nothing (or a spinner) while loading, causing layout shift. This issue adds a content-shaped skeleton.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Render a skeleton matching the wallet layout during load; swap to content on settle.
- Mark it aria-hidden and expose a busy state; no layout shift.
- Cover the skeleton in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/wallet-11-skeleton`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: fast load, slow load, error replaces skeleton.
- Include the full test output in the PR description.

### Example commit message
`feat(wallet): add loading skeleton`

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
title: "Make the wallet controls fully keyboard-operable"
labels: type:a11y, area:wallet, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Keyboard-operate wallet

### Description
Some wallet controls are mouse-only. This issue ensures full keyboard operation with a sensible focus order.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Ensure every interactive wallet control is reachable and operable by keyboard with a logical focus order.
- Add visible focus styles; do not change visual layout.
- Add tests for keyboard activation.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b a11y/wallet-11-keyboard`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: tab order, Enter/Space activation, focus visible.
- Include the full test output in the PR description.

### Example commit message
`a11y(wallet): full keyboard operability`

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
title: "Add client-side validation and inline errors to the wallet inputs"
labels: type:feature, area:wallet, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Validate wallet inputs

### Description
The wallet inputs accept invalid values silently. This issue adds client-side validation with accessible inline errors.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Validate wallet inputs and show accessible inline errors (aria-describedby); block submit while invalid.
- Do not weaken any server-side checks; mirror them client-side.
- Cover valid/invalid paths in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/wallet-12-validation`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: empty, out-of-range, format error, valid submit.
- Include the full test output in the PR description.

### Example commit message
`feat(wallet): add client-side validation`

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
title: "Wrap the wallet section in an error boundary with a retry"
labels: type:refactor, area:wallet, stack:nextjs, stack:react, stack:typescript, priority:medium, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Guard wallet with an error boundary

### Description
An unexpected render error in wallet currently blanks the page. This issue wraps it in an error boundary with a retry.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add an error boundary around the wallet section that shows an accessible fallback with a retry.
- Log the error via the existing seam; do not swallow it silently.
- Cover the fallback and retry in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b refactor/wallet-11-error-boundary`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: child throws, retry re-renders, normal render unaffected.
- Include the full test output in the PR description.

### Example commit message
`refactor(wallet): add error boundary with retry`

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
title: "Add automated accessibility (jest-axe) tests for the wallet view"
labels: type:test, area:wallet, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## A11y-test the wallet view

### Description
The wallet view lacks automated accessibility assertions. This issue adds jest-axe checks.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add jest-axe assertions for the wallet view's key states (loaded, empty, error).
- Fix any violations surfaced, or document why they are acceptable.
- Keep the test deterministic.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b test/wallet-11-axe`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: loaded, empty, error states pass axe.
- Include the full test output in the PR description.

### Example commit message
`test(wallet): add jest-axe accessibility tests`

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
title: "Add a loading skeleton to the watchlist view"
labels: type:feature, area:watchlist, stack:nextjs, stack:react, stack:typescript, priority:medium, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Add a watchlist loading skeleton

### Description
The watchlist view shows nothing (or a spinner) while loading, causing layout shift. This issue adds a content-shaped skeleton.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Render a skeleton matching the watchlist layout during load; swap to content on settle.
- Mark it aria-hidden and expose a busy state; no layout shift.
- Cover the skeleton in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/watchlist-11-skeleton`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: fast load, slow load, error replaces skeleton.
- Include the full test output in the PR description.

### Example commit message
`feat(watchlist): add loading skeleton`

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
title: "Make the watchlist controls fully keyboard-operable"
labels: type:a11y, area:watchlist, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Keyboard-operate watchlist

### Description
Some watchlist controls are mouse-only. This issue ensures full keyboard operation with a sensible focus order.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Ensure every interactive watchlist control is reachable and operable by keyboard with a logical focus order.
- Add visible focus styles; do not change visual layout.
- Add tests for keyboard activation.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b a11y/watchlist-11-keyboard`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: tab order, Enter/Space activation, focus visible.
- Include the full test output in the PR description.

### Example commit message
`a11y(watchlist): full keyboard operability`

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
title: "Add client-side validation and inline errors to the watchlist inputs"
labels: type:feature, area:watchlist, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Validate watchlist inputs

### Description
The watchlist inputs accept invalid values silently. This issue adds client-side validation with accessible inline errors.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Validate watchlist inputs and show accessible inline errors (aria-describedby); block submit while invalid.
- Do not weaken any server-side checks; mirror them client-side.
- Cover valid/invalid paths in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/watchlist-12-validation`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: empty, out-of-range, format error, valid submit.
- Include the full test output in the PR description.

### Example commit message
`feat(watchlist): add client-side validation`

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
title: "Wrap the watchlist section in an error boundary with a retry"
labels: type:refactor, area:watchlist, stack:nextjs, stack:react, stack:typescript, priority:medium, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Guard watchlist with an error boundary

### Description
An unexpected render error in watchlist currently blanks the page. This issue wraps it in an error boundary with a retry.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add an error boundary around the watchlist section that shows an accessible fallback with a retry.
- Log the error via the existing seam; do not swallow it silently.
- Cover the fallback and retry in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b refactor/watchlist-11-error-boundary`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: child throws, retry re-renders, normal render unaffected.
- Include the full test output in the PR description.

### Example commit message
`refactor(watchlist): add error boundary with retry`

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
title: "Add automated accessibility (jest-axe) tests for the watchlist view"
labels: type:test, area:watchlist, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## A11y-test the watchlist view

### Description
The watchlist view lacks automated accessibility assertions. This issue adds jest-axe checks.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add jest-axe assertions for the watchlist view's key states (loaded, empty, error).
- Fix any violations surfaced, or document why they are acceptable.
- Keep the test deterministic.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b test/watchlist-11-axe`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: loaded, empty, error states pass axe.
- Include the full test output in the PR description.

### Example commit message
`test(watchlist): add jest-axe accessibility tests`

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
title: "Add a loading skeleton to the theme view"
labels: type:feature, area:theme, stack:nextjs, stack:react, stack:typescript, priority:medium, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Add a theme loading skeleton

### Description
The theme view shows nothing (or a spinner) while loading, causing layout shift. This issue adds a content-shaped skeleton.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Render a skeleton matching the theme layout during load; swap to content on settle.
- Mark it aria-hidden and expose a busy state; no layout shift.
- Cover the skeleton in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/theme-11-skeleton`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: fast load, slow load, error replaces skeleton.
- Include the full test output in the PR description.

### Example commit message
`feat(theme): add loading skeleton`

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
title: "Make the theme controls fully keyboard-operable"
labels: type:a11y, area:theme, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Keyboard-operate theme

### Description
Some theme controls are mouse-only. This issue ensures full keyboard operation with a sensible focus order.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Ensure every interactive theme control is reachable and operable by keyboard with a logical focus order.
- Add visible focus styles; do not change visual layout.
- Add tests for keyboard activation.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b a11y/theme-11-keyboard`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: tab order, Enter/Space activation, focus visible.
- Include the full test output in the PR description.

### Example commit message
`a11y(theme): full keyboard operability`

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
title: "Add client-side validation and inline errors to the theme inputs"
labels: type:feature, area:theme, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Validate theme inputs

### Description
The theme inputs accept invalid values silently. This issue adds client-side validation with accessible inline errors.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Validate theme inputs and show accessible inline errors (aria-describedby); block submit while invalid.
- Do not weaken any server-side checks; mirror them client-side.
- Cover valid/invalid paths in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/theme-12-validation`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: empty, out-of-range, format error, valid submit.
- Include the full test output in the PR description.

### Example commit message
`feat(theme): add client-side validation`

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
title: "Wrap the theme section in an error boundary with a retry"
labels: type:refactor, area:theme, stack:nextjs, stack:react, stack:typescript, priority:medium, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Guard theme with an error boundary

### Description
An unexpected render error in theme currently blanks the page. This issue wraps it in an error boundary with a retry.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add an error boundary around the theme section that shows an accessible fallback with a retry.
- Log the error via the existing seam; do not swallow it silently.
- Cover the fallback and retry in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b refactor/theme-11-error-boundary`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: child throws, retry re-renders, normal render unaffected.
- Include the full test output in the PR description.

### Example commit message
`refactor(theme): add error boundary with retry`

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
title: "Add automated accessibility (jest-axe) tests for the theme view"
labels: type:test, area:theme, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## A11y-test the theme view

### Description
The theme view lacks automated accessibility assertions. This issue adds jest-axe checks.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add jest-axe assertions for the theme view's key states (loaded, empty, error).
- Fix any violations surfaced, or document why they are acceptable.
- Keep the test deterministic.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b test/theme-11-axe`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: loaded, empty, error states pass axe.
- Include the full test output in the PR description.

### Example commit message
`test(theme): add jest-axe accessibility tests`

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
title: "Add a loading skeleton to the settings view"
labels: type:feature, area:settings, stack:nextjs, stack:react, stack:typescript, priority:medium, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Add a settings loading skeleton

### Description
The settings view shows nothing (or a spinner) while loading, causing layout shift. This issue adds a content-shaped skeleton.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Render a skeleton matching the settings layout during load; swap to content on settle.
- Mark it aria-hidden and expose a busy state; no layout shift.
- Cover the skeleton in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/settings-11-skeleton`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: fast load, slow load, error replaces skeleton.
- Include the full test output in the PR description.

### Example commit message
`feat(settings): add loading skeleton`

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
title: "Make the settings controls fully keyboard-operable"
labels: type:a11y, area:settings, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Keyboard-operate settings

### Description
Some settings controls are mouse-only. This issue ensures full keyboard operation with a sensible focus order.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Ensure every interactive settings control is reachable and operable by keyboard with a logical focus order.
- Add visible focus styles; do not change visual layout.
- Add tests for keyboard activation.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b a11y/settings-11-keyboard`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: tab order, Enter/Space activation, focus visible.
- Include the full test output in the PR description.

### Example commit message
`a11y(settings): full keyboard operability`

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
title: "Add client-side validation and inline errors to the settings inputs"
labels: type:feature, area:settings, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Validate settings inputs

### Description
The settings inputs accept invalid values silently. This issue adds client-side validation with accessible inline errors.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Validate settings inputs and show accessible inline errors (aria-describedby); block submit while invalid.
- Do not weaken any server-side checks; mirror them client-side.
- Cover valid/invalid paths in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/settings-12-validation`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: empty, out-of-range, format error, valid submit.
- Include the full test output in the PR description.

### Example commit message
`feat(settings): add client-side validation`

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
title: "Wrap the settings section in an error boundary with a retry"
labels: type:refactor, area:settings, stack:nextjs, stack:react, stack:typescript, priority:medium, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Guard settings with an error boundary

### Description
An unexpected render error in settings currently blanks the page. This issue wraps it in an error boundary with a retry.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add an error boundary around the settings section that shows an accessible fallback with a retry.
- Log the error via the existing seam; do not swallow it silently.
- Cover the fallback and retry in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b refactor/settings-11-error-boundary`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: child throws, retry re-renders, normal render unaffected.
- Include the full test output in the PR description.

### Example commit message
`refactor(settings): add error boundary with retry`

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
title: "Add automated accessibility (jest-axe) tests for the settings view"
labels: type:test, area:settings, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## A11y-test the settings view

### Description
The settings view lacks automated accessibility assertions. This issue adds jest-axe checks.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add jest-axe assertions for the settings view's key states (loaded, empty, error).
- Fix any violations surfaced, or document why they are acceptable.
- Keep the test deterministic.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b test/settings-11-axe`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: loaded, empty, error states pass axe.
- Include the full test output in the PR description.

### Example commit message
`test(settings): add jest-axe accessibility tests`

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
title: "Add a loading skeleton to the navigation view"
labels: type:feature, area:navigation, stack:nextjs, stack:react, stack:typescript, priority:medium, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Add a navigation loading skeleton

### Description
The navigation view shows nothing (or a spinner) while loading, causing layout shift. This issue adds a content-shaped skeleton.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Render a skeleton matching the navigation layout during load; swap to content on settle.
- Mark it aria-hidden and expose a busy state; no layout shift.
- Cover the skeleton in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/navigation-11-skeleton`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: fast load, slow load, error replaces skeleton.
- Include the full test output in the PR description.

### Example commit message
`feat(navigation): add loading skeleton`

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
title: "Make the navigation controls fully keyboard-operable"
labels: type:a11y, area:navigation, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Keyboard-operate navigation

### Description
Some navigation controls are mouse-only. This issue ensures full keyboard operation with a sensible focus order.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Ensure every interactive navigation control is reachable and operable by keyboard with a logical focus order.
- Add visible focus styles; do not change visual layout.
- Add tests for keyboard activation.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b a11y/navigation-11-keyboard`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: tab order, Enter/Space activation, focus visible.
- Include the full test output in the PR description.

### Example commit message
`a11y(navigation): full keyboard operability`

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
title: "Add client-side validation and inline errors to the navigation inputs"
labels: type:feature, area:navigation, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Validate navigation inputs

### Description
The navigation inputs accept invalid values silently. This issue adds client-side validation with accessible inline errors.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Validate navigation inputs and show accessible inline errors (aria-describedby); block submit while invalid.
- Do not weaken any server-side checks; mirror them client-side.
- Cover valid/invalid paths in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/navigation-12-validation`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: empty, out-of-range, format error, valid submit.
- Include the full test output in the PR description.

### Example commit message
`feat(navigation): add client-side validation`

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
title: "Wrap the navigation section in an error boundary with a retry"
labels: type:refactor, area:navigation, stack:nextjs, stack:react, stack:typescript, priority:medium, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Guard navigation with an error boundary

### Description
An unexpected render error in navigation currently blanks the page. This issue wraps it in an error boundary with a retry.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add an error boundary around the navigation section that shows an accessible fallback with a retry.
- Log the error via the existing seam; do not swallow it silently.
- Cover the fallback and retry in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b refactor/navigation-11-error-boundary`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: child throws, retry re-renders, normal render unaffected.
- Include the full test output in the PR description.

### Example commit message
`refactor(navigation): add error boundary with retry`

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
title: "Add automated accessibility (jest-axe) tests for the navigation view"
labels: type:test, area:navigation, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## A11y-test the navigation view

### Description
The navigation view lacks automated accessibility assertions. This issue adds jest-axe checks.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add jest-axe assertions for the navigation view's key states (loaded, empty, error).
- Fix any violations surfaced, or document why they are acceptable.
- Keep the test deterministic.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b test/navigation-11-axe`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: loaded, empty, error states pass axe.
- Include the full test output in the PR description.

### Example commit message
`test(navigation): add jest-axe accessibility tests`

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
title: "Add a loading skeleton to the toast view"
labels: type:feature, area:toast, stack:nextjs, stack:react, stack:typescript, priority:medium, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Add a toast loading skeleton

### Description
The toast view shows nothing (or a spinner) while loading, causing layout shift. This issue adds a content-shaped skeleton.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Render a skeleton matching the toast layout during load; swap to content on settle.
- Mark it aria-hidden and expose a busy state; no layout shift.
- Cover the skeleton in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/toast-11-skeleton`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: fast load, slow load, error replaces skeleton.
- Include the full test output in the PR description.

### Example commit message
`feat(toast): add loading skeleton`

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
title: "Make the toast controls fully keyboard-operable"
labels: type:a11y, area:toast, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Keyboard-operate toast

### Description
Some toast controls are mouse-only. This issue ensures full keyboard operation with a sensible focus order.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Ensure every interactive toast control is reachable and operable by keyboard with a logical focus order.
- Add visible focus styles; do not change visual layout.
- Add tests for keyboard activation.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b a11y/toast-11-keyboard`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: tab order, Enter/Space activation, focus visible.
- Include the full test output in the PR description.

### Example commit message
`a11y(toast): full keyboard operability`

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
title: "Add client-side validation and inline errors to the toast inputs"
labels: type:feature, area:toast, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Validate toast inputs

### Description
The toast inputs accept invalid values silently. This issue adds client-side validation with accessible inline errors.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Validate toast inputs and show accessible inline errors (aria-describedby); block submit while invalid.
- Do not weaken any server-side checks; mirror them client-side.
- Cover valid/invalid paths in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/toast-12-validation`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: empty, out-of-range, format error, valid submit.
- Include the full test output in the PR description.

### Example commit message
`feat(toast): add client-side validation`

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
title: "Wrap the toast section in an error boundary with a retry"
labels: type:refactor, area:toast, stack:nextjs, stack:react, stack:typescript, priority:medium, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Guard toast with an error boundary

### Description
An unexpected render error in toast currently blanks the page. This issue wraps it in an error boundary with a retry.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add an error boundary around the toast section that shows an accessible fallback with a retry.
- Log the error via the existing seam; do not swallow it silently.
- Cover the fallback and retry in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b refactor/toast-11-error-boundary`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: child throws, retry re-renders, normal render unaffected.
- Include the full test output in the PR description.

### Example commit message
`refactor(toast): add error boundary with retry`

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
title: "Add automated accessibility (jest-axe) tests for the toast view"
labels: type:test, area:toast, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## A11y-test the toast view

### Description
The toast view lacks automated accessibility assertions. This issue adds jest-axe checks.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add jest-axe assertions for the toast view's key states (loaded, empty, error).
- Fix any violations surfaced, or document why they are acceptable.
- Keep the test deterministic.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b test/toast-11-axe`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: loaded, empty, error states pass axe.
- Include the full test output in the PR description.

### Example commit message
`test(toast): add jest-axe accessibility tests`

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
title: "Add a loading skeleton to the forms view"
labels: type:feature, area:forms, stack:nextjs, stack:react, stack:typescript, priority:medium, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Add a forms loading skeleton

### Description
The forms view shows nothing (or a spinner) while loading, causing layout shift. This issue adds a content-shaped skeleton.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Render a skeleton matching the forms layout during load; swap to content on settle.
- Mark it aria-hidden and expose a busy state; no layout shift.
- Cover the skeleton in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/forms-11-skeleton`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: fast load, slow load, error replaces skeleton.
- Include the full test output in the PR description.

### Example commit message
`feat(forms): add loading skeleton`

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
title: "Make the forms controls fully keyboard-operable"
labels: type:a11y, area:forms, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Keyboard-operate forms

### Description
Some forms controls are mouse-only. This issue ensures full keyboard operation with a sensible focus order.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Ensure every interactive forms control is reachable and operable by keyboard with a logical focus order.
- Add visible focus styles; do not change visual layout.
- Add tests for keyboard activation.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b a11y/forms-11-keyboard`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: tab order, Enter/Space activation, focus visible.
- Include the full test output in the PR description.

### Example commit message
`a11y(forms): full keyboard operability`

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
title: "Add client-side validation and inline errors to the forms inputs"
labels: type:feature, area:forms, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Validate forms inputs

### Description
The forms inputs accept invalid values silently. This issue adds client-side validation with accessible inline errors.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Validate forms inputs and show accessible inline errors (aria-describedby); block submit while invalid.
- Do not weaken any server-side checks; mirror them client-side.
- Cover valid/invalid paths in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/forms-12-validation`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: empty, out-of-range, format error, valid submit.
- Include the full test output in the PR description.

### Example commit message
`feat(forms): add client-side validation`

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
title: "Wrap the forms section in an error boundary with a retry"
labels: type:refactor, area:forms, stack:nextjs, stack:react, stack:typescript, priority:medium, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Guard forms with an error boundary

### Description
An unexpected render error in forms currently blanks the page. This issue wraps it in an error boundary with a retry.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add an error boundary around the forms section that shows an accessible fallback with a retry.
- Log the error via the existing seam; do not swallow it silently.
- Cover the fallback and retry in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b refactor/forms-11-error-boundary`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: child throws, retry re-renders, normal render unaffected.
- Include the full test output in the PR description.

### Example commit message
`refactor(forms): add error boundary with retry`

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
title: "Add automated accessibility (jest-axe) tests for the forms view"
labels: type:test, area:forms, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## A11y-test the forms view

### Description
The forms view lacks automated accessibility assertions. This issue adds jest-axe checks.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add jest-axe assertions for the forms view's key states (loaded, empty, error).
- Fix any violations surfaced, or document why they are acceptable.
- Keep the test deterministic.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b test/forms-11-axe`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: loaded, empty, error states pass axe.
- Include the full test output in the PR description.

### Example commit message
`test(forms): add jest-axe accessibility tests`

### Guidelines
- **Minimum 95 percent test coverage** for impacted modules.
- Clear, reviewer-focused documentation.
- **Timeframe: 96 hours.**

### Community & contribution rewards
- 💬 **Join the Liquifact community on Discord:** https://discord.gg/JrGPH4V3
- ⭐ This is a **GrantFox OSS / Official Campaign** task and **may be rewarded**. When your PR is merged you'll be prompted to rate the project — a **5-star rating** is much appreciated.
