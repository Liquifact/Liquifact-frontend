# Contributing to LiquiFact Frontend

1. Use Node.js 20.9+ and install with `npm ci`.
2. Branch from `main` and keep changes focused.
3. Run `npm test` and `npm run build` before opening a PR.
4. If you change dependencies, commit the regenerated `package-lock.json`.

## End-to-end tests

`e2e/` holds Playwright smoke tests that drive the production build in a real
browser. They cover marketplace filtering and URL sync, opening an invoice, the
submit wizard, the offline demo-data fallback and theme persistence. They need no
backend: the app is built with `NEXT_PUBLIC_API_URL=http://127.0.0.1:4010` and
each spec answers that origin with `page.route` (see `e2e/fixtures.mjs`).

One-time setup:

```bash
npm ci
npx playwright install chromium          # on Linux CI also: --with-deps
```

Run:

```bash
npm run test:e2e                         # builds, starts the app on port 3100, runs headless
npx playwright test e2e/submit.spec.mjs  # a single file
npx playwright test --headed             # watch it run
npx playwright show-report               # open the HTML report after a CI run
```

Notes:

- `npm run test:e2e` runs `npm run build` first, so it replaces `.next/`. Stop
  `npm run dev` before running it. Set `E2E_PORT` to use another port.
- A running server on the port is reused outside CI.
- Every test fails on a browser-logged Content-Security-Policy violation or an
  uncaught page error (including hydration errors).
- `npm test` and `npm run test:ui` do not run `e2e/`.

Styling lives in `app/globals.css` (design tokens at the top, light and dark
themes). Shared UI is in `components/`, API access and config in `lib/`.
See the [Documentation Index](docs/README.md) for an overview of all repository docs under `docs/`.
