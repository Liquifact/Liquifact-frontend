import { beforeEach, describe, expect, test, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Account, TransactionBuilder, scValToNative } from "@stellar/stellar-sdk";
import OnChainFundForm from "@/components/invest/OnChainFundForm";

const DAY = 86400;
const INVESTOR = "GDNEQD7V2PJI46ZZGXK44Y23NDOQB3F2Q2D7XHHWA7BAU7M7P5AHGTZQ";
const PASSPHRASE = "Test SDF Network ; September 2015";

const INV = { id: "INV_TIER_TEST", currency: "XLM", amount: 100, fundedAmount: 0 };
const ESCROW = { maturitySec: 1810000000, baseYieldBps: 800 };
const NOW = 1792430000;
const TIERS = [
  { minLockSecs: 30 * DAY, yieldBps: 950 },
  { minLockSecs: 90 * DAY, yieldBps: 1100 },
];

// Captures the XDR handed to the signing step so tests can decode it.
let signedXdrs;

vi.mock("@/lib/stellar/freighter", () => ({
  isFreighterAvailable: () => true,
  connectFreighter: async () => INVESTOR,
  signTransactionXdr: async (xdr) => {
    signedXdrs.push(xdr);
    return xdr; // "signed" = same XDR; tests only assert what was built
  },
}));

vi.mock("@/lib/stellar/rpc", () => ({
  getServer: () => ({
    getAccount: async (address) => new Account(address, "42"),
    prepareTransaction: async (tx) => tx,
    sendTransaction: async () => ({ hash: "deadbeefcafe", status: "PENDING" }),
    getTransaction: async () => ({ status: "SUCCESS" }),
  }),
}));

vi.mock("@/lib/stellar/simulate", () => ({
  getContribution: vi.fn(async () => BigInt(globalThis.__CONTRIB__ ?? 0)),
  getInvestorYieldBps: vi.fn(async () => 950),
  previewYieldTier: vi.fn(async () => ({ effectiveYieldBps: 950, matchedLockSecs: 2592000 })),
  getYieldTiers: vi.fn(async () => []),
  getEscrowInfo: vi.fn(async () => null),
  simulateContractCall: vi.fn(async () => null),
  normalizeTiers: vi.fn(() => []),
}));

function decodeInvocation(xdr) {
  const tx = TransactionBuilder.fromXDR(xdr, PASSPHRASE);
  const ic = tx.operations[0].func.invokeContract;
  return { fn: String(ic.functionName), args: ic.args.map((a) => scValToNative(a)) };
}

beforeEach(() => {
  signedXdrs = [];
  globalThis.__CONTRIB__ = 0;
});

describe("OnChainFundForm — first-time investor", () => {
  test("selector + quote + fund_with_commitment with the selected lock (XDR decoded)", async () => {
    const user = userEvent.setup();
    render(<OnChainFundForm inv={INV} tiers={TIERS} escrow={ESCROW} nowSec={NOW} />);

    // selector is hidden until the wallet is connected (contribution unknown)
    expect(screen.queryByRole("radiogroup")).toBeNull();

    await user.click(await screen.findByRole("button", { name: /connect stellar wallet/i }));
    await screen.findByRole("radiogroup");

    await user.click(screen.getByLabelText(/lock 30 days/i));
    const input = screen.getByLabelText(/^amount/i);
    await waitFor(() => expect(input.disabled).toBe(false));
    await user.type(input, "1");

    // the fund button unlocks only once the contract quote arrives
    const submit = screen.getByRole("button", { name: /fund with lock/i });
    await waitFor(() => expect(submit.disabled).toBe(false), { timeout: 3000 });
    await user.click(submit);

    await waitFor(() => expect(signedXdrs).toHaveLength(1), { timeout: 5000 });
    const { fn, args } = decodeInvocation(signedXdrs[0]);
    expect(fn).toBe("fund_with_commitment");
    expect(args).toHaveLength(3);
    expect(args[0]).toBe(INVESTOR); // investor: Address
    expect(args[1]).toBe(100000000n); // amount: 1 XLM in i128 stroops
    expect(args[2]).toBe(2592000n); // committed_lock_secs: u64 = 30 days
  });

  test("no lock selected → fund, not fund_with_commitment (XDR decoded)", async () => {
    const user = userEvent.setup();
    render(<OnChainFundForm inv={INV} tiers={TIERS} escrow={ESCROW} nowSec={NOW} />);
    await user.click(await screen.findByRole("button", { name: /connect stellar wallet/i }));
    await screen.findByRole("radiogroup");

    // default selection is the base option; make it explicit
    await user.click(screen.getByLabelText(/no lock/i));
    const input = screen.getByLabelText(/^amount/i);
    await waitFor(() => expect(input.disabled).toBe(false));
    await user.type(input, "2");

    const submit = screen.getByRole("button", { name: /fund invoice/i });
    await waitFor(() => expect(submit.disabled).toBe(false), { timeout: 3000 });
    await user.click(submit);

    await waitFor(() => expect(signedXdrs).toHaveLength(1), { timeout: 5000 });
    const { fn, args } = decodeInvocation(signedXdrs[0]);
    expect(fn).toBe("fund");
    expect(args).toHaveLength(2);
    expect(args[1]).toBe(200000000n); // 2 XLM
  });

  test("confirmation shows the contract quote yield, not a client computation", async () => {
    const user = userEvent.setup();
    render(<OnChainFundForm inv={INV} tiers={TIERS} escrow={ESCROW} nowSec={NOW} />);
    await user.click(await screen.findByRole("button", { name: /connect stellar wallet/i }));
    await screen.findByRole("radiogroup");
    await user.click(screen.getByLabelText(/lock 30 days/i));
    const input = screen.getByLabelText(/^amount/i);
    await waitFor(() => expect(input.disabled).toBe(false));
    await user.type(input, "1");
    const submit = screen.getByRole("button", { name: /fund with lock/i });
    await waitFor(() => expect(submit.disabled).toBe(false), { timeout: 3000 });
    await user.click(submit);

    const notice = await screen.findByText(/confirmed on-chain/i, {}, { timeout: 5000 });
    expect(notice.textContent).toContain("Contract quote: 9.50%");
  });
});

describe("OnChainFundForm — returning investor", () => {
  test("selector hidden; fixed-yield text shown; plain fund only", async () => {
    globalThis.__CONTRIB__ = 100000000;
    const user = userEvent.setup();
    render(<OnChainFundForm inv={INV} tiers={TIERS} escrow={ESCROW} nowSec={NOW} />);

    await user.click(await screen.findByRole("button", { name: /connect stellar wallet/i }));

    // fixed-yield text replaces the selector for returning investors
    const fixedText = await screen.findByText(/your yield is fixed at/i);
    expect(fixedText.textContent).toContain("9.50%");
    expect(screen.queryByRole("radiogroup")).toBeNull();

    const input = screen.getByLabelText(/^amount/i);
    await waitFor(() => expect(input.disabled).toBe(false));
    await user.type(input, "1");
    await user.click(screen.getByRole("button", { name: /fund invoice/i }));

    await waitFor(() => expect(signedXdrs).toHaveLength(1), { timeout: 5000 });
    const { fn, args } = decodeInvocation(signedXdrs[0]);
    expect(fn).toBe("fund"); // never fund_with_commitment for returning investors
    expect(args).toHaveLength(2);
  });
});
