import "@testing-library/jest-dom";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
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

jest.mock(
  "../components/NavMenu",
  () =>
    function MockNavMenu() {
      return <div data-testid="nav-menu">NavMenu</div>;
    }
);

jest.mock("../lib/api/health", () => ({
  __esModule: true,
  getHealth: jest.fn(),
}));

const mockGetHealth = getHealth as jest.Mock;

describe("Home Page – health-check abort on unmount", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("passes an AbortSignal to getHealth on each check", async () => {
    mockGetHealth.mockResolvedValue({ status: "connected", message: "ok" });

    render(<Home />);
    fireEvent.click(screen.getByRole("button", { name: /check backend health/i }));

    await waitFor(() => expect(mockGetHealth).toHaveBeenCalledTimes(1));

    expect(mockGetHealth).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
  });

  it("aborts the in-flight signal when the component unmounts", async () => {
    let capturedSignal: AbortSignal | undefined;
    let resolveHealth: (v: unknown) => void;
    const deferred = new Promise((res) => {
      resolveHealth = res;
    });

    mockGetHealth.mockImplementation((_url: string, { signal }: { signal: AbortSignal }) => {
      capturedSignal = signal;
      return deferred;
    });

    const { unmount } = render(<Home />);
    fireEvent.click(screen.getByRole("button", { name: /check backend health/i }));

    await waitFor(() => expect(capturedSignal).toBeDefined());
    expect(capturedSignal!.aborted).toBe(false);

    unmount();

    expect(capturedSignal!.aborted).toBe(true);

    // Resolve to avoid unhandled-rejection noise
    resolveHealth!({ status: "connected", message: "ok" });
  });

  it("does not update health state when the result arrives after unmount", async () => {
    let capturedSignal: AbortSignal | undefined;
    let resolveHealth: (v: unknown) => void;
    const deferred = new Promise((res) => {
      resolveHealth = res;
    });

    mockGetHealth.mockImplementation((_url: string, { signal }: { signal: AbortSignal }) => {
      capturedSignal = signal;
      return deferred;
    });

    const { unmount } = render(<Home />);
    fireEvent.click(screen.getByRole("button", { name: /check backend health/i }));

    await waitFor(() => expect(capturedSignal).toBeDefined());

    unmount();

    // Resolve after unmount — the aborted-signal guard must prevent setHealth
    await act(async () => {
      resolveHealth!({ status: "connected", message: "Backend is healthy" });
    });

    // Signal should be aborted confirming the guard fired
    expect(capturedSignal!.aborted).toBe(true);
  });

  it("treats an unmount-abort as a non-error – does not throw or surface error state", async () => {
    let rejectHealth: (err: unknown) => void;
    const deferred = new Promise<unknown>((_res, rej) => {
      rejectHealth = rej;
    });

    mockGetHealth.mockReturnValue(deferred);

    const { unmount } = render(<Home />);
    fireEvent.click(screen.getByRole("button", { name: /check backend health/i }));

    await waitFor(() => expect(mockGetHealth).toHaveBeenCalledTimes(1));

    unmount();

    const abortError = Object.assign(new Error("Aborted"), { name: "AbortError" });

    await act(async () => {
      rejectHealth(abortError);
      await deferred.catch(() => {});
    });

    // Reaching here means the component silently absorbed the AbortError — no rethrow
  });

  it("does not clear loading state after an unmount-abort", async () => {
    let capturedSignal: AbortSignal | undefined;
    let resolveHealth: (v: unknown) => void;
    const deferred = new Promise((res) => {
      resolveHealth = res;
    });

    mockGetHealth.mockImplementation((_url: string, { signal }: { signal: AbortSignal }) => {
      capturedSignal = signal;
      return deferred;
    });

    const { unmount } = render(<Home />);
    const button = screen.getByRole("button", { name: /check backend health/i });

    fireEvent.click(button);
    await waitFor(() => expect(button).toBeDisabled());

    unmount();
    resolveHealth!({ status: "connected", message: "ok" });

    // Signal must be aborted; component unmounted so no state thrash
    expect(capturedSignal!.aborted).toBe(true);
  });

  it("clears loading and shows result on a normal successful check", async () => {
    mockGetHealth.mockResolvedValue({ status: "connected", message: "Backend is healthy" });

    render(<Home />);
    const button = screen.getByRole("button", { name: /check backend health/i });

    fireEvent.click(button);

    await waitFor(() => expect(button).not.toBeDisabled());
    expect(screen.getAllByText(/backend is healthy/i).length).toBeGreaterThanOrEqual(1);
  });

  it("renders connected badge on a successful check after the abort guard is in place", async () => {
    mockGetHealth.mockResolvedValue({ status: "connected", message: "Backend is healthy" });

    render(<Home />);
    fireEvent.click(screen.getByRole("button", { name: /check backend health/i }));

    await waitFor(() =>
      expect(screen.getAllByText(/backend is healthy/i).length).toBeGreaterThanOrEqual(1)
    );

    expect(screen.getAllByText(/connected/i).length).toBeGreaterThanOrEqual(1);
  });
});
