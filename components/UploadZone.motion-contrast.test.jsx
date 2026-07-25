/**
 * Reduced-motion + high-contrast tests for UploadZone (issue #699).
 *
 * Reduced-motion: jsdom doesn't execute CSS, so — matching the convention
 * already established in app/globals.reduced-motion.test.tsx — this suite
 * asserts on the Tailwind `motion-reduce:` class names that drive the
 * animation/transition suppression at the browser layer, plus the actual
 * `@media (prefers-reduced-motion: reduce)` rule existing in globals.css
 * (which, prior to this change, the existing reduced-motion test's own
 * docstring claimed existed but did not — see globals.css diff).
 *
 * High contrast: asserts the .upload-dropzone / .upload-subtle-panel /
 * .upload-muted-text hooks are present on the elements that rely on
 * low-opacity fills (illegible under forced-colors / prefers-contrast:
 * more), and that globals.css defines real rules for them.
 */

import fs from "fs";
import path from "path";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";
import UploadZone, { Spinner } from "./UploadZone";
import { copy } from "../app/copy/en";

expect.extend(toHaveNoViolations);

const cssSource = fs.readFileSync(path.join(__dirname, "..", "app", "globals.css"), "utf8");

describe("globals.css — reduced-motion and high-contrast rules exist", () => {
  it("defines @media (prefers-reduced-motion: reduce)", () => {
    expect(cssSource).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  });

  it("suppresses animation and transition duration inside the reduced-motion block", () => {
    const match = /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*{([\s\S]*?)}\s*}/.exec(
      cssSource,
    );
    expect(match).toBeTruthy();
    expect(match[1]).toMatch(/animation-duration/);
    expect(match[1]).toMatch(/transition-duration/);
  });

  it("defines forced-colors and prefers-contrast rules targeting the upload classes", () => {
    expect(cssSource).toMatch(/@media\s*\(forced-colors:\s*active\)/);
    expect(cssSource).toMatch(/@media\s*\(prefers-contrast:\s*more\)/);
    expect(cssSource).toContain(".upload-dropzone");
    expect(cssSource).toContain(".upload-subtle-panel");
    expect(cssSource).toContain(".upload-muted-text");
  });
});

describe("UploadZone — reduced-motion class hooks", () => {
  it("Spinner disables its rotation via motion-reduce:animate-none alongside animate-spin", () => {
    const { container } = render(<Spinner />);
    const svg = container.querySelector("svg");
    const cls = svg?.className?.baseVal ?? svg?.getAttribute("class") ?? "";
    expect(cls).toContain("animate-spin");
    expect(cls).toContain("motion-reduce:animate-none");
  });

  it("the dropzone's color transition is suppressed under reduced motion", () => {
    render(<UploadZone />);
    const dropzone = screen.getByRole("button", { name: copy.uploadZone.dropZoneLabel });
    expect(dropzone.className).toContain("transition-colors");
    expect(dropzone.className).toContain("motion-reduce:transition-none");
  });

  it("the submit button's transition is suppressed under reduced motion", () => {
    render(<UploadZone />);
    const submitBtn = document.getElementById("invoice-upload-btn");
    expect(submitBtn.className).toContain("transition-all");
    expect(submitBtn.className).toContain("motion-reduce:transition-none");
  });
});

describe("UploadZone — high-contrast class hooks", () => {
  it("the dropzone carries the upload-dropzone hook used by the forced-colors/contrast rules", () => {
    render(<UploadZone />);
    const dropzone = screen.getByRole("button", { name: copy.uploadZone.dropZoneLabel });
    expect(dropzone.className).toContain("upload-dropzone");
  });

  it("the file-requirements panel carries the upload-subtle-panel hook", () => {
    render(<UploadZone />);
    const panel = screen.getByRole("note", { name: "File upload requirements" });
    expect(panel.className).toContain("upload-subtle-panel");
  });

  it("secondary/muted copy carries the upload-muted-text hook", () => {
    render(<UploadZone />);
    const browsePrompt = screen.getByText(copy.uploadZone.browsePrompt);
    expect(browsePrompt.className).toContain("upload-muted-text");
  });
});

describe("UploadZone — no regressions in core behaviour or accessibility", () => {
  it("still renders the drag-drop prompt and file input when idle", () => {
    render(<UploadZone />);
    expect(screen.getByText(copy.uploadZone.dragDropPrompt)).toBeInTheDocument();
    expect(screen.getByLabelText(copy.uploadZone.fileInputLabel)).toBeInTheDocument();
  });

  it("passes axe accessibility checks in the idle state", async () => {
    const { container } = render(<UploadZone />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
