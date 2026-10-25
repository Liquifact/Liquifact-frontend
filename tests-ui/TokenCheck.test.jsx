import { describe, it, expect, beforeEach } from "vitest";
import { cleanup, render, renderHook, screen, waitFor } from "@testing-library/react";
import TokenCheck, { useFundingTokenCheck } from "@/components/escrow/TokenCheck";

const XLM_SAC = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";
const okResolve = async () => XLM_SAC;
const failResolve = async () => {
  throw new Error("rpc down");
};

describe("TokenCheck", () => {
  beforeEach(() => cleanup());

  it("shows the verified line when the token matches", () => {
    render(<TokenCheck invoice={{ currency: "XLM" }} check={{ loading: false, ok: true, reason: "match", identified: { code: "XLM", issuer: "native" } }} />);
    expect(screen.getByText(/Pays in XLM \(native\) · verified on-chain/)).toBeInTheDocument();
  });

  it("blocks with a mismatch notice", () => {
    render(<TokenCheck invoice={{ currency: "USDC" }} check={{ loading: false, ok: false, reason: "mismatch", identified: { code: "XLM", issuer: "native" }, tokenId: XLM_SAC }} />);
    expect(screen.getByRole("alert")).toHaveTextContent(/accepts XLM, but the listing says USDC — funding disabled/);
  });

  it("fails closed when the token cannot be read", () => {
    render(<TokenCheck invoice={{ currency: "XLM" }} check={{ loading: false, ok: false, error: true }} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Couldn't verify token — funding disabled");
  });
});

describe("useFundingTokenCheck", () => {
  it("is ok when the escrow token matches the invoice currency", async () => {
    const { result } = renderHook(() => useFundingTokenCheck({ currency: "XLM", onChain: true }, { resolve: okResolve }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.ok).toBe(true);
  });

  it("is not ok on mismatch", async () => {
    const { result } = renderHook(() => useFundingTokenCheck({ currency: "USDC", onChain: true }, { resolve: okResolve }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.ok).toBe(false);
    expect(result.current.reason).toBe("mismatch");
  });

  it("fails closed on RPC errors", async () => {
    const { result } = renderHook(() => useFundingTokenCheck({ currency: "XLM", onChain: true }, { resolve: failResolve }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.ok).toBe(false);
    expect(result.current.error).toBe(true);
  });
});
