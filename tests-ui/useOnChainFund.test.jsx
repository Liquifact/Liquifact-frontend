import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/stellar/freighter", () => ({
  connectFreighter: vi.fn(),
  signWithFreighter: vi.fn(),
  SignatureCancelled: class SignatureCancelled extends Error {
    constructor() {
      super("Signature cancelled");
      this.name = "SignatureCancelled";
    }
  },
}));
vi.mock("@/lib/stellar/fund", () => ({ submitFund: vi.fn() }));
vi.mock("@/lib/stellar/networkGuard", () => ({
  assertWalletNetwork: vi.fn(),
  NetworkMismatchError: class NetworkMismatchError extends Error {},
}));

import { connectFreighter } from "@/lib/stellar/freighter";
import { submitFund } from "@/lib/stellar/fund";
import { assertWalletNetwork } from "@/lib/stellar/networkGuard";
import { SignatureCancelled } from "@/lib/stellar/freighter";
import { useOnChainFund } from "@/lib/hooks/useOnChainFund";

const address = "GA7TXEBMEPQCLHIYCWDN7RKAO5IMRD2UV7O7TZXMEW6VZUMEXNR4XBB5";
const hash = "a".repeat(64);
const invoice = { amount: 10, fundedAmount: 2 };

beforeEach(() => {
  vi.clearAllMocks();
  assertWalletNetwork.mockResolvedValue(undefined);
  connectFreighter.mockResolvedValue(address);
  submitFund.mockResolvedValue({ status: "SUCCESS", hash });
});

describe("useOnChainFund", () => {
  it("connects a wallet successfully", async () => {
    const { result } = renderHook(() => useOnChainFund());

    await act(async () => result.current.connect());

    expect(result.current.address).toBe(address);
    expect(result.current.state.message).toBe("Wallet connected.");
    expect(result.current.state.kind).toBe("neutral");
  });

  it("reports a wallet connection failure", async () => {
    connectFreighter.mockRejectedValue(new Error("Wallet unavailable"));
    const { result } = renderHook(() => useOnChainFund());

    await act(async () => result.current.connect());

    expect(result.current.address).toBe("");
    expect(result.current.state.message).toBe("Wallet unavailable");
    expect(result.current.state.kind).toBe("err");
  });

  it("does not submit when no wallet is connected", async () => {
    const { result } = renderHook(() => useOnChainFund());

    await act(async () => result.current.fund(invoice, "1", vi.fn()));

    expect(result.current.state.message).toBe("Connect Freighter before funding.");
    expect(submitFund).not.toHaveBeenCalled();
  });

  it("rejects an amount greater than the invoice's remaining capacity", async () => {
    const { result } = renderHook(() => useOnChainFund());
    await act(async () => result.current.connect());

    await act(async () => result.current.fund(invoice, "9", vi.fn()));

    expect(result.current.state.message).toBe("Amount exceeds this invoice's remaining capacity.");
    expect(submitFund).not.toHaveBeenCalled();
  });

  it("shows a refresh warning after successful funding if refresh fails", async () => {
    const refresh = vi.fn().mockRejectedValue(new Error("Refresh failed"));
    const { result } = renderHook(() => useOnChainFund());
    await act(async () => result.current.connect());

    await act(async () => result.current.fund(invoice, "1", refresh));

    expect(result.current.state.phase).toBe("Confirmed");
    expect(result.current.state.message).toBe("Funding confirmed. Invoice refresh failed; reload to update its balance.");
    expect(result.current.state.hash).toBe(hash);
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("blocks another contribution after a timeout", async () => {
    submitFund.mockResolvedValue({ status: "TIMEOUT", hash });
    const { result } = renderHook(() => useOnChainFund());
    await act(async () => result.current.connect());

    await act(async () => result.current.fund(invoice, "1", vi.fn()));
    await act(async () => result.current.fund(invoice, "1", vi.fn()));

    expect(result.current.pending).toBe(true);
    expect(result.current.state.phase).toBe("Pending confirmation");
    expect(submitFund).toHaveBeenCalledOnce();
  });

  it("reports an on-chain failure", async () => {
    submitFund.mockResolvedValue({ status: "FAILED", hash });
    const { result } = renderHook(() => useOnChainFund());
    await act(async () => result.current.connect());

    await act(async () => result.current.fund(invoice, "1", vi.fn()));

    expect(result.current.state.phase).toBe("Failed");
    expect(result.current.state.message).toBe("The transaction failed on-chain.");
    expect(result.current.state.kind).toBe("err");
  });

  it("treats a cancelled signature as a neutral outcome", async () => {
    submitFund.mockRejectedValue(new SignatureCancelled());
    const { result } = renderHook(() => useOnChainFund());
    await act(async () => result.current.connect());

    await act(async () => result.current.fund(invoice, "1", vi.fn()));

    expect(result.current.state.phase).toBe("");
    expect(result.current.state.message).toBe("Signature cancelled");
    expect(result.current.state.kind).toBe("neutral");
  });

  it("ignores concurrent funding calls while a submission is locked", async () => {
    let finish;
    submitFund.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    const { result } = renderHook(() => useOnChainFund());
    await act(async () => result.current.connect());

    let firstCall;
    await act(async () => {
      firstCall = result.current.fund(invoice, "1", vi.fn());
      await Promise.resolve();
      await result.current.fund(invoice, "1", vi.fn());
    });
    expect(submitFund).toHaveBeenCalledOnce();

    await act(async () => {
      finish({ status: "SUCCESS", hash });
      await firstCall;
    });
    expect(result.current.state.phase).toBe("Confirmed");
  });
});
