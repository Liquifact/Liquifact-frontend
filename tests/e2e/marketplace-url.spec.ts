import { test, expect } from "@playwright/test";

test.describe("Marketplace URL sharing", () => {
  test("Search and filter state is shared via URL and hydrates correctly", async ({
    page,
    context,
  }) => {
    // 1. Visit the marketplace
    await page.goto("/invest");

    // Wait for the skeleton to disappear (aria-busy) if it exists
    const skeleton = page.locator('[aria-busy="true"]');
    await expect(skeleton).toBeHidden({ timeout: 10000 });

    // 2. Apply search term
    const searchInput = page.getByRole("searchbox", { name: /search by issuer name/i });
    await searchInput.fill("Acme");

    // 3. Apply a filter (e.g. Min yield)
    const yieldMinInput = page.getByRole("spinbutton", { name: /minimum yield/i });
    await yieldMinInput.fill("8.0");

    // Wait for status message to indicate filtering is applied
    const statusRegion = page.locator("role=status");
    await expect(statusRegion).toContainText("match");

    // 4. Wait for URL to update
    await page.waitForURL((url) => {
      const searchParams = url.searchParams;
      return searchParams.get("search") === "Acme" && searchParams.get("yieldMin") === "8.0";
    });

    const sharedUrl = page.url();

    // 5. Open a fresh page in a new context (simulate sharing link to a new user/session)
    const newContext = await context.browser().newContext();
    const newPage = await newContext.newPage();
    await newPage.goto(sharedUrl);

    // Wait for skeleton on new page
    const newSkeleton = newPage.locator('[aria-busy="true"]');
    await expect(newSkeleton).toBeHidden({ timeout: 10000 });

    // 6. Assert hydrated state (inputs have the right values)
    const newSearchInput = newPage.getByRole("searchbox", { name: /search by issuer name/i });
    await expect(newSearchInput).toHaveValue("Acme");

    const newYieldMinInput = newPage.getByRole("spinbutton", { name: /minimum yield/i });
    await expect(newYieldMinInput).toHaveValue("8.0");

    // 7. Assert visible results match filtered subset
    const newStatusRegion = newPage.locator("role=status");
    await expect(newStatusRegion).toContainText("match");

    const visibleItems = newPage.locator("ul > li");
    const count = await visibleItems.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      await expect(visibleItems.nth(i)).toContainText("Acme");
    }

    await newContext.close();
  });

  test("Sanitized params do not inject markup", async ({ page }) => {
    const maliciousScript = '<script>alert("xss")</script>';
    const encodedMalicious = encodeURIComponent(maliciousScript);

    await page.goto(`/invest?search=${encodedMalicious}`);

    const skeleton = page.locator('[aria-busy="true"]');
    await expect(skeleton).toBeHidden({ timeout: 10000 });

    const searchInput = page.getByRole("searchbox", { name: /search by issuer name/i });
    await expect(searchInput).toHaveValue(maliciousScript);

    const scriptCount = await page.locator(`script:text-is('alert("xss")')`).count();
    expect(scriptCount).toBe(0);
  });
});
