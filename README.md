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

| Command            | Description                     |
|-------------------|---------------------------------|
| `npm run dev`     | Start dev server (Turbopack)   |
| `npm run lint`    | Run ESLint                      |
| `npm test`        | Run accessibility tests (Jest) |
| `npm run build`   | Production build                |
| `npm run start`   | Start production server         |

Default: http://localhost:3000. The home page can check API health at `NEXT_PUBLIC_API_URL` (default http://localhost:3001).

---

## Project structure

```text
liquifact-frontend/
├─ app/
│   ├─ layout.js            # Root layout, LiquiFact metadata (imports Geist via next/font/google)
│   ├─ page.js              # Home (wallet CTA, API health check)
│   ├─ copy/                # Localized copy strings (e.g., en.js)
│   ├─ invoices/            # Invoices placeholder page
│   └─ invest/              # Invest placeholder page
├─ components/               # Shared UI components
│   ├─ ErrorBanner.jsx
│   ├─ Footer.jsx
│   ├─ InvoiceListSkeleton.jsx
│   ├─ ToastProvider.jsx
│   ├─ UploadZone.jsx
│   └─ WalletStatus.jsx
├─ public/                  # Static assets
├─ tests/                    # Jest / Playwright test suites
├─ .github/workflows/ci.yml # CI pipeline (lint + accessibility tests)
├─ .env.local.example
├─ eslint.config.mjs
├─ jest.config.js
├─ jest.setup.js
├─ next.config.mjs
├─ playwright.config.mjs
└─ package.json
```

Tech: **Next.js 16** (App Router), **React 19**, **Tailwind CSS 4**.

---

## CI/CD

GitHub Actions runs on every push and pull request to `main`:

- **Lint** – `npm run lint`
- **Test Accessibility** – `npm test --silent`

Both jobs must pass before a PR can be merged.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full contributor workflow, branch naming convention, local checks, and accessibility expectations.

1. **Fork** the repo and clone your fork.
2. **Create a branch** from `main`: `git checkout -b feature/your-feature` or `fix/your-fix`.
3. **Setup**: `npm ci`, optionally `cp .env.local.example .env.local`.
4. **Make changes**:
   - Follow existing patterns under `app/` and `components/`.
   - Run `npm run lint` and `npm test` locally.
5. **Commit** with clear messages (e.g., `feat: add X`, `fix: Y`).
6. **Push** to your fork and open a **Pull Request** to `main`.
7. Wait for CI and address review feedback.

We welcome UI improvements, new pages (e.g., invoice upload, marketplace), and Stellar wallet integration aligned with the LiquiFact product.

---

## UI Components

See [COMPONENTS.md](COMPONENTS.md) for the full component library reference — props, accessibility notes, and usage examples for every shared component (`ErrorBanner`, `Footer`, `InvoiceListSkeleton`, `ToastProvider`, `UploadZone`, `WalletStatus`).

---

## Design Tokens

Global tokens are defined in `app/globals.css` and used across all components.

| Token             | Value     | Tailwind equivalent |
|-------------------|-----------|--------------------|
| `--color-bg`      | `#0f0f0f` | `slate-950`        |
| `--color-primary` | `#06b6d4` | `cyan-400`         |

Font: **Geist** is loaded via `next/font/google` (see `app/layout.js`). Headings use `font-bold`; body copy uses the default weight.

---

## Testing

See [TESTING.md](TESTING.md) for the full guide covering Jest unit/accessibility tests and Playwright end‑to‑end setup.

---

## Contracts

- [WALLET_INTEGRATION_CONTRACT.md](WALLET_INTEGRATION_CONTRACT.md)
- [FILTER_CONTRACTS.md](FILTER_CONTRACTS.md)

---

## License

MIT (see root LiquiFact project for full license).


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

## API Integration

For frontend/backend contract details see:

[docs/api-integration.md](docs/api-integration.md)

---

## Development

| Command            | Description                  |
| ------------------ | ---------------------------- |
| `npm run dev`      | Start dev server (Turbopack) |
| `npm run build`    | Production build             |
| `npm run start`    | Start production server      |
| `npm run lint`     | Run ESLint                   |
| `npm run test:e2e` | Run Playwright smoke tests   |

Default: [http://localhost:3000](http://localhost:3000). The home page can check API health at `NEXT_PUBLIC_API_URL` (default `http://localhost:3001`).

### Marketplace search

The Invest page (`app/invest/page.js`) includes an issuer search field above the invoice list. Typing in the field filters invoices by case-insensitive substring match on `issuer`. Input is debounced at **200ms** to avoid thrashing on every keystroke. When a filter is active, the `aria-live` status region announces the match count (e.g. "2 of 3 invoices match"). A distinct "no matches" state is shown when the filter yields zero results, separate from the empty-marketplace state.

---

## Project structure

```
liquifact-frontend/
├── app/
│   ├── layout.js           # Root layout, LiquiFact metadata
│   ├── page.js             # Home (wallet CTA, API health check)
│   ├── copy/en.js          # Centralised UI copy
│   ├── invoices/           # SME invoice upload page
│   └── invest/             # Investor marketplace
│       ├── page.js         # Marketplace list (links to detail)
│       ├── loading.js      # Marketplace skeleton
│       ├── lib.js          # Mock invoice data + helpers
│       └── [id]/           # Invoice detail + funding CTA
│           ├── page.js     # Full invoice details
│           ├── loading.js  # Detail skeleton
│           └── not-found.js # Unknown invoice fallback
├── components/
│   ├── WalletStatus.jsx    # Wallet connection UI
│   └── WalletContext.jsx   # Shared wallet state provider
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

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full contributor workflow, branch naming convention, local checks, and accessibility expectations. Also see our [Accessibility Statement](docs/accessibility.md).

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

See [COMPONENTS.md](COMPONENTS.md) for the full component library reference — props, accessibility notes, and usage examples for every shared component (`ErrorBanner`, `Footer`, `InvoiceListSkeleton`, `ToastProvider`, `UploadZone`, `WalletProvider`, `WalletStatus`).

### Wallet connection (`WalletProvider`)

Wallet state is shared app-wide via `WalletProvider`, mounted in `app/layout.js` inside `ToastProvider`. Any client component can read connection state with `useWallet()`:

```jsx
import { useWallet } from '@/components/WalletProvider';

function FundInvoiceButton() {
  const { state, walletData, connect, disconnect } = useWallet();

  if (state !== 'connected') {
    return <button type="button" onClick={() => connect()}>Connect wallet</button>;
  }

  return <span>Ready to fund as {walletData.address}</span>;
}
```

**Persistence:** On successful connect, a minimal snapshot is saved to `localStorage` under `liquifact-wallet-snapshot`:

| Field | Persisted | Notes |
|-------|-----------|-------|
| `version` | Yes | Schema version (`1`) |
| `state` | Yes | Only `connected` is restored |
| `address` | Yes | Truncated display form only (e.g. `GABC...XYZ123`) |
| `network` | Yes | `public` or `testnet` |
| `balance` | **No** | Fetched live after real wallet integration |
| Private keys / secrets | **Never** | Rejected on read if detected |

The provider rehydrates from storage **after mount** (SSR-safe). `disconnect()` clears storage immediately. See [WALLET_INTEGRATION_CONTRACT.md](WALLET_INTEGRATION_CONTRACT.md) for the full integration contract.

### NavMenu

`components/NavMenu.jsx` — Responsive site-wide header navigation used on every page.

**Props**

| Prop            | Type       | Default            | Description                                      |
| --------------- | ---------- | ------------------ | ------------------------------------------------ |
| `walletLabel`   | `string`   | `'Connect Wallet'` | Label text rendered inside the wallet button     |
| `onWalletClick` | `function` | `undefined`        | Callback fired when the wallet button is clicked |

**Behaviour**

- **Desktop (≥ `md` breakpoint):** Home, Invoices, and Invest links render inline in the header row alongside the wallet button.
- **Mobile (< `md` breakpoint):** Nav links are hidden behind a hamburger toggle (☰). Clicking the toggle reveals a dropdown menu below the header bar.
- The active route is detected automatically via `usePathname` and marked with `aria-current="page"` on the matching link.
- The menu closes on **Escape** (with focus returned to the toggle button), on any navigation event (pathname change), or when the toggle is clicked again.
- Passes `jest-axe` accessibility checks in both open and closed states. The toggle exposes `aria-expanded` and `aria-controls` so assistive technologies can correctly announce the disclosure state.

**Usage**

```jsx
import NavMenu from "@/components/NavMenu";

// Drop-in replacement for the static <header> on any page
export default function MyPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <NavMenu />
      <main>...</main>
    </div>
  );
}

// With Stellar wallet integration
<NavMenu walletLabel="Freighter" onWalletClick={handleConnectWallet} />;
```

## Design Tokens

- **Colors**
  - `--color-bg`: `#0f0f0f` (slate‑950)
  - `--color-primary`: `#06b6d4` (cyan‑400)

- **Typography**
  - Font family: **Geist** – imported via `@fontsource/geist`.
  - Headings use `font‑bold`, body uses `font‑regular`.

## Testing

See [TESTING.md](TESTING.md) for the full guide covering Jest unit/accessibility tests and Playwright end-to-end setup.

## Contracts

- [WALLET_INTEGRATION_CONTRACT.md](WALLET_INTEGRATION_CONTRACT.md)
- [FILTER_CONTRACTS.md](FILTER_CONTRACTS.md)

---

## Security

- **Client-side file validation** — The `UploadZone` component enforces strict client-side
  validation before uploading invoices. In addition to file size and MIME type checks,
  it verifies the PDF magic bytes (`%PDF-`) to reject spoofed files. Filenames are also
  sanitized (stripping control characters and HTML tags) and truncated before rendering
  to prevent layout breakage or cross-site scripting (XSS) risks.

- **Bounded health rendering** — The home page displays the backend `/health` response
  through a bounded pipeline: recognised fields (`status`, `message`, `version`) are
  extracted and shown in a structured summary. The full payload is hidden behind a
  collapsible `<details>` element and stringified via a depth-limited (max 5 levels),
  length-truncated (max 2000 characters) formatter (`lib/format/safeJson.js`).
  This prevents DoS from giant or deeply nested attacker-controlled payloads.

## License

MIT (see root LiquiFact project for full license).
