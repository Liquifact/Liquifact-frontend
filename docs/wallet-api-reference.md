# Wallet Component API Reference

Complete API reference for the LiquiFact wallet subsystem. For architecture
background and implementation guides see
[`docs/wallet-developer-guide.md`](wallet-developer-guide.md) and
[`WALLET_INTEGRATION_CONTRACT.md`](../WALLET_INTEGRATION_CONTRACT.md).

---

## Table of Contents

- [WalletProvider](#walletprovider)
- [useWallet hook](#usewallet-hook)
- [WalletStatus](#walletstatus)
- [WalletStatusLazy](#walletstatuslazy)
- [WalletContext (deprecated shim)](#walletcontext-deprecated-shim)
- [WALLET_STATES constant](#wallet_states-constant)
- [Utility exports](#utility-exports)
  - [truncateAddress](#truncateaddress)
  - [sanitizeSnapshot](#sanitizesnapshot)
  - [isBrowser](#isbrowser)
  - [readStoredSnapshot](#readstoredsnapshot)
  - [writeStoredSnapshot](#writestoredsnapshot)
  - [clearStoredSnapshot](#clearstoredsnapshot)

---

## WalletProvider

**File:** `components/WalletProvider.jsx`  
**Type:** React context provider — client component (`"use client"`)

Manages all wallet connection state and exposes it via `WalletContext`. Must
be mounted once in the app tree (currently done in `app/layout.js` inside
`<ToastProvider>`). Any descendant can access state and actions via
[`useWallet()`](#usewallet-hook).

### Props

| Prop       | Type              | Required | Description                              |
| ---------- | ----------------- | -------- | ---------------------------------------- |
| `children` | `React.ReactNode` | Yes      | The application subtree to wrap.         |

### Context value shape

`WalletProvider` injects the following value into `WalletContext`:

```ts
{
  state:      string;          // One of WALLET_STATES — current connection state
  walletData: WalletData | null; // Populated only in CONNECTED state
  error:      string | null;   // Human-readable error message (ERROR / WRONG_NETWORK states)
  hydrating:  boolean;         // true during the initial localStorage rehydration pass
  connect:    () => Promise<ConnectOutcome>;
  disconnect: () => void;
}
```

#### `WalletData`

```ts
type WalletData = {
  address:    string;  // Truncated Stellar G-address, e.g. "GABC...XYZ123"
  network:    string;  // "public" | "testnet"
  balance?:   string;  // e.g. "1,234.56 XLM" — live only, never persisted
  walletType?: string; // e.g. "freighter"
}
```

#### `ConnectOutcome`

```ts
type ConnectOutcome = {
  outcome: 'success' | 'error' | 'wrong_network' | 'no_wallet';
  message?: string; // Human-readable reason, present on non-success outcomes
}
```

### Usage

```jsx
import { WalletProvider } from "@/components/WalletProvider";

export default function RootLayout({ children }) {
  return (
    <ToastProvider>
      <WalletProvider>
        {children}
      </WalletProvider>
    </ToastProvider>
  );
}
```

### localStorage persistence

On successful connect, a minimal snapshot is written to
`localStorage` under the key `liquifact-wallet-snapshot`:

| Field     | Type     | Notes                                                   |
| --------- | -------- | ------------------------------------------------------- |
| `version` | `number` | Schema version (`1`). Snapshot rejected if mismatched.  |
| `state`   | `string` | Only `"connected"` is persisted.                        |
| `address` | `string` | Truncated display form (first 4 + last 6 chars).        |
| `network` | `string` | `"public"` or `"testnet"`.                              |

Balances, private keys, and full signing material are **never** persisted.
Addresses starting with `S` (≥ 56 chars) are rejected on read as likely secret keys.

---

## useWallet hook

**File:** `components/WalletProvider.jsx`  
**Signature:** `useWallet() → WalletContextValue`

Access shared wallet state and actions from any client component. Throws if
called outside a `<WalletProvider>` tree.

```js
import { useWallet } from "@/components/WalletProvider";
```

### Return shape

```ts
{
  /**
   * Current connection state — one of the WALLET_STATES string values.
   */
  state: string;

  /**
   * Populated only when state === WALLET_STATES.CONNECTED.
   * balance is runtime-only and is never persisted to localStorage.
   */
  walletData: {
    address:    string;  // Truncated Stellar G-address, e.g. "GABC...XYZ123"
    network:    string;  // "public" | "testnet"
    balance?:   string;  // e.g. "1,234.56 XLM"
    walletType?: string; // e.g. "freighter"
  } | null;

  /**
   * Human-readable error message.
   * Set in ERROR and WRONG_NETWORK states; null otherwise.
   */
  error: string | null;

  /**
   * True during the initial localStorage rehydration (SSR-safe).
   * WalletStatus renders a skeleton while this is true to prevent
   * layout shift.
   */
  hydrating: boolean;

  /**
   * Initiate a wallet connection via the configured adapter (Freighter).
   * Never rejects — errors are surfaced via the returned outcome and the
   * state machine.
   */
  connect: () => Promise<{
    outcome: 'success' | 'error' | 'wrong_network' | 'no_wallet';
    message?: string;
  }>;

  /**
   * Terminate the session: resets state to DISCONNECTED and removes the
   * persisted snapshot from localStorage.
   */
  disconnect: () => void;
}
```

### Minimal usage example

```jsx
import { useWallet, WALLET_STATES } from "@/components/WalletProvider";

function FundInvoiceButton() {
  const { state, walletData, connect, disconnect } = useWallet();

  if (state === WALLET_STATES.CONNECTING) {
    return <span>Connecting…</span>;
  }

  if (state !== WALLET_STATES.CONNECTED) {
    return (
      <button type="button" onClick={() => connect()}>
        Connect wallet
      </button>
    );
  }

  return (
    <div>
      <span>Connected as {walletData.address}</span>
      <button type="button" onClick={disconnect}>Disconnect</button>
    </div>
  );
}
```

### Error handling example

```jsx
const { state, error, connect } = useWallet();

if (state === WALLET_STATES.ERROR) {
  return (
    <div role="alert">
      <p>Connection failed: {error}</p>
      <button onClick={() => connect()}>Retry</button>
    </div>
  );
}
```

---

## WalletStatus

**File:** `components/WalletStatus.jsx`  
**Type:** Presentational client component (`"use client"`)  
**Default export:** `WalletStatus`

Renders the wallet action button and status indicator. Reads state from
`WalletContext` via `useContext` (falls back gracefully when no provider is
present). Displays a `WalletSkeleton` while `hydrating` is true.

### Props

`WalletStatus` accepts **no props**. All data is sourced from `WalletContext`.

### Internal helpers (exported for tests)

| Export | Signature | Description |
| ------ | --------- | ----------- |
| `WALLET_STATES` | `object` | Re-exported from `WalletProvider` for convenience. |

### Button variant mapping

`getStateConfig` maps each wallet state to a `Button` variant. The `loading`
prop is derived independently from `state === WALLET_STATES.CONNECTING`.

| Wallet state    | `buttonVariant` | Visible signal                        |
| --------------- | --------------- | ------------------------------------- |
| `DISCONNECTED`  | `"primary"`     | Cyan — invites connection             |
| `CONNECTING`    | `"primary"`     | Cyan + spinner (via `loading={true}`) |
| `CONNECTED`     | `"secondary"`   | Muted — signals destructive action    |
| `ERROR`         | `"primary"`     | Cyan — re-invites retry               |
| `WRONG_NETWORK` | `"warning"`     | Amber — user must switch network      |
| `NO_WALLET`     | `"external"`    | Violet — opens install URL            |

### Accessibility

- A `sr-only` `aria-live="polite"` region announces every state transition
  (e.g. "Wallet connected", "Connection failed").
- The `aria-describedby` attribute on the button references `#wallet-helper-text`
  only when that element exists in the DOM (i.e. when `showAddress` is false).
  This prevents dangling IDREF references in the connected state.
- The NO_WALLET button only navigates to `https://` URLs; non-HTTPS values are
  blocked with a console error.

### Usage

Do **not** import `WalletStatus` directly. Use
[`WalletStatusLazy`](#walletstatuslazy) at every call site.

---

## WalletStatusLazy

**File:** `components/WalletStatusLazy.jsx`  
**Type:** Client component — lazy-loaded with `next/dynamic`  
**Default export:** `WalletStatusLazy`

The public entry-point for the wallet UI. Wraps `WalletStatus` with:

1. **`next/dynamic` (`ssr: false`)** — prevents "window is not defined" errors
   from the Stellar/Freighter SDK at SSR time and keeps the wallet chunk out of
   the initial server bundle.
2. **`WalletStatusPlaceholder`** — a pulse skeleton with matching outer
   dimensions (`h-12 w-80`) that prevents cumulative layout shift (CLS) while
   the dynamic chunk downloads.
3. **`WalletErrorBoundary`** — catches unexpected render errors inside
   `WalletStatus` and degrades to an accessible fallback with a Retry action,
   preventing a wallet error from blanking the entire page.

### Props

`WalletStatusLazy` accepts **no props**.

### Named exports

| Export | Description |
| ------ | ----------- |
| `LazyWalletStatus` | The raw `next/dynamic` component (used internally). |
| `WalletStatusPlaceholder` | The pulse-skeleton placeholder rendered during chunk download. |

### Usage

```jsx
import WalletStatusLazy from "@/components/WalletStatusLazy";

// Inside NavMenu (desktop slot)
<WalletStatusLazy />

// Inside NavMenu (mobile slot)
<WalletStatusLazy />
```

---

## WalletContext (deprecated shim)

**File:** `components/WalletContext.jsx`

> **Deprecated.** New code must import from `@/components/WalletProvider`.

A thin re-export shim for backwards compatibility. Re-exports every public
symbol from `WalletProvider.jsx` so existing imports keep working without changes.

Exported symbols:
`WalletProvider`, `useWallet`, `WALLET_STATES`, `WalletContext`,
`truncateAddress`, `sanitizeSnapshot`, `isBrowser`, `readStoredSnapshot`,
`writeStoredSnapshot`, `clearStoredSnapshot`.

---

## WALLET_STATES constant

**File:** `components/WalletProvider.jsx`  
**Export:** named

```js
import { WALLET_STATES } from "@/components/WalletProvider";
```

| Key             | Value             | Description                                                 |
| --------------- | ----------------- | ----------------------------------------------------------- |
| `DISCONNECTED`  | `"disconnected"`  | No wallet connected. Initial state on fresh load.           |
| `CONNECTING`    | `"connecting"`    | Connection attempt in progress. UI is locked.               |
| `CONNECTED`     | `"connected"`     | Connected successfully. `walletData` is populated.          |
| `ERROR`         | `"error"`         | Connection failed (user rejected, SDK threw, etc.).         |
| `WRONG_NETWORK` | `"wrong_network"` | Wallet connected but on the wrong Stellar network.          |
| `NO_WALLET`     | `"no_wallet"`     | No compatible Stellar wallet extension detected.            |

Always compare against this constant rather than raw strings to stay in sync
with future renames.

---

## Utility exports

All utilities are exported from `components/WalletProvider.jsx`.

### truncateAddress

```ts
function truncateAddress(address: string): string
```

Returns the first 4 and last 6 characters of a Stellar address with `...` in
between. Safe for display and safe to persist (no secrets exposed).

| Input length | Behaviour |
| ------------ | --------- |
| ≤ 12 chars   | Returned as-is. |
| > 12 chars   | `GABC...XYZ123` form. |
| Non-string / falsy | Returns `""`. |

```js
truncateAddress("GABCDEFGHIJKLMNOPQRSTUVWXYZ123456789");
// → "GABC...123456"

truncateAddress("SHORT");
// → "SHORT"
```

---

### sanitizeSnapshot

```ts
function sanitizeSnapshot(raw: unknown): Snapshot | null
```

Validates and sanitizes a raw value read from `localStorage`. Returns `null` on
any validation failure.

**Rejection criteria:**

- Not an object or is `null`
- `version !== 1`
- `state` is not `"connected"` (only `CONNECTED` is persistable)
- `address` is not a non-empty string of ≤ 64 chars
- `network` is not `"public"` or `"testnet"`
- `address` starts with `S` and has ≥ 56 chars (likely a secret key)

**Return type (on success):**

```ts
{
  version: 1;
  state:   "connected";
  address: string; // truncated via truncateAddress
  network: "public" | "testnet";
}
```

---

### isBrowser

```ts
function isBrowser(): boolean
```

Returns `true` when `window` is defined. Use to guard any code that must only
run in the browser (e.g. `localStorage` access).

---

### readStoredSnapshot

```ts
function readStoredSnapshot(): Snapshot | null
```

Reads `localStorage["liquifact-wallet-snapshot"]`, JSON-parses it, and passes
the result through `sanitizeSnapshot`. Returns `null` on the server, on parse
errors, or when the stored value is invalid.

---

### writeStoredSnapshot

```ts
function writeStoredSnapshot(state: string, walletData: WalletData): void
```

Writes a sanitized snapshot when `state === "connected"` and `walletData` is
present. Delegates to `clearStoredSnapshot` for all other states. No-op on the
server.

---

### clearStoredSnapshot

```ts
function clearStoredSnapshot(): void
```

Removes `liquifact-wallet-snapshot` from `localStorage`. No-op on the server.

---

## Component tree

```
app/layout.js
└── <ToastProvider>
    └── <WalletProvider>        ← state, persistence, toasts
        └── <NavMenu>
            ├── (desktop) <WalletStatusLazy>
            │              └── <WalletErrorBoundary>
            │                  └── <WalletStatus>  ← presentational consumer
            └── (mobile)  <WalletStatusLazy>
                           └── <WalletErrorBoundary>
                               └── <WalletStatus>
```

---

## State machine summary

```
DISCONNECTED ──connect()──► CONNECTING ──success──► CONNECTED
                                       ──no wallet──► NO_WALLET
                                       ──sdk error──► ERROR
                                       ──wrong net──► WRONG_NETWORK
CONNECTED    ──disconnect()──► DISCONNECTED
ERROR / WRONG_NETWORK ──connect()──► CONNECTING  (retry path)
localStorage snapshot found on mount → DISCONNECTED transitions to CONNECTED
```

---

## Related documents

| Document | Description |
| -------- | ----------- |
| [`docs/wallet-developer-guide.md`](wallet-developer-guide.md) | Integration guide: state machine, adapter pattern, testing |
| [`docs/wallet-data-flow.md`](wallet-data-flow.md) | Data-flow diagrams (fetch → transform → render) |
| [`WALLET_INTEGRATION_CONTRACT.md`](../WALLET_INTEGRATION_CONTRACT.md) | Required wire-up checklist for real Stellar SDK adapters |
| [`docs/architecture.md`](architecture.md) | App Router routes, data flow, shared state overview |
