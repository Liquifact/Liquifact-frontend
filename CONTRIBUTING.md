# Contributing to LiquiFact Frontend

Thanks for improving the LiquiFact frontend. This guide keeps contribution setup, review expectations, and campaign workflow in one place.

## Local Setup

Use Node.js 20 and npm 9 or newer.

```bash
npm ci
cp .env.local.example .env.local # optional
npm run dev
```

The app runs at `http://localhost:3000`. Set `NEXT_PUBLIC_API_URL` in `.env.local` when testing against a non-default backend.

## Branches and Commits

Create branches from `main` using a focused name:

```text
<type>/<area>-<issue-number>-<short-slug>
```

Examples:

```text
docs/community-106-contributing-templates
fix/invoices-42-empty-state
feature/wallet-18-connect-flow
```

Use conventional commit style where practical, such as `docs: add contributor templates` or `fix: handle upload errors`.

## Checks

Run the checks that match your change before opening a pull request:

```bash
npm run lint
npm test
npm run build
```

CI currently runs `npm ci`, `npm run lint`, and `npm test --silent` on pull requests to `main`. Run `npm run build` locally for UI or routing changes because the build command is part of the documented workflow even when a PR only changes a small surface.

## Code Review Assignment (CODEOWNERS)

[.github/CODEOWNERS](.github/CODEOWNERS) maps file paths to reviewers so GitHub can automatically request review on pull requests that touch a given area:

| Path | Area |
| --- | --- |
| `/app/` | Application routes and pages |
| `/components/` | Shared UI components |
| `/lib/wallet/` | Wallet integration (Freighter, signing, connection flows) |
| `/lib/api/` | API client layer |
| `/lib/securityHeaders.mjs` | Security headers configuration |
| `/docs/`, `CONTRIBUTING.md` | Documentation |
| `/.github/` | CI/CD workflows and repo automation |
| everything else | Falls back to the catch-all (`*`) owner |

What this means for review turnaround, especially for external contributors:

- A pull request is automatically routed to the owner(s) of every area it touches. A PR that only edits `components/` gets a different (usually faster) reviewer path than one that also touches `lib/wallet/` or `.github/workflows/`.
- **Sensitive areas take longer.** Changes under `/lib/wallet/`, `/lib/securityHeaders.mjs`, and `/.github/` require sign-off from that area's owner before merge, since these directories affect fund safety, security posture, or CI trust. Expect a longer review cycle than for `components/` or `docs/` changes.
- Scoping a PR to a single area (per the branch-naming convention above) keeps it mapped to one reviewer group and avoids waiting on multiple owners.
- If your PR spans multiple owned areas (e.g. a `components/` change plus a `lib/wallet/` change), all relevant owners are requested — plan for the slowest area to set the review timeline.
- The mapping in `.github/CODEOWNERS` currently uses placeholder owner handles (`@OWNER-*`). Repo maintainers are responsible for keeping these pointed at real, active GitHub users or teams; if a PR sits without a review request, flag it in the campaign Discord rather than assuming no one owns the area.

## Formatting

The project uses **Prettier** to enforce a consistent code style.

- Run `npm run format` to reformat the entire codebase.
- CI includes a `format:check` step (`npm run format:check`) that fails if any file is not properly formatted.
- The configuration lives in `.prettierrc` and `.prettierignore`.
- This gate ensures that all contributions adhere to the same style before merging.

## Testing and Accessibility

The repo uses Jest, React Testing Library, `@testing-library/user-event`, and `jest-axe` for component and accessibility checks.

- Prefer user-facing role, label, and text assertions.
- Cover loading, empty, success, and error states when touching UI flows.
- Keep `jest-axe` checks for components that render interactive or landmark content.
- Use Playwright only for end-to-end smoke paths that need browser behavior.

## UI Guidelines

Follow the existing App Router structure under `app/` and reuse shared components under `components/` before adding new primitives. Keep Tailwind classes consistent with nearby pages, preserve keyboard focus behavior, and do not commit generated build output.

## Pull Request Checklist

Before requesting review, confirm:

- The PR references the issue with `Closes #<issue-number>`.
- Lint and tests were run, or the reason is documented.
- UI changes include accessible labels, focus states, and relevant tests.
- Documentation was updated for setup, workflow, or behavior changes.
- No secrets, `.env` files, wallet keys, or generated artifacts were committed.

## Community and Campaign

This repository is part of the GrantFox OSS / Official Campaign. Use the LiquiFact Discord linked in campaign issues for coordination, review questions, and reward follow-up after eligible merged work.
