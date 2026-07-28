/**
 * @file FundActions.announce.test.tsx
 *
 * Tests for issue #727 – invoice-detail async action results (copy link,
 * funding submission) are announced to screen readers via a polite live
 * region, debounced so rapid-fire results settle into a single
 * announcement.
 */

import React from "react";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { axe, toHaveNoViolations } from "jest-axe";

expect.extend(toHaveNoViolations);

const ANNOUNCE_DEBOUNCE_MS = 250;

const mockToast = {
  success: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
};

jest.mock("@/components/ToastProvider", () => ({
  ToastProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useToast: () => mockToast,
}));

jest.mock("@/components/WalletContext", () => ({
  WALLET_STATES: {
    DISCONNECTED: "disconnected",
    CONNECTING: "connecting",
    CONNECTED: "connected",
    NO_WALLET: "no_wallet",
    WRONG_NETWORK: "wrong_network",
  },
  useWallet: jest.fn(() => ({ state: "connected", connect: jest.fn() })),
}));

jest.mock("@/app/invest/MarketplaceContext", () => ({
  useMarketplace: () => ({
    invoices: [],
    setInvoices: jest.fn(),
    pendingIds: new Set(),
    fundInvoice: jest.fn().mockResolvedValue(true),
  }),
}));

import FundActions from "./FundActions";
import { useWallet, WALLET_STATES } from "@/components/WalletContext";
import { copy } from "@/app/copy/en";

const mockUseWallet = useWallet as jest.MockedFunction<typeof useWallet>;

const defaultProps = { id: "inv-001", status: "Open" };

function getAnnounceRegion() {
  return screen.getByTestId("invoice-detail-announce");
}

// The FundAmountInput submit button shares its accessible name ("Fund this
// invoice") with the top-level Fund button, so it is located via its <form>
// ancestor rather than screen.getByRole.
function getAmountFormSubmitButton(container: HTMLElement) {
  const form = container.querySelector("form");
  if (!form) throw new Error("Expected FundAmountInput form to be rendered");
  const button = form.querySelector('button[type="submit"]');
  if (!button) throw new Error("Expected a submit button inside the amount form");
  return button as HTMLButtonElement;
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  mockUseWallet.mockReturnValue({ state: "connected", connect: jest.fn() } as ReturnType<
    typeof useWallet
  >);
});

afterEach(() => {
  act(() => {
    jest.runOnlyPendingTimers();
  });
  jest.useRealTimers();
});

describe("FundActions – invoice-detail async action announcements (issue #727)", () => {
  describe("live region presence", () => {
    it("renders exactly one polite status region", () => {
      render(<FundActions {...defaultProps} />);
      const regions = screen.getAllByRole("status");
      expect(regions).toHaveLength(1);
      expect(regions[0]).toHaveAttribute("aria-live", "polite");
      expect(regions[0]).toHaveAttribute("aria-atomic", "true");
    });

    it("is visually hidden (sr-only) so there is no visual change", () => {
      render(<FundActions {...defaultProps} />);
      expect(getAnnounceRegion()).toHaveClass("sr-only");
    });

    it("is empty on initial render", () => {
      render(<FundActions {...defaultProps} />);
      expect(getAnnounceRegion()).toHaveTextContent("");
    });
  });

  describe("success announcement", () => {
    it("announces the copy-link success message after the debounce window", async () => {
      const writeText = jest.fn().mockResolvedValue(undefined);
      Object.assign(navigator, { clipboard: { writeText } });

      render(<FundActions {...defaultProps} />);

      await act(async () => {
        fireEvent.click(
          screen.getByRole("button", { name: copy.invest.detail.copyLinkButtonLabel })
        );
      });

      // Not yet announced — still inside the debounce window.
      expect(getAnnounceRegion()).toHaveTextContent("");

      act(() => {
        jest.advanceTimersByTime(ANNOUNCE_DEBOUNCE_MS);
      });

      await waitFor(() => {
        expect(getAnnounceRegion()).toHaveTextContent(copy.invest.detail.copySuccessMsg);
      });
    });
  });

  describe("failure announcement", () => {
    it("announces the copy-link error message when the clipboard write fails", async () => {
      const writeText = jest.fn().mockRejectedValue(new Error("Permission denied"));
      Object.assign(navigator, { clipboard: { writeText } });

      render(<FundActions {...defaultProps} />);

      await act(async () => {
        fireEvent.click(
          screen.getByRole("button", { name: copy.invest.detail.copyLinkButtonLabel })
        );
      });

      act(() => {
        jest.advanceTimersByTime(ANNOUNCE_DEBOUNCE_MS);
      });

      await waitFor(() => {
        expect(getAnnounceRegion()).toHaveTextContent(copy.invest.detail.copyErrorMsg);
      });
    });
  });

  describe("debouncing rapid results", () => {
    it("coalesces a burst of results into a single final announcement", async () => {
      const writeText = jest
        .fn()
        .mockRejectedValueOnce(new Error("first failure"))
        .mockResolvedValueOnce(undefined);
      Object.assign(navigator, { clipboard: { writeText } });

      render(<FundActions {...defaultProps} />);

      const copyButton = screen.getByRole("button", {
        name: copy.invest.detail.copyLinkButtonLabel,
      });

      // First click resolves to a failure result.
      await act(async () => {
        fireEvent.click(copyButton);
      });

      // Advance partway through the debounce window, then fire a second,
      // successful click before the first announcement lands.
      act(() => {
        jest.advanceTimersByTime(ANNOUNCE_DEBOUNCE_MS - 50);
      });

      await act(async () => {
        fireEvent.click(copyButton);
      });

      // Let the (restarted) debounce window elapse.
      act(() => {
        jest.advanceTimersByTime(ANNOUNCE_DEBOUNCE_MS);
      });

      // Only the latest (success) result is announced — the stale failure
      // never reaches the live region.
      await waitFor(() => {
        expect(getAnnounceRegion()).toHaveTextContent(copy.invest.detail.copySuccessMsg);
      });
      expect(getAnnounceRegion()).not.toHaveTextContent(copy.invest.detail.copyErrorMsg);
      // Only one announcement was ever committed to the live region.
      expect(writeText).toHaveBeenCalledTimes(2);
    });

    it("does not announce before the debounce window elapses", async () => {
      const writeText = jest.fn().mockResolvedValue(undefined);
      Object.assign(navigator, { clipboard: { writeText } });

      render(<FundActions {...defaultProps} />);

      await act(async () => {
        fireEvent.click(
          screen.getByRole("button", { name: copy.invest.detail.copyLinkButtonLabel })
        );
      });

      act(() => {
        jest.advanceTimersByTime(ANNOUNCE_DEBOUNCE_MS - 1);
      });
      expect(getAnnounceRegion()).toHaveTextContent("");

      act(() => {
        jest.advanceTimersByTime(1);
      });
      await waitFor(() => {
        expect(getAnnounceRegion()).toHaveTextContent(copy.invest.detail.copySuccessMsg);
      });
    });
  });

  describe("funding submission announcement", () => {
    it("announces the funding-submitted message when connected", async () => {
      const { container } = render(
        <FundActions id="inv-001" status="Open" maxAmount={1000} currency="USD" />
      );

      const amountInput = screen.getByLabelText(/funding amount/i);
      fireEvent.change(amountInput, { target: { value: "100" } });
      fireEvent.blur(amountInput);
      await act(async () => {
        fireEvent.click(getAmountFormSubmitButton(container));
      });

      act(() => {
        jest.advanceTimersByTime(ANNOUNCE_DEBOUNCE_MS);
      });

      expect(getAnnounceRegion()).toHaveTextContent(/Funding request for 100 USD submitted/i);
    });

    it("does not announce when the wallet is disconnected (connect() is prompted instead)", async () => {
      const connect = jest.fn();
      mockUseWallet.mockReturnValue({
        state: WALLET_STATES.DISCONNECTED,
        connect,
      } as ReturnType<typeof useWallet>);

      const { container } = render(
        <FundActions id="inv-001" status="Open" maxAmount={1000} currency="USD" />
      );

      const amountInput = screen.getByLabelText(/funding amount/i);
      fireEvent.change(amountInput, { target: { value: "100" } });
      fireEvent.blur(amountInput);
      await act(async () => {
        fireEvent.click(getAmountFormSubmitButton(container));
      });

      act(() => {
        jest.advanceTimersByTime(ANNOUNCE_DEBOUNCE_MS);
      });

      expect(connect).toHaveBeenCalledTimes(1);
      expect(getAnnounceRegion()).toHaveTextContent("");
    });
  });

  describe("cleanup", () => {
    it("clears the pending debounce timer on unmount without throwing", async () => {
      const writeText = jest.fn().mockResolvedValue(undefined);
      Object.assign(navigator, { clipboard: { writeText } });

      const { unmount } = render(<FundActions {...defaultProps} />);

      await act(async () => {
        fireEvent.click(
          screen.getByRole("button", { name: copy.invest.detail.copyLinkButtonLabel })
        );
      });

      expect(() => unmount()).not.toThrow();

      // No pending timer callback should attempt to set state on the
      // unmounted component.
      expect(() => {
        act(() => {
          jest.advanceTimersByTime(ANNOUNCE_DEBOUNCE_MS + 100);
        });
      }).not.toThrow();
    });
  });

  describe("accessibility", () => {
    it("passes axe accessibility checks with the live region present", async () => {
      jest.useRealTimers();
      const { container } = render(<FundActions {...defaultProps} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
      jest.useFakeTimers();
    });
  });
});
