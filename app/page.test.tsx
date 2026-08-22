import "@testing-library/jest-dom";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

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

// IMPORTANT: mock before tests
jest.mock("../lib/api/health", () => ({
  __esModule: true,
  getHealth: jest.fn(),
}));

// Mock NavMenu to avoid WalletStatus pre-existing bugs
jest.mock("../components/NavMenu", () => {
  return function MockNavMenu() {
    return <div data-testid="nav-menu">NavMenu</div>;
  };
});

const mockGetHealth = getHealth as jest.Mock;

describe("Home Page Health Check", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("verifies mock", () => {
    expect(jest.isMockFunction(getHealth)).toBe(true);
  });

  it("renders the health check button", () => {
    render(<Home />);

    expect(
      screen.getByRole("button", {
        name: /check backend health/i,
      })
    ).toBeTruthy();
  });

  it("disables button while loading", async () => {
    mockGetHealth.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                status: "connected",
                message: "Backend is healthy",
              }),
            100
          )
        )
    );

    render(<Home />);

    const button = screen.getByRole("button", {
      name: /check backend health/i,
    });

    fireEvent.click(button);

    await waitFor(() => {
      expect(button).toBeDisabled();
    });

    expect(screen.getByText(/checking/i)).toBeTruthy();
  });

  it("renders connected state with green badge", async () => {
    mockGetHealth.mockResolvedValue({
      status: "connected",
      message: "Backend is healthy",
      details: {
        status: "ok",
      },
    });

    render(<Home />);

    fireEvent.click(
      screen.getByRole("button", {
        name: /check backend health/i,
      })
    );

    await waitFor(() => {
      expect(screen.getByText(/backend is healthy/i)).toBeTruthy();
    });

    // Assert the "Connected" badge is rendered
    expect(screen.getAllByText(/connected/i).length).toBeGreaterThan(0);
  });

  it("renders degraded state with amber badge", async () => {
    mockGetHealth.mockResolvedValue({
      status: "degraded",
      message: "Backend responded with 500",
      details: {
        error: "Internal Server Error",
      },
    });

    render(<Home />);

    fireEvent.click(
      screen.getByRole("button", {
        name: /check backend health/i,
      })
    );

    await waitFor(() => {
      expect(screen.getByText(/backend responded with 500/i)).toBeTruthy();
    });

    // Assert the "Degraded" badge is rendered
    expect(screen.getAllByText(/degraded/i).length).toBeGreaterThan(0);
  });

  it("renders unreachable state with red badge", async () => {
    mockGetHealth.mockResolvedValue({
      status: "unreachable",
      message: "Health check timed out",
    });

    render(<Home />);

    fireEvent.click(
      screen.getByRole("button", {
        name: /check backend health/i,
      })
    );

    await waitFor(() => {
      expect(screen.getAllByText(/health check timed out/i).length).toBeGreaterThan(0);
    });

    // Assert the "Unreachable" badge is rendered
    expect(screen.getAllByText(/unreachable/i).length).toBeGreaterThan(0);
  });

  it("renders raw response details", async () => {
    mockGetHealth.mockResolvedValue({
      status: "degraded",
      message: "Backend responded with 500",
      details: {
        error: "Internal Server Error",
      },
    });

    render(<Home />);

    fireEvent.click(
      screen.getByRole("button", {
        name: /check backend health/i,
      })
    );

    await waitFor(() => {
      expect(screen.getByText(/raw response/i)).toBeTruthy();
    });
  });

  it("renders distinct visual state for each status", async () => {
    // Test connected state
    mockGetHealth.mockResolvedValue({
      status: "connected",
      message: "Backend is healthy",
    });

    render(<Home />);

    fireEvent.click(
      screen.getByRole("button", {
        name: /check backend health/i,
      })
    );

    await waitFor(() => {
      expect(screen.getAllByText(/connected/i).length).toBeGreaterThan(0);
    });

    // Test degraded state
    mockGetHealth.mockResolvedValue({
      status: "degraded",
      message: "Backend responded with 500",
    });

    fireEvent.click(
      screen.getByRole("button", {
        name: /check backend health/i,
      })
    );

    await waitFor(() => {
      expect(screen.getAllByText(/degraded/i).length).toBeGreaterThan(0);
    });

    // Test unreachable state
    mockGetHealth.mockResolvedValue({
      status: "unreachable",
      message: "Health check timed out",
    });

    fireEvent.click(
      screen.getByRole("button", {
        name: /check backend health/i,
      })
    );

    await waitFor(() => {
      expect(screen.getAllByText(/unreachable/i).length).toBeGreaterThan(0);
    });
  });

  it("announces status updates politely", async () => {
    mockGetHealth.mockResolvedValue({
      status: "connected",
      message: "Backend is healthy",
      details: {
        status: "ok",
      },
    });

    render(<Home />);

    fireEvent.click(
      screen.getByRole("button", {
        name: /check backend health/i,
      })
    );

    const statusRegion = await screen.findByRole("status");

    expect(statusRegion.getAttribute("aria-live")).toBe("polite");
  });
});
