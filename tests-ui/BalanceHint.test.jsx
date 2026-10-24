import { describe, it, expect, vi, beforeEach } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import BalanceHint from "@/components/wallet/BalanceHint";

const ADDR = `G${"B".repeat(55)}`;
const funded = {
  balances: [
    { code: "XLM", issuer: null, balance: "10000.0000000", limit: null },
    { code: "USDC", issuer: "GISSUER", balance: "25", limit: "1000" },
  ],
  subentryCount: 1,
  numSponsoring: 0,
  numSponsored: 0,
};

describe("BalanceHint", () => {
  beforeEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders nothing without a wallet address", () => {
    const { container } = render(<BalanceHint currency="XLM" address={null} amount="" />);
    expect(container.firstChild).toBeNull();
  });

  it("shows balance and spendable for a funded account", async () => {
    const load = vi.fn(async () => funded);
    render(<BalanceHint currency="XLM" address={ADDR} amount="" loadBalancesFn={load} />);
    await waitFor(() => expect(screen.getByText(/spendable 9997.5/)).toBeTruthy());
    expect(screen.getByText(/Balance: 10000.0000000 XLM/)).toBeTruthy();
  });

  it("Use max fills the spendable amount", async () => {
    const user = userEvent.setup();
    const onUseMax = vi.fn();
    render(<BalanceHint currency="XLM" address={ADDR} amount="" loadBalancesFn={async () => funded} onUseMax={onUseMax} />);
    await waitFor(() => screen.getByRole("button", { name: "Use max" }));
    await user.click(screen.getByRole("button", { name: "Use max" }));
    expect(onUseMax).toHaveBeenCalledWith("9997.5");
  });

  it("reports invalid when amount exceeds spendable", async () => {
    const onValidation = vi.fn();
    render(<BalanceHint currency="XLM" address={ADDR} amount="50000" loadBalancesFn={async () => funded} onValidation={onValidation} />);
    await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
    expect(onValidation).toHaveBeenLastCalledWith(expect.objectContaining({ ok: false }));
  });

  it("shows the unfunded state with a Friendbot link", async () => {
    render(<BalanceHint currency="XLM" address={ADDR} amount="" loadBalancesFn={async () => ({ unfunded: true, balances: [], subentryCount: 0, numSponsored: 0, numSponsoring: 0 })} />);
    await waitFor(() => expect(screen.getByText(/isn’t funded/)).toBeTruthy());
    expect(screen.getByRole("link", { name: "Friendbot" })).toBeTruthy();
  });

  it("offers Add trustline for a missing token trustline and reloads on success", async () => {
    const user = userEvent.setup();
    const noUsdc = { ...funded, balances: funded.balances.filter((b) => b.code === "XLM") };
    const load = vi.fn().mockResolvedValueOnce(noUsdc).mockResolvedValueOnce(funded);
    const addT = vi.fn(async () => ({}));
    render(<BalanceHint currency="USDC" address={ADDR} amount="" loadBalancesFn={load} addTrustlineFn={addT} />);
    await waitFor(() => expect(screen.getByText(/No USDC trustline/)).toBeTruthy());
    await user.click(screen.getByRole("button", { name: /Add USDC trustline/ }));
    expect(addT).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.getByText(/Balance: 25 USDC/)).toBeTruthy());
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("shows an error state with Retry on load failure", async () => {
    const user = userEvent.setup();
    const load = vi.fn().mockRejectedValueOnce(new Error("horizon down")).mockResolvedValueOnce(funded);
    render(<BalanceHint currency="XLM" address={ADDR} amount="" loadBalancesFn={load} />);
    await waitFor(() => expect(screen.getByText(/Couldn’t check your balance/)).toBeTruthy());
    await user.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() => expect(screen.getByText(/spendable/)).toBeTruthy());
  });

  it("reloads when the wallet address changes", async () => {
    const load = vi.fn(async () => funded);
    const { rerender } = render(<BalanceHint currency="XLM" address={ADDR} amount="" loadBalancesFn={load} />);
    await waitFor(() => expect(load).toHaveBeenCalledTimes(1));
    rerender(<BalanceHint currency="XLM" address={`G${"C".repeat(55)}`} amount="" loadBalancesFn={load} />);
    await waitFor(() => expect(load).toHaveBeenCalledTimes(2));
  });
});
