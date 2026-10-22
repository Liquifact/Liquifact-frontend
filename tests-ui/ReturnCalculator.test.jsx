import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ReturnCalculator from "@/components/invest/ReturnCalculator";

const NOW = Date.parse("2026-10-19T00:00:00Z");
const DUE = "2027-01-01T00:00:00Z";

function renderCalculator(overrides = {}) {
  const props = {
    amount: "2",
    dueDate: DUE,
    currency: "XLM",
    nowMs: NOW,
    onAmountChange: vi.fn(),
    remaining: 100,
    yieldBps: 800,
    ...overrides,
  };
  const view = render(<ReturnCalculator {...props} />);
  return { props, view };
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("ReturnCalculator", () => {
  it("shows the projected payout, profit, term and annualised rate", () => {
    vi.useFakeTimers();
    renderCalculator();

    act(() => {
      vi.advanceTimersByTime(400);
    });

    expect(screen.getByText("2.16 XLM")).toBeInTheDocument();
    expect(screen.getByText(/0.16 XLM/)).toBeInTheDocument();
    expect(screen.getByText(/74-day term/)).toBeInTheDocument();
    expect(screen.getByText(/39.46% annualised/)).toBeInTheDocument();
    expect(screen.getByText(/Flat coupon for the invoice term/)).toBeInTheDocument();
  });

  it("updates after the amount changes and the 400ms idle window", () => {
    vi.useFakeTimers();
    const { view } = renderCalculator();

    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(screen.getByText("2.16 XLM")).toBeInTheDocument();

    view.rerender(
      <ReturnCalculator
        amount="3"
        dueDate={DUE}
        currency="XLM"
        nowMs={NOW}
        onAmountChange={vi.fn()}
        remaining={100}
        yieldBps={800}
      />,
    );

    act(() => {
      vi.advanceTimersByTime(399);
    });
    expect(screen.queryByText("3.24 XLM")).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.getByText("3.24 XLM")).toBeInTheDocument();
  });

  it("sets the amount from the 25/50/100 percent chips", () => {
    const { props } = renderCalculator();

    fireEvent.click(screen.getByRole("button", { name: "Use 25% of remaining" }));
    fireEvent.click(screen.getByRole("button", { name: "Use 50% of remaining" }));
    fireEvent.click(screen.getByRole("button", { name: "Use 100% of remaining" }));

    expect(props.onAmountChange.mock.calls.map(([value]) => value)).toEqual([
      "25",
      "50",
      "100",
    ]);
  });

  it("shows a warning instead of a projection for overdue invoices", () => {
    vi.useFakeTimers();
    renderCalculator({ dueDate: "2026-10-18T23:59:59Z" });

    act(() => {
      vi.advanceTimersByTime(400);
    });

    expect(screen.getByText(/overdue/)).toBeInTheDocument();
    expect(screen.queryByText(/You receive/)).not.toBeInTheDocument();
  });

  it("shows a validation message for amounts with more than 7 decimals", () => {
    vi.useFakeTimers();
    renderCalculator({ amount: "0.00000001" });

    act(() => {
      vi.advanceTimersByTime(400);
    });

    expect(screen.getByText(/7 decimal places/)).toBeInTheDocument();
    expect(screen.queryByText(/You receive/)).not.toBeInTheDocument();
  });
});
