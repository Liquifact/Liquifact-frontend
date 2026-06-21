# LiquiFact Frontend

Web app for **LiquiFact** — the global invoice liquidity network on Stellar. Next.js dashboard for SMEs (upload invoices, get liquidity) and investors (fund tokenized invoices, earn yield). Stellar wallet integration is planned.

Part of the LiquiFact stack: **frontend** (this repo) | **backend** (Express API) | **contracts** (Soroban).

---

## Prerequisites

- **Node.js** 20+ (LTS recommended)
- **npm** 9+

---

## Setup

1. **Clone the repo**

   ```bash
   git clone <this-repo-url>
   cd liquifact-frontend
   ```

2. **Install dependencies**

   ```bash
   npm ci
   ```

3. **Configure environment** (optional)

   ```bash
   cp .env.local.example .env.local
   # Set NEXT_PUBLIC_API_URL if the API is not at http://localhost:3001
   ```

---

## Development

| Command         | Description                |
|-----------------|----------------------------|
| `npm run dev`   | Start dev server (Turbopack) |
| `npm run build` | Production build           |
| `npm run start` | Start production server   |
| `npm run lint`  | Run ESLint                 |
| `npm run test:e2e` | Run Playwright smoke tests |

Default: [http://localhost:3000](http://localhost:3000). The home page can check API health at `NEXT_PUBLIC_API_URL` (default `http://localhost:3001`).

See [docs/api-integration.md](docs/api-integration.md) for the frontend-backend API contract, including current `/health` and invoice upload behavior plus planned invoice marketplace endpoints.

---

## Project structure

```
liquifact-frontend/
├── app/
│   ├── layout.js      # Root layout, LiquiFact metadata
│   ├── page.js        # Home (wallet CTA, API health check)
│   ├── invoices/      # Invoices placeholder page
│   └── invest/       # Invest placeholder page
├── public/
├── .env.local.example
├── eslint.config.mjs
└── package.json
```

Tech: **Next.js 16** (App Router), **React 19**, **Tailwind CSS 4**.

---

## CI/CD

GitHub Actions runs on every push and pull request to `main`:

- **Lint** — `npm run lint`
- **Build** — `npm run build`

Keep both passing before opening a PR.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full contributor workflow, branch naming convention, local checks, and accessibility expectations.


1. **Fork** the repo and clone your fork.
2. **Create a branch** from `main`: `git checkout -b feature/your-feature` or `fix/your-fix`.
3. **Setup**: `npm ci`, optionally `cp .env.local.example .env.local`.
4. **Make changes**:
   - Follow existing patterns under `app/`.
   - Run `npm run lint` and `npm run build` locally.
5. **Commit** with clear messages (e.g. `feat: add X`, `fix: Y`).
6. **Push** to your fork and open a **Pull Request** to `main`.
7. Wait for CI and address review feedback.

We welcome UI improvements, new pages (e.g. invoice upload, marketplace), and Stellar wallet integration aligned with the LiquiFact product.
## UI Components

### Footer
Provides the site footer with navigation links.
**Props:** none.

### ErrorBanner
Displays an error message with variant styling.
**Props:**
- `variant` (string): `"default"` | `"warning"` | `"error"` – determines color.
- `message` (string): The error text.

### InvoiceListSkeleton
Skeleton placeholder for invoice list while loading.
**Props:**
- `rows` (number, default `5`): Number of placeholder rows.

### Invest Marketplace
The `/invest` page uses a polite live region to announce when the skeleton resolves:
- loaded: `N investable invoices loaded`
- empty: `No invoices available`

### WalletStatus
Shows connection status of Stellar wallet.
**Props:**
- `status` (`'connected' | 'disconnected' | 'loading'`)

## Design Tokens

- **Colors**
  - `--color-bg`: `#0f0f0f` (slate‑950)
  - `--color-primary`: `#06b6d4` (cyan‑400)

- **Typography**
  - Font family: **Geist** – imported via `@fontsource/geist`.
  - Headings use `font‑bold`, body uses `font‑regular`.

## Contracts

- [WALLET_INTEGRATION_CONTRACT.md](WALLET_INTEGRATION_CONTRACT.md)
- [FILTER_CONTRACTS.md](FILTER_CONTRACTS.md)

---

## License

MIT (see root LiquiFact project for full license).
