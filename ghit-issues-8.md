---
type: Feature
title: "Add a Playwright end-to-end test for the invoice PDF upload flow"
labels: type:test, area:e2e-upload, stack:nextjs, stack:react, stack:typescript, priority:high, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---
## Add a Playwright end-to-end test for the invoice PDF upload flow

### Description
`components/UploadZone.jsx` is exercised only by jsdom unit tests (`components/UploadZone.test.jsx`, `components/UploadZone.size.test.tsx`); no browser-level test drives the real `/invoices` page. A Playwright spec under `tests/e2e/` should upload a fixture PDF and assert the success, error, and oversized-file outcomes end to end.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Route the upload request through Playwright's `page.route()` so the spec never touches a live backend.
- Cover: valid PDF success state, non-PDF rejection, oversized-file rejection, and network-failure error copy.
- Register the spec so it is picked up by `playwright.config.mjs` and stays excluded from the Jest run via the existing `testPathIgnorePatterns`.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b test/e2e-upload-flow`
- **Write code in:** `tests/e2e/invoice-upload.spec.ts`
- **Write comprehensive tests in:** `tests/e2e/invoice-upload.spec.ts`
- **Add documentation:** `TESTING.md`

### Test and commit
- Run `npm run lint`, `npm test`, `npm run build`
- Cover edge cases; include test output

### Example commit message
`test(e2e): add Playwright coverage for the invoice PDF upload flow`

### Guidelines
- Minimum 95 percent test coverage for impacted modules
- Clear documentation
- **Timeframe: 96 hours.**

### Community & contribution rewards
- 💬 **Join the Liquifact community on Discord:** https://discord.gg/JrGPH4V3
- ⭐ This is a **GrantFox OSS / Official Campaign** task and **may be rewarded**. When your PR is merged you'll be prompted to rate the project — a **5-star rating** is much appreciated.
++++++
---
type: Feature
title: "Consolidate the duplicated WalletStatus and ToastProvider test suites"
labels: type:refactor, area:test-hygiene, stack:nextjs, stack:react, stack:typescript, priority:medium, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---
## Consolidate the duplicated WalletStatus and ToastProvider test suites

### Description
`WalletStatus` is covered by six overlapping files (`components/WalletStatus.test.jsx`, `components/WalletStatus.test.tsx`, `components/__tests__/WalletStatus.test.jsx`, plus a11y, lazy, and external variants), and `ToastProvider` is tested in both `components/ToastProvider.test.tsx` and `components/__tests__/ToastProvider.test.jsx`. The duplication slows CI and hides which assertions are authoritative.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Pick one location convention (`components/__tests__/`) and merge duplicate assertions without losing any distinct case.
- Keep separate files only where the concern is genuinely different (a11y, lazy mount, external-link safety).
- Verify coverage does not regress before and after the merge.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b refactor/test-hygiene-dedupe`
- **Write code in:** `components/__tests__/WalletStatus.test.jsx`
- **Write comprehensive tests in:** `components/__tests__/ToastProvider.test.jsx`
- **Add documentation:** `TESTING.md`

### Test and commit
- Run `npm run lint`, `npm test`, `npm run build`
- Cover edge cases; include test output

### Example commit message
`refactor(tests): consolidate duplicated WalletStatus and ToastProvider suites`

### Guidelines
- Minimum 95 percent test coverage for impacted modules
- Clear documentation
- **Timeframe: 96 hours.**

### Community & contribution rewards
- 💬 **Join the Liquifact community on Discord:** https://discord.gg/JrGPH4V3
- ⭐ This is a **GrantFox OSS / Official Campaign** task and **may be rewarded**. When your PR is merged you'll be prompted to rate the project — a **5-star rating** is much appreciated.
++++++
---
type: Feature
title: "Add unit tests for the sanitizeUrl protocol allow-list"
labels: type:test, area:url-safety, stack:nextjs, stack:react, stack:typescript, priority:high, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---
## Add unit tests for the sanitizeUrl protocol allow-list

### Description
`utils/sanitizeUrl.ts` guards outbound links but has no test file anywhere in the repo. Because it is the last defence against `javascript:` and `data:` URLs reaching an `href`, it needs direct behavioural coverage.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Assert that `http:`, `https:`, and `mailto:` pass while `javascript:`, `data:`, `vbscript:`, and `file:` are rejected.
- Cover whitespace-padded, mixed-case, and percent-encoded scheme bypass attempts.
- Cover `null`, `undefined`, empty string, and malformed URL inputs.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b test/url-safety-sanitizeurl`
- **Write code in:** `utils/sanitizeUrl.ts`
- **Write comprehensive tests in:** `utils/sanitizeUrl.test.tsx`
- **Add documentation:** `docs/security.md`

### Test and commit
- Run `npm run lint`, `npm test`, `npm run build`
- Cover edge cases; include test output

### Example commit message
`test(url-safety): cover sanitizeUrl protocol allow-list and bypass attempts`

### Guidelines
- Minimum 95 percent test coverage for impacted modules
- Clear documentation
- **Timeframe: 96 hours.**

### Community & contribution rewards
- 💬 **Join the Liquifact community on Discord:** https://discord.gg/JrGPH4V3
- ⭐ This is a **GrantFox OSS / Official Campaign** task and **may be rewarded**. When your PR is merged you'll be prompted to rate the project — a **5-star rating** is much appreciated.
++++++
---
type: Feature
title: "Add unit tests for the date and truncateAddress format helpers"
labels: type:test, area:format-helpers, stack:nextjs, stack:react, stack:typescript, priority:medium, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---
## Add unit tests for the date and truncateAddress format helpers

### Description
`lib/format/currency.js`, `invoice.js`, and `safeJson.js` all have test files, but `lib/format/date.js` and `lib/format/truncateAddress.js` ship untested. Both are used across `components/InvoiceCard.jsx` and `components/WalletStatus.jsx`, so silent regressions would surface directly in the UI.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Test date formatting for ISO strings, `Date` objects, epoch numbers, invalid inputs, and timezone stability.
- Test address truncation for short addresses below the truncation threshold, exact-boundary lengths, and non-string inputs.
- Pin the locale and timezone inside the tests so results are deterministic in CI.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b test/format-helpers-date-address`
- **Write code in:** `lib/format/date.js`
- **Write comprehensive tests in:** `lib/format/date.test.tsx`
- **Add documentation:** `TESTING.md`

### Test and commit
- Run `npm run lint`, `npm test`, `npm run build`
- Cover edge cases; include test output

### Example commit message
`test(format): add coverage for date and truncateAddress helpers`

### Guidelines
- Minimum 95 percent test coverage for impacted modules
- Clear documentation
- **Timeframe: 96 hours.**

### Community & contribution rewards
- 💬 **Join the Liquifact community on Discord:** https://discord.gg/JrGPH4V3
- ⭐ This is a **GrantFox OSS / Official Campaign** task and **may be rewarded**. When your PR is merged you'll be prompted to rate the project — a **5-star rating** is much appreciated.
++++++
---
type: Feature
title: "Add unit tests for getApiBaseUrl normalization and fallback"
labels: type:test, area:api-config, stack:nextjs, stack:react, stack:typescript, priority:medium, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---
## Add unit tests for getApiBaseUrl normalization and fallback

### Description
`lib/api/getApiBaseUrl.js` centralises backend URL resolution and is consumed by `lib/api/health.js` and `lib/api/invoices.js`, yet it has no dedicated test file while its siblings do. Its trailing-slash stripping and default fallback behaviour is load-bearing for every request the app makes.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Cover unset `NEXT_PUBLIC_API_URL`, empty string, whitespace-only, single and multiple trailing slashes, and full URLs with a path prefix.
- Save and restore `process.env` around each case so tests do not leak state.
- Assert the documented default of `http://localhost:3001` matches `.env.local.example`.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b test/api-config-base-url`
- **Write code in:** `lib/api/getApiBaseUrl.js`
- **Write comprehensive tests in:** `lib/api/getApiBaseUrl.test.tsx`
- **Add documentation:** `docs/configuration.md`

### Test and commit
- Run `npm run lint`, `npm test`, `npm run build`
- Cover edge cases; include test output

### Example commit message
`test(api): cover getApiBaseUrl normalization and default fallback`

### Guidelines
- Minimum 95 percent test coverage for impacted modules
- Clear documentation
- **Timeframe: 96 hours.**

### Community & contribution rewards
- 💬 **Join the Liquifact community on Discord:** https://discord.gg/JrGPH4V3
- ⭐ This is a **GrantFox OSS / Official Campaign** task and **may be rewarded**. When your PR is merged you'll be prompted to rate the project — a **5-star rating** is much appreciated.
++++++
---
type: Feature
title: "Enforce a no-raw-process.env ESLint rule outside lib/config/env.js"
labels: type:security, area:env-access, stack:nextjs, stack:react, stack:typescript, priority:high, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---
## Enforce a no-raw-process.env ESLint rule outside lib/config/env.js

### Description
`lib/config/env.js` exists as the typed env loader, yet `lib/api/invoices.js` still reads `process.env.NEXT_PUBLIC_API_URL` directly with its own inline fallback, and other modules do the same. An ESLint restriction would make the loader the single enforced entry point.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add a `no-restricted-syntax` (or equivalent) rule in `eslint.config.mjs` banning `process.env` member access, with an allow-list override for `lib/config/env.js` and config files.
- Migrate the remaining direct readers, starting with `lib/api/invoices.js` and `lib/securityHeaders.mjs` callers, to the loader.
- Add a lint-level test under `tests/lint/` mirroring the existing `tests/lint/no-danger.test.tsx` pattern.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b security/env-access-lint-rule`
- **Write code in:** `eslint.config.mjs`
- **Write comprehensive tests in:** `tests/lint/no-raw-env.test.tsx`
- **Add documentation:** `docs/configuration.md`

### Test and commit
- Run `npm run lint`, `npm test`, `npm run build`
- Cover edge cases; include test output

### Example commit message
`security(env): restrict raw process.env access to the typed env loader`

### Guidelines
- Minimum 95 percent test coverage for impacted modules
- Clear documentation
- **Timeframe: 96 hours.**

### Community & contribution rewards
- 💬 **Join the Liquifact community on Discord:** https://discord.gg/JrGPH4V3
- ⭐ This is a **GrantFox OSS / Official Campaign** task and **may be rewarded**. When your PR is merged you'll be prompted to rate the project — a **5-star rating** is much appreciated.
++++++
---
type: Feature
title: "Replace CSP unsafe-inline with a nonce-based script policy"
labels: type:security, area:csp-nonce, stack:nextjs, stack:react, stack:typescript, priority:high, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---
## Replace CSP unsafe-inline with a nonce-based script policy

### Description
`lib/securityHeaders.mjs` documents that it is kept separate from `next.config.mjs` so it can be reused by middleware "later if we move to per-request CSP nonces". That move should happen: the static policy currently has to permit inline scripts for Next.js hydration, weakening the deny-by-default goal stated in the module header.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Generate a per-request nonce in `middleware.js`, pass it into `buildSecurityHeaders`, and propagate it to Next's script tags.
- Keep `connect-src` for `NEXT_PUBLIC_API_URL` and the Geist font sources intact so wallet and API calls do not break.
- Extend `security/headers.test.tsx` and `tests/security/coop-headers.test.tsx` to assert a nonce is present and that `unsafe-inline` is gone.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b security/csp-nonce-policy`
- **Write code in:** `lib/securityHeaders.mjs`
- **Write comprehensive tests in:** `security/headers.test.tsx`
- **Add documentation:** `docs/security.md`

### Test and commit
- Run `npm run lint`, `npm test`, `npm run build`
- Cover edge cases; include test output

### Example commit message
`security(csp): move to per-request nonces and drop unsafe-inline`

### Guidelines
- Minimum 95 percent test coverage for impacted modules
- Clear documentation
- **Timeframe: 96 hours.**

### Community & contribution rewards
- 💬 **Join the Liquifact community on Discord:** https://discord.gg/JrGPH4V3
- ⭐ This is a **GrantFox OSS / Official Campaign** task and **may be rewarded**. When your PR is merged you'll be prompted to rate the project — a **5-star rating** is much appreciated.
++++++
---
type: Feature
title: "Verify the Freighter provider identity before requesting account access"
labels: type:security, area:wallet-provider, stack:nextjs, stack:react, stack:typescript, priority:high, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---
## Verify the Freighter provider identity before requesting account access

### Description
`lib/wallet/freighter.js` calls `requestAccess()` from `@stellar/freighter-api` as soon as `isConnected()` resolves truthy, with no check that the injected provider is the genuine extension. A malicious page-injected object satisfying the same interface could harvest a connection prompt and impersonate wallet state.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add a provider-integrity check before `connectFreighter()` proceeds, and surface a distinct error type alongside the existing `WrongNetworkError`.
- Ensure the failure path renders a clear message through `components/WalletStatus.jsx` rather than a generic rejection string.
- Extend `lib/wallet/freighter.test.tsx` with a spoofed-provider fixture.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b security/wallet-provider-verification`
- **Write code in:** `lib/wallet/freighter.js`
- **Write comprehensive tests in:** `lib/wallet/freighter.test.tsx`
- **Add documentation:** `WALLET_INTEGRATION_CONTRACT.md`

### Test and commit
- Run `npm run lint`, `npm test`, `npm run build`
- Cover edge cases; include test output

### Example commit message
`security(wallet): verify provider identity before requesting access`

### Guidelines
- Minimum 95 percent test coverage for impacted modules
- Clear documentation
- **Timeframe: 96 hours.**

### Community & contribution rewards
- 💬 **Join the Liquifact community on Discord:** https://discord.gg/JrGPH4V3
- ⭐ This is a **GrantFox OSS / Official Campaign** task and **may be rewarded**. When your PR is merged you'll be prompted to rate the project — a **5-star rating** is much appreciated.
++++++
---
type: Feature
title: "Clamp and escape issuer-supplied invoice text before rendering"
labels: type:security, area:untrusted-text, stack:nextjs, stack:react, stack:typescript, priority:medium, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---
## Clamp and escape issuer-supplied invoice text before rendering

### Description
`fetchInvestableInvoices` in `lib/api/invoices.js` normalizes fields but does not bound their length, so a hostile or buggy backend can return a multi-megabyte issuer name that `components/InvoiceCard.jsx` and `app/invest/[id]/page.js` render verbatim, breaking layout and inflating the DOM.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add a shared string-clamping normalizer applied to issuer, description, and reference fields at the API boundary.
- Strip control characters and bidirectional-override codepoints that could spoof rendered amounts.
- Add fixtures covering oversized, control-character, and RTL-override payloads.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b security/untrusted-text-clamp`
- **Write code in:** `lib/api/invoices.js`
- **Write comprehensive tests in:** `lib/api/invoices.test.ts`
- **Add documentation:** `docs/security.md`

### Test and commit
- Run `npm run lint`, `npm test`, `npm run build`
- Cover edge cases; include test output

### Example commit message
`security(api): clamp and sanitize issuer-supplied invoice text`

### Guidelines
- Minimum 95 percent test coverage for impacted modules
- Clear documentation
- **Timeframe: 96 hours.**

### Community & contribution rewards
- 💬 **Join the Liquifact community on Discord:** https://discord.gg/JrGPH4V3
- ⭐ This is a **GrantFox OSS / Official Campaign** task and **may be rewarded**. When your PR is merged you'll be prompted to rate the project — a **5-star rating** is much appreciated.
++++++
---
type: Feature
title: "Add a SECURITY.md disclosure policy with supported versions"
labels: type:docs, area:disclosure-policy, stack:nextjs, stack:react, stack:typescript, priority:medium, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---
## Add a SECURITY.md disclosure policy with supported versions

### Description
The repo has `docs/security.md` describing controls and a `security-audit` job in `.github/workflows/ci.yml`, but no root `SECURITY.md`, so GitHub shows no reporting path and researchers have nowhere to send findings for a wallet-connected financial app.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Document a private reporting channel, expected acknowledgement and fix windows, and what is in and out of scope.
- Include a supported-versions table and a link to `docs/security.md` for the technical control set.
- Reference the gitleaks and `npm audit` jobs already running in CI so reporters know what is auto-checked.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b docs/disclosure-policy`
- **Write code in:** `SECURITY.md`
- **Write comprehensive tests in:** `tests/security/security-md.test.tsx`
- **Add documentation:** `docs/security.md`

### Test and commit
- Run `npm run lint`, `npm test`, `npm run build`
- Cover edge cases; include test output

### Example commit message
`docs(security): add SECURITY.md disclosure policy and supported versions`

### Guidelines
- Minimum 95 percent test coverage for impacted modules
- Clear documentation
- **Timeframe: 96 hours.**

### Community & contribution rewards
- 💬 **Join the Liquifact community on Discord:** https://discord.gg/JrGPH4V3
- ⭐ This is a **GrantFox OSS / Official Campaign** task and **may be rewarded**. When your PR is merged you'll be prompted to rate the project — a **5-star rating** is much appreciated.
++++++
---
type: Feature
title: "Add a CODEOWNERS file mapping reviewers to frontend areas"
labels: type:docs, area:codeowners, stack:nextjs, stack:react, stack:typescript, priority:low, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---
## Add a CODEOWNERS file mapping reviewers to frontend areas

### Description
`.github/` holds workflows but no `CODEOWNERS`, so campaign PRs touching sensitive areas such as `lib/wallet/`, `lib/securityHeaders.mjs`, and `.github/workflows/` get no automatic reviewer assignment. A path-based ownership map keeps review load predictable as contribution volume rises.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Map ownership for `lib/wallet/`, `lib/api/`, `components/`, `app/`, `docs/`, and `.github/` separately.
- Document in `CONTRIBUTING.md` how the mapping affects review turnaround for external contributors.
- Keep the syntax valid so GitHub does not silently ignore the file.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b docs/codeowners-mapping`
- **Write code in:** `.github/CODEOWNERS`
- **Write comprehensive tests in:** `tests/lint/codeowners.test.tsx`
- **Add documentation:** `CONTRIBUTING.md`

### Test and commit
- Run `npm run lint`, `npm test`, `npm run build`
- Cover edge cases; include test output

### Example commit message
`docs(github): add CODEOWNERS mapping for frontend review areas`

### Guidelines
- Minimum 95 percent test coverage for impacted modules
- Clear documentation
- **Timeframe: 96 hours.**

### Community & contribution rewards
- 💬 **Join the Liquifact community on Discord:** https://discord.gg/JrGPH4V3
- ⭐ This is a **GrantFox OSS / Official Campaign** task and **may be rewarded**. When your PR is merged you'll be prompted to rate the project — a **5-star rating** is much appreciated.
++++++
---
type: Feature
title: "Add a docs index page linking every guide under docs/"
labels: type:docs, area:docs-index, stack:nextjs, stack:react, stack:typescript, priority:low, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---
## Add a docs index page linking every guide under docs/

### Description
`docs/` now contains ten guides (`accessibility.md`, `api-integration.md`, `architecture.md`, `configuration.md`, `design-tokens.md`, `getting-started.md`, `observability.md`, `performance.md`, `security.md`, `wallet-developer-guide.md`) with no index, so newcomers have to browse the directory to discover them.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Write `docs/README.md` grouping the guides by audience: getting started, building features, operating, and contributing.
- Give each entry a one-line description of what question it answers.
- Add a test that fails when a `.md` file in `docs/` is missing from the index, so it cannot drift.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b docs/docs-index`
- **Write code in:** `docs/README.md`
- **Write comprehensive tests in:** `tests/lint/docs-index.test.tsx`
- **Add documentation:** `README.md`

### Test and commit
- Run `npm run lint`, `npm test`, `npm run build`
- Cover edge cases; include test output

### Example commit message
`docs: add an index of every guide under docs/`

### Guidelines
- Minimum 95 percent test coverage for impacted modules
- Clear documentation
- **Timeframe: 96 hours.**

### Community & contribution rewards
- 💬 **Join the Liquifact community on Discord:** https://discord.gg/JrGPH4V3
- ⭐ This is a **GrantFox OSS / Official Campaign** task and **may be rewarded**. When your PR is merged you'll be prompted to rate the project — a **5-star rating** is much appreciated.
++++++
---
type: Feature
title: "Remove the stray Rust and PR-body artifacts from the frontend root"
labels: type:refactor, area:repo-hygiene, stack:nextjs, stack:react, stack:typescript, priority:medium, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---
## Remove the stray Rust and PR-body artifacts from the frontend root

### Description
The frontend root contains files that belong to no frontend build: `Cargo.toml`, `Cargo.lock`, `EXAMPLE_LENDING_INTEGRATION.rs`, `rustup-init.exe`, `contracts/`, plus one-off notes such as `PR_BODY_253.md`, `PR_BODY_260.md`, and `ISSUE_334_IMPLEMENTATION.md`. They confuse newcomers about the stack and bloat clones.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Remove the committed `rustup-init.exe` binary and the Rust/contract artifacts that have no consumer in `package.json` or `next.config.mjs`.
- Archive the still-useful one-off notes into `docs/` and delete the transient PR-body files.
- Extend `.gitignore` so binaries and generated PR bodies cannot be re-added.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b refactor/repo-hygiene-cleanup`
- **Write code in:** `.gitignore`
- **Write comprehensive tests in:** `tests/lint/repo-hygiene.test.tsx`
- **Add documentation:** `docs/architecture.md`

### Test and commit
- Run `npm run lint`, `npm test`, `npm run build`
- Cover edge cases; include test output

### Example commit message
`refactor(repo): drop stray Rust binaries and PR-body artifacts from the root`

### Guidelines
- Minimum 95 percent test coverage for impacted modules
- Clear documentation
- **Timeframe: 96 hours.**

### Community & contribution rewards
- 💬 **Join the Liquifact community on Discord:** https://discord.gg/JrGPH4V3
- ⭐ This is a **GrantFox OSS / Official Campaign** task and **may be rewarded**. When your PR is merged you'll be prompted to rate the project — a **5-star rating** is much appreciated.
++++++
---
type: Feature
title: "Enable TypeScript strict mode and noUncheckedIndexedAccess"
labels: type:refactor, area:ts-strictness, stack:nextjs, stack:react, stack:typescript, priority:high, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---
## Enable TypeScript strict mode and noUncheckedIndexedAccess

### Description
`tsconfig.json` governs the `.ts`/`.tsx` files in `utils/`, `tests/e2e/`, and the growing test suite, but the compiler settings are not strict enough to catch the null-and-undefined bugs that have already appeared in wallet and invoice code paths. Tightening them now is far cheaper than after further TypeScript migration.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Turn on `strict`, `noUncheckedIndexedAccess`, and `noImplicitOverride`, then fix the resulting errors in `utils/sanitizeUrl.ts` and the `.tsx` test files.
- Add a `typecheck` script to `package.json` and wire it into `.github/workflows/ci.yml` before the build step.
- Do not introduce `any` or `@ts-expect-error` suppressions to silence real errors.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b refactor/ts-strictness`
- **Write code in:** `tsconfig.json`
- **Write comprehensive tests in:** `utils/sanitizeUrl.test.tsx`
- **Add documentation:** `CONTRIBUTING.md`

### Test and commit
- Run `npm run lint`, `npm test`, `npm run build`
- Cover edge cases; include test output

### Example commit message
`refactor(ts): enable strict mode and noUncheckedIndexedAccess`

### Guidelines
- Minimum 95 percent test coverage for impacted modules
- Clear documentation
- **Timeframe: 96 hours.**

### Community & contribution rewards
- 💬 **Join the Liquifact community on Discord:** https://discord.gg/JrGPH4V3
- ⭐ This is a **GrantFox OSS / Official Campaign** task and **may be rewarded**. When your PR is merged you'll be prompted to rate the project — a **5-star rating** is much appreciated.
++++++
---
type: Feature
title: "Migrate the lib/format modules from JavaScript to TypeScript"
labels: type:refactor, area:format-typescript, stack:nextjs, stack:react, stack:typescript, priority:medium, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---
## Migrate the lib/format modules from JavaScript to TypeScript

### Description
Every module in `lib/format/` (`currency.js`, `date.js`, `invoice.js`, `safeJson.js`, `truncateAddress.js`) is plain JavaScript with JSDoc, while its tests are already `.tsx`. Converting the smallest, purest layer first gives real type safety at the formatting boundary without a repo-wide rewrite.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Convert each module to `.ts` with exported input and return types, preserving current runtime behaviour exactly.
- Keep import paths stable so `components/InvoiceCard.jsx` and `app/invest/[id]/page.js` need no changes.
- Confirm the Jest `moduleNameMapper` and babel transform in `jest.config.js` still resolve the converted files.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b refactor/format-typescript`
- **Write code in:** `lib/format/currency.ts`
- **Write comprehensive tests in:** `lib/format/currency.test.tsx`
- **Add documentation:** `docs/architecture.md`

### Test and commit
- Run `npm run lint`, `npm test`, `npm run build`
- Cover edge cases; include test output

### Example commit message
`refactor(format): migrate lib/format modules to TypeScript`

### Guidelines
- Minimum 95 percent test coverage for impacted modules
- Clear documentation
- **Timeframe: 96 hours.**

### Community & contribution rewards
- 💬 **Join the Liquifact community on Discord:** https://discord.gg/JrGPH4V3
- ⭐ This is a **GrantFox OSS / Official Campaign** task and **may be rewarded**. When your PR is merged you'll be prompted to rate the project — a **5-star rating** is much appreciated.
++++++
---
type: Feature
title: "Split Jest into unit and accessibility projects for faster runs"
labels: type:performance, area:jest-projects, stack:nextjs, stack:react, stack:typescript, priority:medium, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---
## Split Jest into unit and accessibility projects for faster runs

### Description
`jest.config.js` runs one flat project across every suite, so the slow `jest-axe` passes in `components/__tests__/*.a11y.test.jsx`, `app/page.a11y.test.tsx`, and `components/focus-ring.a11y.test.tsx` block fast unit feedback. Jest `projects` would let contributors run the quick tier locally and CI run both in parallel.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Define `unit` and `a11y` projects with distinct `testMatch` patterns, sharing the existing `moduleNameMapper` and babel transform.
- Add `test:unit` and `test:a11y` scripts to `package.json` while keeping bare `npm test` running everything.
- Measure and report the before/after wall-clock time in the PR description.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b performance/jest-projects-split`
- **Write code in:** `jest.config.js`
- **Write comprehensive tests in:** `tests/lint/jest-projects.test.tsx`
- **Add documentation:** `TESTING.md`

### Test and commit
- Run `npm run lint`, `npm test`, `npm run build`
- Cover edge cases; include test output

### Example commit message
`perf(test): split Jest into unit and accessibility projects`

### Guidelines
- Minimum 95 percent test coverage for impacted modules
- Clear documentation
- **Timeframe: 96 hours.**

### Community & contribution rewards
- 💬 **Join the Liquifact community on Discord:** https://discord.gg/JrGPH4V3
- ⭐ This is a **GrantFox OSS / Official Campaign** task and **may be rewarded**. When your PR is merged you'll be prompted to rate the project — a **5-star rating** is much appreciated.
++++++
---
type: Feature
title: "Add a stale-while-revalidate cache to fetchInvestableInvoices"
labels: type:performance, area:invoice-cache, stack:nextjs, stack:react, stack:typescript, priority:medium, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---
## Add a stale-while-revalidate cache to fetchInvestableInvoices

### Description
`lib/api/invoices.js` issues a fresh network request on every mount of `app/invest/page.js`, so navigating from the marketplace to `app/invest/[id]/page.js` and back re-shows the skeleton in `app/invest/loading.js`. A small in-memory SWR cache would render cached rows instantly while refreshing behind them.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Implement a TTL-bounded module-level cache with an explicit invalidate hook for tests, respecting the existing `AbortSignal` and `InvoiceTimeoutError` contract.
- Do not serve cached data across differing `NEXT_PUBLIC_API_URL` values.
- Assert the second call within the TTL performs no `fetch` and that a stale entry triggers a background refresh.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b performance/invoice-swr-cache`
- **Write code in:** `lib/api/invoices.js`
- **Write comprehensive tests in:** `lib/api/invoices.test.ts`
- **Add documentation:** `docs/performance.md`

### Test and commit
- Run `npm run lint`, `npm test`, `npm run build`
- Cover edge cases; include test output

### Example commit message
`perf(api): add a stale-while-revalidate cache to fetchInvestableInvoices`

### Guidelines
- Minimum 95 percent test coverage for impacted modules
- Clear documentation
- **Timeframe: 96 hours.**

### Community & contribution rewards
- 💬 **Join the Liquifact community on Discord:** https://discord.gg/JrGPH4V3
- ⭐ This is a **GrantFox OSS / Official Campaign** task and **may be rewarded**. When your PR is merged you'll be prompted to rate the project — a **5-star rating** is much appreciated.
++++++
---
type: Feature
title: "Move static invoice detail markup into a Server Component shell"
labels: type:performance, area:rsc-detail, stack:nextjs, stack:react, stack:typescript, priority:medium, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---
## Move static invoice detail markup into a Server Component shell

### Description
`app/invest/[id]/page.js` is a single client component, so the entire detail layout, formatting helpers, and copy strings ship to the browser even though only the fund action needs interactivity. Splitting the static shell out as a Server Component cuts client JavaScript on the highest-intent route.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Keep the interactive fund control and wallet-dependent branches in a small `"use client"` child; render headings, metadata, and formatted values on the server.
- Preserve the current behaviour of `app/invest/[id]/loading.js` and `app/invest/[id]/not-found.js`.
- Record the client-bundle delta against the budgets in `.size-limit.json`.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b performance/rsc-detail-shell`
- **Write code in:** `app/invest/[id]/page.js`
- **Write comprehensive tests in:** `app/invest/[id]/page.test.tsx`
- **Add documentation:** `docs/performance.md`

### Test and commit
- Run `npm run lint`, `npm test`, `npm run build`
- Cover edge cases; include test output

### Example commit message
`perf(invest): split the invoice detail page into a server shell and client action`

### Guidelines
- Minimum 95 percent test coverage for impacted modules
- Clear documentation
- **Timeframe: 96 hours.**

### Community & contribution rewards
- 💬 **Join the Liquifact community on Discord:** https://discord.gg/JrGPH4V3
- ⭐ This is a **GrantFox OSS / Official Campaign** task and **may be rewarded**. When your PR is merged you'll be prompted to rate the project — a **5-star rating** is much appreciated.
++++++
---
type: Feature
title: "Subset and preload the Geist font to remove first-paint layout shift"
labels: type:performance, area:font-loading, stack:nextjs, stack:react, stack:typescript, priority:low, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---
## Subset and preload the Geist font to remove first-paint layout shift

### Description
`app/layout.js` loads Geist through `next/font/google` without an explicit subset, preload, or fallback-metric configuration, so the first paint on `app/page.js` swaps typefaces and shifts the hero. `lib/securityHeaders.mjs` already allow-lists the font hosts, so the remaining work is purely in the loader options.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Set explicit `subsets`, `display`, `preload`, and `adjustFontFallback` options and load only the weights actually used.
- Verify the `__mocks__/next-font-google.js` mock still satisfies `app/layout.test.tsx`.
- Report the cumulative layout shift before and after in the PR description.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b performance/font-loading-subset`
- **Write code in:** `app/layout.js`
- **Write comprehensive tests in:** `app/layout.test.tsx`
- **Add documentation:** `docs/performance.md`

### Test and commit
- Run `npm run lint`, `npm test`, `npm run build`
- Cover edge cases; include test output

### Example commit message
`perf(font): subset and preload Geist to eliminate first-paint shift`

### Guidelines
- Minimum 95 percent test coverage for impacted modules
- Clear documentation
- **Timeframe: 96 hours.**

### Community & contribution rewards
- 💬 **Join the Liquifact community on Discord:** https://discord.gg/JrGPH4V3
- ⭐ This is a **GrantFox OSS / Official Campaign** task and **may be rewarded**. When your PR is merged you'll be prompted to rate the project — a **5-star rating** is much appreciated.
++++++
---
type: Feature
title: "Show an offline and reconnected banner driven by network status"
labels: type:enhancement, area:offline-banner, stack:nextjs, stack:react, stack:typescript, priority:medium, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---
## Show an offline and reconnected banner driven by network status

### Description
When the browser loses connectivity, `app/invest/page.js` and `app/page.js` surface only a generic fetch failure through `components/ErrorBanner.jsx`, which reads as a backend outage. A dedicated offline indicator distinguishes "you are offline" from "the service is down".

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add a `useNetworkStatus` hook subscribing to the `online` and `offline` events with SSR-safe initialisation, matching the pattern in `lib/hooks/useLocalStorage.js`.
- Render a persistent banner while offline and a transient reconnected confirmation via `components/ToastProvider.jsx`.
- Announce both transitions politely so screen-reader users are not left guessing.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b enhancement/offline-banner`
- **Write code in:** `lib/hooks/useNetworkStatus.js`
- **Write comprehensive tests in:** `lib/hooks/useNetworkStatus.test.tsx`
- **Add documentation:** `COMPONENTS.md`

### Test and commit
- Run `npm run lint`, `npm test`, `npm run build`
- Cover edge cases; include test output

### Example commit message
`feat(offline): add a network-status banner with reconnect confirmation`

### Guidelines
- Minimum 95 percent test coverage for impacted modules
- Clear documentation
- **Timeframe: 96 hours.**

### Community & contribution rewards
- 💬 **Join the Liquifact community on Discord:** https://discord.gg/JrGPH4V3
- ⭐ This is a **GrantFox OSS / Official Campaign** task and **may be rewarded**. When your PR is merged you'll be prompted to rate the project — a **5-star rating** is much appreciated.
++++++
---
type: Feature
title: "Let investors star invoices into a persisted watchlist"
labels: type:feature, area:watchlist, stack:nextjs, stack:react, stack:typescript, priority:medium, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---
## Let investors star invoices into a persisted watchlist

### Description
Investors browsing `app/invest/page.js` have no way to shortlist invoices they are considering; every visit restarts from the full list. A star control on `components/InvoiceCard.jsx` backed by `lib/hooks/useLocalStorage.js` would persist a watchlist across sessions.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add a toggle button per card with `aria-pressed` state and a clear accessible name that includes the invoice reference.
- Add a watchlist-only view mode to `components/InvoiceFilters.jsx` that composes with the existing search and filter predicates.
- Handle invoices that disappear from the API by pruning stale watchlist ids on load.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/watchlist-starred-invoices`
- **Write code in:** `lib/hooks/useWatchlist.js`
- **Write comprehensive tests in:** `lib/hooks/useWatchlist.test.tsx`
- **Add documentation:** `COMPONENTS.md`

### Test and commit
- Run `npm run lint`, `npm test`, `npm run build`
- Cover edge cases; include test output

### Example commit message
`feat(invest): add a persisted invoice watchlist with a star toggle`

### Guidelines
- Minimum 95 percent test coverage for impacted modules
- Clear documentation
- **Timeframe: 96 hours.**

### Community & contribution rewards
- 💬 **Join the Liquifact community on Discord:** https://discord.gg/JrGPH4V3
- ⭐ This is a **GrantFox OSS / Official Campaign** task and **may be rewarded**. When your PR is merged you'll be prompted to rate the project — a **5-star rating** is much appreciated.
++++++
---
type: Feature
title: "Add a partial-funding amount input with validation to the detail page"
labels: type:feature, area:partial-funding, stack:nextjs, stack:react, stack:typescript, priority:high, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---
## Add a partial-funding amount input with validation to the detail page

### Description
The fund action on `app/invest/[id]/page.js` is all-or-nothing, so an investor cannot commit part of an invoice. An amount input with live validation against the remaining balance turns the page into a usable funding form.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Validate that the amount is positive, at or below the remaining fundable balance, and within the invoice's decimal precision, with inline messages tied via `aria-describedby`.
- Show the derived expected yield for the entered amount using `lib/format/invoice.js`.
- Keep the button disabled while the input is invalid or a submission is in flight.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/partial-funding-input`
- **Write code in:** `components/FundAmountInput.jsx`
- **Write comprehensive tests in:** `components/FundAmountInput.test.tsx`
- **Add documentation:** `COMPONENTS.md`

### Test and commit
- Run `npm run lint`, `npm test`, `npm run build`
- Cover edge cases; include test output

### Example commit message
`feat(invest): add a validated partial-funding amount input`

### Guidelines
- Minimum 95 percent test coverage for impacted modules
- Clear documentation
- **Timeframe: 96 hours.**

### Community & contribution rewards
- 💬 **Join the Liquifact community on Discord:** https://discord.gg/JrGPH4V3
- ⭐ This is a **GrantFox OSS / Official Campaign** task and **may be rewarded**. When your PR is merged you'll be prompted to rate the project — a **5-star rating** is much appreciated.
++++++
---
type: Feature
title: "Add an invoice lifecycle timeline to the detail page"
labels: type:feature, area:invoice-timeline, stack:nextjs, stack:react, stack:typescript, priority:medium, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---
## Add an invoice lifecycle timeline to the detail page

### Description
`app/invest/[id]/page.js` shows a single current status via `components/StatusPill.jsx`, giving no sense of where the invoice sits in its lifecycle. A vertical timeline of uploaded, verified, listed, funded, and settled makes progress and next steps legible.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Derive stage states from the status enum in `lib/types/invoice.js` and reuse the tone tokens already used by `components/StatusPill.jsx`.
- Mark the current stage with `aria-current` and render the timeline as an ordered list so screen readers get the sequence.
- Degrade gracefully when timestamps for earlier stages are missing from the API payload.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/invoice-timeline`
- **Write code in:** `components/InvoiceTimeline.jsx`
- **Write comprehensive tests in:** `components/InvoiceTimeline.test.tsx`
- **Add documentation:** `COMPONENTS.md`

### Test and commit
- Run `npm run lint`, `npm test`, `npm run build`
- Cover edge cases; include test output

### Example commit message
`feat(invest): add an invoice lifecycle timeline to the detail page`

### Guidelines
- Minimum 95 percent test coverage for impacted modules
- Clear documentation
- **Timeframe: 96 hours.**

### Community & contribution rewards
- 💬 **Join the Liquifact community on Discord:** https://discord.gg/JrGPH4V3
- ⭐ This is a **GrantFox OSS / Official Campaign** task and **may be rewarded**. When your PR is merged you'll be prompted to rate the project — a **5-star rating** is much appreciated.
++++++
---
type: Feature
title: "Add a keyboard shortcut help dialog opened with the question-mark key"
labels: type:feature, area:shortcut-help, stack:nextjs, stack:react, stack:typescript, priority:low, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---
## Add a keyboard shortcut help dialog opened with the question-mark key

### Description
`components/InvoiceSearch.jsx` already registers a global focus shortcut (see `components/InvoiceSearch.shortcut.test.tsx`), but nothing tells users it exists. A `?` help dialog listing every shortcut makes the keyboard surface discoverable as more are added.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Build a modal dialog with `role="dialog"`, `aria-modal`, focus trapping, Escape to close, and focus restored to the previously focused element.
- Ignore the `?` trigger while focus is inside an input, textarea, or contenteditable region.
- Source the shortcut list from one exported registry so new shortcuts appear automatically.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/shortcut-help-dialog`
- **Write code in:** `components/ShortcutHelpDialog.jsx`
- **Write comprehensive tests in:** `components/ShortcutHelpDialog.test.tsx`
- **Add documentation:** `docs/accessibility.md`

### Test and commit
- Run `npm run lint`, `npm test`, `npm run build`
- Cover edge cases; include test output

### Example commit message
`feat(a11y): add a discoverable keyboard shortcut help dialog`

### Guidelines
- Minimum 95 percent test coverage for impacted modules
- Clear documentation
- **Timeframe: 96 hours.**

### Community & contribution rewards
- 💬 **Join the Liquifact community on Discord:** https://discord.gg/JrGPH4V3
- ⭐ This is a **GrantFox OSS / Official Campaign** task and **may be rewarded**. When your PR is merged you'll be prompted to rate the project — a **5-star rating** is much appreciated.
++++++
---
type: Feature
title: "Add a system-preference auto option to the theme toggle"
labels: type:enhancement, area:theme-auto, stack:nextjs, stack:react, stack:typescript, priority:low, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---
## Add a system-preference auto option to the theme toggle

### Description
`components/ThemeToggle.jsx` flips between an explicit light and dark choice, so a user whose OS switches to dark at sunset keeps whatever they last picked. A third `auto` state that follows `prefers-color-scheme` and updates live restores that behaviour.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Cycle through light, dark, and auto, persisting the choice via `lib/hooks/useLocalStorage.js` and defaulting to auto for first-time visitors.
- Subscribe to `prefers-color-scheme` change events while in auto mode and unsubscribe on unmount.
- Keep the toggle's accessible name describing both the current mode and the resolved theme.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b enhancement/theme-auto-mode`
- **Write code in:** `components/ThemeToggle.jsx`
- **Write comprehensive tests in:** `components/ThemeToggle.test.tsx`
- **Add documentation:** `docs/design-tokens.md`

### Test and commit
- Run `npm run lint`, `npm test`, `npm run build`
- Cover edge cases; include test output

### Example commit message
`feat(theme): add an auto mode that follows the system color scheme`

### Guidelines
- Minimum 95 percent test coverage for impacted modules
- Clear documentation
- **Timeframe: 96 hours.**

### Community & contribution rewards
- 💬 **Join the Liquifact community on Discord:** https://discord.gg/JrGPH4V3
- ⭐ This is a **GrantFox OSS / Official Campaign** task and **may be rewarded**. When your PR is merged you'll be prompted to rate the project — a **5-star rating** is much appreciated.
++++++
---
type: Feature
title: "Give the marketplace filter chips a roving tabindex group"
labels: type:a11y, area:roving-tabindex, stack:nextjs, stack:react, stack:typescript, priority:medium, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---
## Give the marketplace filter chips a roving tabindex group

### Description
`components/InvoiceFilters.jsx` renders each filter chip as an independently focusable button, so a keyboard user must tab through every option to reach the invoice list. A roving tabindex makes the group one tab stop with arrow-key navigation inside it, matching the ARIA toolbar pattern.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Give the group a `role="toolbar"` with an accessible name; only the active chip carries `tabindex="0"`.
- Support Left/Right/Home/End with wrap-around, and keep the existing `aria-pressed` selection semantics intact.
- Verify the focus ring still meets the contract asserted in `components/focus-ring.a11y.test.tsx`.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b a11y/roving-tabindex-filters`
- **Write code in:** `components/InvoiceFilters.jsx`
- **Write comprehensive tests in:** `components/InvoiceFilters.roving.test.tsx`
- **Add documentation:** `docs/accessibility.md`

### Test and commit
- Run `npm run lint`, `npm test`, `npm run build`
- Cover edge cases; include test output

### Example commit message
`fix(a11y): give marketplace filter chips a roving tabindex toolbar`

### Guidelines
- Minimum 95 percent test coverage for impacted modules
- Clear documentation
- **Timeframe: 96 hours.**

### Community & contribution rewards
- 💬 **Join the Liquifact community on Discord:** https://discord.gg/JrGPH4V3
- ⭐ This is a **GrantFox OSS / Official Campaign** task and **may be rewarded**. When your PR is merged you'll be prompted to rate the project — a **5-star rating** is much appreciated.
++++++
---
type: Feature
title: "Support Windows High Contrast mode across the theme tokens"
labels: type:a11y, area:forced-colors, stack:nextjs, stack:react, stack:typescript, priority:medium, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---
## Support Windows High Contrast mode across the theme tokens

### Description
`app/globals.css` defines the palette through `@theme inline` tokens and is verified by `app/globals.contrast.test.tsx` for normal viewing, but nothing handles `forced-colors: active`. In Windows High Contrast mode the status tones in `components/StatusPill.jsx` and the focus rings collapse to system colors and lose meaning.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Add a `@media (forced-colors: active)` block mapping surfaces, borders, and focus outlines to system color keywords.
- Ensure `components/StatusPill.jsx` keeps a non-color cue, such as a text label or shape, so status is not conveyed by color alone.
- Preserve visible focus by setting `forced-color-adjust` and an explicit outline where the token-based ring is dropped.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b a11y/forced-colors-support`
- **Write code in:** `app/globals.css`
- **Write comprehensive tests in:** `app/globals.forced-colors.test.tsx`
- **Add documentation:** `docs/accessibility.md`

### Test and commit
- Run `npm run lint`, `npm test`, `npm run build`
- Cover edge cases; include test output

### Example commit message
`fix(a11y): support forced-colors mode across theme tokens and status pills`

### Guidelines
- Minimum 95 percent test coverage for impacted modules
- Clear documentation
- **Timeframe: 96 hours.**

### Community & contribution rewards
- 💬 **Join the Liquifact community on Discord:** https://discord.gg/JrGPH4V3
- ⭐ This is a **GrantFox OSS / Official Campaign** task and **may be rewarded**. When your PR is merged you'll be prompted to rate the project — a **5-star rating** is much appreciated.
++++++
---
type: Feature
title: "Add aria-sort to the marketplace sortable column controls"
labels: type:a11y, area:aria-sort, stack:nextjs, stack:react, stack:typescript, priority:medium, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---
## Add aria-sort to the marketplace sortable column controls

### Description
The sort-direction controls exercised by `components/InvoiceFilters.sortdir.test.tsx` change the order of `components/InvoiceList.jsx` visually, but expose no programmatic sort state. Screen-reader users get no indication of which field is active or in which direction.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Set `aria-sort` to `ascending`, `descending`, or `none` on the appropriate container for each sortable field, with only one active at a time.
- Announce the applied sort through a polite live region without duplicating the existing results-summary announcement.
- Keep the control's accessible name describing the action, not just the field.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b a11y/aria-sort-marketplace`
- **Write code in:** `components/InvoiceFilters.jsx`
- **Write comprehensive tests in:** `components/InvoiceFilters.ariasort.test.tsx`
- **Add documentation:** `docs/accessibility.md`

### Test and commit
- Run `npm run lint`, `npm test`, `npm run build`
- Cover edge cases; include test output

### Example commit message
`fix(a11y): expose aria-sort state on marketplace sort controls`

### Guidelines
- Minimum 95 percent test coverage for impacted modules
- Clear documentation
- **Timeframe: 96 hours.**

### Community & contribution rewards
- 💬 **Join the Liquifact community on Discord:** https://discord.gg/JrGPH4V3
- ⭐ This is a **GrantFox OSS / Official Campaign** task and **may be rewarded**. When your PR is merged you'll be prompted to rate the project — a **5-star rating** is much appreciated.
++++++
---
type: Feature
title: "Guard the fund action against duplicate in-flight submissions"
labels: type:security, area:double-submit, stack:nextjs, stack:react, stack:typescript, priority:high, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---
## Guard the fund action against duplicate in-flight submissions

### Description
The fund control on `app/invest/[id]/page.js` triggers a wallet flow through `lib/wallet/freighter.js`, and a double click or an Enter keypress during the wallet popup can dispatch a second request before the first settles. For a money-moving action that guard must be explicit rather than incidental.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Track in-flight state in a ref so rapid repeat activations are dropped before any wallet call is made, not just visually disabled.
- Generate an idempotency key per funding attempt and reuse it for retries of the same intent.
- Cover rapid double click, Enter-then-Space, and unmount-during-flight in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b security/double-submit-guard`
- **Write code in:** `app/invest/[id]/page.js`
- **Write comprehensive tests in:** `app/invest/[id]/page.test.tsx`
- **Add documentation:** `WALLET_INTEGRATION_CONTRACT.md`

### Test and commit
- Run `npm run lint`, `npm test`, `npm run build`
- Cover edge cases; include test output

### Example commit message
`security(invest): prevent duplicate in-flight funding submissions`

### Guidelines
- Minimum 95 percent test coverage for impacted modules
- Clear documentation
- **Timeframe: 96 hours.**

### Community & contribution rewards
- 💬 **Join the Liquifact community on Discord:** https://discord.gg/JrGPH4V3
- ⭐ This is a **GrantFox OSS / Official Campaign** task and **may be rewarded**. When your PR is merged you'll be prompted to rate the project — a **5-star rating** is much appreciated.
++++++
---
type: Feature
title: "Auto-disconnect the wallet session after a period of inactivity"
labels: type:security, area:idle-disconnect, stack:nextjs, stack:react, stack:typescript, priority:medium, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---
## Auto-disconnect the wallet session after a period of inactivity

### Description
`components/WalletProvider.jsx` rehydrates a persisted connection snapshot on load and keeps it indefinitely, so a shared or unattended machine shows a connected wallet with a funding button ready. An idle timeout that clears the snapshot bounds that exposure.

### Requirements and context
- **Repository scope:** Liquifact/Liquifact-frontend only.
- Reset an inactivity timer on pointer, key, and visibility events; on expiry clear the persisted snapshot and return to the disconnected state.
- Warn shortly before disconnecting via `components/ToastProvider.jsx` with an option to stay connected.
- Never leave a stale address rendered in `components/WalletStatus.jsx` after expiry.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b security/idle-wallet-disconnect`
- **Write code in:** `components/WalletProvider.jsx`
- **Write comprehensive tests in:** `components/WalletProvider.test.tsx`
- **Add documentation:** `docs/security.md`

### Test and commit
- Run `npm run lint`, `npm test`, `npm run build`
- Cover edge cases; include test output

### Example commit message
`security(wallet): auto-disconnect the wallet session after inactivity`

### Guidelines
- Minimum 95 percent test coverage for impacted modules
- Clear documentation
- **Timeframe: 96 hours.**

### Community & contribution rewards
- 💬 **Join the Liquifact community on Discord:** https://discord.gg/JrGPH4V3
- ⭐ This is a **GrantFox OSS / Official Campaign** task and **may be rewarded**. When your PR is merged you'll be prompted to rate the project — a **5-star rating** is much appreciated.
