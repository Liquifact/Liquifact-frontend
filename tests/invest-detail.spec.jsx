import { test, expect } from "@playwright/test";

// Deterministic invoice data via test hook
const MOCK_INVOICE_ID = "invoice-123";

test("Invoice detail funding flow", async ({ page }) => {
  // Use the test hook to provide deterministic invoices
  await page.addInitScript(() => {
    window.__TEST_MOCK_INVOICES__ = [
      {
        id: MOCK_INVOICE_ID,
        amount: 5000,
        currency: "USD",
        dueDate: "2024-12-31",
        description: "Test Invoice",
        // other fields used by the UI
      },
    ];
  });

  // Navigate to marketplace
  await page.goto("/invest");

  // Wait for invoices list to load and click the known invoice
  const invoiceLink = page.locator(`a[href="/invest/${MOCK_INVOICE_ID}"]`).first();
  await expect(invoiceLink).toBeVisible();
  await invoiceLink.click();

  // Verify summary fields are rendered
  await expect(page.locator("h1")).toContainText("Test Invoice");
  await expect(page.locator("text=USD")).toBeVisible();
  await expect(page.locator("text=5000")).toBeVisible();

  // a11y checks for headings and Fund button
  const fundButton = page.getByRole("button", { name: /Fund this invoice/i });
  await expect(fundButton).toBeVisible();

  // Wallet disconnected – clicking should prompt connection
  await fundButton.click();
  await expect(page.locator("text=Connect wallet to fund")).toBeVisible();

  // Simulate wallet connecting state (the UI disables the button while connecting)
  await page.evaluate(() => {
    window.__TEST_WALLET_STATE__ = "connecting";
  });
  await expect(fundButton).toBeDisabled();

  // Navigate to unknown invoice ID and verify not‑found page
  await page.goto(`/invest/unknown-id`);
  await expect(page.locator("text=Invoice not found")).toBeVisible();
});
