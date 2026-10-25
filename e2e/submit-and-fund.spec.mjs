import { expect } from "@playwright/test";
import { test, API_URL } from "./fixtures.mjs";

test.describe("submit → browse → fund", () => {
  test("full journey: submit, find in marketplace, fund to completion", async ({ page }) => {
    const realRequests = [];
    page.on("request", (req) => {
      const u = req.url();
      if (u.includes("liquifact-backend.vercel.app")) realRequests.push(u);
    });

    await page.goto("/submit");

    await page.getByLabel(/invoice number/i).fill("INV-E2E-001");
    await page.getByLabel(/issuer/i).or(page.getByLabel(/company/i)).first().fill("Acme Co.");
    await page.getByLabel(/debtor/i).fill("Beta Ltd.");
    await page.getByLabel(/amount/i).fill("1000");
    await page.getByLabel(/due date/i).or(page.getByLabel(/maturity/i)).first().fill("2030-01-01");

    await page.getByRole("button", { name: /submit/i }).click();

    await expect(page.getByText(/success/i).first()).toBeVisible();

    await page.getByRole("link", { name: /view listing/i }).click();
    await expect(page).toHaveURL(/\/marketplace\/[^/]+/);

    await expect(page.getByText(/INV-E2E-001/)).toBeVisible();

    const fundAmount = page.getByLabel(/amount/i).filter({ hasNot: page.getByText(/invoice number/i) });
    await fundAmount.first().fill("500");
    await page.getByRole("button", { name: /fund/i }).click();

    await expect(page.getByText(/50%|500\s*\/\s*1000|500 of 1000/i).first()).toBeVisible();

    await fundAmount.first().fill("500");
    await page.getByRole("button", { name: /fund/i }).click();

    await expect(page.getByText(/funded/i).first()).toBeVisible();
    await expect(page.getByLabel(/amount/i).filter({ hasNot: page.getByText(/invoice number/i) })).toHaveCount(0);

    expect(realRequests, `should not hit real backend: ${realRequests.join(", ")}`).toHaveLength(0);
  });
});
