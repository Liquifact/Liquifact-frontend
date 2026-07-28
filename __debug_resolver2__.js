const ResolverModule = require("jest-resolve");
console.log("keys:", Object.keys(ResolverModule));
console.log("default keys:", Object.keys(ResolverModule.default || {}));
console.log("ResolverModule:", typeof ResolverModule);

// Maybe findNodeModule is on the module, not the class
if (typeof ResolverModule.findNodeModule === "function") {
  console.log("findNodeModule exists on module");
}

// Try the resolver default export
const DefaultResolver = ResolverModule.default;
if (DefaultResolver) {
  console.log("DefaultResolver:", typeof DefaultResolver);
  console.log("DefaultResolver prototype:", Object.getOwnPropertyNames(DefaultResolver.prototype));
  console.log("static:", Object.getOwnPropertyNames(DefaultResolver));
}
