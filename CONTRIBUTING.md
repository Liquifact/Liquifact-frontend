# Contributing to LiquiFact Frontend

1. Use Node.js 20.9+ and install with `npm ci`.
2. Branch from `main` and keep changes focused.
3. Run `npm test` and `npm run build` before opening a PR.
4. If you change dependencies, commit the regenerated `package-lock.json`.
5. To check UI test coverage, run `npm run test:coverage`.

Styling lives in `app/globals.css` (design tokens at the top, light and dark
themes). Shared UI is in `components/`, API access and config in `lib/`.
See the [Documentation Index](docs/README.md) for an overview of all repository docs under `docs/`.
