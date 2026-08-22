import "@testing-library/jest-dom";
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

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

jest.mock("../components/NetworkBadge", () => ({
  __esModule: true,
  default: function MockNetworkBadge() {
    return <span>Testnet</span>;
  },
}));

jest.mock("../lib/config/env", () => ({
  env: {
    apiUrl: "http://localhost:3001",
  },
}));

jest.mock("../lib/api/health", () => ({
  getHealth: jest.fn(),
}));

const setupUser = () =>
  userEvent.setup({
    advanceTimers: jest.advanceTimersByTime,
  });

describe("dashboard keyboard navigation", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    getHealth.mockReset();
    getHealth.mockResolvedValue({
      status: "connected",
      message: "Backend connected",
      details: {
        status: "ok",
      },
    });
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it("follows a logical forward and reverse tab order through dashboard actions", async () => {
    const user = setupUser();
    render(<Home />);

    const main = screen.getByRole("main");
    const dashboardLinks = within(main).getAllByRole("link");
    const healthButton = within(main).getByRole("button", {
      name: /check backend health/i,
    });

    expect(dashboardLinks).toHaveLength(2);

    dashboardLinks[0].focus();
    expect(dashboardLinks[0]).toHaveFocus();

    await user.tab();
    expect(dashboardLinks[1]).toHaveFocus();

    await user.tab();
    expect(healthButton).toHaveFocus();

    await user.tab({ shift: true });
    expect(dashboardLinks[1]).toHaveFocus();

    await user.tab({ shift: true });
    expect(dashboardLinks[0]).toHaveFocus();
  });

  it("keeps focus stable when arrow keys are pressed on standard dashboard links", async () => {
    const user = setupUser();
    render(<Home />);

    const main = screen.getByRole("main");
    const firstDashboardLink = within(main).getAllByRole("link")[0];
    const activationSpy = jest.fn();

    firstDashboardLink.addEventListener("click", activationSpy);
    firstDashboardLink.focus();

    await user.keyboard("{ArrowRight}{ArrowDown}{ArrowLeft}{ArrowUp}");

    expect(firstDashboardLink).toHaveFocus();
    expect(activationSpy).not.toHaveBeenCalled();
  });

  it("activates the focused dashboard action with Enter", async () => {
    const user = setupUser();
    render(<Home />);

    const healthButton = within(screen.getByRole("main")).getByRole("button", {
      name: /check backend health/i,
    });

    healthButton.focus();
    await user.keyboard("{Enter}");

    expect(getHealth).toHaveBeenCalledTimes(1);
    expect(getHealth).toHaveBeenCalledWith(
      "http://localhost:3001",
      expect.objectContaining({
        signal: expect.any(AbortSignal),
      })
    );

    await act(async () => {
      await Promise.resolve();
    });
  });

  it("opens the mobile menu with Enter and closes it with Escape", async () => {
    const user = setupUser();
    render(<Home />);

    const toggle = screen.getByRole("button", {
      name: /open navigation menu/i,
    });

    toggle.focus();
    await user.keyboard("{Enter}");

    act(() => {
      jest.advanceTimersByTime(20);
    });

    const mobileNavigation = screen.getByRole("navigation", {
      name: /mobile navigation/i,
    });
    const firstMobileLink = within(mobileNavigation).getByRole("link", {
      name: /^home$/i,
    });

    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(firstMobileLink).toHaveFocus();

    await user.keyboard("{Escape}");

    expect(
      screen.queryByRole("navigation", {
        name: /mobile navigation/i,
      })
    ).not.toBeInTheDocument();
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(toggle).toHaveFocus();
  });
});
