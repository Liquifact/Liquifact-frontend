/**
 * Wiring test: the wallet section exported by WalletStatusLazy is guarded by
 * WalletErrorBoundary, so a render error inside the lazily-loaded wallet chunk
 * degrades to the accessible fallback instead of blanking the page.
 *
 * next/dynamic is mocked to synchronously return a component that throws,
 * standing in for a broken wallet chunk.
 */
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import React from "react";

jest.mock("../lib/observability/reportError", () => ({
  reportError: jest.fn(),
}));

jest.mock("next/dynamic", () => () => {
  function BrokenWalletChunk() {
    throw new Error("wallet chunk failed");
  }
  BrokenWalletChunk.displayName = "BrokenWalletChunk";
  return BrokenWalletChunk;
});

import WalletStatusLazy, { WalletStatusPlaceholder } from "./WalletStatusLazy";
import { reportError } from "../lib/observability/reportError";
import { copy } from "../app/copy/en";

let consoleErrorSpy;

beforeEach(() => {
  jest.clearAllMocks();
  consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

describe("WalletStatusLazy — error boundary wiring", () => {
  it("renders the wallet fallback when the wallet chunk throws", () => {
    render(<WalletStatusLazy />);

    expect(screen.getByTestId("wallet-error-fallback")).toBeInTheDocument();
    expect(screen.getByText(copy.wallet.errorTitle)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: copy.wallet.errorActionLabel })).toBeInTheDocument();
  });

  it("reports the chunk error rather than swallowing it", () => {
    render(<WalletStatusLazy />);

    expect(reportError).toHaveBeenCalledTimes(1);
    expect(reportError.mock.calls[0][0].message).toBe("wallet chunk failed");
    expect(reportError.mock.calls[0][1]).toMatchObject({ boundary: "WalletErrorBoundary" });
  });

  it("still exports the CLS placeholder used as the dynamic loading state", () => {
    render(<WalletStatusPlaceholder />);

    const placeholder = screen.getByTestId("wallet-status-placeholder");
    expect(placeholder).toHaveAttribute("aria-hidden", "true");
    expect(placeholder).toHaveClass("h-12", "w-80");
  });
});
