# Getting started

This guide covers the fastest way to run LiquiFact Frontend locally, run tests, and troubleshoot the most common setup issues.

## Prerequisites

- Node.js 20 LTS or newer
- npm 9 or newer
- A terminal with Git available

## Install and run locally

1. Clone the repository and enter the project directory:

   ```bash
   git clone <your-fork-url>
   cd liquifact-frontend
   ```

2. Install dependencies:

   ```bash
   npm ci
   ```

3. Copy the example environment file if you need local config:

   ```bash
   cp .env.local.example .env.local
   ```

4. Start the development server:

   ```bash
   npm run dev
   ```

   The app will be available at http://localhost:3000 unless a different port is already in use.

## Useful commands

- `npm run dev` — start the Next.js development server
- For marketplace component props and a minimal usage example, see [marketplace-api.md](marketplace-api.md).
- `npm run lint` — run ESLint across the repository
- `npm test` — run the Jest unit and accessibility test suite
- `npm run build` — create a production build
- `npm run start` — start the production build locally
- `npm run test:e2e` — run Playwright end-to-end tests

## Running tests

### Unit tests

```bash
npm test
```

### End-to-end tests

Playwright requires browser binaries to be available. Install them once with:

```bash
npx playwright install
```

Then run:

```bash
npm run test:e2e
```

## Troubleshooting

### Port already in use

If `npm run dev` reports that port 3000 is busy, stop the conflicting process or start the app on a different port:

```bash
PORT=3001 npm run dev
```

### Browser dependencies missing for Playwright

If `npm run test:e2e` fails with a browser-related error, install the Playwright browser binaries:

```bash
npx playwright install
```

### Environment configuration issues

If the app fails to start or build, verify that `.env.local` exists and that any values you set are valid. Avoid committing secrets in `.env.local` or any `NEXT_PUBLIC_*` values that should remain private.

### Dependency install failures

If `npm ci` fails, remove the existing install artifacts and retry:

```bash
rm -rf node_modules package-lock.json
npm install
```

If the issue persists, confirm you are using a supported Node.js version and update npm with:

```bash
node --version
npm --version
```
