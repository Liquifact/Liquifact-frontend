import { defineConfig, devices } from "@playwright/test";
import { BASE_URL, MOCK_API_URL, PORT } from "./e2e/constants.mjs";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.spec.mjs",
  outputDir: "test-results",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: BASE_URL,
    locale: "en-US",
    colorScheme: "light",
    // The PWA service worker would answer requests before page.route sees them.
    serviceWorkers: "block",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // Production build, so the nonce CSP from proxy.js is exercised as shipped.
    command: `npm run build && npm start -- --hostname 127.0.0.1 --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
    env: {
      NEXT_PUBLIC_API_URL: MOCK_API_URL,
      NEXT_TELEMETRY_DISABLED: "1",
    },
  },
});
