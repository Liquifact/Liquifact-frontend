import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { fileURLToPath } from "url";
import { transformWithEsbuild } from "vite";

const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  plugins: [
    {
      // Next app-router pages use JSX in .js files; transform them for UI tests.
      name: "next-jsx-pages",
      enforce: "pre",
      async transform(code, id) {
        if (/\/app\/.*\.js$/.test(id.replaceAll("\\", "/"))) {
          return transformWithEsbuild(code, id, { loader: "jsx", jsx: "automatic" });
        }
      },
    },
    react(),
  ],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.js"],
    include: ["tests/**/*.ui.test.{js,jsx,ts,tsx}", "tests-ui/**/*.test.{js,jsx}"],
  },
  resolve: {
    alias: {
      "@": resolve(root, "."),
    },
  },
});
