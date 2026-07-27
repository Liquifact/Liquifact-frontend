import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import WalletStatus from "./WalletStatus";
import { WalletContext, WALLET_STATES } from "./WalletProvider";
import { ToastProvider } from "./ToastProvider";
import { copy } from "../app/copy/en";
import * as clipboardModule from "../lib/clipboard";

const FULL_ADDRESS = "GABCDEFGHIJKLMNOPQRSTUVWXYZ12345678901234567890123456";

function renderConnectedWallet(overrides: Record<string, unknown> = {}) {
  const contextValue = {
    state: WALLET_STATES.CONNECTED,
    walletData: {
      address: FULL_ADDRESS,
      network: "public",
      balance: "1,000 XLM",
    },
    error: null,
    connect: jest.fn(),
    disconnect: jest.fn(),
    ...overrides,
  };

  return render(
    <ToastProvider>
      <WalletContext.Provider value={contextValue}>
        <WalletStatus />
      </WalletContext.Provider>
    </ToastProvider>
  );
}

describe("WalletStatus copy address feature", () => {
  let originalClipboard: Clipboard | undefined;
  let originalExecCommand: (commandId: string, showUI?: boolean, value?: string) => boolean;

  beforeEach(() => {
    originalClipboard = navigator.clipboard;
    originalExecCommand = document.execCommand;
  });

  afterEach(() => {
    Object.defineProperty(navigator, "clipboard", {
      value: originalClipboard,
      configurable: true,
      writable: true,
    });
    document.execCommand = originalExecCommand;
    jest.restoreAllMocks();
  });

  it("renders copy button with correct accessible label and truncated address display when connected", () => {
    renderConnectedWallet();

    const copyButton = screen.getByRole("button", { name: copy.wallet.copyAddressButton });
    expect(copyButton).toBeInTheDocument();
    expect(copyButton).toHaveAttribute("title", copy.wallet.copyAddressButton);
    expect(copyButton).toHaveClass("focus-visible:outline-2", "focus-visible:outline-cyan-400");

    // Displayed address should be truncated (starts with GABC... and ends with 123456)
    expect(screen.getByText("GABC...123456")).toBeInTheDocument();
  });

  it("1. Successful copy flow: copies full address via Clipboard API and triggers success toast", async () => {
    const user = userEvent.setup();
    const writeTextMock = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: writeTextMock },
      configurable: true,
      writable: true,
    });

    renderConnectedWallet();

    const copyButton = screen.getByRole("button", { name: copy.wallet.copyAddressButton });
    await user.click(copyButton);

    expect(writeTextMock).toHaveBeenCalledTimes(1);
    expect(writeTextMock).toHaveBeenCalledWith(FULL_ADDRESS);

    // Toast notification should render success message
    await waitFor(() => {
      expect(screen.getByText(copy.wallet.toastCopySuccessMsg)).toBeInTheDocument();
      expect(screen.getByText(copy.wallet.toastCopySuccessTitle)).toBeInTheDocument();
    });
  });

  it("2a. Fallback copy flow: executes fallback when navigator.clipboard is unavailable", async () => {
    const user = userEvent.setup();
    Object.defineProperty(navigator, "clipboard", {
      value: undefined,
      configurable: true,
      writable: true,
    });
    const execCommandSpy = jest.fn().mockReturnValue(true);
    document.execCommand = execCommandSpy;

    renderConnectedWallet();

    const copyButton = screen.getByRole("button", { name: copy.wallet.copyAddressButton });
    await user.click(copyButton);

    expect(execCommandSpy).toHaveBeenCalledWith("copy");
    await waitFor(() => {
      expect(screen.getByText(copy.wallet.toastCopySuccessMsg)).toBeInTheDocument();
    });
  });

  it("2b. Fallback copy flow: executes fallback when navigator.clipboard.writeText fails", async () => {
    const user = userEvent.setup();
    const writeTextMock = jest.fn().mockRejectedValue(new Error("Permission denied"));
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: writeTextMock },
      configurable: true,
      writable: true,
    });
    const execCommandSpy = jest.fn().mockReturnValue(true);
    document.execCommand = execCommandSpy;

    renderConnectedWallet();

    const copyButton = screen.getByRole("button", { name: copy.wallet.copyAddressButton });
    await user.click(copyButton);

    expect(writeTextMock).toHaveBeenCalledWith(FULL_ADDRESS);
    expect(execCommandSpy).toHaveBeenCalledWith("copy");
    await waitFor(() => {
      expect(screen.getByText(copy.wallet.toastCopySuccessMsg)).toBeInTheDocument();
    });
  });

  it("2c. Failure handling: triggers error toast when both Clipboard API and fallback fail", async () => {
    const user = userEvent.setup();
    jest.spyOn(clipboardModule, "copyToClipboard").mockRejectedValue(new Error("Copy failed"));

    renderConnectedWallet();

    const copyButton = screen.getByRole("button", { name: copy.wallet.copyAddressButton });
    await user.click(copyButton);

    await waitFor(() => {
      expect(screen.getByText(copy.wallet.toastCopyErrorMsg)).toBeInTheDocument();
      expect(screen.getByText(copy.wallet.toastCopyErrorTitle)).toBeInTheDocument();
    });
  });

  it("3. Accessibility & keyboard navigation: allows keyboard focus and trigger via Enter / Space", async () => {
    const user = userEvent.setup();
    const writeTextMock = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: writeTextMock },
      configurable: true,
      writable: true,
    });

    renderConnectedWallet();

    const copyButton = screen.getByRole("button", { name: copy.wallet.copyAddressButton });
    copyButton.focus();
    expect(copyButton).toHaveFocus();

    await user.keyboard("{Enter}");
    expect(writeTextMock).toHaveBeenCalledWith(FULL_ADDRESS);

    await user.keyboard(" ");
    expect(writeTextMock).toHaveBeenCalledTimes(2);
  });
});
