const path = require("path");

// Shared configuration applied to every project via object spread so we
// don't duplicate moduleNameMapper / transform / setup / ignores across
// projects.  Each project then extends `testPathIgnorePatterns` (and only
// overrides keys it actually needs, e.g. testMatch) on top.
const sharedConfig = {
  testEnvironment: "jest-environment-jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
    "^next/link$": "<rootDir>/__mocks__/next-link.js",
    "^next/font/google$": "<rootDir>/__mocks__/next-font-google.js",
    "^.+\\.css$": "<rootDir>/__mocks__/style.js",
  },
  testPathIgnorePatterns: ["/node_modules/", "/.next/", "<rootDir>/tests/fixtures/"],
  transform: {
    "^.+\\.(js|jsx|ts|tsx|mjs)$": [
      "babel-jest",
      { configFile: path.join(__dirname, "babel-jest.config.js") },
    ],
  },
  transformIgnorePatterns: ["/node_modules/(?!(next|@next)/)"],
};

module.exports = {
  projects: [
    {
      displayName: "unit",
      // Positive testMatch scoped to source directories so the unit project
      // picks up every *.test.{js,jsx,ts,tsx} file inside them but not
      // Playwright specs and not the dedicated a11y files.
      testMatch: [
        "<rootDir>/app/**/*.test.{js,jsx,ts,tsx}",
        "<rootDir>/components/**/*.test.{js,jsx,ts,tsx}",
        "<rootDir>/lib/**/*.test.{js,jsx,ts,tsx}",
        "<rootDir>/scripts/**/*.test.{js,jsx,ts,tsx}",
        "<rootDir>/security/**/*.test.{js,jsx,ts,tsx}",
        "<rootDir>/tests/**/*.test.{js,jsx,ts,tsx}",
      ],
      // Project-specific ignores layered on top of sharedConfig entries.
      // Spread AFTER the shared list so project changes cannot accidentally
      // clobber the boilerplate.
      ...sharedConfig,
      testPathIgnorePatterns: [
        ...sharedConfig.testPathIgnorePatterns,
        // Playwright e2e specs (run via `npm run test:e2e`, not Jest).
        "\\.spec\\.[jt]sx?$",
        // Dedicated accessibility tests are picked up by the `a11y` project
        // instead so that the slow jest-axe passes don't slow down unit runs.
        "\\.a11y\\.test\\.[jt]sx?$",
      ],
    },
    {
      displayName: "a11y",
      // Only the dedicated *.a11y.test.* files (jest-axe accessibility audits).
      testMatch: ["<rootDir>/**/*.a11y.test.{js,jsx,ts,tsx}"],
      ...sharedConfig,
    },
  ],
};
