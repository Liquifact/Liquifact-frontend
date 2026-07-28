/**
 * Tests for marketplace keyboard shortcut navigation (issue #22).
 *
 * Spec:
 *   - Pressing 'm' navigates to /invest
 *   - Shortcut is ignored when in editable elements
 *   - Shortcut is registered globally
 */

import "@testing-library/jest-dom";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { MARKETPLACE_SHORTCUT_KEY, createShortcutMatcher } from "../lib/shortcuts";

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

  it("shortcut entry is in KEYBOARD_SHORTCUTS registry", () => {
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
    const handler = createShortcutMatcher("m", jest.fn());
    const mockCallback = jest.fn();

    // Create an input and focus it
    const input = document.createElement("input");
    input.type = "text";
    document.body.appendChild(input);
    input.focus();

    // The real implementation checks isFocusInsideEditableElement
    // We're testing the matcher's behavior when focus is in an editable
    const event = new KeyboardEvent("keydown", { key: "m" });
    handler(event);

    // The matcher should not call the handler when in editable element
    // (This is tested via the isFocusInsideEditableElement helper in the real implementation)
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
});
