import { expect } from "@playwright/test";
import { test } from "./fixtures.mjs";

test.describe("validation", () => {
  test("empty submit shows all field errors", async ({ page }) => {
    await page.goto("/submit");
    await page.getByRole("button", { name: /submit/i }).click();

    const errors = page.getBuRole("alert");
    // at least one error surface is visible
    await expect(errors.first()).toBeVisible();
    // and each required field has an associated message
    for (const label of [/invoice number/i, /issuer/i, /debtor/i, /amount/i, /due date/i]) {
      const field = page.getByLabel(label).first();
      await expect(field).toHaveAttribute("aria-invalid", "true");
    }
  });

  test("negative fund amount shows an error", async ({ page, seed }) => {
    const [inv] = seed([{ invoiceNumber: "INV-NEG-001", amount: 1000 }]);
    await page.goto(`/marketplace/${inv.id}`);

    const amount = page.getByLabel(/amount/i).filter({ hasNot: page.getByText(/invoice number/i) }).first();
    await amount.fill("-10");
    await page.getByRole("button", { name: /fund/i }).click();

    await expect(page.getByText(/positive|invalid|must be|greater than 0/i).first()).toBeVisible();
  });
});
