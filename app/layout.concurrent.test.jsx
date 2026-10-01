import React from "react";

jest.mock("next/headers", () => ({ headers: jest.fn() }));

import { headers } from "next/headers";
import RootLayout from "./layout";

const FIRST_NONCE = "AAAAAAAAAAAAAAAAAAAAAA==";
const SECOND_NONCE = "AQEBAQEBAQEBAQEBAQEBAQ==";

function createHeaders(nonce) {
  return { get: jest.fn(() => nonce) };
}

function createDeferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function getScriptNonce(layout) {
  return layout.props.children[0].props.children.props.nonce;
}

describe("RootLayout concurrent request handling", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("keeps each nonce bound to its render when requests resolve out of order", async () => {
    const firstHeaders = createDeferred();
    const secondHeaders = createDeferred();
    headers.mockReturnValueOnce(firstHeaders.promise).mockReturnValueOnce(secondHeaders.promise);

    const firstLayoutPromise = RootLayout({ children: null });
    const secondLayoutPromise = RootLayout({ children: null });

    secondHeaders.resolve(createHeaders(SECOND_NONCE));
    const secondLayout = await secondLayoutPromise;
    firstHeaders.resolve(createHeaders(FIRST_NONCE));
    const firstLayout = await firstLayoutPromise;

    expect(getScriptNonce(firstLayout)).toBe(FIRST_NONCE);
    expect(getScriptNonce(secondLayout)).toBe(SECOND_NONCE);
    expect(headers).toHaveBeenCalledTimes(2);
  });

  it("reads headers independently for duplicate invocations", async () => {
    headers
      .mockResolvedValueOnce(createHeaders(FIRST_NONCE))
      .mockResolvedValueOnce(createHeaders(SECOND_NONCE));

    const [firstLayout, secondLayout] = await Promise.all([
      RootLayout({ children: null }),
      RootLayout({ children: null }),
    ]);

    expect(getScriptNonce(firstLayout)).toBe(FIRST_NONCE);
    expect(getScriptNonce(secondLayout)).toBe(SECOND_NONCE);
    expect(headers).toHaveBeenCalledTimes(2);
  });

  it.each([
    ["missing", null],
    ["empty", ""],
    ["short boundary", "AA=="],
    ["un-padded boundary", FIRST_NONCE.slice(0, -2)],
    ["malformed", "not-a-nonce"],
    ["duplicate", `${FIRST_NONCE}, ${FIRST_NONCE}`],
  ])("rejects a %s nonce", async (_case, nonce) => {
    headers.mockResolvedValue(createHeaders(nonce));

    await expect(RootLayout({ children: null })).rejects.toThrow(
      "Root layout requires a valid CSP nonce."
    );
  });

  it("does not retain failed request state across a retry", async () => {
    const failure = new Error("Request headers unavailable");
    headers.mockRejectedValueOnce(failure).mockResolvedValueOnce(createHeaders(SECOND_NONCE));

    await expect(RootLayout({ children: null })).rejects.toBe(failure);
    const recoveredLayout = await RootLayout({ children: null });

    expect(getScriptNonce(recoveredLayout)).toBe(SECOND_NONCE);
    expect(headers).toHaveBeenCalledTimes(2);
  });
});
