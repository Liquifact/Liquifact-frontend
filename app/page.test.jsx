import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Home from "./page";

function createDeferred() {
  let resolve;
  let reject;
  const promise = new Promise((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });

  return { promise, resolve, reject };
}

describe("Home API health check", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it("renders the healthy backend payload and restores the idle button label", async () => {
    const user = userEvent.setup();
    const healthPayload = { status: "ok", service: "liquifact-api" };

    // Mock fetch so the test only exercises the home page rendering contract.
    global.fetch = jest.fn().mockResolvedValue({
      json: jest.fn().mockResolvedValue(healthPayload),
    });

    render(<Home />);

    await user.click(
      screen.getByRole("button", { name: /check backend health/i }),
    );

    expect(await screen.findByText(/"status": "ok"/i)).toBeInTheDocument();
    expect(screen.getByText(/"service": "liquifact-api"/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /check backend health/i }),
    ).toBeEnabled();
    expect(global.fetch).toHaveBeenCalledWith("http://localhost:3001/health");
  });

  it("disables the health button while the request is loading", async () => {
    const user = userEvent.setup();
    const deferred = createDeferred();

    // Keep fetch pending long enough to assert the intermediate loading state.
    global.fetch = jest.fn().mockReturnValue(deferred.promise);

    render(<Home />);

    await user.click(
      screen.getByRole("button", { name: /check backend health/i }),
    );

    expect(screen.getByRole("button", { name: /checking/i })).toBeDisabled();

    deferred.resolve({
      json: jest.fn().mockResolvedValue({ status: "ok" }),
    });

    expect(await screen.findByText(/"status": "ok"/i)).toBeInTheDocument();
  });

  it("renders rejected fetch errors as an error health object", async () => {
    const user = userEvent.setup();

    // Reject fetch to cover the catch branch and displayed error payload.
    global.fetch = jest.fn().mockRejectedValue(new Error("network down"));

    render(<Home />);

    await user.click(
      screen.getByRole("button", { name: /check backend health/i }),
    );

    await waitFor(() => {
      expect(screen.getByText(/"status": "error"/i)).toBeInTheDocument();
      expect(screen.getByText(/"message": "network down"/i)).toBeInTheDocument();
    });
    expect(
      screen.getByRole("button", { name: /check backend health/i }),
    ).toBeEnabled();
  });
});
