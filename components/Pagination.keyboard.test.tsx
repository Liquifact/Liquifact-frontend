/**
 * @file Pagination.keyboard.test.tsx
 * Keyboard-operability tests for the "Load more" pagination control,
 * per issue #642 (navigation controls must be fully keyboard-operable).
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Pagination from "./Pagination";

function renderLoadMoreMode(shown = 5, total = 10, onLoadMore = jest.fn()) {
  render(<Pagination shown={shown} total={total} onLoadMore={onLoadMore} />);
  return { onLoadMore };
}

describe("Pagination – keyboard operability (issue #642)", () => {
  describe("tab reachability", () => {
    it("the Load more button is a real, natively focusable element (no tabindex=-1)", () => {
      renderLoadMoreMode();
      const button = screen.getByRole("button", { name: /load more/i });
      expect(button.tagName).toBe("BUTTON");
      expect(button).not.toHaveAttribute("tabindex", "-1");
    });

    it("the Load more button is reachable via Tab from the top of the document", async () => {
      const user = userEvent.setup();
      renderLoadMoreMode();
      await user.tab();
      expect(screen.getByRole("button", { name: /load more/i })).toHaveFocus();
    });

    it("is not present in the tab order at all once all items are shown (no orphaned focusable element)", () => {
      renderLoadMoreMode(10, 10);
      expect(screen.queryByRole("button", { name: /load more/i })).not.toBeInTheDocument();
    });
  });

  describe("Enter/Space activation", () => {
    it("activates onLoadMore when Enter is pressed while focused", async () => {
      const user = userEvent.setup();
      const { onLoadMore } = renderLoadMoreMode();
      const button = screen.getByRole("button", { name: /load more/i });

      button.focus();
      await user.keyboard("{Enter}");

      expect(onLoadMore).toHaveBeenCalledTimes(1);
    });

    it("activates onLoadMore when Space is pressed while focused", async () => {
      const user = userEvent.setup();
      const { onLoadMore } = renderLoadMoreMode();
      const button = screen.getByRole("button", { name: /load more/i });

      button.focus();
      await user.keyboard(" ");

      expect(onLoadMore).toHaveBeenCalledTimes(1);
    });

    it("does not activate onLoadMore for unrelated key presses", async () => {
      const user = userEvent.setup();
      const { onLoadMore } = renderLoadMoreMode();
      const button = screen.getByRole("button", { name: /load more/i });

      button.focus();
      await user.keyboard("{Escape}");
      await user.keyboard("a");

      expect(onLoadMore).not.toHaveBeenCalled();
    });
  });

  describe("focus order and focus restoration", () => {
    it("focus lands on the Load more button and stays there until the user moves it", async () => {
      const user = userEvent.setup();
      renderLoadMoreMode();
      await user.tab();
      const button = screen.getByRole("button", { name: /load more/i });
      expect(button).toHaveFocus();

      // A second Tab press should move focus away (no focus trap on this button)
      await user.tab();
      expect(button).not.toHaveFocus();
    });

    it("the ref forwarded to the button can be used by callers to restore focus after a load", () => {
      const ref = React.createRef<HTMLButtonElement>();
      render(<Pagination ref={ref} shown={5} total={10} onLoadMore={() => {}} />);

      expect(ref.current).not.toBeNull();
      expect(ref.current?.tagName).toBe("BUTTON");

      ref.current?.focus();
      expect(ref.current).toHaveFocus();
    });
  });

  describe("visible focus indicator", () => {
    it("the Load more button carries the focus-visible ring utility classes", () => {
      renderLoadMoreMode();
      const button = screen.getByRole("button", { name: /load more/i });
      expect(button.className).toEqual(expect.stringContaining("focus-visible:ring-2"));
      expect(button.className).toEqual(expect.stringContaining("focus-visible:ring-cyan-400"));
    });
  });
});
