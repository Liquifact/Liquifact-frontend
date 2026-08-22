import { test, expect } from "@playwright/test";
import path from "path";

test("shows upload toast notification after successful invoice upload", async ({ page }) => {
  await page.goto("/invoices");

  await page.setInputFiles("#invoice-file-input", path.resolve("tests/fixtures/dummy.pdf"));

  await page.click("#invoice-upload-btn");

  await expect(page.locator("role=status")).toContainText(
    "Invoice queued for tokenization. Blockchain confirmation pending."
  );
});
