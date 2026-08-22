const config = {
  testEnvironment: "jest-environment-jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
    "^next/link$": "<rootDir>/__mocks__/next-link.js",
    "^next/font/google$": "<rootDir>/__mocks__/next-font-google.js",
    "^.+\\.css$": "<rootDir>/__mocks__/style.js",
  },
  testPathIgnorePatterns: [
    "/node_modules/",
    "/.next/",
    "<rootDir>/tests/fixtures/",
    "\\.spec\\.(jsx|ts|tsx)$",
  ],
  transform: {
    "^.+\\.(js|jsx|ts|tsx|mjs)$": [
      "babel-jest",
      { configFile: require("path").join(__dirname, "babel-jest.config.js") },
    ],
  },
  transformIgnorePatterns: ["/node_modules/(?!(next|@next)/)"],
};

module.exports = config;
