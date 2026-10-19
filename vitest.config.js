import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    // Only pick up JSX component tests — the pure .mjs tests run under node:test
    include: ["tests/**/*.test.jsx"],
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.js"],
    testTimeout: 10000,
  },
  resolve: {
    alias: {
      "@": resolve(import.meta.dirname, "."),
    },
  },
});
