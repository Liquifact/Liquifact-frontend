const path = require("path");
const jestResolveBuild = path.join(
  process.cwd(),
  "node_modules",
  "jest-resolve",
  "build",
  "index.js"
);
const fs = require("fs");
const content = fs.readFileSync(jestResolveBuild, "utf8");

// Find what resolver is being used
const resolverMatch = content.match(/require\("([^"]+)"\)/g);
if (resolverMatch) {
  const unique = [...new Set(resolverMatch)];
  console.log("Required modules:");
  unique.forEach((m) => console.log("  ", m));
}

// Look for the specific line that loads the default resolver
const lines = content.split("\n");
for (let i = 0; i < lines.length; i++) {
  if (
    lines[i].includes("resolver") &&
    (lines[i].includes("default") || lines[i].includes("require"))
  ) {
    console.log(`Line ${i + 1}: ${lines[i].substring(0, 200)}`);
  }
}
