/**
 * ShortcutHelpDialog.test.tsx
 *
 * End-to-end coverage for the discoverable shortcut help dialog (issue #464).
 *
 * Spec mapping (one block per acceptance criterion from the issue):
 *   - dialog opens with "?"                     → "opens"
 *   - role="dialog" + aria-modal + heading      → "accessibility markup"
 *   - shortcut list rendered from registry      → "registry rendering"
 *   - focus trap (Tab / Shift+Tab cycle)         → "focus trap"
 *   - Escape closes                              → "Escape closes"
 *   - backdrop closes / clicks inside don't      → "backdrop close"
 *   - focus restored after close                 → "focus restoration"
 *   - "?" ignored inside input / textarea / CE   → "editable-element bypass"
 *   - multiple open / close cycles               → "multiple cycles"
 *   - shared registry is consumed (not dup'd)    → "registry rendering"
 *   - axe accessibility regression guard        → "axe"
 */

import "@testing-library/jest-dom";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";

import ShortcutHelpDialog from "./ShortcutHelpDialog";
import { HELP_SHORTCUT_KEY, KEYBOARD_SHORTCUTS } from "../lib/shortcuts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Simulates the `?` keystroke (which on a US-ANSI layout is `Shift+/`).
 * Listener installs on `document`, so dispatching from `document` matches
 * the production behavior.
 */
function pressQuestionMark(init: KeyboardEventInit = {}) {
  fireEvent.keyDown(document, { key: "?", bubbles: true, ...init });
}

/**
 * Wipes focus to a known reference and returns the freshly-focused element
 * so tests can later assert what the dialog restored focus to.
 */
function focusReference(label: string) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.textContent = label;
  document.body.appendChild(btn);
  btn.focus();
  return btn;
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  document.body.innerHTML = "";
});

afterEach(() => {
  // Belt-and-braces: ensure no listeners linger between tests when we
  // forget to unmount. Manual cleanup is performed by RTL's `unmount`.
  document.body.innerHTML = "";
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ShortcutHelpDialog — opens with `?`", () => {
  it("is closed on initial mount and has no dialog markup in the DOM", () => {
    render(<ShortcutHelpDialog />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens when the user presses `?` on the document", async () => {
    render(<ShortcutHelpDialog />);

    act(() => {
      pressQuestionMark();
    });

    // Wait for React to commit the open state and requestAnimationFrame to
    // settle in case the focus-management effect is still pending.
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
  });

  it("does NOT open when a non-`?` key is pressed", () => {
    render(<ShortcutHelpDialog />);

    act(() => {
      fireEvent.keyDown(document, { key: "a", bubbles: true });
    });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("does NOT open when `?` is pressed with Ctrl/Meta/Alt modifier", () => {
    render(<ShortcutHelpDialog />);

    act(() => {
      pressQuestionMark({ ctrlKey: true });
    });
    act(() => {
      pressQuestionMark({ metaKey: true });
    });
    act(() => {
      pressQuestionMark({ altKey: true });
    });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("accepts the Shift modifier while matching `?`", async () => {
    // The bare `/` key does NOT open the help dialog (the search shortcut
    // owns that key).
    render(<ShortcutHelpDialog />);

    act(() => {
      fireEvent.keyDown(document, { key: "/", bubbles: true });
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    // The matcher does not strip `shiftKey` because `?` requires the user
    // to press `Shift+/` on US-ANSI layouts. With explicit shift the key
    // event still reaches the handler.
    act(() => {
      pressQuestionMark({ shiftKey: true });
    });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});

describe("ShortcutHelpDialog — accessibility markup", () => {
  it("exposes role=dialog and aria-modal=true while open", async () => {
    render(<ShortcutHelpDialog />);
    act(() => {
      pressQuestionMark();
    });
    await waitFor(() => screen.getByRole("dialog"));

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
  });

  it("has an accessible title wired via aria-labelledby", async () => {
    render(<ShortcutHelpDialog />);
    act(() => {
      pressQuestionMark();
    });
    await waitFor(() => screen.getByRole("dialog"));

    const dialog = screen.getByRole("dialog");
    const labelledBy = dialog.getAttribute("aria-labelledby");
    expect(labelledBy).toBeTruthy();
    const heading = document.getElementById(labelledBy as string);
    expect(heading).toBeInTheDocument();
    expect(heading?.textContent).toMatch(/shortcuts/i);
  });

  it("is the document's top-level modal landmark while open", async () => {
    const { container } = render(<ShortcutHelpDialog />);
    act(() => {
      pressQuestionMark();
    });
    await waitFor(() => screen.getByRole("dialog"));

    // axe: no accessibility violations while the dialog is open
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe("ShortcutHelpDialog — shared registry rendering", () => {
  it("renders every entry of KEYBOARD_SHORTCUTS by description", async () => {
    render(<ShortcutHelpDialog />);
    act(() => {
      pressQuestionMark();
    });
    await waitFor(() => screen.getByRole("dialog"));

    for (const entry of KEYBOARD_SHORTCUTS) {
      expect(screen.getByText(entry.description)).toBeInTheDocument();
    }
  });

  it("renders the key label formatted as a kbd for every entry", async () => {
    render(<ShortcutHelpDialog />);
    act(() => {
      pressQuestionMark();
    });
    await waitFor(() => screen.getByRole("dialog"));

    for (const entry of KEYBOARD_SHORTCUTS) {
      // `Shift + /` for the `?` entry; the raw key otherwise. The
      // formatter decorates `?` only.
      const expectedLabel = entry.key === "?" ? "Shift + /" : entry.key;
      expect(screen.getByText(expectedLabel)).toBeInTheDocument();
      // The kbd must be aria-hidden so screen readers do not announce
      // both the visible glyph and a phantom "Key: ..." label.
      const kbd = screen.getByText(expectedLabel).closest("kbd");
      expect(kbd).toHaveAttribute("aria-hidden", "true");
    }
  });
});

describe("ShortcutHelpDialog — `?` is ignored inside editable elements", () => {
  function mountEditable(element: HTMLElement) {
    document.body.appendChild(element);
    element.focus();
    render(<ShortcutHelpDialog />);
  }

  it("does not open when focus is inside an <input>", () => {
    mountEditable(document.createElement("input"));
    act(() => {
      pressQuestionMark();
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("does not open when focus is inside a <textarea>", () => {
    mountEditable(document.createElement("textarea"));
    act(() => {
      pressQuestionMark();
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("does not open when focus is inside a contenteditable element", () => {
    const div = document.createElement("div");
    div.setAttribute("contenteditable", "true");
    Object.defineProperty(div, "isContentEditable", { value: true });
    mountEditable(div);
    act(() => {
      pressQuestionMark();
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("still works after focus leaves an editable element", async () => {
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();
    render(<ShortcutHelpDialog />);

    // While focused in input: ignored
    act(() => {
      pressQuestionMark();
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    // After moving focus elsewhere: fires
    const button = focusReference("outside");
    button.focus();
    act(() => {
      pressQuestionMark();
    });
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());
  });
});

describe("ShortcutHelpDialog — Escape closes the dialog", () => {
  it("closes the dialog and removes it from the DOM", async () => {
    render(<ShortcutHelpDialog />);
    act(() => {
      pressQuestionMark();
    });
    const dialog = await waitFor(() => screen.getByRole("dialog"));

    fireEvent.keyDown(dialog, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("closes via the in-dialog Close button", async () => {
    render(<ShortcutHelpDialog />);
    act(() => {
      pressQuestionMark();
    });
    await waitFor(() => screen.getByRole("dialog"));

    fireEvent.click(screen.getByRole("button", { name: /close/i }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("ShortcutHelpDialog — backdrop behavior", () => {
  it("closes when the user clicks the backdrop (target === currentTarget)", async () => {
    render(<ShortcutHelpDialog />);
    act(() => {
      pressQuestionMark();
    });
    const backdrop = await waitFor(() =>
      document.querySelector('[data-testid="shortcut-help-backdrop"]')!
    );

    fireEvent.click(backdrop, { target: backdrop, currentTarget: backdrop });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("does NOT close when a click bubbles up from inside the dialog", async () => {
    render(<ShortcutHelpDialog />);
    act(() => {
      pressQuestionMark();
    });
    await waitFor(() => screen.getByRole("dialog"));

    const dialog = screen.getByRole("dialog");
    // Click anywhere inside the dialog (the heading, say). The handler
    // is installed on the backdrop, so bubbling must not close it because
    // `event.target !== event.currentTarget`.
    const heading = dialog.querySelector("h2")!;
    fireEvent.click(heading, { target: heading, currentTarget: heading });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});

describe("ShortcutHelpDialog — focus trap", () => {
  it("moves focus into the dialog on open", async () => {
    render(<ShortcutHelpDialog />);
    act(() => {
      pressQuestionMark();
    });
    await waitFor(() => screen.getByRole("dialog"));

    // The Close button is the first focusable inside the dialog and the
    // dialog focuses it on open (after a requestAnimationFrame).
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /close/i })).toHaveFocus();
    });
  });

  it("Tab on the last focusable wraps to the first", async () => {
    render(<ShortcutHelpDialog />);
    act(() => {
      pressQuestionMark();
    });
    const dialog = await waitFor(() => screen.getByRole("dialog"));

    // Focus the close button — the only focusable inside the dialog here.
    const closeBtn = screen.getByRole("button", { name: /close/i });
    closeBtn.focus();

    fireEvent.keyDown(dialog, { key: "Tab" });
    expect(closeBtn).toHaveFocus();
  });

  it("Shift+Tab on the first focusable wraps to the last", async () => {
    render(<ShortcutHelpDialog />);
    act(() => {
      pressQuestionMark();
    });
    const dialog = await waitFor(() => screen.getByRole("dialog"));

    const closeBtn = screen.getByRole("button", { name: /close/i });
    closeBtn.focus();

    fireEvent.keyDown(dialog, { key: "Tab", shiftKey: true });
    expect(closeBtn).toHaveFocus();
  });

  it("does not steal Tab keystrokes from the document while closed", () => {
    render(<ShortcutHelpDialog />);
    fireEvent.keyDown(document, { key: "Tab" });
    // Whenever the dialog is closed, the focus trap should never fire.
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("ShortcutHelpDialog — focus restoration on close", () => {
  it("restores focus to the element that was focused before opening", async () => {
    const trigger = focusReference("trigger");

    render(<ShortcutHelpDialog />);
    act(() => {
      pressQuestionMark();
    });

    const closeBtn = await waitFor(() => screen.getByRole("button", { name: /close/i }));
    // Focus moves into the dialog on a `requestAnimationFrame` after the
    // open effect runs, so wait for the assertion to land.
    await waitFor(() => expect(closeBtn).toHaveFocus());

    fireEvent.click(closeBtn);

    // Restoration is scheduled with `queueMicrotask`; flush it.
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it("restores focus after an Escape-close", async () => {
    const trigger = focusReference("trigger-esc");
    render(<ShortcutHelpDialog />);

    act(() => {
      pressQuestionMark();
    });
    const dialog = await waitFor(() => screen.getByRole("dialog"));

    fireEvent.keyDown(dialog, { key: "Escape" });

    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it("restores focus after a backdrop-close", async () => {
    const trigger = focusReference("trigger-backdrop");
    render(<ShortcutHelpDialog />);

    act(() => {
      pressQuestionMark();
    });
    const backdrop = await waitFor(() =>
      document.querySelector('[data-testid="shortcut-help-backdrop"]')!
    );

    fireEvent.click(backdrop, { target: backdrop, currentTarget: backdrop });
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it("does not throw if the previously focused element was removed", async () => {
    const trigger = focusReference("trigger-gone");
    render(<ShortcutHelpDialog />);

    act(() => {
      pressQuestionMark();
    });
    await waitFor(() => screen.getByRole("dialog"));

    // Remove the trigger while the dialog is open — simulates a route
    // change or list re-render.
    trigger.remove();

    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    // Just assert no error was thrown — focus falls back gracefully.
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("ignores `<body>` as the previously-focused restore target", async () => {
    // Nothing has focus — `document.activeElement === document.body`.
    render(<ShortcutHelpDialog />);

    act(() => {
      pressQuestionMark();
    });
    await waitFor(() => screen.getByRole("dialog"));

    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    // Body focus is the default; the restore should not throw and should
    // leave activeElement as body (rather than re-focusing some phantom
    // target).
    expect(document.activeElement).toBe(document.body);
  });
});

describe("ShortcutHelpDialog — multiple open / close cycles", () => {
  it("can be opened and closed repeatedly without listener leak", async () => {
    render(<ShortcutHelpDialog />);

    for (let i = 0; i < 3; i += 1) {
      const trigger = focusReference(`trigger-${i}`);
      act(() => {
        pressQuestionMark();
      });
      const dialog = await waitFor(() => screen.getByRole("dialog"));
      fireEvent.keyDown(dialog, { key: "Escape" });
      await waitFor(() => expect(trigger).toHaveFocus());
    }
  });

  it("survives a re-render with a new tree (unmount + remount)", async () => {
    const trigger = focusReference("trigger-re");
    const { rerender } = render(<ShortcutHelpDialog />);
    rerender(<ShortcutHelpDialog />);

    act(() => {
      pressQuestionMark();
    });
    await waitFor(() => screen.getByRole("dialog"));
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it("does not re-fire `?` while already open (no recursive open)", async () => {
    render(<ShortcutHelpDialog />);
    act(() => {
      pressQuestionMark();
    });
    await waitFor(() => screen.getByRole("dialog"));

    const dialogsBefore = document.querySelectorAll('[role="dialog"]').length;
    act(() => {
      pressQuestionMark();
    });
    const dialogsAfter = document.querySelectorAll('[role="dialog"]').length;
    expect(dialogsAfter).toBe(dialogsBefore);
  });
});

describe("ShortcutHelpDialog — keyboard navigation inside the dialog", () => {
  it("userEvent: Tab from the Close button wraps to itself (single focusable)", async () => {
    const user = userEvent.setup({ delay: null });
    render(<ShortcutHelpDialog />);
    const trigger = focusReference("trigger-user");
    trigger.focus();

    await user.keyboard("{?}");
    const dialog = await screen.findByRole("dialog");

    const closeBtn = screen.getByRole("button", { name: /close/i });
    // Focus moves into the dialog via `requestAnimationFrame` after the
    // keyboard event settles.
    await waitFor(() => expect(closeBtn).toHaveFocus());

    // With only one focusable, Tab should keep focus on it (wrap to itself).
    await user.tab();
    expect(closeBtn).toHaveFocus();

    // Shift+Tab likewise wraps.
    await user.tab({ shift: true });
    expect(closeBtn).toHaveFocus();

    // Escape closes via the inner onKeyDown handler.
    fireEvent.keyDown(dialog, { key: "Escape" });
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it("does not eat Tab navigation while focus is not yet inside the dialog", () => {
    render(<ShortcutHelpDialog />);
    focusReference("outside-tab");
    // Press Tab from outside the dialog — no trap, no interception.
    fireEvent.keyDown(document, { key: "Tab" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("ShortcutHelpDialog — registry contract", () => {
  it("reads shortcuts from KEYBOARD_SHORTCUTS (no duplicate definitions)", () => {
    // Static check: the registry remains the single source of truth and
    // contains the entry the dialog drives.
    expect(HELP_SHORTCUT_KEY).toBe("?");
    const helpEntry = KEYBOARD_SHORTCUTS.find((s) => s.id === "shortcut-help");
    expect(helpEntry).toBeDefined();
    expect(helpEntry?.key).toBe("?");
  });
});
