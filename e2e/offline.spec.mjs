import { expect } from "@playwright/test";
import { test } from "./fixtures.mjs";

test.describe("offline fallback", () => {
  test("marketplace shows demo banner and demo invoices when API is unavailable", async ({ page, setOffline }) => {
    setOffline(true);
    await page.goto("/marketplace");

    await expect(page.getByText(/demo/i).first()).toBeVisible();

    const cards = page.getByTestId(/invoice-item/i);
    await expect(cards).toHaveCount(4);
  });

  test("fund button is disabled in offline mode", async ({ page, setOffline }) => {
    setOffline(true);
    await page.goto("/marketplace");
    const firstCard = page.getByTestId(/invoice-item/i).first();
    await firstCard.getByRole("link").click();
    await expect(page).toHaveURL(/\/marketplace\/[^/]+/);
    const fundBtn = page.getByRole("button", { name: /fund/i });
    await expect(fundBtn).toBeDisabled();
  });
});
