import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": root.replace(/\/$/, "") },
  },
  test: {
    environment: "jsdom",
    // globals so @testing-library/react registers its auto-cleanup afterEach
    globals: true,
    setupFiles: ["./vitest.setup.mjs"],
    // Plain node --test ESM suites live in tests/*.test.mjs and are run by
    // `npm test`; Vitest only picks up the JSX component/hook suites.
    include: ["tests/**/*.test.jsx"],
  },
});
