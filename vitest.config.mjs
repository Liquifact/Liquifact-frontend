import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { fileURLToPath } from "url";

const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.js"],
    include: ["tests/**/*.ui.test.{js,jsx,ts,tsx}", "ui-tests/**/*.test.jsx"],
    clearMocks: true,
  },
  resolve: {
    alias: {
      "@": resolve(root, "."),
    },
  },
});
