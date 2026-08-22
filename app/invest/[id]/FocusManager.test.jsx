import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { RouteFocus, DialogFocusTrap } from "./FocusManager";

describe("FocusManager", () => {
  describe("RouteFocus", () => {
    it("moves focus to main-content on mount", () => {
      // Setup the DOM with a main element
      const main = document.createElement("main");
      main.id = "main-content";
      document.body.appendChild(main);

      // Render RouteFocus
      render(<RouteFocus />);

      // Focus should be on the main element
      expect(document.activeElement).toBe(main);
      expect(main).toHaveAttribute("tabIndex", "-1");

      // Cleanup
      document.body.removeChild(main);
    });

    it("restores focus to previous element on unmount", () => {
      // Setup a button and focus it
      const button = document.createElement("button");
      document.body.appendChild(button);
      button.focus();

      const main = document.createElement("main");
      main.id = "main-content";
      document.body.appendChild(main);

      // Ensure button has focus initially
      expect(document.activeElement).toBe(button);

      // Render RouteFocus
      const { unmount } = render(<RouteFocus />);

      // Focus moves to main
      expect(document.activeElement).toBe(main);

      // Unmount RouteFocus
      unmount();

      // Focus should be restored to the button
      expect(document.activeElement).toBe(button);

      // Cleanup
      document.body.removeChild(button);
      document.body.removeChild(main);
    });
  });

  describe("DialogFocusTrap", () => {
    it("traps focus when tabbing", () => {
      const { getByTestId } = render(
        <DialogFocusTrap isActive={true}>
          <div data-testid="container">
            <button data-testid="first">First</button>
            <button data-testid="middle">Middle</button>
            <button data-testid="last">Last</button>
          </div>
        </DialogFocusTrap>
      );

      const first = getByTestId("first");
      const last = getByTestId("last");
      const container = getByTestId("container");

      // Focus the last element
      last.focus();
      expect(document.activeElement).toBe(last);

      // Press Tab (without shift)
      fireEvent.keyDown(container, { key: "Tab", shiftKey: false });

      // Focus should loop back to the first element
      expect(document.activeElement).toBe(first);

      // Press Shift+Tab on the first element
      fireEvent.keyDown(container, { key: "Tab", shiftKey: true });

      // Focus should loop to the last element
      expect(document.activeElement).toBe(last);
    });

    it("does not trap focus when isActive is false", () => {
      const { getByTestId } = render(
        <DialogFocusTrap isActive={false}>
          <div data-testid="container">
            <button data-testid="first">First</button>
            <button data-testid="last">Last</button>
          </div>
        </DialogFocusTrap>
      );

      const first = getByTestId("first");
      const last = getByTestId("last");
      const container = getByTestId("container");

      last.focus();
      fireEvent.keyDown(container, { key: "Tab", shiftKey: false });

      // Focus should not be changed by the trap
      expect(document.activeElement).toBe(last);
    });
  });
});
