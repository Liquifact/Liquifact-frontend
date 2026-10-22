import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    include: ["tests-ui/**/*.test.{js,jsx}", "tests/**/*.ui.test.{js,jsx,ts,tsx}"],
    setupFiles: ["./tests-ui/setup.js", "./tests/setup.js"],
  },
});