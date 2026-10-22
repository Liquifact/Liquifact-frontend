import { expect } from "@playwright/test";
import { test } from "./fixtures.mjs";

test.describe("status filters", () => {
  test("tabs filter the list and update aria-pressed", async ({ page, seed }) => {
    seed([
      { invoiceNumber: "INV-OPEN-1", status: "open" },
      { invoiceNumber: "INV-OPEN-2", status: "open" },
      { invoiceNumber: "INV-FUNDED-1", status: "funded", amount: 1000, funded: 1000 },
    ]);
    await page.goto("/marketplace");

    const openTab = page.getByRole("button", { name: /^open$/i });
    const fundedTab = page.getByRole("button", { name: /^funded$/i });

    await expect(openTab).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByText(/INV-OPEN-1/)).toBeVisible();
    await expect(page.getByText(/INV-FUNDED-1/)).toBeVisible();

    await fundedTab.click();
    await expect(fundedTab).toHaveAttribute("aria-pressed", "true");
    await expect(openTab).toHaveAttribute("aria-pressed", "false");
    await expect(page.getByText(/INV-FUNDED-1/)).toBeVisible();
    await expect(page.getByText(/INV-OPEN-1/)).toHaveCount(0);
  });
});
