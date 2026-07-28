const path = require("path");
const root = __dirname;

const config = {
  rootDir: root,
  testEnvironment: require.resolve("jest-environment-jsdom"),
  moduleNameMapper: {
    "^@/(.*)$": path.join(root, "$1"),
    "^next/link$": path.join(root, "__mocks__", "next-link.js"),
    "^next/font/google$": path.join(root, "__mocks__", "next-font-google.js"),
    "^.+\\.css$": path.join(root, "__mocks__", "style.js"),
  },
  setupFilesAfterEnv: [require.resolve("./jest.setup.js")],
  transform: {
    "^.+\\.(js|jsx|ts|tsx|mjs)$": ["babel-jest", { configFile: path.join(root, "babel-jest.config.js") }],
  },
  transformIgnorePatterns: ["/node_modules/(?!(next|@next)/)"],
};

module.exports = config;
