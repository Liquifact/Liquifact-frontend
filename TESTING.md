# Testing Guide

This document covers both the **Jest unit/integration** suite and the **Playwright end-to-end** suite for the LiquiFact frontend.

---

## Prerequisites

```bash
npm ci
```

Playwright browsers are downloaded separately (required only for e2e):

```bash
npx playwright install --with-deps
```

---

## Jest — Unit & Accessibility Tests

### Run

```bash
# Run all Jest suites
npm test

# Watch mode (re-runs on file change)
npm test -- --watch

# Specific file
npm test -- components/__tests__/WalletStatus.a11y.test.jsx
```

### Configuration

| File             | Purpose                                                                                                                            |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `jest.config.js` | Extends `next/jest`; sets `jsdom` environment, aliases, and excludes `./tests/` (Playwright).                                      |
| `jest.setup.js`  | Loaded via `setupFilesAfterEnv`; extends `expect` with `@testing-library/jest-dom` matchers and `jest-axe`'s `toHaveNoViolations`. |

### Test locations

| Path                       | What it covers                                                                                   |
| -------------------------- | ------------------------------------------------------------------------------------------------ |
| `components/__tests__/`    | Accessibility tests using `jest-axe` (one per component).                                        |
| `components/*.test.jsx`    | Unit/behaviour tests for individual components.                                                  |
| `app/invest/page.test.jsx` | Integration tests for the `InvestMarketplace` component and `getInvoiceLoadAnnouncement` helper. |

### Writing a new Jest test

**Behaviour test** (e.g. `components/MyComponent.test.jsx`):

```jsx
import { render, screen } from "@testing-library/react";
import MyComponent from "./MyComponent";

it("renders the heading", () => {
  render(<MyComponent />);
  expect(screen.getByRole("heading", { name: /my component/i })).toBeInTheDocument();
});
```

**Accessibility test** (e.g. `components/__tests__/MyComponent.a11y.test.jsx`):

```jsx
import { render } from "@testing-library/react";
import { axe } from "jest-axe";
import MyComponent from "../MyComponent";

test("MyComponent has no accessibility violations", async () => {
  const { container } = render(<MyComponent />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

> If your component calls `useToast()`, wrap it in `<ToastProvider>`:
>
> ```jsx
> import { ToastProvider } from "../ToastProvider";
> // ...
> render(
>   <ToastProvider>
>     <MyComponent />
>   </ToastProvider>
> );
> ```

---

## Playwright — End-to-End Tests

### Run

```bash
# Start the dev server and run all e2e specs
npm run test:e2e

# Run against an already-running server (skips auto-start)
PLAYWRIGHT_REUSE_SERVER=1 npm run test:e2e

# Headed mode for debugging
npx playwright test --headed

# Specific spec file
npx playwright test tests/toast.spec.jsx
```

### Configuration

`playwright.config.mjs` at the project root:

- **`testDir`** — `./tests/`
- **`baseURL`** — `http://127.0.0.1:4173`
- **`webServer`** — auto-starts `npm run dev -- -H 127.0.0.1 -p 4173`; in CI the server is always started fresh.
- **`trace: 'on-first-retry'`** — captures a Playwright trace on the first retry of a failed test.

### Test locations

| Path                                  | What it covers                                                                                   |
| ------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `playwright.config.mjs`               | Configures the Playwright runner (`testDir`, `baseURL`, `webServer`, `trace: 'on-first-retry'`). |
| `tests/toast.spec.jsx`                | Invoice upload flow — file selection, submit, toast notification.                                |
| `tests/invest.spec.jsx`               | Invest marketplace flow — loading, skeleton, list, status announcement, empty state.             |
| `tests/invest-detail.spec.jsx`        | Invoice detail funding flow — connect wallet prompt, disabled while connecting, not-found.       |
| `tests/e2e/marketplace-url.spec.ts`   | Marketplace URL sharing — search/filter state hydrate across a fresh navigation.                 |
| `tests/e2e/theme-persistence.spec.ts` | Theme toggle — preference persists across reload with no FOIT and no console errors (#265).      |
| `tests/wallet-connect.spec.tsx`       | Freighter connect flow with a **mocked** provider — connect, user rejection, already-connected.  |
| `tests/fixtures/`                     | Static fixture files used in tests (e.g. `dummy.pdf`).                                           |

### Mocking the Freighter wallet (e2e)

The connect flow is driven without a real wallet by injecting a mock provider
on `window.__MOCK_FREIGHTER__` before the app loads. `lib/wallet/freighter.js`
prefers this mock when present, so no extension and **no real keys** are used:

```js
await page.addInitScript(() => {
  window.__MOCK_FREIGHTER__ = {
    isConnected: async () => true,
    requestAccess: async () => "GTEST...E2E001", // fake public key only
    getNetworkDetails: async () => ({ network: "testnet" }),
  };
});
```

See `tests/wallet-connect.spec.tsx` for the full success/rejection coverage.

### Writing a new Playwright test

```js
// tests/my-feature.spec.js
import { test, expect } from "@playwright/test";

test("page title is correct", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/LiquiFact/i);
});
```

### Invoice Detail Funding Flow Test

```js
// tests/invest-detail.spec.jsx
import { test, expect } from "@playwright/test";

test("Invoice detail funding flow", async ({ page }) => {
  // deterministic invoices via test hook
  await page.addInitScript(() => {
    window.__TEST_MOCK_INVOICES__ = [
      {
        id: "invoice-123",
        amount: 5000,
        currency: "USD",
        dueDate: "2024-12-31",
        description: "Test Invoice",
      },
    ];
  });

  // navigate to marketplace
  await page.goto("/invest");

  // open known invoice
  const invoiceLink = page.locator(`a[href="/invest/invoice-123"]`).first();
  await expect(invoiceLink).toBeVisible();
  await invoiceLink.click();

  // verify summary
  await expect(page.locator("h1")).toContainText("Test Invoice");
  await expect(page.locator("text=USD")).toBeVisible();
  await expect(page.locator("text=5000")).toBeVisible();

  // fund button behavior
  const fundButton = page.getByRole("button", { name: /Fund this invoice/i });
  await expect(fundButton).toBeVisible();
  await fundButton.click();
  await expect(page.locator("text=Connect wallet to fund")).toBeVisible();

  // simulate connecting state
  await page.evaluate(() => {
    window.__TEST_WALLET_STATE__ = "connecting";
  });
  await expect(fundButton).toBeDisabled();

  // unknown invoice not-found
  await page.goto("/invest/unknown-id");
  await expect(page.locator("text=Invoice not found")).toBeVisible();
});
```

### Theme Toggle Persistence Test

The `ThemeToggle` component ships with detailed Jest unit tests, but those
run in jsdom and can't observe the pre-paint inline script in
`app/layout.js`. This e2e spec exercises the full browser-level integration:
a user toggles the theme, reloads, and the chosen theme is restored without a
flash of incorrect theme and without any console errors.

```ts
// tests/e2e/theme-persistence.spec.ts
import { test, expect } from "@playwright/test";

test("light theme persists across reload with no console errors", async ({ page }) => {
  // Pin the OS preference so 'system' resolves deterministically.
  await page.emulateMedia({ colorScheme: "dark" });

  // Capture anything written to console.error so we can assert silence.
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(err.message));

  await page.goto("/");
  const toggle = page.locator("#theme-toggle");
  await expect(toggle).toBeVisible();

  // Initial: 'system' resolves to 'dark' under our emulated scheme.
  await expect(toggle).toHaveAttribute("data-theme-pref", "system");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

  // Toggle once: 'system' → 'light' (the non-default selection).
  await toggle.click();
  await expect(toggle).toHaveAttribute("data-theme-pref", "light");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

  // Full page reload — pre-paint script re-applies from localStorage.
  await page.reload();

  await expect(toggle).toHaveAttribute("data-theme-pref", "light");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  expect(errors).toEqual([]);
});
```

The complete spec (`tests/e2e/theme-persistence.spec.ts`) also covers:

- Toggling **through** to `dark` (two clicks) and reloading.
- A **pre-set** `localStorage` preference, asserted via a `MutationObserver`
  on `<html>`'s `data-theme` to prove there is no flash of incorrect theme on
  first paint.
- Verifying the toggle remains in the **natural tab order** after reload and
  is reachable via keyboard navigation (focus management / a11y).
- Cycling through all **three** themes (`light → dark → system`) and
  asserting the final preference persists.

Conventions used:

- `await page.emulateMedia({ colorScheme: "..." })` keeps the `system`
  resolution deterministic across CI machines.
- `page.evaluate(...)` reads `localStorage` so the assertion isn't coupled
  to React's internal state.
- `page.reload()` triggers a true navigation, exercising the pre-paint
  script in `app/layout.js`.

---

## CI

Both suites run in GitHub Actions on every push and pull request to `main`:

```
Lint  →  npm run lint
Tests →  npm test --silent   (Jest)
```

Playwright e2e tests are **not** run in CI by default (browser install is heavy). Add a dedicated step when e2e coverage is needed in CI:

```yaml
- name: Install Playwright browsers
  run: npx playwright install --with-deps chromium

- name: E2E tests
  run: npm run test:e2e
```

---

## Troubleshooting

| Symptom                                        | Fix                                                                                       |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `toHaveNoViolations is not a function`         | `jest.setup.js` not loaded — check `setupFilesAfterEnv` in `jest.config.js`.              |
| `useToast must be used within a ToastProvider` | Wrap the component under test in `<ToastProvider>`.                                       |
| Playwright `net::ERR_CONNECTION_REFUSED`       | Dev server didn't start in time; increase `webServer.timeout` in `playwright.config.mjs`. |
| Jest picks up Playwright specs                 | Ensure `testPathIgnorePatterns` includes `<rootDir>/tests/` in `jest.config.js`.          |
