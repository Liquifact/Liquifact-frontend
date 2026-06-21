import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Home from "./page";
import { checkBackendHealth } from "../lib/api/health";

jest.mock("../lib/api/health", () => ({
  checkBackendHealth: jest.fn(),
}));

describe("Home API health check", () => {
  beforeEach(() => {
    checkBackendHealth.mockReset();
  });

  it("renders a connected health status with raw details", async () => {
    checkBackendHealth.mockResolvedValue({
      state: "connected",
      message: "API ready",
      details: { status: "ok" },
      checkedAt: "2026-06-21T00:00:00.000Z",
    });

    render(<Home />);

    await userEvent.click(
      screen.getByRole("button", { name: /check backend health/i }),
    );

    expect(await screen.findByRole("status")).toHaveTextContent("Connected");
    expect(screen.getByRole("status")).toHaveTextContent("API ready");
    expect(screen.getByText("Raw health payload")).toBeInTheDocument();
    expect(checkBackendHealth).toHaveBeenCalledWith("http://localhost:3001");
  });

  it("disables the health check button while a request is pending", async () => {
    let resolveHealth;
    checkBackendHealth.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveHealth = resolve;
        }),
    );

    render(<Home />);

    const button = screen.getByRole("button", {
      name: /check backend health/i,
    });
    const click = userEvent.click(button);

    await waitFor(() => expect(button).toBeDisabled());

    resolveHealth({
      state: "unreachable",
      message: "network down",
      details: null,
      checkedAt: "2026-06-21T00:00:00.000Z",
    });
    await click;

    expect(await screen.findByRole("status")).toHaveTextContent("Unreachable");
    await waitFor(() => expect(button).not.toBeDisabled());
  });
});
