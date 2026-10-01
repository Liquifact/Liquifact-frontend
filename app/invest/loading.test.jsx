import "@testing-library/jest-dom";
import { act, fireEvent, render, screen } from "@testing-library/react";
import InvestLoading, { LOADING_RECOVERY_DELAY_MS } from "./loading";

const mockRefresh = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

describe("InvestLoading", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockRefresh.mockClear();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it("shows a retryable error after the fixed loading timeout", () => {
    const { container } = render(<InvestLoading />);

    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
    expect(screen.getByLabelText("Loading investable invoices")).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(LOADING_RECOVERY_DELAY_MS - 1);
    });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(1);
    });

    expect(container.querySelector('[aria-busy="false"]')).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("taking longer than expected");
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it("clears the recovery timer when the loading fallback unmounts", () => {
    const { unmount } = render(<InvestLoading />);
    unmount();

    act(() => {
      jest.advanceTimersByTime(LOADING_RECOVERY_DELAY_MS);
    });

    expect(mockRefresh).not.toHaveBeenCalled();
  });
});
