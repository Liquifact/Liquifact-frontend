import React from "react";
import { render } from "@testing-library/react";
import { ToastProvider } from "../ToastProvider";
import { WalletContext, WALLET_STATES } from "../WalletProvider";
import WalletStatus from "../WalletStatus";
import { axe, toHaveNoViolations } from "jest-axe";

expect.extend(toHaveNoViolations);

describe("WalletStatus Accessibility", () => {
  const renderWalletStatus = (contextValue) => {
    return render(
      <ToastProvider>
        <WalletContext.Provider value={contextValue}>
          <WalletStatus />
        </WalletContext.Provider>
      </ToastProvider>
    );
  };

  test("empty (disconnected) state has no accessibility violations", async () => {
    const { container } = renderWalletStatus({
      state: WALLET_STATES.DISCONNECTED,
      walletData: null,
      error: null,
      connect: jest.fn(),
      disconnect: jest.fn(),
    });
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  test("loaded (connected) state has no accessibility violations", async () => {
    const { container } = renderWalletStatus({
      state: WALLET_STATES.CONNECTED,
      walletData: {
        address: "GABC1234567890XYZ",
        network: "public",
        balance: "1,234.56 XLM",
      },
      error: null,
      connect: jest.fn(),
      disconnect: jest.fn(),
    });
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  test("error state has no accessibility violations", async () => {
    const { container } = renderWalletStatus({
      state: WALLET_STATES.ERROR,
      walletData: null,
      error: "Connection failed",
      connect: jest.fn(),
      disconnect: jest.fn(),
    });
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
