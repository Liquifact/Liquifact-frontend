# LiquiFact Frontend

## Live

- **Website:** https://liquifact-frontend.vercel.app
- **Docs:** https://liquifact-frontend.vercel.app/docs
- **API:** https://liquifact-backend.vercel.app (API docs: https://liquifact-backend.vercel.app/docs)
- **Contract (testnet):** [`CDQCKR2YU6IVQ4GYPBMXBPZ4FGFQB5H25AI7ZSETHS2CZ5ZRCWQDSO6P`](https://stellar.expert/explorer/testnet/contract/CDQCKR2YU6IVQ4GYPBMXBPZ4FGFQB5H25AI7ZSETHS2CZ5ZRCWQDSO6P)

Web app for **LiquiFact**, the invoice liquidity network on Stellar. SMEs list
unpaid invoices and get paid today; investors fund them through a Soroban
escrow contract and earn yield when the debtor settles.

Part of the LiquiFact stack: **frontend** (this repo) ·
[backend](https://github.com/Liquifact/Liquifact-backend) (Express API) ·
[contracts](https://github.com/Liquifact/Liquifact-contracts) (Soroban).

## Pages

| Route | What it does |
|-------|--------------|
| `/` | Landing page: product overview, live API stats, escrow contract |
| `/get-started` | Investor onboarding for setting up a Stellar wallet and testnet account |
| `/marketplace` | Invoices from the API with status filters |
| `/marketplace/[id]` | Invoice detail and funding form |
| `/marketplace/compare` | Side-by-side comparison of invoice yield, tenor, capacity, and risk |
| `/marketplace/[id]/receipt` | Printable funding receipt for an invoice contribution |
| `/submit` | Submit an invoice for financing |
| `/watchlist` | Track followed invoices and their funding progress |
| `/offline` | Offline fallback with links to saved marketplace content |
| `/docs` | Product overview, architecture, usage guide, API and contract reference |

The production app can be installed from the browser. Previously viewed invoices
remain available offline with a saved-data timestamp; bundled demo data is used
only when no cached response is available. Unvisited pages show an offline screen.

`npm run build` prepares the versioned worker policy/config before building Next.
The worker registers only in production on HTTPS or localhost; use `npm start`
to verify offline behavior. `npm run test:ui` runs the PWA keyboard/status tests.
Updates activate only after the user selects **Reload**. Funding, escrow, wallet,
and RPC traffic are not cached. [Browser evidence](docs/pwa-evidence/README.md).

## Documentation

See the [Documentation Index](docs/README.md) for a categorized overview of all contributor guides, architecture diagrams, API references, and current vs. planned/outdated documentation in `docs/`.

## Development

Requires Node.js 20.9+.

```bash
npm ci
npm run dev      # http://localhost:3000
npm test         # i18n key parity check, then unit tests (node:test)
npm run test:ui  # UI tests in tests-ui/ and tests/*.ui.test.* (Vitest)
npm run build
```

`npm test` runs `scripts/check-i18n.mjs` before the Node.js tests in
`tests/*.test.mjs`. `npm run test:ui` runs Vitest tests from `tests-ui/` and
`tests/*.ui.test.*`. `npm run build` runs `scripts/prepare-pwa.mjs` before the
Next.js production build.

## Project layout

- `app/` — Next.js App Router pages and route handlers.
- `components/` — reusable interface components.
- `lib/` — application logic, integrations, and shared utilities.
- `tests/` — Node.js unit tests.
- `tests-ui/` — Vitest UI tests.
- `docs/` — product, architecture, and contributor documentation.

## Configuration

All variables are optional (see [`.env.local.example`](.env.local.example)).
See the [configuration reference](docs/configuration.md) for details.

| Variable | Default |
|----------|---------|
| `NEXT_PUBLIC_API_URL` | `https://liquifact-backend.vercel.app` |
| `NEXT_PUBLIC_CONTRACT_ID` | `CDQCKR2YU6IVQ4GYPBMXBPZ4FGFQB5H25AI7ZSETHS2CZ5ZRCWQDSO6P` |
| `NEXT_PUBLIC_CONTRACT_INVOICE_ID` | `INV_0001` |
| `NEXT_PUBLIC_ESCROW_REGISTRY` | _(empty)_ |
| `NEXT_PUBLIC_STELLAR_NETWORK` | `testnet` |
| `NEXT_PUBLIC_STELLAR_RPC_URL` | `https://soroban-testnet.stellar.org` |
| `NEXT_PUBLIC_HORIZON_URL` | `https://horizon-testnet.stellar.org` |
| `NEXT_PUBLIC_SITE_URL` | `https://liquifact-frontend.vercel.app` |

`NEXT_PUBLIC_STELLAR_RPC_URL` and `NEXT_PUBLIC_HORIZON_URL` accept comma-separated
endpoint pools. RPC and Horizon reads try the next healthy endpoint on network or
5xx failures; failed endpoints enter a 60-second cooldown.

## Deployment

Deployed on Vercel (`vercel deploy --prod`). CI (`.github/workflows/ci.yml`)
runs `npm ci`, `npm test` and `npm run build` on node 20 for every push to
`main` and every pull request.

## License

MIT — see [LICENSE](LICENSE).
