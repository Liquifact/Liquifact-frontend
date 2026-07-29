import "@testing-library/jest-dom";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { axe } from "jest-axe";
import Home from "./page";
import { getHealth } from "../lib/api/health";

jest.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

jest.mock("../components/WalletStatusLazy", () => ({
  __esModule: true,
  default: function MockWalletStatusLazy() {
    return <button type="button">Connect Wallet</button>;
  },
}));

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

jest.mock("../lib/api/health", () => ({
  getHealth: jest.fn(),
}));

afterEach(() => {
  jest.restoreAllMocks();
});

describe("Home dashboard loading skeleton", () => {
  it("shows the skeleton (not blank content) while the health check is in flight", async () => {
    let resolveHealth;
    getHealth.mockReturnValue(
      new Promise((resolve) => {
        resolveHealth = resolve;
      })
    );

    render(<Home />);
    fireEvent.click(screen.getByRole("button", { name: /check backend health/i }));

    const skeleton = await screen.findByTestId("health-status-skeleton");
    expect(skeleton).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText(/loading api status/i)).toBeInTheDocument();

    resolveHealth({ status: "connected", message: "All good" });
    await waitFor(() => expect(skeleton).not.toBeInTheDocument());
    expect(screen.getAllByText("All good").length).toBeGreaterThan(0);
  });

  it("has no axe accessibility violations while the skeleton is shown", async () => {
    getHealth.mockReturnValue(new Promise(() => {}));

    render(<Home />);
    fireEvent.click(screen.getByRole("button", { name: /check backend health/i }));

    await screen.findByTestId("health-status-skeleton");
    const results = await axe(document.body);
    expect(results).toHaveNoViolations();
  });
});
