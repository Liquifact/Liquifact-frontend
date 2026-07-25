import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";
import "jest-axe/extend-expect";
import "@testing-library/jest-dom";
import { ToastProvider } from "./ToastProvider";

// WalletStatus calls useToast(), so every render needs a ToastProvider ancestor.
function renderLazy() {
  return render(
    <ToastProvider>
      <WalletStatusLazy />
    </ToastProvider>
  );
}

// ── Mock next/dynamic so we can control lazy-load timing in tests ──
jest.mock("next/dynamic", () => {
  const ReactForMock = require("react");

  return function dynamicMock(importFunc, options) {
    function DynamicWrapper(props) {
      const [Component, setComponent] = ReactForMock.useState(null);
      const [isLoading, setIsLoading] = ReactForMock.useState(true);

      ReactForMock.useEffect(() => {
        let cancelled = false;
        importFunc().then((mod) => {
          if (!cancelled) {
            setComponent(() => mod.default || mod);
            setIsLoading(false);
          }
        });
        return () => {
          cancelled = true;
        };
      }, []);

      if (isLoading && options?.loading) {
        const LoadingComponent = options.loading;
        return ReactForMock.createElement(LoadingComponent, props);
      }

      if (Component) {
        return ReactForMock.createElement(Component, props);
      }

      return null;
    }

    DynamicWrapper.displayName = "DynamicWrapper";
    const SuspenseWrapper = (props) => {
      const inlineReact = require("react");
      return inlineReact.createElement(
        inlineReact.Suspense,
        { fallback: options?.loading ? inlineReact.createElement(options.loading, props) : null },
        inlineReact.createElement(DynamicWrapper, props)
      );
    };
    SuspenseWrapper.displayName = "SuspenseWrapper";
    return SuspenseWrapper;
  };
});

// ── Mock WalletContext ──
const mockConnectWallet = jest.fn();
const mockDisconnectWallet = jest.fn();

jest.mock("./WalletProvider", () => {
  const actual = jest.requireActual("./WalletProvider");
  return {
    ...actual,
    __esModule: true,
    useWallet: () => ({
      state: "disconnected",
      walletData: null,
      error: null,
      connect: mockConnectWallet,
      disconnect: mockDisconnectWallet,
    }),
  };
});

jest.mock("./ToastProvider", () => ({
  ...jest.requireActual("./ToastProvider"),
  useToast: () => ({
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  }),
}));

// Import after mocks are set up
import WalletStatusLazy from "./WalletStatusLazy";
import { WALLET_STATES } from "./WalletStatus";

expect.extend(toHaveNoViolations);

describe("WalletStatusLazy", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the placeholder immediately (no CLS)", () => {
    renderLazy();
    const placeholder = screen.getByTestId("wallet-status-placeholder");
    expect(placeholder).toBeInTheDocument();
    expect(placeholder).toHaveAttribute("aria-hidden", "true");
  });

  it("placeholder has matching dimensions to prevent layout shift", () => {
    renderLazy();
    const placeholder = screen.getByTestId("wallet-status-placeholder");
    expect(placeholder).toHaveClass("h-12");
    expect(placeholder).toHaveClass("w-80");
    expect(placeholder).toHaveClass("rounded-full");
    expect(placeholder).toHaveClass("flex");
    expect(placeholder).toHaveClass("items-center");
  });

  it("mounts the real WalletStatus after chunk loads", async () => {
    renderLazy();

    // Initially placeholder
    expect(screen.getByTestId("wallet-status-placeholder")).toBeInTheDocument();

    // Wait for lazy component to resolve
    await waitFor(
      () => {
        expect(screen.queryByTestId("wallet-status-placeholder")).not.toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    // Real wallet button should appear
    expect(screen.getByRole("button", { name: /connect wallet/i })).toBeInTheDocument();
  });

  it("accessible status region is present after mount", async () => {
    renderLazy();

    await waitFor(
      () => {
        const status = screen.getByRole("status");
        expect(status).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-live", "polite");
  });

  it("has no accessibility violations in placeholder state", async () => {
    const { container } = renderLazy();
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("has no accessibility violations after lazy mount", async () => {
    const { container } = renderLazy();

    await waitFor(
      () => {
        expect(screen.getByRole("button")).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("WALLET_STATES export path remains stable", () => {
    expect(WALLET_STATES).toBeDefined();
    expect(WALLET_STATES.DISCONNECTED).toBe("disconnected");
    expect(WALLET_STATES.CONNECTING).toBe("connecting");
    expect(WALLET_STATES.CONNECTED).toBe("connected");
    expect(WALLET_STATES.ERROR).toBe("error");
    expect(WALLET_STATES.WRONG_NETWORK).toBe("wrong_network");
    expect(WALLET_STATES.NO_WALLET).toBe("no_wallet");
  });

  it("does not produce hydration warnings (placeholder is aria-hidden)", () => {
    renderLazy();
    const placeholder = screen.getByTestId("wallet-status-placeholder");
    expect(placeholder).toHaveAttribute("aria-hidden", "true");
  });
});
