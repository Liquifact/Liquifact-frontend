/**
 * focus-management.test.jsx
 *
 * Coverage for issue "Add focus management on marketplace route and dialog
 * transitions" (a11y/marketplace-21-focus).
 *
 * Next.js client-side navigation does not reset or announce focus the way a
 * full page load does, so keyboard and screen-reader users arriving at
 * `/invest` from another route can be left with focus stranded on a
 * now-removed element. These tests cover:
 *
 *   1. Route-change focus: the marketplace page moves focus to its heading
 *      on mount, and does so exactly once (it never fights the user for
 *      focus on subsequent re-renders).
 *   2. Dialog trap: any dialog reachable from the marketplace route (here,
 *      the globally-mounted `ShortcutHelpDialog`) traps Tab/Shift+Tab and
 *      restores focus to wherever it was in the marketplace page once
 *      closed.
 */

import "@testing-library/jest-dom";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { InvestMarketplace } from "./page";
import ShortcutHelpDialog from "@/components/ShortcutHelpDialog";

jest.mock("next/link", () => {
  function MockLink({ href, children, ...props }) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  }
  return { __esModule: true, default: MockLink };
});

jest.mock("@/components/NavMenu", () => {
  function MockNavMenu() {
    return <nav aria-label="site navigation" />;
  }
  return { __esModule: true, default: MockNavMenu };
});

function createPendingLoader() {
  return jest.fn(() => new Promise(() => {}));
}

function pressQuestionMark(target = document) {
  fireEvent.keyDown(target, { key: "?", bubbles: true });
}

// ── Route-change focus management ─────────────────────────────────────────

describe("InvestMarketplace — route-change focus management", () => {
  it("moves focus to the page heading on mount", () => {
    render(<InvestMarketplace loadInvoices={createPendingLoader()} />);

    const heading = screen.getByRole("heading", { name: /invest/i });
    expect(heading).toHaveFocus();
  });

  it("makes the heading programmatically focusable without adding it to the natural Tab order", () => {
    render(<InvestMarketplace loadInvoices={createPendingLoader()} />);

    const heading = screen.getByRole("heading", { name: /invest/i });
    expect(heading).toHaveAttribute("tabindex", "-1");
  });

  it("does not steal focus back to the heading after the user moves focus elsewhere", async () => {
    jest.useFakeTimers();
    let resolveLoad;
    const loadInvoices = jest.fn(
      () =>
        new Promise((resolve) => {
          resolveLoad = resolve;
        })
    );

    render(<InvestMarketplace loadInvoices={loadInvoices} />);

    const heading = screen.getByRole("heading", { name: /invest/i });
    expect(heading).toHaveFocus();

    // User tabs away to the search input.
    const searchInput = screen.getByLabelText("Search by issuer name");
    searchInput.focus();
    expect(searchInput).toHaveFocus();

    // A later state update (the invoice list resolving) re-renders the page;
    // the mount-only focus effect must not re-fire and steal focus back.
    await act(async () => {
      resolveLoad([]);
      await Promise.resolve();
    });

    expect(searchInput).toHaveFocus();
    jest.useRealTimers();
  });
});

// ── Dialog focus trap reachable from the marketplace route ───────────────

describe("Marketplace route — dialog focus trap and restoration", () => {
  it("traps Tab/Shift+Tab inside the dialog opened while on the marketplace route", async () => {
    render(
      <>
        <InvestMarketplace loadInvoices={createPendingLoader()} />
        <ShortcutHelpDialog />
      </>
    );

    // Focus a non-editable marketplace control — ShortcutHelpDialog
    // deliberately ignores `?` while focus is inside an editable element
    // (typing a literal "?" must not trigger the help dialog), so the
    // dialog-focus tests below use a button rather than the search input.
    const statusChip = screen.getByRole("button", { name: "Open" });
    statusChip.focus();

    act(() => {
      pressQuestionMark();
    });

    const dialog = await waitFor(() => screen.getByRole("dialog"));
    const closeBtn = screen.getByRole("button", { name: /close/i });
    await waitFor(() => expect(closeBtn).toHaveFocus());

    // Only one focusable control inside this dialog — Tab and Shift+Tab
    // must both keep focus trapped on it rather than escaping to the
    // marketplace page underneath.
    fireEvent.keyDown(dialog, { key: "Tab" });
    expect(closeBtn).toHaveFocus();

    fireEvent.keyDown(dialog, { key: "Tab", shiftKey: true });
    expect(closeBtn).toHaveFocus();
  });

  it("restores focus to the marketplace control that was focused before the dialog opened", async () => {
    render(
      <>
        <InvestMarketplace loadInvoices={createPendingLoader()} />
        <ShortcutHelpDialog />
      </>
    );

    // See the note above: a button is used instead of the search input
    // because ShortcutHelpDialog ignores `?` while focus is on an editable
    // element.
    const statusChip = screen.getByRole("button", { name: "Open" });
    statusChip.focus();
    expect(statusChip).toHaveFocus();

    act(() => {
      pressQuestionMark();
    });

    const dialog = await waitFor(() => screen.getByRole("dialog"));
    await waitFor(() => expect(screen.getByRole("button", { name: /close/i })).toHaveFocus());

    fireEvent.keyDown(dialog, { key: "Escape" });

    await waitFor(() => expect(statusChip).toHaveFocus());
  });

  it("restores focus to the marketplace heading if the dialog is opened right after mount", async () => {
    render(
      <>
        <InvestMarketplace loadInvoices={createPendingLoader()} />
        <ShortcutHelpDialog />
      </>
    );

    const heading = screen.getByRole("heading", { name: /invest/i });
    expect(heading).toHaveFocus();

    act(() => {
      pressQuestionMark();
    });

    const dialog = await waitFor(() => screen.getByRole("dialog"));
    await waitFor(() => expect(screen.getByRole("button", { name: /close/i })).toHaveFocus());

    fireEvent.click(screen.getByRole("button", { name: /close/i }));

    await waitFor(() => expect(heading).toHaveFocus());
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
