import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";

import ThemeToggle from "./ThemeToggle";
import { THEME_CONTROL_FRAME_CLASS } from "./ThemeSkeleton";
import { useHydrated } from "../lib/hooks/useHydrated";
import { useLocalStorage } from "../lib/hooks/useLocalStorage";

jest.mock("../lib/hooks/useHydrated", () => ({
  useHydrated: jest.fn(),
}));

jest.mock("../lib/hooks/useLocalStorage", () => ({
  useLocalStorage: jest.fn(),
}));

jest.mock("./ToastProvider", () => ({
  useToast: () => ({
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  }),
}));

jest.mock("./CopyButton", () => ({
  __esModule: true,
  default: function MockCopyButton() {
    return <button type="button">Copy theme identifier</button>;
  },
}));

jest.mock("./ThemeOptionsModal", () => ({
  __esModule: true,
  default: function MockThemeOptionsModal() {
    return null;
  },
}));

const mockUseHydrated = useHydrated;
const mockUseLocalStorage = useLocalStorage;

describe("ThemeToggle skeleton loading state", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    window.localStorage.clear();

    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: jest.fn(() => ({
        matches: false,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      })),
    });

    mockUseHydrated.mockReturnValue(false);
    mockUseLocalStorage.mockReturnValue(["auto", jest.fn()]);
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it("shows a compact skeleton and loading announcement before hydration", () => {
    render(<ThemeToggle />);

    const skeleton = screen.getByTestId("theme-skeleton");

    expect(skeleton).toHaveAttribute("data-variant", "control");
    expect(skeleton).toHaveAttribute("role", "status");
    expect(skeleton).toHaveAttribute("aria-live", "polite");
    expect(skeleton).toHaveAttribute("aria-busy", "true");
    expect(
      screen.getByText(/theme controls loading, please wait/i)
    ).toBeInTheDocument();
  });

  it("does not expose interactive theme controls while loading", () => {
    render(<ThemeToggle />);

    expect(
      screen.queryByRole("button", { name: /theme:/i })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /theme options/i })
    ).not.toBeInTheDocument();
  });

  it("swaps the skeleton for the loaded controls after hydration", () => {
    const { rerender } = render(<ThemeToggle />);

    expect(screen.getByTestId("theme-skeleton")).toBeInTheDocument();

    mockUseHydrated.mockReturnValue(true);
    rerender(<ThemeToggle />);

    expect(screen.queryByTestId("theme-skeleton")).not.toBeInTheDocument();
    expect(screen.getByTestId("theme-toggle-content")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /theme:/i })
    ).toBeInTheDocument();
  });

  it("reserves the same frame before and after loading to prevent layout shift", () => {
    const frameClasses = THEME_CONTROL_FRAME_CLASS.split(" ");
    const { rerender } = render(<ThemeToggle />);

    const skeleton = screen.getByTestId("theme-skeleton");
    frameClasses.forEach((className) => {
      expect(skeleton).toHaveClass(className);
    });

    mockUseHydrated.mockReturnValue(true);
    rerender(<ThemeToggle />);

    const content = screen.getByTestId("theme-toggle-content");
    frameClasses.forEach((className) => {
      expect(content).toHaveClass(className);
    });
  });
});
