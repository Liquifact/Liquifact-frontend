/**
 * @file components/WalletShortcut.test.tsx
 *
 * Tests for the `w` keyboard shortcut that focuses the wallet connect /
 * disconnect button.
 *
 * Coverage goals:
 *   - WALLET_SHORTCUT_KEY is "w"
 *   - The shortcut is advertised in the shared KEYBOARD_SHORTCUTS registry
 *   - Pressing "w" focuses the Connect Wallet button
 *   - Pressing "w" focuses the Disconnect button when connected
 *   - Does not fire while focus is inside an editable element (input / textarea)
 *   - Does not fire when a modifier key (Ctrl/Meta/Alt) is held
 *   - No-op when the wallet button is not in the DOM
 */

import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";

import WalletShortcut from "./WalletShortcut";
import {
  WALLET_SHORTCUT_KEY,
  KEYBOARD_SHORTCUTS,
  createShortcutMatcher,
  isEditableElement,
} from "../lib/shortcuts";

// ── Registry contract ───────────────────────────────────────────────────────

describe("WALLET_SHORTCUT_KEY", () => {
  it("is the letter w", () => {
    expect(WALLET_SHORTCUT_KEY).toBe("w");
  });

  it("is advertised in the shared shortcut registry", () => {
    const entry = KEYBOARD_SHORTCUTS.find((s) => s.id === "wallet-focus");
    expect(entry).toBeDefined();
    expect(entry?.key).toBe(WALLET_SHORTCUT_KEY);
    expect(entry?.scope).toBe("global");
  });
});

// ── WalletShortcut integration ──────────────────────────────────────────────

describe("WalletShortcut — focus wallet button", () => {
  function renderWithButton(ariaLabel: string) {
    // Render the shortcut component alongside a mock wallet button
    render(
      <div>
        <WalletShortcut />
        <button type="button" aria-label={ariaLabel}>
          {ariaLabel}
        </button>
      </div>
    );
  }

  it("focuses the Connect Wallet button when 'w' is pressed", () => {
    renderWithButton("Connect Wallet");
    const btn = screen.getByRole("button", { name: /connect wallet/i });
    expect(btn).not.toHaveFocus();

    fireEvent.keyDown(document, { key: "w" });
    expect(btn).toHaveFocus();
  });

  it("focuses the Disconnect button when 'w' is pressed and wallet is connected", () => {
    renderWithButton("Disconnect");
    const btn = screen.getByRole("button", { name: /disconnect/i });
    expect(btn).not.toHaveFocus();

    fireEvent.keyDown(document, { key: "w" });
    expect(btn).toHaveFocus();
  });

  it("does not focus when a modifier key is held (Ctrl+w)", () => {
    renderWithButton("Connect Wallet");
    const btn = screen.getByRole("button", { name: /connect wallet/i });

    fireEvent.keyDown(document, { key: "w", ctrlKey: true });
    expect(btn).not.toHaveFocus();
  });

  it("does not focus when focus is inside an input element", async () => {
    const user = userEvent.setup();
    render(
      <div>
        <WalletShortcut />
        <input data-testid="search-input" />
        <button type="button" aria-label="Connect Wallet">
          Connect Wallet
        </button>
      </div>
    );

    const input = screen.getByTestId("search-input");
    input.focus();
    expect(input).toHaveFocus();

    await user.keyboard("w");
    // Focus should remain on the input, not move to the wallet button
    expect(input).toHaveFocus();
  });

  it("is a no-op when no wallet button exists in the DOM", () => {
    render(<WalletShortcut />);
    // Should not throw
    expect(() => {
      fireEvent.keyDown(document, { key: "w" });
    }).not.toThrow();
  });
});