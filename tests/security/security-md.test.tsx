import fs from "fs";
import path from "path";

describe("security documentation policy", () => {
  const repoRoot = path.resolve(__dirname, "..", "..");
  const securityPath = path.join(repoRoot, "SECURITY.md");
  const docsSecurityPath = path.join(repoRoot, "docs", "security.md");

  test("SECURITY.md exists at the repository root", () => {
    expect(fs.existsSync(securityPath)).toBe(true);
  });

  test("SECURITY.md contains the expected policy sections", () => {
    const content = fs.readFileSync(securityPath, "utf8");
    expect(content).toContain("## Supported Versions");
    expect(content).toContain("## Reporting a Vulnerability");
    expect(content).toContain("## Disclosure Process");
    expect(content).toContain("## Scope");
    expect(content).toContain("## Existing Security Controls");
    expect(content).toContain("## Automated Security Checks");
  });

  test("SECURITY.md documents supported versions and private reporting", () => {
    const content = fs.readFileSync(securityPath, "utf8");
    expect(content).toContain("| Version | Supported | Notes |");
    expect(content).toContain("private");
    expect(content).toContain("acknowledge");
    expect(content).toContain("npm audit");
    expect(content).toContain("Gitleaks");
  });

  test("docs/security.md links back to the root policy and mentions CI security checks", () => {
    const content = fs.readFileSync(docsSecurityPath, "utf8");
    expect(content).toContain("SECURITY.md");
    expect(content).toContain("Gitleaks");
    expect(content).toContain("npm audit");
  });
});
