import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";

jest.mock("next/headers", () => ({ headers: jest.fn() }));
jest.mock("../lib/observability/reportError", () => ({ reportError: jest.fn() }));

import { headers } from "next/headers";
import RootLayout from "./layout";
import GlobalLayoutError from "./global-error";
import { reportError } from "../lib/observability/reportError";
import { copy } from "./copy/en";

const nonce = "AAAAAAAAAAAAAAAAAAAAAA==";

function createHeaders(value) {
  return { get: jest.fn(() => value) };
}

function getThemeScript(layout) {
  const head = layout.props.children[0];
  return head.props.children;
}

describe("RootLayout failure recovery", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("passes the valid request nonce to the pre-paint script", async () => {
    headers.mockResolvedValue(createHeaders(nonce));

    const layout = await RootLayout({ children: null });

    expect(getThemeScript(layout).props.nonce).toBe(nonce);
  });

  it.each([
    ["missing", null],
    ["empty", ""],
    ["malformed", "not-a-nonce"],
    ["duplicated", `${nonce}, ${nonce}`],
  ])("rejects a %s nonce instead of rendering an unusable script", async (_case, value) => {
    headers.mockResolvedValue(createHeaders(value));

    await expect(RootLayout({ children: null })).rejects.toThrow(
      "Root layout requires a valid CSP nonce."
    );
  });

  it("propagates header dependency failures to the root error boundary", async () => {
    const failure = new Error("Request headers unavailable");
    headers.mockRejectedValue(failure);

    await expect(RootLayout({ children: null })).rejects.toBe(failure);
  });

  it("retries from fresh request headers without reusing failed state", async () => {
    headers
      .mockRejectedValueOnce(new Error("Request headers unavailable"))
      .mockResolvedValueOnce(createHeaders(nonce));

    await expect(RootLayout({ children: null })).rejects.toThrow("Request headers unavailable");
    const recoveredLayout = await RootLayout({ children: null });

    expect(getThemeScript(recoveredLayout).props.nonce).toBe(nonce);
    expect(headers).toHaveBeenCalledTimes(2);
  });

  it("shows the root recovery UI and invokes reset after a nonce failure", async () => {
    headers.mockResolvedValue(createHeaders(null));
    let failure;
    try {
      await RootLayout({ children: null });
    } catch (error) {
      failure = error;
    }
    const reset = jest.fn();

    render(<GlobalLayoutError error={failure} reset={reset} />);

    expect(screen.getByTestId("global-error-page")).toBeInTheDocument();
    expect(screen.getByText(copy.globalError.heading)).toBeInTheDocument();
    expect(reportError).toHaveBeenCalledWith(failure, {
      digest: undefined,
      boundary: "global-layout",
    });
    fireEvent.click(screen.getByTestId("global-error-reset"));
    expect(reset).toHaveBeenCalledTimes(1);
  });
});
