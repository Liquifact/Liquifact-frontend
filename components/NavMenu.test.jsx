import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import NavMenu from "./NavMenu";

// Mock next/navigation
const mockPathname = jest.fn(() => "/");
jest.mock("next/navigation", () => ({
  usePathname: () => mockPathname(),
}));

// Mock next/link
jest.mock("next/link", () => {
  const MockLink = ({ href, children, ...props }) => (
    <a href={href} {...props}>
      {children}
    </a>
  );
  MockLink.displayName = "MockLink";
  return MockLink;
});

jest.mock("./WalletStatusLazy", () => ({
  __esModule: true,
  default: function MockWalletStatusLazy() {
    return <button type="button">Connect Wallet</button>;
  },
}));

describe("NavMenu", () => {
  beforeEach(() => {
    mockPathname.mockReturnValue("/");
  });

  describe("rendering", () => {
    it("renders the brand name", () => {
      render(<NavMenu />);
      expect(screen.getAllByText("LiquiFact").length).toBeGreaterThan(0);
    });

    it("renders desktop nav links", () => {
      render(<NavMenu />);
      const links = screen.getAllByRole("link", { name: /home|invoices|invest/i });
      expect(links.length).toBeGreaterThanOrEqual(3);
    });

    it("renders the wallet button", () => {
      render(<NavMenu />);
      expect(screen.getAllByRole("button", { name: /connect wallet/i })).toHaveLength(2);
    });

    it("mobile menu is hidden by default", () => {
      render(<NavMenu />);
      expect(
        screen.queryByRole("navigation", { name: /mobile navigation/i })
      ).not.toBeInTheDocument();
    });
  });

  describe("hamburger toggle", () => {
    it("toggle button has aria-expanded=false initially", () => {
      render(<NavMenu />);
      const toggle = screen.getByRole("button", { name: /open navigation menu/i });
      expect(toggle).toHaveAttribute("aria-expanded", "false");
    });

    it("opens mobile menu on toggle click", async () => {
      const user = userEvent.setup();
      render(<NavMenu />);
      const toggle = screen.getByRole("button", { name: /open navigation menu/i });
      await user.click(toggle);
      expect(screen.getByRole("navigation", { name: /mobile navigation/i })).toBeInTheDocument();
    });

    it("moves focus to the first mobile link when the menu opens", async () => {
      const user = userEvent.setup();
      render(<NavMenu />);

      await user.click(screen.getByRole("button", { name: /open navigation menu/i }));

      const mobileNav = screen.getByRole("navigation", { name: /mobile navigation/i });
      await waitFor(() => {
        expect(within(mobileNav).getByRole("link", { name: /^home$/i })).toHaveFocus();
      });
    });

    it("sets aria-expanded=true when open", async () => {
      const user = userEvent.setup();
      render(<NavMenu />);
      const toggle = screen.getByRole("button", { name: /open navigation menu/i });
      await user.click(toggle);
      expect(toggle).toHaveAttribute("aria-expanded", "true");
    });

    it("closes mobile menu on second toggle click", async () => {
      const user = userEvent.setup();
      render(<NavMenu />);
      const toggle = screen.getByRole("button", { name: /open navigation menu/i });
      await user.click(toggle);
      await user.click(screen.getByRole("button", { name: /close navigation menu/i }));
      expect(
        screen.queryByRole("navigation", { name: /mobile navigation/i })
      ).not.toBeInTheDocument();
    });

    it("toggle button has aria-controls pointing to mobile-menu", async () => {
      const user = userEvent.setup();
      render(<NavMenu />);
      const toggle = screen.getByRole("button", { name: /open navigation menu/i });
      await user.click(toggle);
      expect(toggle).toHaveAttribute("aria-controls", "mobile-menu");
      expect(document.getElementById("mobile-menu")).toBeInTheDocument();
    });

    it("moves focus into the mobile menu when opened from the keyboard", async () => {
      const user = userEvent.setup();
      render(<NavMenu />);
      const toggle = screen.getByRole("button", { name: /open navigation menu/i });

      toggle.focus();
      await user.keyboard("{Enter}");

      const mobileNav = screen.getByRole("navigation", { name: /mobile navigation/i });
      await waitFor(() => {
        expect(within(mobileNav).getByRole("link", { name: /^home$/i })).toHaveFocus();
      });
    });
  });

  describe("Escape key", () => {
    it("closes the menu when Escape is pressed", async () => {
      const user = userEvent.setup();
      render(<NavMenu />);
      await user.click(screen.getByRole("button", { name: /open navigation menu/i }));
      expect(screen.getByRole("navigation", { name: /mobile navigation/i })).toBeInTheDocument();

      fireEvent.keyDown(document, { key: "Escape" });

      await waitFor(() => {
        expect(
          screen.queryByRole("navigation", { name: /mobile navigation/i })
        ).not.toBeInTheDocument();
      });
    });

    it("returns focus to toggle button after Escape", async () => {
      const user = userEvent.setup();
      render(<NavMenu />);
      const toggle = screen.getByRole("button", { name: /open navigation menu/i });
      await user.click(toggle);

      fireEvent.keyDown(document, { key: "Escape" });

      await waitFor(() => {
        expect(toggle).toHaveFocus();
      });
    });
  });

  describe("aria-current (active route)", () => {
    it("marks Home as current when on /", () => {
      mockPathname.mockReturnValue("/");
      render(<NavMenu />);
      const homeLinks = screen.getAllByRole("link", { name: /^home$/i });
      const currentLink = homeLinks.find((l) => l.getAttribute("aria-current") === "page");
      expect(currentLink).toBeInTheDocument();
    });

    it("marks Invoices as current when on /invoices", () => {
      mockPathname.mockReturnValue("/invoices");
      render(<NavMenu />);
      const invoiceLinks = screen.getAllByRole("link", { name: /^invoices$/i });
      const currentLink = invoiceLinks.find((l) => l.getAttribute("aria-current") === "page");
      expect(currentLink).toBeInTheDocument();
    });

    it("marks Invest as current when on /invest", () => {
      mockPathname.mockReturnValue("/invest");
      render(<NavMenu />);
      const investLinks = screen.getAllByRole("link", { name: /^invest$/i });
      const currentLink = investLinks.find((l) => l.getAttribute("aria-current") === "page");
      expect(currentLink).toBeInTheDocument();
    });

    it("does not mark non-active routes as current", () => {
      mockPathname.mockReturnValue("/");
      render(<NavMenu />);
      const investLinks = screen.getAllByRole("link", { name: /^invest$/i });
      investLinks.forEach((link) => {
        expect(link).not.toHaveAttribute("aria-current", "page");
      });
    });
  });

  describe("close on navigation", () => {
    it("closes mobile menu when pathname changes", async () => {
      const user = userEvent.setup();
      mockPathname.mockReturnValue("/");
      const { rerender } = render(<NavMenu />);
      await user.click(screen.getByRole("button", { name: /open navigation menu/i }));
      expect(screen.getByRole("navigation", { name: /mobile navigation/i })).toBeInTheDocument();

      mockPathname.mockReturnValue("/invoices");
      rerender(<NavMenu />);

      await waitFor(() => {
        expect(
          screen.queryByRole("navigation", { name: /mobile navigation/i })
        ).not.toBeInTheDocument();
      });
    });
  });

  describe("click outside", () => {
    it("closes the mobile menu and returns focus to the toggle", async () => {
      const user = userEvent.setup();
      render(<NavMenu />);
      const toggle = screen.getByRole("button", { name: /open navigation menu/i });

      await user.click(toggle);
      expect(screen.getByRole("navigation", { name: /mobile navigation/i })).toBeInTheDocument();

      fireEvent.mouseDown(document.body);

      await waitFor(() => {
        expect(
          screen.queryByRole("navigation", { name: /mobile navigation/i })
        ).not.toBeInTheDocument();
        expect(toggle).toHaveFocus();
      });
    });
  });

  describe("accessibility", () => {
    it("has no axe violations when closed", async () => {
      const { container } = render(<NavMenu />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it("has no axe violations when open", async () => {
      const user = userEvent.setup();
      const { container } = render(<NavMenu />);
      await user.click(screen.getByRole("button", { name: /open navigation menu/i }));
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it("all nav links are keyboard focusable", async () => {
      const user = userEvent.setup();
      render(<NavMenu />);
      await user.click(screen.getByRole("button", { name: /open navigation menu/i }));
      const mobileNav = screen.getByRole("navigation", { name: /mobile navigation/i });
      const links = mobileNav.querySelectorAll("a");
      links.forEach((link) => {
        expect(link).not.toHaveAttribute("tabindex", "-1");
      });
    });
  });
});
