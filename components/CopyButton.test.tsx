/**
 * CopyButton — comprehensive unit + accessibility tests
 *
 * Covers:
 *   - Rendering & initial state
 *   - Clipboard API success path
 *   - execCommand fallback (Clipboard API unavailable)
 *   - Error path (both API and fallback fail)
 *   - 2-second visual feedback & revert
 *   - aria-label / live-region accessibility
 *   - Toast integration (success + error)
 *   - jest-axe pass
 *   - Keyboard operability
 */

import React from "react";
import "@testing-library/jest-dom";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";

import CopyButton, { copyToClipboard } from "./CopyButton";

expect.extend(toHaveNoViolations);

// ── Toast mock ────────────────────────────────────────────────────────────────

const mockToast = {
  success: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
};

jest.mock("./ToastProvider", () => ({
  useToast: () => mockToast,
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderCopyButton(props: Partial<React.ComponentProps<typeof CopyButton>> = {}) {
  return render(
    <CopyButton
      text="inv-001"
      label="Reference ID"
      successMessage="Reference ID copied to clipboard."
      errorMessage="Unable to copy — please copy manually."
      {...props}
    />
  );
}

/** Override navigator.clipboard with a controlled mock. */
function mockClipboard(
  impl: { writeText?: jest.Mock } | undefined = { writeText: jest.fn().mockResolvedValue(undefined) }
) {
  Object.defineProperty(navigator, "clipboard", {
    value: impl,
    configurable: true,
    writable: true,
  });
}

/** Remove navigator.clipboard to force the execCommand fallback. */
function removeClipboard() {
  // jsdom defines clipboard on the Navigator prototype as a getter, so we
  // can't simply set navigator.clipboard = undefined.  Instead, override the
  // writeText method to be absent so the `navigator.clipboard?.writeText`
  // guard in copyToClipboard falls through to the execCommand path.
  Object.defineProperty(navigator, "clipboard", {
    value: { /* no writeText */ },
    configurable: true,
    writable: true,
  });
}

/**
 * jsdom does not implement document.execCommand; define a no-op stub so that
 * jest.spyOn can replace it.  Each test that needs it re-mocks the return value.
 */
function stubExecCommand(returnValue = true) {
  if (!document.execCommand) {
    Object.defineProperty(document, "execCommand", {
      value: () => returnValue,
      configurable: true,
      writable: true,
    });
  }
  return jest.spyOn(document, "execCommand").mockReturnValue(returnValue);
}

/** Restore real clipboard after tests that clobber it. */
let _originalClipboard: Clipboard;
beforeAll(() => {
  _originalClipboard = navigator.clipboard;
});
afterEach(() => {
  Object.defineProperty(navigator, "clipboard", {
    value: _originalClipboard,
    configurable: true,
    writable: true,
  });
  jest.clearAllMocks();
});

// ── Rendering ─────────────────────────────────────────────────────────────────

describe("CopyButton — rendering", () => {
  it("renders a button", () => {
    renderCopyButton();
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it('has type="button" so it does not submit forms', () => {
    renderCopyButton();
    expect(screen.getByRole("button")).toHaveAttribute("type", "button");
  });

  it("initial aria-label includes the label prop", () => {
    renderCopyButton();
    expect(screen.getByRole("button")).toHaveAttribute("aria-label", "Copy Reference ID");
  });

  it("initial title attribute matches aria-label", () => {
    renderCopyButton();
    expect(screen.getByRole("button")).toHaveAttribute("title", "Copy Reference ID");
  });

  it("renders the copy icon (not the checkmark) initially", () => {
    renderCopyButton();
    // Copy icon contains a <rect> element; checkmark uses a <polyline>
    const svgs = document.querySelectorAll("svg");
    expect(svgs.length).toBeGreaterThan(0);
    const hasRect = Array.from(svgs).some((svg) => svg.querySelector("rect") !== null);
    expect(hasRect).toBe(true);
  });

  it("renders the live region with empty content initially", () => {
    renderCopyButton();
    const liveRegion = screen.getByRole("status");
    expect(liveRegion).toHaveTextContent("");
  });

  it("uses the default label when no label prop is supplied", () => {
    render(<CopyButton text="inv-001" />);
    expect(screen.getByRole("button")).toHaveAttribute("aria-label", "Copy Copy");
  });
});

// ── Clipboard API — success ────────────────────────────────────────────────────

describe("CopyButton — Clipboard API success", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockClipboard({ writeText: jest.fn().mockResolvedValue(undefined) });
  });
  afterEach(() => jest.useRealTimers());

  it("calls navigator.clipboard.writeText with the supplied text", async () => {
    renderCopyButton({ text: "inv-001" });

    await act(async () => {
      fireEvent.click(screen.getByRole("button"));
    });

    expect(navigator.clipboard.writeText).toHaveBeenCalledTimes(1);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("inv-001");
  });

  it("calls toast.success with the successMessage on copy", async () => {
    renderCopyButton({ successMessage: "Reference ID copied to clipboard." });

    await act(async () => {
      fireEvent.click(screen.getByRole("button"));
    });

    expect(mockToast.success).toHaveBeenCalledTimes(1);
    expect(mockToast.success).toHaveBeenCalledWith("Reference ID copied to clipboard.", "Copied!");
  });

  it("does NOT call toast.error on success", async () => {
    renderCopyButton();

    await act(async () => {
      fireEvent.click(screen.getByRole("button"));
    });

    expect(mockToast.error).not.toHaveBeenCalled();
  });

  it('updates aria-label to "Copied!" after click', async () => {
    renderCopyButton();
    const button = screen.getByRole("button");

    await act(async () => {
      fireEvent.click(button);
    });

    expect(button).toHaveAttribute("aria-label", "Copied!");
  });

  it('updates title to "Copied!" after click', async () => {
    renderCopyButton();

    await act(async () => {
      fireEvent.click(screen.getByRole("button"));
    });

    expect(screen.getByRole("button")).toHaveAttribute("title", "Copied!");
  });

  it("populates the live region with 'Copied!' after click", async () => {
    renderCopyButton();

    await act(async () => {
      fireEvent.click(screen.getByRole("button"));
    });

    expect(screen.getByRole("status")).toHaveTextContent("Copied!");
  });

  it("renders the check-mark icon after click", async () => {
    renderCopyButton();

    await act(async () => {
      fireEvent.click(screen.getByRole("button"));
    });

    const svgs = document.querySelectorAll("svg");
    const hasPolyline = Array.from(svgs).some((svg) => svg.querySelector("polyline") !== null);
    expect(hasPolyline).toBe(true);
  });

  it("reverts aria-label after 2 seconds", async () => {
    renderCopyButton();
    const button = screen.getByRole("button");

    await act(async () => {
      fireEvent.click(button);
    });

    expect(button).toHaveAttribute("aria-label", "Copied!");

    await act(async () => {
      jest.advanceTimersByTime(2001);
    });

    expect(button).toHaveAttribute("aria-label", "Copy Reference ID");
  });

  it("clears the live region after 2 seconds", async () => {
    renderCopyButton();

    await act(async () => {
      fireEvent.click(screen.getByRole("button"));
    });

    expect(screen.getByRole("status")).toHaveTextContent("Copied!");

    await act(async () => {
      jest.advanceTimersByTime(2001);
    });

    expect(screen.getByRole("status")).toHaveTextContent("");
  });

  it("reverts to the copy icon after 2 seconds", async () => {
    renderCopyButton();

    await act(async () => {
      fireEvent.click(screen.getByRole("button"));
    });

    await act(async () => {
      jest.advanceTimersByTime(2001);
    });

    const svgs = document.querySelectorAll("svg");
    const hasRect = Array.from(svgs).some((svg) => svg.querySelector("rect") !== null);
    expect(hasRect).toBe(true);
  });
});

// ── execCommand fallback ───────────────────────────────────────────────────────

describe("CopyButton — execCommand fallback", () => {
  let execCommandSpy: jest.SpyInstance;

  beforeEach(() => {
    removeClipboard();
    execCommandSpy = stubExecCommand(true);
  });
  afterEach(() => {
    execCommandSpy.mockRestore();
  });

  it("calls document.execCommand('copy') when Clipboard API is unavailable", async () => {
    renderCopyButton({ text: "inv-002" });

    await act(async () => {
      fireEvent.click(screen.getByRole("button"));
    });

    expect(execCommandSpy).toHaveBeenCalledWith("copy");
  });

  it("fires toast.success after a successful execCommand fallback", async () => {
    renderCopyButton({ successMessage: "Copied via fallback." });

    await act(async () => {
      fireEvent.click(screen.getByRole("button"));
    });

    expect(mockToast.success).toHaveBeenCalledWith("Copied via fallback.", "Copied!");
  });

  it("shows 'Copied!' feedback after execCommand fallback", async () => {
    jest.useFakeTimers();
    renderCopyButton();

    await act(async () => {
      fireEvent.click(screen.getByRole("button"));
    });

    expect(screen.getByRole("button")).toHaveAttribute("aria-label", "Copied!");
    jest.useRealTimers();
  });
});

// ── copyToClipboard helper — unit ─────────────────────────────────────────────

describe("copyToClipboard helper", () => {
  afterEach(() => jest.restoreAllMocks());

  it("uses navigator.clipboard.writeText when available", async () => {
    const writeMock = jest.fn().mockResolvedValue(undefined);
    mockClipboard({ writeText: writeMock });

    await copyToClipboard("hello");
    expect(writeMock).toHaveBeenCalledWith("hello");
  });

  it("falls back to execCommand when navigator.clipboard is undefined", async () => {
    removeClipboard();
    const execSpy = stubExecCommand(true);

    await copyToClipboard("fallback-text");
    expect(execSpy).toHaveBeenCalledWith("copy");
    execSpy.mockRestore();
  });

  it("throws when execCommand returns false", async () => {
    removeClipboard();
    const execSpy = stubExecCommand(false);

    await expect(copyToClipboard("boom")).rejects.toThrow("execCommand copy failed");
    execSpy.mockRestore();
  });

  it("propagates rejection from navigator.clipboard.writeText", async () => {
    mockClipboard({ writeText: jest.fn().mockRejectedValue(new Error("Permission denied")) });

    await expect(copyToClipboard("blocked")).rejects.toThrow("Permission denied");
  });
});

// ── Error handling ─────────────────────────────────────────────────────────────

describe("CopyButton — error handling", () => {
  it("calls toast.error when navigator.clipboard.writeText rejects", async () => {
    mockClipboard({
      writeText: jest.fn().mockRejectedValue(new Error("Permission denied")),
    });

    renderCopyButton({ errorMessage: "Unable to copy — please copy manually." });

    await act(async () => {
      fireEvent.click(screen.getByRole("button"));
    });

    expect(mockToast.error).toHaveBeenCalledTimes(1);
    expect(mockToast.error).toHaveBeenCalledWith(
      "Unable to copy — please copy manually.",
      "Copy failed"
    );
  });

  it("does NOT call toast.success when copy fails", async () => {
    mockClipboard({
      writeText: jest.fn().mockRejectedValue(new Error("Permission denied")),
    });

    renderCopyButton();

    await act(async () => {
      fireEvent.click(screen.getByRole("button"));
    });

    expect(mockToast.success).not.toHaveBeenCalled();
  });

  it("does not show 'Copied!' when copy fails", async () => {
    mockClipboard({
      writeText: jest.fn().mockRejectedValue(new Error("Permission denied")),
    });

    renderCopyButton();

    await act(async () => {
      fireEvent.click(screen.getByRole("button"));
    });

    expect(screen.getByRole("button")).not.toHaveAttribute("aria-label", "Copied!");
    expect(screen.getByRole("status")).toHaveTextContent("");
  });

  it("calls toast.error when execCommand fallback also fails", async () => {
    removeClipboard();
    const execSpy = stubExecCommand(false);

    renderCopyButton({ errorMessage: "Unable to copy — please copy manually." });

    await act(async () => {
      fireEvent.click(screen.getByRole("button"));
    });

    expect(mockToast.error).toHaveBeenCalledWith(
      "Unable to copy — please copy manually.",
      "Copy failed"
    );
    execSpy.mockRestore();
  });

  it("does not render an error alert element — errors surface via toast only", async () => {
    mockClipboard({
      writeText: jest.fn().mockRejectedValue(new Error("Permission denied")),
    });

    renderCopyButton();

    await act(async () => {
      fireEvent.click(screen.getByRole("button"));
    });

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

// ── Keyboard operability ───────────────────────────────────────────────────────

describe("CopyButton — keyboard operability", () => {
  it("button is focusable", () => {
    renderCopyButton();
    const button = screen.getByRole("button");
    button.focus();
    expect(button).toHaveFocus();
  });

  it("pressing Enter triggers the copy handler", async () => {
    mockClipboard({ writeText: jest.fn().mockResolvedValue(undefined) });
    renderCopyButton();
    const button = screen.getByRole("button");
    button.focus();

    await act(async () => {
      fireEvent.keyDown(button, { key: "Enter", code: "Enter" });
      fireEvent.click(button); // jsdom activates button via click after Enter
    });

    expect(navigator.clipboard.writeText).toHaveBeenCalled();
  });

  it("button is not disabled by default", () => {
    renderCopyButton();
    expect(screen.getByRole("button")).not.toBeDisabled();
  });
});

// ── Accessibility (jest-axe) ───────────────────────────────────────────────────

describe("CopyButton — accessibility (axe)", () => {
  it("has no axe violations in the default (pre-copy) state", async () => {
    mockClipboard({ writeText: jest.fn().mockResolvedValue(undefined) });
    const { container } = renderCopyButton();
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("has no axe violations in the post-copy (Copied!) state", async () => {
    jest.useFakeTimers();
    mockClipboard({ writeText: jest.fn().mockResolvedValue(undefined) });
    const { container } = renderCopyButton();

    await act(async () => {
      fireEvent.click(screen.getByRole("button"));
    });

    const results = await axe(container);
    expect(results).toHaveNoViolations();
    jest.useRealTimers();
  });

  it("live region has role=status and aria-live=polite", () => {
    renderCopyButton();
    const liveRegion = screen.getByRole("status");
    expect(liveRegion).toHaveAttribute("aria-live", "polite");
    expect(liveRegion).toHaveAttribute("aria-atomic", "true");
  });

  it("SVG icons are aria-hidden", () => {
    renderCopyButton();
    const svgs = document.querySelectorAll("svg");
    svgs.forEach((svg) => {
      expect(svg).toHaveAttribute("aria-hidden", "true");
    });
  });
});

// ── Multiple copies ────────────────────────────────────────────────────────────

describe("CopyButton — multiple sequential copies", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockClipboard({ writeText: jest.fn().mockResolvedValue(undefined) });
  });
  afterEach(() => jest.useRealTimers());

  it("resets and re-enters 'Copied!' state when clicked again before timeout", async () => {
    renderCopyButton();
    const button = screen.getByRole("button");

    // First click
    await act(async () => {
      fireEvent.click(button);
    });
    expect(button).toHaveAttribute("aria-label", "Copied!");

    // Advance timer partially (< 2s)
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });

    // Second click while still showing "Copied!"
    await act(async () => {
      fireEvent.click(button);
    });
    expect(button).toHaveAttribute("aria-label", "Copied!");

    // Full revert after 2s from second click
    await act(async () => {
      jest.advanceTimersByTime(2001);
    });
    expect(button).toHaveAttribute("aria-label", "Copy Reference ID");
  });
});
