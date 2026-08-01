# Documentation index

Guides for the LiquiFact frontend, grouped by audience. Every Markdown file under
`docs/` (except this index) must appear here — `tests/lint/docs-index.test.tsx`
fails when a guide is missing from the index.

---

## Getting started

| Guide | Answers |
| ----- | ------- |
| [Getting started](getting-started.md) | How do I run the app locally, run tests, and fix common setup issues? |
| [Architecture & data flow](architecture.md) | How are App Router routes, API clients, and shared state wired together? |
| [Configuration](configuration.md) | Which environment variables exist, and what are their defaults and rules? |
| [Design tokens](design-tokens.md) | Which Tailwind/`@theme` tokens should I use instead of hard-coded values? |
| [Dashboard theming](dashboard-theming.md) | How does the dashboard resolve light/dark/system theme preferences? |
| [Theme theming](theme-theming.md) | How does the shared theme layer resolve preferences and consume tokens? |

---

## Building features

| Guide | Answers |
| ----- | ------- |
| [API integration](api-integration.md) | How does the frontend talk to the Express backend (mock vs live contract)? |
| [Invoice data contract](invoice-data.md) | What shape do invoice fixtures use, and how do formatted vs raw values differ? |
| [Marketplace usage](marketplace.md) | How do I use marketplace components on `/invest`? |
| [Marketplace API](marketplace-api.md) | What props do Invest marketplace UI components expose? |
| [Marketplace data flow](marketplace-data-flow.md) | How do invoices move from fetch through filter/sort/pagination to render? |
| [Invoice detail usage](invoice-detail-usage.md) | How do I use invoice-detail components on `/invest/[id]`? |
| [Invoice detail flow](invoice-detail-flow.md) | How does `/invest/[id]` fetch, transform, and render an invoice (diagram)? |
| [Invoice detail data flow](invoice-detail-data-flow.md) | What is the full data lifecycle for the invoice-detail route? |
| [Upload API](upload-api.md) | What is the component API for `UploadZone`? |
| [Upload data flow](upload-data-flow.md) | How does invoice upload move from file selection through API submission? |
| [Settings API](settings-api.md) | What props and surfaces does the settings UI expose? |
| [Settings data flow](settings-data-flow.md) | How do settings load, validate, persist, and re-render? |
| [Wallet developer guide](wallet-developer-guide.md) | How do I integrate and extend the Stellar wallet subsystem? |
| [Wallet API reference](wallet-api-reference.md) | What is the full API surface of the wallet components and helpers? |
| [Wallet data flow](wallet-data-flow.md) | How does wallet connect, hydrate, and persist across SSR and the client? |

---

## Operating

| Guide | Answers |
| ----- | ------- |
| [Observability](observability.md) | How are client-side errors caught and reported to a pluggable sink? |
| [Performance](performance.md) | What bundle-size budgets exist and how do we guard against bloat? |
| [Security](security.md) | What XSS and related security practices does the frontend enforce? |

---

## Contributing

| Guide | Answers |
| ----- | ------- |
| [Accessibility](accessibility.md) | What WCAG commitments, focus patterns, and a11y checklists apply repo-wide? |
| [Invoice detail accessibility](invoice-detail-a11y.md) | What roles, keyboard, and focus contracts apply on `/invest/[id]`? |
| [Upload accessibility](upload-a11y.md) | What ARIA and keyboard contracts does `UploadZone` require? |
| [Issue #334 CPU budget notes](issue-334-cpu-budget-median-throttling.md) | Why was median-price telemetry throttled for Soroban CPU budgets? |
| [Issue #334 flow diagram](issue-334-flow-diagram.md) | How does the buffer-truncation flow for issue #334 work? |
