import "@testing-library/jest-dom";
import { render, screen, within } from "@testing-library/react";

import Home from "./page";

jest.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

jest.mock("../components/WalletStatusLazy", () => ({
  __esModule: true,
  default: function MockWalletStatusLazy() {
    return <button type="button">Connect Wallet</button>;
  },
}));

describe("Home page navigation", () => {
  it("renders the shared NavMenu as the only header landmark", () => {
    render(<Home />);

    expect(screen.getAllByRole("banner")).toHaveLength(1);
    expect(document.querySelectorAll("header")).toHaveLength(1);
  });

  it("renders a single main navigation landmark with the expected links", () => {
    render(<Home />);

    const navigation = screen.getByRole("navigation", {
      name: /main navigation/i,
    });

    expect(screen.getAllByRole("navigation")).toHaveLength(1);
    expect(within(navigation).getByRole("link", { name: /^home$/i })).toHaveAttribute("href", "/");
    expect(within(navigation).getByRole("link", { name: /^invoices$/i })).toHaveAttribute(
      "href",
      "/invoices"
    );
    expect(within(navigation).getByRole("link", { name: /^invest$/i })).toHaveAttribute(
      "href",
      "/invest"
    );
  });

  it("mounts without hydration-style console errors from the lazy wallet entry", () => {
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    render(<Home />);

    expect(consoleErrorSpy).not.toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });
});
