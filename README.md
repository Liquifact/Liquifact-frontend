# LiquiFact Frontend

## Live

- **Website:** https://liquifact-frontend.vercel.app
- **Docs:** https://liquifact-frontend.vercel.app/docs
- **API:** https://liquifact-backend.vercel.app (API docs: https://liquifact-backend.vercel.app/docs)
- **Contract (testnet):** [`CCQCKR2YU6IVQ4GYPBMXBPZ4FGFQB5H25AI7ZSETHS2CZ5ZRCWQDSO6P`](https://stellar.expert/explorer/testnet/contract/CDQCKR2YU6IVQ4GYPBMXBPZ4FGFQB5H25AI7ZSETHS2CZ5ZRCWQDSO6P)

Web app for **LiquFact**, the invoice liquidity network on Stellar. SMEs list
unpaid invoices and get paid today; investors fund them through a Soroban
escrow contract and earn yield when the debtor settles.

Part of the LiquiFact stack: **frontend** (this repo) ·
[backend](https://github.com/Liquifact/Liquifact-backend) (Express API) ·
[contracts](https://github.com/Liquifact/Liquifact-contracts) (Soroban).

## Pages

| Route | What it does |
|-------|--------------|
| `/` | Landing page: product overview, live API stats, escrow contract |
| `/marketplace` | Invoices from the API with status filters |
| `/marketplace/[id]` | Invoice detail and funding form |
| `/submit` | Submit an invoice for financing |
| `/docs` | Product overview, architecture, usage guide, API and contract reference |

If the API is unreachable the marketplace falls back to bundled demo data.

## Development

Requires Node.js 20.9+.

```bash
npm ci
npm run dev      # http://localhost:3000
npm test         # unit tests (node:test)
npm run build
```

## Configuration

All variables are optional (see [`.env.local.example`](.env.local.example)). Values are
validated at build time by `lib/config.js`; invalid values fail `npm run build`
with a list of problems.

| Variable | Default |
|----------|---------|
| `NEXT_PUBLIC_API_URL` | `https://liquifact-backend.vercel.app` |
| `NEXT_PUBLIC_CONTRACT_ID` | `CDQCKR2YU6IVQ4GYPBMXBPZ4FGFQB5H25AI7ZSETHS2CZ5ZRCWQDSO6P` |
| `NEXT_PUBLIC_STELLAR_NETWORK` | `testnet` (accepts: `testnet`, `futurenet`, `mainnet` or `public`) |
| `NEXT_PUBLIC_SITE_URL` | `https://liquifact-frontend.vercel.app` |
| `NEXT_PUBLIC_SOROBAN_RPC_URL` | derived from network (testnet: `https://soroban-testnet.stellar.org`) |
| `NEXT_PUBLIC_HORIZON_URL` | derived from network (testnet: `https://horizon-testnet.stellar.org`) |

Network-specific constants (passphrase, RPC, Horizon, explorer slug) are
derived from `NEXT_PUBLIC_STELLAR_NETWORK`. Mainnet maps to the `public`
explorer slug on stellar.expert.

## Deployment

Deployed on Vercel (`vercel deploy --prod`). CI (`.github/workflows/ci.yml`)
runs `npm ci`, `npm test` and `npm run build` on node 20 for every push to
`main` and every pull request.

## License

MIT — see [LICENSE](LICENSE).
