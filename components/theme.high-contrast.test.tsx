/**
 * @file components/theme.high-contrast.test.tsx
 * Issue #949 — theme components forced-colors and high-contrast support.
 *
 * jsdom cannot evaluate CSS media queries, so the stylesheet contract is
 * checked from source. DOM tests verify that the theme components expose
 * stable CSS hooks and continue to pass an axe smoke check.
 */

import fs from "fs";
import path from "path";
import React from "react";
import "jest-axe";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";

import ThemeInputs from "./ThemeInputs";
import ThemeOptionsModal from "./ThemeOptionsModal";

expect.extend(toHaveNoViolations);

// ── Source-loading helpers ────────────────────────────────────────────────────

const GLOBALS_CSS_PATH = path.join(__dirname, "..", "app", "globals.css");

function escapeRegExp(literal: string): string {
  return literal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractMediaBlock(source: string, feature: string): string {
  const pattern = new RegExp(
    `@media\\s*\\([^)]*${escapeRegExp(feature)}[^)]*\\)\\s*\\{`,
    "g"
  );
  const bodies: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(source)) !== null) {
    const openIndex = match.index + match[0].length - 1;
    let depth = 1;
    let cursor = openIndex + 1;

    while (cursor < source.length && depth > 0) {
      if (source[cursor] === "{") depth += 1;
      if (source[cursor] === "}") depth -= 1;
      cursor += 1;
    }

    if (depth !== 0) {
      throw new Error(`Unbalanced CSS media block for ${feature}`);
    }

    bodies.push(source.slice(openIndex + 1, cursor - 1));
    pattern.lastIndex = cursor;
  }

  if (bodies.length === 0) {
    throw new Error(`CSS media block "${feature}" not found in globals.css`);
  }

  return bodies.join("\n");
}

function stripMediaBlocks(source: string): string {
  const output: string[] = [];
  const pattern = /@media\s*\([^)]*\)\s*\{/g;
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(source)) !== null) {
    output.push(source.slice(cursor, match.index));

    let depth = 1;
    let index = match.index + match[0].length;
    while (index < source.length && depth > 0) {
      if (source[index] === "{") depth += 1;
      if (source[index] === "}") depth -= 1;
      index += 1;
    }

    cursor = index;
    pattern.lastIndex = index;
  }

  output.push(source.slice(cursor));
  return output.join("");
}

// ── DOM hook tests ───────────────────────────────────────────────────────────

describe("ThemeInputs high-contrast DOM hooks", () => {
  const defaultProps = {
    initialTheme: "dark",
    initialAccentColour: "cyan",
    onSubmit: () => {},
    disabled: false,
  };

  it("marks the form panel with a CSS hook", () => {
    const { container } = render(<ThemeInputs {...defaultProps} />);
    const form = container.querySelector("form");
    expect(form).toHaveClass("theme-form-panel");
  });

  it("marks the title with a CSS hook", () => {
    render(<ThemeInputs {...defaultProps} />);
    const title = screen.getByText("Theme Preferences");
    expect(title).toHaveClass("theme-form-title");
  });

  it("marks the labels with a CSS hook", () => {
    render(<ThemeInputs {...defaultProps} />);
    const themeLabel = screen.getByText("Theme");
    const accentLabel = screen.getByText("Accent Colour");
    expect(themeLabel).toHaveClass("theme-form-label");
    expect(accentLabel).toHaveClass("theme-form-label");
  });

  it("marks the helper text with a CSS hook", () => {
    render(<ThemeInputs {...defaultProps} />);
    const helper = screen.getByText(/Light, dark, or follow/i);
    expect(helper).toHaveClass("theme-form-helper");
  });

  it("passes an axe smoke check", async () => {
    const { container } = render(<ThemeInputs {...defaultProps} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe("ThemeOptionsModal high-contrast DOM hooks", () => {
  const defaultProps = {
    preference: "dark",
    onSelect: () => {},
    onClose: () => {},
    open: true,
  };

  it("marks the backdrop with a CSS hook", () => {
    render(<ThemeOptionsModal {...defaultProps} />);
    const backdrop = screen.getByTestId("theme-options-backdrop");
    expect(backdrop).toHaveClass("theme-modal-backdrop");
  });

  it("marks the dialog with a CSS hook", () => {
    render(<ThemeOptionsModal {...defaultProps} />);
    const dialog = screen.getByRole("dialog", { name: "Theme" });
    expect(dialog).toHaveClass("theme-modal-dialog");
  });

  it("marks the title with a CSS hook", () => {
    render(<ThemeOptionsModal {...defaultProps} />);
    const title = screen.getByText("Theme");
    expect(title).toHaveClass("theme-modal-title");
  });

  it("marks the selected option with a CSS hook", () => {
    render(<ThemeOptionsModal {...defaultProps} />);
    const darkRadio = screen.getByRole("radio", { name: "Dark" });
    expect(darkRadio).toHaveClass("theme-option-selected");
  });

  it("marks unselected options with a CSS hook", () => {
    render(<ThemeOptionsModal {...defaultProps} />);
    const lightRadio = screen.getByRole("radio", { name: "Light" });
    expect(lightRadio).toHaveClass("theme-option-unselected");
  });

  it("passes an axe smoke check", async () => {
    const { container } = render(<ThemeOptionsModal {...defaultProps} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});

// ── forced-colors stylesheet contract ─────────────────────────────────────────

describe("theme forced-colors stylesheet contract", () => {
  const cssSource = fs.readFileSync(GLOBALS_CSS_PATH, "utf8");
  const block = extractMediaBlock(cssSource, "forced-colors: active");

  it("uses system Canvas for theme surfaces", () => {
    expect(block).toMatch(/\.theme-form-panel\b/);
    expect(block).toMatch(/\.theme-modal-dialog\b/);
    expect(block).toMatch(/background-color\s*:\s*Canvas/);
    expect(block).toMatch(/forced-color-adjust\s*:\s*none/);
  });

  it("uses system CanvasText for theme titles and labels", () => {
    expect(block).toMatch(/\.theme-form-title\b/);
    expect(block).toMatch(/\.theme-modal-title\b/);
    expect(block).toMatch(/\.theme-form-label\b/);
    expect(block).toMatch(/color\s*:\s*CanvasText/);
  });

  it("uses system GrayText for helper text", () => {
    expect(block).toMatch(/\.theme-form-helper\b/);
    expect(block).toMatch(/color\s*:\s*GrayText/);
  });

  it("uses system ButtonFace/ButtonText for selected option", () => {
    expect(block).toMatch(/\.theme-option-selected\b/);
    expect(block).toMatch(/background-color\s*:\s*ButtonFace/);
    expect(block).toMatch(/color\s*:\s*ButtonText/);
    expect(block).toMatch(/border\s*:\s*2px\s+solid\s+Highlight/);
  });

  it("uses system Canvas/CanvasText for unselected option", () => {
    expect(block).toMatch(/\.theme-option-unselected\b/);
    expect(block).toMatch(/background-color\s*:\s*Canvas/);
    expect(block).toMatch(/color\s*:\s*CanvasText/);
  });

  it("provides accessible hover state for theme buttons", () => {
    expect(block).toMatch(/\.theme-toggle-button:hover\b/);
    expect(block).toMatch(/background-color\s*:\s*ButtonFace/);
  });
});

// ── prefers-contrast stylesheet contract ──────────────────────────────────────

describe("theme prefers-contrast stylesheet contract", () => {
  const cssSource = fs.readFileSync(GLOBALS_CSS_PATH, "utf8");
  const block = extractMediaBlock(cssSource, "prefers-contrast: more");

  it("strengthens theme surface borders and backgrounds", () => {
    expect(block).toMatch(/\.theme-form-panel\b/);
    expect(block).toMatch(/\.theme-modal-dialog\b/);
    expect(block).toMatch(/background-color\s*:\s*#0f172a/);
    expect(block).toMatch(/border-color\s*:\s*#475569/);
  });

  it("strengthens theme title and label contrast", () => {
    expect(block).toMatch(/\.theme-form-title\b/);
    expect(block).toMatch(/\.theme-modal-title\b/);
    expect(block).toMatch(/color\s*:\s*#f1f5f9/);
  });

  it("strengthens helper text contrast", () => {
    expect(block).toMatch(/\.theme-form-helper\b/);
    expect(block).toMatch(/color\s*:\s*#94a3b8/);
  });

  it("strengthens the selected option", () => {
    expect(block).toMatch(/\.theme-option-selected\b/);
    expect(block).toMatch(/border-color\s*:\s*#67e8f9/);
  });

  it("strengthens the unselected option", () => {
    expect(block).toMatch(/\.theme-option-unselected\b/);
    expect(block).toMatch(/border-color\s*:\s*#475569/);
    expect(block).toMatch(/color\s*:\s*#e2e8f0/);
  });

  it("keeps theme-specific CSS out of normal mode", () => {
    const normalModeCss = stripMediaBlocks(cssSource);
    expect(normalModeCss).not.toMatch(
      /\.theme-(?:form-panel|form-title|form-label|form-helper|modal-backdrop|modal-dialog|modal-title|option-selected|option-unselected|toggle-button|options-button|updated-at)\b/
    );
  });
});