import { test, expect } from "./fixtures.mjs";

const summary = (n) => new RegExp(`Showing 1–${n} of ${n} invoices?`);
const statusTab = (page, name) =>
  page.getByRole("group", { name: "Filter by status" }).getByRole("button", { name, exact: true });

test("lists the invoices returned by the API", async ({ page }) => {
  await page.goto("/marketplace");

  await expect(page.getByText(summary(4))).toBeVisible();
  await expect(page.getByText("E2E Alpha Foods")).toBeVisible();
  await expect(page.getByText("E2E Charlie Logistics")).toBeVisible();
  // No demo fallback notice when the API answered.
  await expect(page.getByText("showing demo data")).toHaveCount(0);
});

test("status filter narrows the list and stays in sync with the URL", async ({ page }) => {
  await page.goto("/marketplace");
  await expect(page.getByText(summary(4))).toBeVisible();

  await statusTab(page, "Open").click();
  await expect(page).toHaveURL(/[?&]status=open(&|$)/);
  await expect(statusTab(page, "Open")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText(summary(2))).toBeVisible();
  await expect(page.getByText("E2E Alpha Foods")).toBeVisible();
  await expect(page.getByText("E2E Delta Tools")).toBeVisible();
  await expect(page.getByText("E2E Bravo Textiles")).toHaveCount(0);

  await statusTab(page, "Funded").click();
  await expect(page).toHaveURL(/[?&]status=funded(&|$)/);
  await expect(page.getByText(summary(1))).toBeVisible();
  await expect(page.getByText("E2E Bravo Textiles")).toBeVisible();

  await statusTab(page, "All").click();
  await expect(page).not.toHaveURL(/status=/);
  await expect(page.getByText(summary(4))).toBeVisible();

  // The URL is the source of truth, so Back restores the previous filter.
  await page.goBack();
  await expect(page).toHaveURL(/[?&]status=funded(&|$)/);
  await expect(page.getByText(summary(1))).toBeVisible();
});

test("a status in the URL is applied on first load", async ({ page }) => {
  await page.goto("/marketplace?status=settled");

  await expect(statusTab(page, "Settled")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText(summary(1))).toBeVisible();
  await expect(page.getByText("E2E Charlie Logistics")).toBeVisible();
  await expect(page.getByText("E2E Alpha Foods")).toHaveCount(0);
});

test("opens the invoice detail page from a card", async ({ page }) => {
  await page.goto("/marketplace");
  await expect(page.getByText(summary(4))).toBeVisible();

  await page.getByRole("link", { name: /E2E Alpha Foods/ }).click();

  await expect(page).toHaveURL(/\/marketplace\/INV_E2E_1$/);
  await expect(page.getByRole("heading", { level: 1, name: "E2E Alpha Foods" })).toBeVisible();
});

test("falls back to demo invoices when the API is unreachable", async ({ page, api }) => {
  api.offline = true;
  await page.goto("/marketplace");

  await expect(page.getByText("The API is unreachable right now — showing demo data.")).toBeVisible();
  await expect(page.getByText("INV_0001")).toBeVisible();
  await expect(page.getByText("E2E Alpha Foods")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Export CSV (demo data)" })).toBeEnabled();
});
