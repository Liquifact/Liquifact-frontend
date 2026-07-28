const ResolverModule = require("jest-resolve");
const DefaultResolver = ResolverModule.default;

console.log("DefaultResolver.findNodeModule:", typeof DefaultResolver.findNodeModule);

const result = DefaultResolver.findNodeModule("babel-jest", { basedir: process.cwd() });
console.log("findNodeModule('babel-jest'):", result);

const result2 = DefaultResolver.findNodeModule(
  process.cwd().replace(/\\/g, "/") + "/jest.setup.js",
  { basedir: process.cwd() }
);
console.log("findNodeModule(absolute):", result2);

const result3 = DefaultResolver.findNodeModule(
  process.cwd() + "/jest.setup.js",
  { basedir: process.cwd() }
);
console.log("findNodeModule(backslash):", result3);

const result4 = DefaultResolver.findNodeModule(
  "<rootDir>/jest.setup.js",
  { basedir: process.cwd() }
);
console.log("findNodeModule(<rootDir>):", result4);
