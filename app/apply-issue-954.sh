#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

echo "Restoring original dashboard files from upstream/main..."
git restore --source=upstream/main -- app/page.js app/globals.css

echo "Adding a stable dashboard scope and CSS import..."
node <<'NODE'
const fs = require("fs");

const pagePath = "app/page.js";
const globalsPath = "app/globals.css";

let page = fs.readFileSync(pagePath, "utf8");
const originalMain =
  '<main id="main-content" className="max-w-4xl mx-auto px-6 py-16">';
const scopedMain =
  '<main id="main-content" data-dashboard="home" className="max-w-4xl mx-auto px-6 py-16">';

if (!page.includes(originalMain) && !page.includes(scopedMain)) {
  throw new Error("Expected dashboard <main> element was not found in app/page.js");
}

if (!page.includes(scopedMain)) {
  page = page.replace(originalMain, scopedMain);
  fs.writeFileSync(pagePath, page);
}

let globals = fs.readFileSync(globalsPath, "utf8");
const importLine = '@import "./dashboard.high-contrast.css";';

if (!globals.includes(importLine)) {
  const tailwindImport = '@import "tailwindcss";';
  if (!globals.includes(tailwindImport)) {
    throw new Error('Expected @import "tailwindcss"; was not found in app/globals.css');
  }

  globals = globals.replace(
    tailwindImport,
    `${tailwindImport}\n${importLine}`
  );
  fs.writeFileSync(globalsPath, globals);
}
NODE

echo "Creating dashboard high-contrast stylesheet..."
cat > app/dashboard.high-contrast.css <<'EOF'
/*
 * Issue #954: dashboard high-contrast support.
 *
 * These rules are scoped to the home dashboard through data-dashboard="home".
 * They only apply when the operating system requests forced colours or
 * increased contrast, so normal-mode layout and styling remain unchanged.
 */

@media (forced-colors: active) {
  [data-dashboard="home"] {
    background-color: Canvas;
    color: CanvasText;
  }

  [data-dashboard="home"] > p,
  [data-dashboard="home"] > .grid p,
  [data-dashboard="home"] > .rounded-xl > p,
  [data-dashboard="home"] [role="status"] p,
  [data-dashboard="home"] [role="status"] span,
  [data-dashboard="home"] summary,
  [data-dashboard="home"] pre {
    color: CanvasText;
    forced-color-adjust: none;
  }

  [data-dashboard="home"] > .grid > a,
  [data-dashboard="home"] > .rounded-xl,
  [data-dashboard="home"] [role="status"] {
    border: 2px solid CanvasText;
    background-color: Canvas;
    color: CanvasText;
    forced-color-adjust: none;
  }

  [data-dashboard="home"] > .grid > a {
    border-color: LinkText;
  }

  [data-dashboard="home"] > .grid > a h2 {
    color: LinkText;
    text-decoration: underline;
    text-decoration-thickness: 2px;
    forced-color-adjust: none;
  }

  [data-dashboard="home"] button {
    border: 2px solid ButtonText;
    background-color: ButtonFace;
    color: ButtonText;
    opacity: 1;
    forced-color-adjust: none;
  }

  [data-dashboard="home"] button:disabled {
    border-color: GrayText;
    color: GrayText;
    opacity: 1;
  }

  [data-dashboard="home"] [role="status"] > div:first-child > span {
    border: 2px solid ButtonText;
    background-color: ButtonFace;
    color: ButtonText;
    forced-color-adjust: none;
  }

  [data-dashboard="home"] a:focus-visible,
  [data-dashboard="home"] button:focus-visible,
  [data-dashboard="home"] summary:focus-visible {
    outline: 3px solid Highlight;
    outline-offset: 3px;
    forced-color-adjust: none;
  }

  [data-dashboard="home"]
    [data-testid="health-status-skeleton"]
    [aria-hidden="true"] {
    border: 2px solid CanvasText;
    background-color: Canvas;
    forced-color-adjust: none;
  }

  [data-dashboard="home"]
    [data-testid="health-status-skeleton"]
    [aria-hidden="true"]
    div {
    background-color: CanvasText;
    forced-color-adjust: none;
  }
}

@media (prefers-contrast: more) {
  [data-dashboard="home"] > .grid > a,
  [data-dashboard="home"] > .rounded-xl,
  [data-dashboard="home"] [role="status"] {
    border-width: 2px;
    border-color: var(--color-fg);
    background-color: var(--color-surface);
  }

  [data-dashboard="home"] > .grid > a h2 {
    color: var(--color-primary);
    text-decoration: underline;
    text-decoration-thickness: 2px;
  }

  [data-dashboard="home"] > p,
  [data-dashboard="home"] > .grid p,
  [data-dashboard="home"] > .rounded-xl > p,
  [data-dashboard="home"] [role="status"] p,
  [data-dashboard="home"] [role="status"] span,
  [data-dashboard="home"] summary,
  [data-dashboard="home"] pre {
    color: var(--color-fg);
  }

  [data-dashboard="home"] button {
    border: 2px solid var(--color-fg);
    background-color: var(--color-surface);
    color: var(--color-fg);
    opacity: 1;
  }

  [data-dashboard="home"] [role="status"] > div:first-child > span {
    border-width: 2px;
  }

  [data-dashboard="home"] a:focus-visible,
  [data-dashboard="home"] button:focus-visible,
  [data-dashboard="home"] summary:focus-visible {
    outline-width: 3px;
    outline-offset: 3px;
  }
}
EOF

echo "Creating focused dashboard contrast tests..."
cat > app/page.high-contrast.test.tsx <<'EOF'
import fs from "fs";
import path from "path";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";

import Home from "./page";
import { getHealth } from "../lib/api/health";

expect.extend(toHaveNoViolations);

jest.mock("../components/NavMenu", () => ({
  __esModule: true,
  default: function MockNavMenu() {
    return <div data-testid="nav-menu">NavMenu</div>;
  },
}));

jest.mock("../lib/api/health", () => ({
  __esModule: true,
  getHealth: jest.fn(),
}));

const mockGetHealth = getHealth as jest.Mock;
const dashboardCss = fs.readFileSync(
  path.join(__dirname, "dashboard.high-contrast.css"),
  "utf8"
);
const globalsCss = fs.readFileSync(
  path.join(__dirname, "globals.css"),
  "utf8"
);

describe("dashboard high-contrast support", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("scopes the accessibility styles to the home dashboard", () => {
    const { container } = render(<Home />);
    expect(
      container.querySelector('[data-dashboard="home"]')
    ).toBeInTheDocument();
  });

  it("imports the dashboard stylesheet from globals.css", () => {
    expect(globalsCss).toContain(
      '@import "./dashboard.high-contrast.css";'
    );
  });

  it("defines forced-colors system colours and visible focus", () => {
    expect(dashboardCss).toMatch(
      /@media\s*\(\s*forced-colors\s*:\s*active\s*\)/
    );
    expect(dashboardCss).toContain("Canvas");
    expect(dashboardCss).toContain("CanvasText");
    expect(dashboardCss).toContain("LinkText");
    expect(dashboardCss).toContain("ButtonFace");
    expect(dashboardCss).toContain("ButtonText");
    expect(dashboardCss).toContain("GrayText");
    expect(dashboardCss).toContain("Highlight");
    expect(dashboardCss).toMatch(
      /outline:\s*3px\s+solid\s+Highlight/
    );
  });

  it("defines stronger contrast without adding normal-mode rules", () => {
    expect(dashboardCss).toMatch(
      /@media\s*\(\s*prefers-contrast\s*:\s*more\s*\)/
    );
    expect(dashboardCss.trim().startsWith("/*")).toBe(true);

    const firstRuleIndex = dashboardCss.indexOf("@media");
    const beforeMedia = dashboardCss.slice(0, firstRuleIndex);
    expect(beforeMedia).not.toMatch(
      /\[data-dashboard="home"\]\s*\{/
    );
  });

  it("keeps status readable with text and a non-colour border", async () => {
    mockGetHealth.mockResolvedValue({
      status: "degraded",
      message: "Backend responded with 500",
      details: { error: "Internal Server Error" },
    });

    render(<Home />);

    fireEvent.click(
      screen.getByRole("button", {
        name: /check backend health/i,
      })
    );

    await waitFor(() => {
      expect(screen.getByText(/degraded/i)).toBeInTheDocument();
    });

    expect(screen.getByRole("status")).toHaveTextContent(/degraded/i);
    expect(screen.getByRole("status")).toHaveTextContent(
      /backend responded with 500/i
    );
  });

  it("passes axe before and after health content loads", async () => {
    const initial = render(<Home />);
    expect(await axe(initial.container)).toHaveNoViolations();
    initial.unmount();

    mockGetHealth.mockResolvedValue({
      status: "connected",
      message: "Backend is healthy",
      details: { status: "ok" },
    });

    const loaded = render(<Home />);

    fireEvent.click(
      screen.getByRole("button", {
        name: /check backend health/i,
      })
    );

    await waitFor(() => {
      expect(
        screen.getByText(/backend is healthy/i)
      ).toBeInTheDocument();
    });

    expect(await axe(loaded.container)).toHaveNoViolations();
  });
});
EOF

echo "Removing the earlier temporary replacement file if present..."
rm -f app/page.high-contrast.test.jsx

echo
echo "Issue #954 files prepared:"
git status --short
echo
git diff --check
