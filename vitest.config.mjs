import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { transformWithEsbuild } from "vite";

export default defineConfig({
  plugins: [{
    name: "next-jsx-pages",
    enforce: "pre",
    async transform(code, id) {
      if (/\/app\/.*\.js$/.test(id.replaceAll("\\", "/"))) {
        return transformWithEsbuild(code, id, { loader: "jsx", jsx: "automatic" });
      }
    },
  }, react()],
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.js"],
    include: ["tests/**/*.ui.test.{js,jsx,ts,tsx}", "ui-tests/**/*.test.jsx"],
    restoreMocks: true,
  },
});
