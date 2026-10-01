import "jest";
import { render, screen } from "@testing-library/react";
import WalletStatus from "./WalletStatus";
import * as WalletStatusConstants from "./constants";

const WalletStatusModule = WalletStatus as unknown as {
  default?: (props: { status: string }) => JSX.Element;
};
const WalletStatusComponent = (WalletStatusModule.default ?? WalletStatus) as unknown as (props: {
  status: string;
}) => JSX.Element;

describe("WalletStatus external contract", () => {
  const requiredCopyKeys = [
    "connected",
    "connecting",
    "disconnected",
    "error",
    "unknown",
  ] as const;

  it("preserves the public copy contract for every wallet status", () => {
    const module = WalletStatusConstants as unknown as {
      WALLET_STATUS_COPY?: Record<string, string>;
      default?: Record<string, string>;
    };
    const copy = module.WALLET_STATUS_COPY || module.default || (module as unknown as Record<string, string>);

    expect(copy).toBeTruthy();
    for (const key of requiredCopyKeys) {
      expect(typeof copy[key]).toBe("string");
      expect(copy[key].length).toBeGreaterThan(0);
    }
  });

  it("renders the connected status without losing the contract label", () => {
    render(<WalletStatusComponent status="connected" />);
    expect(screen.getByText(/connected/i)).toBeInTheDocument();
  });

  it("renders the disconnected status without losing the contract label", () => {
    render(<WalletStatusComponent status="disconnected" />);
    expect(screen.getByText(/disconnected/i)).toBeInTheDocument();
  });

  it("renders the error status without losing the contract label", () => {
    render(<WalletStatusComponent status="error" />);
    expect(screen.getByText(/error/i)).toBeInTheDocument();
  });

  it("renders the unknown status without losing the contract label", () => {
    render(<WalletStatusComponent status="unknown" />);
    expect(screen.getByText(/unknown/i)).toBeInTheDocument();
  });

  it("fails closed on an unsupported status without throwing", () => {
    expect(() => render(<WalletStatusComponent status={"unsupported"} />)).toNotThrow();
  });
});
