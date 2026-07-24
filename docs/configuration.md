# Environment Variable Configuration Reference

This document is the **single authoritative reference** for every environment variable used in the LiquiFact frontend. All variables listed here are reflected in [`.env.local.example`](../.env.local.example).

> **Security note:** All variables prefixed with `NEXT_PUBLIC_` are inlined by Next.js at build time and sent to the browser. Never store secrets (API keys, database credentials, private keys) in `NEXT_PUBLIC_*` variables.

---

## Variable Reference

| Variable | Purpose | Default | Required | Consuming Modules |
|---|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | Base URL for the LiquiFact backend REST API. All invoice and data fetch calls are routed through this URL. | `http://localhost:3001` | Optional (recommended for production) | `lib/config/env.js`, `lib/api/invoices.js`, `app/page.js`, `lib/securityHeaders.mjs` |
| `NEXT_PUBLIC_SITE_URL` | Canonical base URL of the frontend site. Used for SEO metadata, Open Graph tags, sitemap generation, and robots.txt. | `http://localhost:3000` | Optional (required for correct SEO in production) | `lib/config/env.js`, `app/layout.js`, `app/sitemap.js`, `app/robots.js` |
| `NEXT_PUBLIC_STELLAR_NETWORK` | Stellar network identifier for Freighter wallet integration. Accepted values: `testnet`, `public`. | *(undefined — Freighter integration disabled)* | Optional | `lib/config/env.js`, `lib/wallet/freighter.js` |

---

## Variable Details

### `NEXT_PUBLIC_API_URL`

- **Type:** URL string
- **Default:** `http://localhost:3001`
- **Accepted values:** Any valid absolute URL (e.g. `https://api.liquifact.io`)
- **Required:** Optional. Without this variable the app falls back to `http://localhost:3001`, which is correct for local development but will fail in production if the API is hosted elsewhere.
- **Breaking behaviour if missing in production:** Invoice listing, detail pages, and all data-fetching routes return errors or empty states.

### `NEXT_PUBLIC_SITE_URL`

- **Type:** URL string
- **Default:** `http://localhost:3000`
- **Accepted values:** Any valid absolute URL (e.g. `https://app.liquifact.io`)
- **Required:** Optional. Without this variable SEO metadata, the sitemap, and robots.txt will reference `localhost:3000`, which is incorrect in production.
- **Breaking behaviour if missing in production:** Search engines receive incorrect canonical URLs; social sharing cards may not render correctly.

### `NEXT_PUBLIC_STELLAR_NETWORK`

- **Type:** Enum string
- **Default:** `undefined` (Stellar/Freighter integration is disabled when unset)
- **Accepted values:** `testnet` | `public`
- **Required:** Optional. Set to `testnet` during development and `public` for mainnet deployments.
- **Breaking behaviour if misconfigured:** `lib/config/env.js` throws a build-time error listing the invalid value, preventing a misconfigured build from deploying.

---

## Setting Up Locally

1. Copy the example file:

   ```bash
   cp .env.local.example .env.local
   ```

2. Edit `.env.local` with your values. For local development the defaults in `.env.local.example` work without changes.

3. Restart the dev server after any change to `.env.local`:

   ```bash
   npm run dev
   ```

---

## Production Checklist

- [ ] `NEXT_PUBLIC_API_URL` points to the production API (e.g. `https://api.liquifact.io`).
- [ ] `NEXT_PUBLIC_SITE_URL` points to the production frontend (e.g. `https://app.liquifact.io`).
- [ ] `NEXT_PUBLIC_STELLAR_NETWORK` is set to `public` for mainnet or `testnet` for staging.
- [ ] No secrets (private keys, database URLs, JWT secrets) are stored in `NEXT_PUBLIC_*` variables.
