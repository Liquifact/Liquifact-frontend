import { test, expect } from "./fixtures.mjs";

const choice = (page, name) => page.getByRole("radiogroup", { name: "Theme" }).getByRole("radio", { name });
const theme = (page) => page.locator("html");

test("theme choice persists across reloads and pages", async ({ page }) => {
  await page.goto("/");
  await expect(theme(page)).toHaveAttribute("data-theme", "light");

  await choice(page, "Dark").click();
  await expect(theme(page)).toHaveAttribute("data-theme", "dark");
  expect(await page.evaluate(() => localStorage.getItem("liquifact-theme"))).toBe("dark");

  // The inline init script applies the saved theme before hydration.
  await page.reload();
  await expect(theme(page)).toHaveAttribute("data-theme", "dark");
  await expect(choice(page, "Dark")).toHaveAttribute("aria-checked", "true");

  await page.goto("/marketplace");
  await expect(theme(page)).toHaveAttribute("data-theme", "dark");

  await choice(page, "Light").click();
  await page.reload();
  await expect(theme(page)).toHaveAttribute("data-theme", "light");
  await expect(choice(page, "Light")).toHaveAttribute("aria-checked", "true");
});
