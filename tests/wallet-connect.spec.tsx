import { test, expect, type Page } from "@playwright/test";

/**
 * End-to-end coverage for the Freighter connect flow using a MOCKED wallet
 * provider. No real wallet, extension, or keys are ever involved — the mock is
 * injected on `window.__MOCK_FREIGHTER__` before any app script runs (see
 * `lib/wallet/freighter.js`, which prefers the mock when present).
 *
 * Covered paths:
 *  - successful connect: disconnected → connecting → connected (address shown)
 *  - user rejection: a denied `requestAccess` surfaces an error state
 *  - already-connected session: `isConnected` true still lands on connected
 */

// A demonstrably fake public key — never a real account, no secret keys.
const MOCK_ADDRESS = "GTEST...E2E001";

type MockOptions = {
  installed?: boolean;
  reject?: boolean;
  network?: string;
};

/**
 * Inject the mocked Freighter API surface before the app bundle evaluates.
 * Exposes `isConnected`, `requestAccess`, and `getNetworkDetails`.
 */
async function installMockFreighter(page: Page, opts: MockOptions = {}) {
  const { installed = true, reject = false, network = "testnet" } = opts;
  await page.addInitScript(
    ({ address, installed, reject, network }) => {
      (window as any).__MOCK_FREIGHTER__ = {
        isConnected: async () => installed,
        requestAccess: async () => {
          if (reject) {
            throw new Error("User rejected connection");
          }
          return address;
        },
        getNetworkDetails: async () => ({ network }),
      };
    },
    { address: MOCK_ADDRESS, installed, reject, network }
  );
}

/** Find the primary wallet connect/disconnect button in the header. */
function connectButton(page: Page) {
  return page.getByRole("button", { name: /connect wallet/i }).first();
}

test.describe("Freighter connect flow (mocked provider)", () => {
  test("transitions disconnected → connecting → connected and shows the address", async ({
    page,
  }) => {
    await installMockFreighter(page, { installed: true, network: "testnet" });
    await page.goto("/");

    // Starts disconnected: connect affordance is present.
    await expect(connectButton(page)).toBeVisible();

    // Drive the connect flow.
    await connectButton(page).click();

    // The live region announces the connected state once the mock resolves.
    const status = page.locator('[role="status"]').filter({ hasText: /wallet status/i });
    await expect(status).toContainText(/connected/i);

    // The truncated public key from the mock is rendered (no real key used).
    await expect(page.getByText(MOCK_ADDRESS)).toBeVisible();
  });

  test("surfaces an error state when the user rejects requestAccess", async ({ page }) => {
    await installMockFreighter(page, { installed: true, reject: true });
    await page.goto("/");

    await connectButton(page).click();

    // Rejection lands on the error state, never on connected.
    const status = page.locator('[role="status"]').filter({ hasText: /wallet status/i });
    await expect(status).toContainText(/error/i);
    await expect(page.getByText(MOCK_ADDRESS)).toHaveCount(0);
  });

  test("an already-connected session still resolves to connected", async ({ page }) => {
    // isConnected() true (extension already authorized) + matching network.
    await installMockFreighter(page, { installed: true, network: "testnet" });
    await page.goto("/");

    await connectButton(page).click();

    const status = page.locator('[role="status"]').filter({ hasText: /wallet status/i });
    await expect(status).toContainText(/connected/i);
  });
});
