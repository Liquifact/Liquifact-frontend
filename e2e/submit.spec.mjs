import { test, expect } from "./fixtures.mjs";
import { CREATED_ID } from "./fixtures.mjs";

const DUE_DATE = "2027-06-30";

async function fillDetails(page) {
  await page.getByLabel("Company name").fill("E2E Echo Metals");
  await page.getByLabel("Debtor (who owes the invoice)").fill("Hotel Retail");
  await page.getByLabel("Amount").fill("25000");
}

async function fillTerms(page, { yieldPercent = "8" } = {}) {
  await page.getByLabel("Investor yield (%)").fill(yieldPercent);
  await page.getByLabel("Due date").fill(DUE_DATE);
}

const next = (page) => page.getByRole("button", { name: "Next" }).click();
const stepHeading = (page, text) => page.getByRole("heading", { level: 2, name: text });

test("step 1 blocks Next until the required fields are valid", async ({ page, api }) => {
  await page.goto("/submit");
  await expect(stepHeading(page, /Step 1 of 3/)).toBeVisible();

  await next(page);

  await expect(page.getByText("Company name is required")).toBeVisible();
  await expect(page.getByText("Debtor is required")).toBeVisible();
  await expect(page.getByText("Enter a positive amount")).toBeVisible();
  await expect(stepHeading(page, /Step 1 of 3/)).toBeVisible();
  await expect(page.getByLabel("Company name")).toBeFocused();

  await fillDetails(page);
  await next(page);
  await expect(stepHeading(page, /Step 2 of 3/)).toBeVisible();
  expect(api.created).toEqual([]);
});

test("step 2 rejects a yield with more than two decimals and a missing due date", async ({ page }) => {
  await page.goto("/submit");
  await fillDetails(page);
  await next(page);

  await page.getByLabel("Investor yield (%)").fill("8.125");
  await next(page);
  await expect(page.getByText("Enter a yield from 0 to 100 with at most 2 decimals")).toBeVisible();
  await expect(page.getByText("Pick a due date")).toBeVisible();
  await expect(stepHeading(page, /Step 2 of 3/)).toBeVisible();

  await fillTerms(page);
  await next(page);
  await expect(stepHeading(page, /Step 3 of 3/)).toBeVisible();
});

test("review step needs the confirmation checkbox before it submits", async ({ page, api }) => {
  await page.goto("/submit");
  await fillDetails(page);
  await next(page);
  await fillTerms(page);
  await next(page);

  await page.getByRole("button", { name: "Submit invoice" }).click();

  await expect(page.getByText("Confirm the invoice is genuine and unpaid")).toBeVisible();
  expect(api.created).toEqual([]);
});

test("submits the wizard and shows the created invoice", async ({ page, api }) => {
  await page.goto("/submit");
  await fillDetails(page);
  await next(page);
  await fillTerms(page);
  await next(page);

  await expect(page.getByText("E2E Echo Metals")).toBeVisible();
  await page.getByLabel("I confirm this invoice is genuine and unpaid").check();
  await page.getByRole("button", { name: "Submit invoice" }).click();

  await expect(page.getByRole("heading", { name: "Invoice submitted" })).toBeVisible();
  await expect(page.getByText(CREATED_ID).first()).toBeVisible();
  expect(api.created).toEqual([
    { sme: "E2E Echo Metals", debtor: "Hotel Retail", amount: 25000, currency: "USDC", yieldBps: 800, dueDate: DUE_DATE },
  ]);

  await page.getByRole("link", { name: /View listing/ }).click();
  await expect(page).toHaveURL(new RegExp(`/marketplace/${CREATED_ID}$`));
  await expect(page.getByRole("heading", { level: 1, name: "E2E Echo Metals" })).toBeVisible();
});

test("shows the API's validation error and keeps the form", async ({ page, api }) => {
  api.createResponse = { status: 400, body: { error: "Validation failed", details: ["dueDate must be in the future"] } };
  await page.goto("/submit");
  await fillDetails(page);
  await next(page);
  await fillTerms(page);
  await next(page);
  await page.getByLabel("I confirm this invoice is genuine and unpaid").check();
  await page.getByRole("button", { name: "Submit invoice" }).click();

  await expect(page.getByText("Could not submit: Validation failed")).toBeVisible();
  await expect(page.getByText("dueDate must be in the future")).toBeVisible();
  await expect(stepHeading(page, /Step 3 of 3/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Submit invoice" })).toBeEnabled();
});

test("queues the invoice when the API is unreachable", async ({ page, api }) => {
  await page.goto("/submit");
  await fillDetails(page);
  await next(page);
  await fillTerms(page);
  await next(page);
  await page.getByLabel("I confirm this invoice is genuine and unpaid").check();

  api.offline = true;
  await page.getByRole("button", { name: "Submit invoice" }).click();

  await expect(page.getByRole("heading", { name: "Invoice queued" })).toBeVisible();
  await expect(page.getByText(/will send when online/i)).toBeVisible();
});
