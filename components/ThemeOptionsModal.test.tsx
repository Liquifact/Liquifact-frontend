import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import ThemeOptionsModal from "./ThemeOptionsModal";

// jsdom has no real layout engine, so every element's `offsetParent` is null
// by default — including genuinely visible ones. getFocusableElements uses
// offsetParent to skip display:none elements, so without this stub it would
// (only in tests) treat everything as hidden. Mirrors the same offsetParent
// limitation relevant to ShortcutHelpDialog's identical logic.
beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, "offsetParent", {
    configurable: true,
    get() {
      return document.body;
    },
  });
});

function setup(props: { open?: boolean; preference?: string } = {}) {
  const onClose = jest.fn();
  const onSelect = jest.fn();
  const utils = render(
    <ThemeOptionsModal
      open={props.open ?? true}
      onClose={onClose}
      preference={props.preference ?? "system"}
      onSelect={onSelect}
      titleId="theme-modal-title"
    />
  );
  return { ...utils, onClose, onSelect };
}

describe("ThemeOptionsModal", () => {
  it("renders nothing when closed", () => {
    const { container } = setup({ open: false });
    expect(container).toBeEmptyDOMElement();
  });

  it("renders as an accessible dialog when open", () => {
    setup({ open: true });
    const dialog = screen.getByRole("dialog", { name: "Theme" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
  });

  it("lists Light, Dark, and System as radio options", () => {
    setup();
    expect(screen.getByRole("radio", { name: "Light" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Dark" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "System" })).toBeInTheDocument();
  });

  it("marks the current preference as checked", () => {
    setup({ preference: "dark" });
    expect(screen.getByRole("radio", { name: "Dark" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "Light" })).toHaveAttribute("aria-checked", "false");
    expect(screen.getByRole("radio", { name: "System" })).toHaveAttribute("aria-checked", "false");
  });

  it("calls onSelect with the chosen value when an option is clicked", () => {
    const { onSelect } = setup({ preference: "system" });
    fireEvent.click(screen.getByRole("radio", { name: "Dark" }));
    expect(onSelect).toHaveBeenCalledWith("dark");
  });

  // ── Focus moves into the dialog on open ───────────────────────────────────

  it("moves focus to the first option when opened", async () => {
    setup();
    await new Promise((resolve) => requestAnimationFrame(resolve));
    expect(document.activeElement).toHaveAttribute("role", "radio");
    expect(document.activeElement).toHaveTextContent("Light");
  });

  // ── Escape closes ──────────────────────────────────────────────────────────

  it("closes on Escape when focus is inside the dialog", () => {
    const { onClose } = setup();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes on Escape when the backdrop itself has focus, without double-firing", () => {
    const { onClose } = setup();
    fireEvent.keyDown(screen.getByTestId("theme-options-backdrop"), { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("ignores keys other than Tab and Escape", () => {
    const { onClose } = setup();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "a" });
    expect(onClose).not.toHaveBeenCalled();
    expect(document.activeElement).not.toBe(null);
  });

  it("does not close when a non-Escape keydown bubbles up to the backdrop", () => {
    const { onClose } = setup();
    // Fired on the dialog (a child of the backdrop) so it bubbles up to the
    // backdrop's own onKeyDown, exercising its target!==currentTarget guard
    // for a key other than Escape.
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "a" });
    expect(onClose).not.toHaveBeenCalled();
  });

  // ── Backdrop click closes, inner click does not ───────────────────────────

  it("closes when the backdrop is clicked directly", () => {
    const { onClose } = setup();
    fireEvent.click(screen.getByTestId("theme-options-backdrop"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not close when clicking inside the dialog card", () => {
    const { onClose } = setup();
    fireEvent.click(screen.getByRole("dialog"));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("does not close when clicking an option (click bubbles from inside)", () => {
    const { onClose } = setup();
    fireEvent.click(screen.getByRole("radio", { name: "Light" }));
    expect(onClose).not.toHaveBeenCalled();
  });

  // ── Focus trap: Tab / Shift+Tab wrap within the dialog ────────────────────

  it("wraps focus from the last option to the first on Tab", () => {
    setup();
    const options = screen.getAllByRole("radio");
    const last = options[options.length - 1];
    last.focus();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Tab" });
    expect(document.activeElement).toBe(options[0]);
  });

  it("wraps focus from the first option to the last on Shift+Tab", () => {
    setup();
    const options = screen.getAllByRole("radio");
    options[0].focus();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(options[options.length - 1]);
  });

  it("does not trap Tab presses that land in the middle of the option list", () => {
    setup();
    const options = screen.getAllByRole("radio");
    options[1].focus();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Tab" });
    // Middle element isn't first or last, so the trap doesn't intervene —
    // native Tab order handles it (outside this test's scope).
    expect(document.activeElement).toBe(options[1]);
  });

  it("keeps focus on the dialog if it somehow contains nothing focusable", () => {
    setup();
    const dialog = screen.getByRole("dialog");
    dialog.innerHTML = "";
    fireEvent.keyDown(dialog, { key: "Tab" });
    expect(document.activeElement).toBe(dialog);
  });
});
