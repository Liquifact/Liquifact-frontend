# Component Testing Guide

This guide documents the conventions used to test components in this repository: test runner setup, the jsdom URL convention, and how wallet, toast, and clipboard interactions are mocked. Read this before adding or modifying test.

## Running test

```bash
npm test
```

This runs the full Jest suite (`jest.config.js`). There is **no separate command for accessibility tests** — a11y checks (using `jest-axe`) live inside the same `*.test.tsx` files as regular unit tests and run automatically with `npm test`.

⚠️ **Known limitation:** `jest-axe` is globally mocked in `jest.setup.js` to always return zero violations (`axe: async () => ({ violations: [] })`).
This means `expect(await axe(container)).toHaveNoViolations()` currently passes unconditionally in every test file — it does not perform a real accessibility check. Treat a11y-labeled tests as structural placeholders until this mock is removed or scoped down. See [docs/accessibility.md](./accessibility.md) for the project's actual accessibility commitments and manual audit notes.

## Environment

- Test environment: `jest-environment-jsdom`
- Global setup: `jest.setup.js` (imports `@testing-library/jest-dom`, mocks
  `jest-axe` and `next/server`, sets `jest.setTimeout(30000)`)
- Transform: Babel via `babel-jest.config.js`
- Test file convention: `*.test.tsx` / `*.test.jsx`. Files named `*.spec.(jsx|ts|tsx)`
  are explicitly excluded (`testPathIgnorePatterns` in `jest.config.js`) —
  don't use the `.spec.` suffix for new tests.

## The jsdom URL convention

Modern jsdom does not allow reassigning or deleting `window.location`. When a test needs a specific origin (e.g. to build absolute URLs), set it via a per-file docblock instead of touching `window.location` directly:

```ts
/**
 * @jest-environment jsdom
 * @jest-environment-options {"url": "http://localhost:3000"}
 */
```

See `app/invest/[id]/page.test.tsx` for a real example — it uses this to test `copyInvoiceUrl`, which builds a link from `window.location.origin`.

## Common mocks

### Wallet

Wallet state is provided by `WalletContext`/`WalletProvider`. Two patterns exist depending on what you're testing:

- **Testing a consumer of the wallet** (e.g. a page or button that reacts to
  wallet state): mock the context module directly.

```ts
  jest.mock("@/components/WalletContext", () => ({
    WALLET_STATES: {
      DISCONNECTED: "disconnected",
      CONNECTING: "connecting",
      CONNECTED: "connected",
      NO_WALLET: "no_wallet",
      WRONG_NETWORK: "wrong_network",
    },
    useWallet: jest.fn(() => ({ state: "disconnected", connect: jest.fn() })),
  }));
```

- **Testing `WalletProvider` itself** (`components/WalletProvider.test.tsx`):
  don't mock the provider — mock its external dependency instead
  (`lib/wallet/freighter`), and exercise the real provider through a small
  probe component that calls `useWallet()`.

```ts
  jest.mock("../lib/wallet/freighter", () => ({
    isFreighterConnected: jest.fn(),
    connectFreighter: jest.fn(),
    getFreighterNetwork: jest.fn(),
    assertExpectedNetwork: jest.fn(),
  }));
```

  Also clear `localStorage` and use `jest.useFakeTimers()` in `beforeEach`/`afterEach`
  when testing snapshot persistence.

See [docs/wallet-developer-guide.md](./wallet-developer-guide.md) for the
wallet architecture itself.

### Toast

Same two-pattern split as wallet:

- **Testing a consumer**: mock `ToastProvider`.

```ts
  const mockToast = { success: jest.fn(), error: jest.fn(), info: jest.fn() };
  jest.mock("@/components/ToastProvider", () => ({
    ToastProvider: ({ children }) => <>{children}</>,
    useToast: () => mockToast,
  }));
```

- **Testing `ToastProvider` itself** (`components/ToastProvider.test.tsx`):
  render it for real with a small consumer component calling `useToast()`.
  Use `jest.useFakeTimers()` to test auto-dismiss (`AUTO_DISMISS_MS`), and
  `fireEvent.mouseEnter`/`mouseLeave` to test the pause-on-hover behavior.

### Clipboard

There are **two separate clipboard utilities** in this codebase — don't
conflate them:

1. `lib/clipboard.ts` → `copyToClipboard(text)` (`lib/clipboard.test.js`).
   Uses `Object.defineProperty(navigator, "clipboard", { value, configurable: true, writable: true })`
   to stub `navigator.clipboard`, and stubs `document.execCommand` for the
   fallback path. Throws on invalid input, on `execCommand` returning `false`,
   or on `execCommand` throwing.

2. `app/invest/[id]/FundActions.tsx` → `copyInvoiceUrl` / `copyToClipboardFallback`
   (tested in `app/invest/[id]/page.test.tsx`). Uses
   `Object.assign(navigator, { clipboard: { writeText } })` to stub the API,
   and asserts the fallback path appends a hidden `<textarea>`, runs
   `execCommand("copy")`, and removes the textarea even if `execCommand` throws.

Both patterns test: (a) the Clipboard API success path, (b) API failure, and
(c) the `execCommand`/textarea fallback when `navigator.clipboard` is absent.

## Related docs

- [docs/accessibility.md](./accessibility.md) — accessibility commitments and audits
- [docs/wallet-developer-guide.md](./wallet-developer-guide.md) — wallet architecture