import { test, expect } from "@playwright/test";

test("Invest marketplace loads and displays invoices", async ({ page }) => {
  await page.goto("/invest");

  // Assert skeleton is visible (aria-busy)
  const skeleton = page.locator('[aria-busy="true"]');
  await expect(skeleton).toBeVisible();
  // Wait for skeleton to disappear
  await expect(skeleton).toBeHidden();

  // Wait for loading to finish and verify the status announcement
  const statusRegion = page.locator("role=status");
  await expect(statusRegion).toContainText("3 investable invoices loaded");

  // Assert 3 invoices
  const invoices = page.locator("ul > li");
  await expect(invoices).toHaveCount(3);
});

test("Invest marketplace empty state", async ({ page }) => {
  // Use init script to mock empty invoices
  await page.addInitScript(() => {
    window.__TEST_MOCK_INVOICES__ = [];
  });

  await page.goto("/invest");

  // Assert empty state copy
  // copy.invest.emptyState: "No investable invoices. Connect wallet to see the marketplace."
  await expect(
    page.locator("text=No investable invoices. Connect wallet to see the marketplace.")
  ).toBeVisible();
});
