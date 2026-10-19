import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import TxReviewDialog from "@/components/wallet/TxReviewDialog";
import { IntentMismatchError } from "@/lib/stellar/assertMatchesIntent";

const CONTRACT = "CDQCKR2YU6IVQ4GYPBMXBPZ4FGFQB5H25AI7ZSETHS2CZ5ZRCWQDSO6P";
const BUYER = "GA7TXEBMEPQCLHIYCWDN7RKAO5IMRD2UV7O7TZXMEW6VZUMEXNR4XBB5";

const description = {
  fee: "0.00001",
  network: "testnet",
  operations: [
    {
      args: [BUYER, 20_000_000n],
      contractId: CONTRACT,
      fn: "fund",
      type: "invokeContract",
    },
  ],
  sequence: "2",
  source: BUYER,
  timeBounds: { maxTime: "0", minTime: "0" },
};

function renderDialog(overrides = {}) {
  const props = {
    asset: "XLM",
    description,
    error: null,
    onCancel: vi.fn(),
    onConfirm: vi.fn(),
    ...overrides,
  };
  render(<TxReviewDialog {...props} />);
  return props;
}

afterEach(cleanup);

describe("TxReviewDialog", () => {
  it("renders the decoded transaction rows", () => {
    renderDialog();

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("testnet")).toBeInTheDocument();
    expect(screen.getByText("fund")).toBeInTheDocument();
    expect(screen.getByText("2 XLM")).toBeInTheDocument();
    expect(screen.getByText("0.00001 XLM")).toBeInTheDocument();
    expect(screen.getByText("No expiry")).toBeInTheDocument();
  });

  it("focuses Cancel first and keeps Tab inside the dialog", () => {
    renderDialog();

    const cancel = screen.getByRole("button", { name: "Cancel" });
    const sign = screen.getByRole("button", { name: "Sign in Freighter" });
    const dialog = screen.getByRole("dialog");

    expect(cancel).toHaveFocus();

    sign.focus();
    fireEvent.keyDown(dialog, { key: "Tab" });
    expect(dialog.contains(document.activeElement)).toBe(true);
    expect(document.activeElement).not.toBe(sign);
  });

  it("resolves false on Escape", () => {
    const props = renderDialog();

    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(props.onCancel).toHaveBeenCalledTimes(1);
    expect(props.onConfirm).not.toHaveBeenCalled();
  });

  it("blocks signing and lists differences on an intent mismatch", () => {
    const error = new IntentMismatchError([
      "contractId: expected CAAA, got CBBB",
      "arg 1: expected 20000001n, got 20000000n",
    ]);
    renderDialog({ error });

    expect(screen.getByRole("alert")).toHaveTextContent(
      "This transaction does not match your intent.",
    );
    expect(screen.getByText(/contractId: expected/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign in Freighter" })).toBeDisabled();
  });

  it("confirms signing only when the transaction matches", () => {
    const props = renderDialog();

    fireEvent.click(screen.getByRole("button", { name: "Sign in Freighter" }));
    expect(props.onConfirm).toHaveBeenCalledTimes(1);
    expect(props.onCancel).not.toHaveBeenCalled();
  });
});
