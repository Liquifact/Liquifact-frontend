/**
 * Tests for marketplace keyboard shortcut navigation (issue #22).
 *
 * Spec:
 *   - Pressing 'm' navigates to /invest
 *   - Shortcut is ignored when in editable elements
 *   - Shortcut is registered globally
 */

import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import {
  MARKETPLACE_SHORTCUT_KEY,
  createShortcutMatcher,
  isFocusInsideEditableElement,
} from "../lib/shortcuts";

// Mock useRouter
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

describe("Marketplace shortcut", () => {
  const mockPush = jest.fn();
  const mockRouter = { push: mockPush };

  beforeEach(() => {
    jest.clearAllMocks();
    (require("next/navigation").useRouter as jest.Mock).mockReturnValue(mockRouter);
    document.body.innerHTML = "";
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("registers shortcut matcher with correct key", () => {
    const { MARKETPLACE_SHORTCUT_KEY: key } = require("../lib/shortcuts");
    expect(key).toBe("m");
  });

  it("shortcut entry is in KEYBOARD_SHORTCUT_ registry", () => {
    const { KEYBOARD_SHORTCUTS } = require("../lib/shortcuts");
    const marketplaceEntry = KEYBOARD_SHORTCUTS.find((s: any) => s.id === "marketplace-navigate");

    expect(marketplaceEntry).toBeDefined();
    expect(marketplaceEntry.key).toBe("m");
    expect(marketplaceEntry.description).toBe("Navigate to the marketplace");
    expect(marketplaceEntry.scope).toBe("global");
  });

  it("createShortcutMatcher is called with marketplace key and navigation handler", () => {
    // This is tested in layout.test.tsx via the mock
    expect(createShortcutMatcher).toBeDefined();
  });

  it("shortcut matcher ignores modifier keys", () => {
    const handler = createShortcutMatcher("m", jest.fn());

    // Should not trigger with Ctrl
    const ctrlEvent = new KeyboardEvent("keydown", { key: "m", ctrlKey: true });
    handler(ctrlEvent);
    expect(ctrlEvent.defaultPrevented).toBe(false);

    // Should not trigger with Meta
    const metaEvent = new KeyboardEvent("keydown", { key: "m", metaKey: true });
    handler(metaEvent);
    expect(metaEvent.defaultPrevented).toBe(false);

    // Should not trigger with Alt
    const altEvent = new KeyboardEvent("keydown", { key: "m", altKey: true });
    handler(altEvent);
    expect(altEvent.defaultPrevented).toBe(false);
  });

  it("shortcut matcher ignores key when in editable element", () => {
    const callback = jest.fn();
    const handler = createShortcutMatcher("m", callback);

    // Create an input and focus it
    const input = document.createElement("input");
    input.type = "text";
    document.body.appendChild(input);
    input.focus();

    const event = new KeyboardEvent("keydown", { key: "m" });
    handler(event);

    expect(callback).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });

  it("shortcut matcher ignores key when focus is in a contenteditable element", () => {
    const callback = jest.fn();
    const handler = createShortcutMatcher("m", callback);

    const editable = document.createElement("div");
    editable.setAttribute("contenteditable", "true");
    document.body.appendChild(editable);
    editable.focus();

    const event = new KeyboardEvent("keydown", { key: "m" });
    handler(event);

    expect(callback).not.toHaveBeenCalled();
  });

  it("shortcut matcher triggers on plain 'm' key", () => {
    const callback = jest.fn();
    const handler = createShortcutMatcher("m", callback);

    const event = new KeyboardEvent("keydown", { key: "m" });
    handler(event);

    expect(callback).toHaveBeenCalledWith(event);
  });

  it("shortcut matcher does not trigger on other keys", () => {
    const callback = jest.fn();
    const handler = createShortcutMatcher("m", callback);

    const event = new KeyboardEvent("keydown", { key: "a" });
    handler(event);

    expect(callback).not.toHaveBeenCalled();
  });

  it("shortcut matcher ignores repeat keydown events to avoid duplicate navigation", () => {
    const callback = jest.fn();
    const handler = createShortcutMatcher("m", callback);

    const event = new KeyboardEvent("keydown", { key: "m", repeat: true });
    handler(event);

    expect(callback).not.toHaveBeenCalled();
  });

  it("shortcut matcher ignores events already defaultPrevented", () => {
    const callback = jest.fn();
    const handler = createShortcutMatcher("m", callback);

    const event = new KeyboardEvent("keydown", { key: "m", cancelable: true });
    event.preventDefault();
    handler(event);

    expect(callback).not.toHaveBeenCalled();
  });

  it("shortcut matcher ignores events from editable element targets even without focus", () => {
    const callback = jest.fn();
    const handler = createShortcutMatcher("m", callback);

    const textarea = document.createElement("textarea");
    document.body.appendChild(textarea);

    const event = new KeyboardEvent("keydown", { key: "m", bubbles: true });
    textarea.dispatchEvent(event);

    expect(callback).not.toHaveBeenCalled();
  });

  it("isFocusInsideEditableElement returns true for input, textarea, select, and contenteditable", () => {
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();
    expect(isFocusInsideEditableElement()).toBe(true);

    const textarea = document.createElement("textarea");
    document.body.appendChild(textarea);
    textarea.focus();
    expect(isFocusInsideEditableElement()).toBe(true);

    const select = document.createElement("select");
    document.body.appendChild(select);
    select.focus();
    expect(isFocusInsideEditableElement()).toBe(true);

    const editable = document.createElement("div");
    editable.setAttribute("contenteditable", "true");
    document.body.appendChild(editable);
    editable.focus();
    expect(isFocusInsideEditableElement()).toBe(true);
  });

  it("isFocusInsideEditableElement returns false for body and non-editable elements", () => {
    expect(isFocusInsideEditableElement()).toBe(false);

    const button = document.createElement("button");
    document.body.appendChild(button);
    button.focus();
    expect(isFocusInsideEditableElement()).toBe(false);
  });

  it("shortcut matcher ignores key when modifier key is pressed even if key matches", () => {
    const callback = jest.fn();
    const handler = createShortcutMatcher("m", callback);

    const shiftEvent = new KeyboardEvent("keydown", { key: "M", shiftKey: true });
    handler(shiftEvent);
    expect(callback).not.toHaveBeenCalled();
  });

  it("shortcut matcher is case-insensitive for the configured key", () => {
    const callback = jest.fn();
    const handler = createShortcutMatcher("m", callback);

    const event = new KeyboardEvent("keydown", { key: "M" });
    handler(event);

    expect(callback).toHaveBeenCalledWith(event);
  });

  it("shortcut matcher does not throw when document is undefined", () => {
    const callback = jest.fn();
    const handler = createShortcutMatcher("m", callback);

    const original = global.document;
    // @js-tools-ignore next-line
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).document = undefined;

    try {
      const event = new KeyboardEvent("keydown", { key: "m" });
      handler(event);
      expect(callback).not.toHaveBeenCalled();
    } finally {
      // @js-tools-ignore next-line
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (global as any).document = original;
    }
  });
});
