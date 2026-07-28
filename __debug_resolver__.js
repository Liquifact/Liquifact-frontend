const Resolver = require("jest-resolve").default;
console.log("Resolver keys:", Object.keys(Resolver));

// Try findNodeModule
const result1 = Resolver.findNodeModule("babel-jest", { basedir: process.cwd() });
console.log("findNodeModule('babel-jest'):", result1);

const result2 = Resolver.findNodeModule(
  process.cwd().replace(/\\/g, "/") + "/jest.setup.js",
  { basedir: process.cwd() }
);
console.log("findNodeModule(absolute):", result2);

// Try with forward slashes
const fs = require("fs");
const p = process.cwd() + "\\jest.setup.js";
console.log("fs.existsSync:", fs.existsSync(p));
