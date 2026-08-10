/**
 * UploadActionShortcuts.keyboard.test.jsx
 *
 * Coverage for the upload page keyboard shortcuts (issue #933).
 *
 * Tests:
 *   - Registry entries appear in KEYBOARD_SHORTCUTS
 *   - Discoverable hint is rendered
 *   - Pressing u / s focuses the matching interactive element
 *   - Ignores editable elements and modifier keys
 *   - Cleans up listeners on unmount
 *   - Dismiss button hides the hint
 */

import "@testing-library/jest-dom";
import { act, fireEvent, render, screen } from "@testing-library/react";
import UploadActionShortcuts from "./UploadActionShortcuts";
import {
  UPLOAD_BROWSE_SHORTCUT_KEY,
  UPLOAD_SUBMIT_SHORTCUT_KEY,
  KEYBOARD_SHORTCUTS,
} from "@/lib/shortcuts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pressKey(key, init = {}) {
  fireEvent.keyDown(document, { key, bubbles: true, ...init });
}

/** Mount the target interactive elements into the document body, then render. */
function renderWithActions() {
  const actions = document.createElement("div");
  actions.innerHTML = `
      <div role="button" tabindex="0" aria-label="Drop PDF invoice here or press Enter to browse files">Dropzone</div>
      <button id="invoice-upload-btn" type="submit">Upload &amp; Tokenize Invoice</button>
    `;
  document.body.appendChild(actions);
  return render(<UploadActionShortcuts />);
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  document.body.innerHTML = "";
});

afterEach(() => {
  document.body.innerHTML = "";
});

// ---------------------------------------------------------------------------
// Registry tests
// ---------------------------------------------------------------------------

describe("Upload shortcut registry entries", () => {
  it("browse shortcut key is 'u'", () => {
    expect(UPLOAD_BROWSE_SHORTCUT_KEY).toBe("u");
  });

  it("submit shortcut key is 's'", () => {
    expect(UPLOAD_SUBMIT_SHORTCUT_KEY).toBe("s");
  });

  it("browse entry appears in KEYBOARD_SHORTCUTS exactly once", () => {
    const entries = KEYBOARD_SHORTCUTS.filter((s) => s.id === "upload-browse");
    expect(entries).toHaveLength(1);
    expect(entries[0].key).toBe(UPLOAD_BROWSE_SHORTCUT_KEY);
  });

  it("submit entry appears in KEYBOARD_SHORTCUTS exactly once", () => {
    const entries = KEYBOARD_SHORTCUTS.filter((s) => s.id === "upload-submit");
    expect(entries).toHaveLength(1);
    expect(entries[0].key).toBe(UPLOAD_SUBMIT_SHORTCUT_KEY);
  });

  it("no duplicate keys across the registry", () => {
    ["u", "s"].forEach((key) => {
      const matches = KEYBOARD_SHORTCUTS.filter((s) => s.key === key);
      expect(matches.length).toBeLessThanOrEqual(1);
    });
  });
});

// ---------------------------------------------------------------------------
// Hint rendering
// ---------------------------------------------------------------------------

describe("Upload shortcut hint", () => {
  it("renders the discoverable hint with data-testid", () => {
    render(<UploadActionShortcuts />);
    expect(screen.getByTestId("upload-shortcut-hint")).toBeInTheDocument();
  });

  it("shows the browse and submit keys in the hint", () => {
    render(<UploadActionShortcuts />);
    const hint = screen.getByTestId("upload-shortcut-hint");
    expect(hint.textContent).toMatch(/u/i);
    expect(hint.textContent).toMatch(/s/i);
  });

  it("dismisses the hint when the × button is clicked", () => {
    render(<UploadActionShortcuts />);
    const dismiss = screen.getByRole("button", { name: /dismiss shortcut/i });
    fireEvent.click(dismiss);
    expect(
      screen.queryByTestId("upload-shortcut-hint")
    ).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Activation tests
// ---------------------------------------------------------------------------

describe("Upload shortcut activation", () => {
  it("pressing u focuses the dropzone", () => {
    renderWithActions();
    const dropzone = screen.getByRole("button", {
      name: /drop pdf invoice/i,
    });
    expect(dropzone).not.toHaveFocus();

    act(() => {
      pressKey("u");
    });

    expect(dropzone).toHaveFocus();
  });

  it("pressing s focuses the submit button", () => {
    renderWithActions();
    const submitBtn = document.getElementById("invoice-upload-btn");
    expect(submitBtn).not.toHaveFocus();

    act(() => {
      pressKey("s");
    });

    expect(submitBtn).toHaveFocus();
  });

  it("does not focus when a different key is pressed", () => {
    renderWithActions();
    const dropzone = screen.getByRole("button", {
      name: /drop pdf invoice/i,
    });

    act(() => {
      pressKey("x");
    });

    expect(dropzone).not.toHaveFocus();
  });
});

// ---------------------------------------------------------------------------
// Editable-element bypass
// ---------------------------------------------------------------------------

describe("Upload shortcuts — ignore editable elements", () => {
  it("does not focus dropzone when an <input> has focus", () => {
    renderWithActions();
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();

    const dropzone = screen.getByRole("button", {
      name: /drop pdf invoice/i,
    });
    act(() => {
      pressKey("u");
    });
    expect(dropzone).not.toHaveFocus();
  });

  it("does not focus submit when a <textarea> has focus", () => {
    renderWithActions();
    const textarea = document.createElement("textarea");
    document.body.appendChild(textarea);
    textarea.focus();

    const submitBtn = document.getElementById("invoice-upload-btn");
    act(() => {
      pressKey("s");
    });
    expect(submitBtn).not.toHaveFocus();
  });
});

// ---------------------------------------------------------------------------
// Modifier-key bypass
// ---------------------------------------------------------------------------

describe("Upload shortcuts — modifier keys", () => {
  it("does not focus dropzone when Ctrl+u is pressed", () => {
    renderWithActions();
    const dropzone = screen.getByRole("button", {
      name: /drop pdf invoice/i,
    });

    act(() => {
      pressKey("u", { ctrlKey: true });
    });

    expect(dropzone).not.toHaveFocus();
  });

  it("does not focus submit when Meta+s is pressed", () => {
    renderWithActions();
    const submitBtn = document.getElementById("invoice-upload-btn");

    act(() => {
      pressKey("s", { metaKey: true });
    });

    expect(submitBtn).not.toHaveFocus();
  });

  it("does not focus dropzone when Alt+u is pressed", () => {
    renderWithActions();
    const dropzone = screen.getByRole("button", {
      name: /drop pdf invoice/i,
    });

    act(() => {
      pressKey("u", { altKey: true });
    });

    expect(dropzone).not.toHaveFocus();
  });
});

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------

describe("Upload shortcuts — cleanup", () => {
  it("removes listeners when the component unmounts", () => {
    const { unmount } = renderWithActions();
    const dropzone = screen.getByRole("button", {
      name: /drop pdf invoice/i,
    });

    unmount();

    act(() => {
      pressKey("u");
    });

    expect(dropzone).not.toHaveFocus();
  });
});