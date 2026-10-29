import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import TierSelector from "@/components/invest/TierSelector";

const NOW = 1_730_419_200;
const MATURITY = NOW + 120 * 86400;

const OPTIONS = [
  { lockSecs: 0, yieldBps: 800, label: "No lock (base 8.00%)", disabled: false, reason: null },
  { lockSecs: 2592000, yieldBps: 950, label: "Lock 30 days \u2192 9.50%", disabled: false, reason: null },
  { lockSecs: 7776000, yieldBps: 1100, label: "Lock 90 days \u2192 11.00%", disabled: false, reason: null },
];

const OPTIONS_WITH_DISABLED = [
  ...OPTIONS.slice(0, 2),
  { lockSecs: 7776000, yieldBps: 1100, label: "Lock 90 days \u2192 11.00%", disabled: true, reason: "Lock would exceed invoice maturity" },
];

beforeEach(() => cleanup());

describe("TierSelector — returning investor", () => {
  it("shows fixed-yield text instead of the radio group when hasContribution is true", () => {
    render(
      <TierSelector
        options={OPTIONS}
        selectedLock={0}
        onSelect={vi.fn()}
        hasContribution={true}
        fixedYieldBps={950}
      />,
    );
    // Fixed-yield text is shown
    expect(screen.getByText(/fixed at/i)).toBeInTheDocument();
    expect(screen.getByText("9.50%")).toBeInTheDocument();
    // No radio group
    expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument();
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
  });

  it("shows generic text when fixedYieldBps is null but hasContribution is true", () => {
    render(
      <TierSelector
        options={OPTIONS}
        selectedLock={0}
        onSelect={vi.fn()}
        hasContribution={true}
        fixedYieldBps={null}
      />,
    );
    expect(screen.getByText(/fixed at your first deposit/i)).toBeInTheDocument();
    expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument();
  });
});

describe("TierSelector — first-time investor", () => {
  it("renders a radiogroup with one radio per option", () => {
    render(
      <TierSelector
        options={OPTIONS}
        selectedLock={0}
        onSelect={vi.fn()}
        hasContribution={false}
        fixedYieldBps={null}
      />,
    );
    expect(screen.getByRole("radiogroup")).toBeInTheDocument();
    expect(screen.getByRole("radiogroup")).toHaveAttribute("aria-labelledby");
    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(3);
    expect(radios[0]).toHaveAttribute("aria-checked", "true");
    expect(radios[1]).toHaveAttribute("aria-checked", "false");
    expect(radios[2]).toHaveAttribute("aria-checked", "false");
  });

  it("calls onSelect with the lockSecs when a radio is clicked", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <TierSelector
        options={OPTIONS}
        selectedLock={0}
        onSelect={onSelect}
        hasContribution={false}
        fixedYieldBps={null}
      />,
    );
    const radios = screen.getAllByRole("radio");
    await user.click(radios[1]);
    expect(onSelect).toHaveBeenCalledWith(2592000);
  });

  it("arrow-down moves selection to the next enabled radio", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <TierSelector
        options={OPTIONS}
        selectedLock={0}
        onSelect={onSelect}
        hasContribution={false}
        fixedYieldBps={null}
      />,
    );
    const radios = screen.getAllByRole("radio");
    radios[0].focus();
    expect(radios[0]).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(onSelect).toHaveBeenCalledWith(2592000);
  });

  it("arrow-up moves selection to the previous enabled radio", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <TierSelector
        options={OPTIONS}
        selectedLock={2592000}
        onSelect={onSelect}
        hasContribution={false}
        fixedYieldBps={null}
      />,
    );
    const radios = screen.getAllByRole("radio");
    radios[1].focus();
    await user.keyboard("{ArrowUp}");
    expect(onSelect).toHaveBeenCalledWith(0);
  });

  it("arrow-right and arrow-left also navigate", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <TierSelector
        options={OPTIONS}
        selectedLock={0}
        onSelect={onSelect}
        hasContribution={false}
        fixedYieldBps={null}
      />,
    );
    const radios = screen.getAllByRole("radio");
    radios[0].focus();
    await user.keyboard("{ArrowRight}");
    expect(onSelect).toHaveBeenCalledWith(2592000);
    // Arrow left from the base wraps to the last option
    await user.keyboard("{ArrowLeft}");
    expect(onSelect).toHaveBeenCalledWith(7776000);
  });

  it("arrow navigation skips disabled options", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <TierSelector
        options={OPTIONS_WITH_DISABLED}
        selectedLock={2592000}
        onSelect={onSelect}
        hasContribution={false}
        fixedYieldBps={null}
      />,
    );
    const radios = screen.getAllByRole("radio");
    radios[1].focus();
    // Arrow down from 30 days should wrap to the base (skip the disabled 90 days)
    await user.keyboard("{ArrowDown}");
    expect(onSelect).toHaveBeenCalledWith(0);
  });

  it("disabled radio shows the reason and does not call onSelect", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <TierSelector
        options={OPTIONS_WITH_DISABLED}
        selectedLock={0}
        onSelect={onSelect}
        hasContribution={false}
        fixedYieldBps={null}
      />,
    );
    expect(screen.getByText(/exceed invoice maturity/i)).toBeInTheDocument();
    const radios = screen.getAllByRole("radio");
    expect(radios[2]).toBeDisabled();
    // Clicking a disabled radio should not call onSelect
    await user.click(radios[2]);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("Tab enters at the checked radio and exits to the next element", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <div>
        <button type="button">Before</button>
        <TierSelector
          options={OPTIONS}
          selectedLock={2592000}
          onSelect={onSelect}
          hasContribution={false}
          fixedYieldBps={null}
        />
        <button type="button">After</button>
      </div>,
    );
    const radios = screen.getAllByRole("radio");
    // Tab from "Before" should land on the checked radio (index 1)
    await user.tab();
    expect(screen.getByRole("button", { name: "Before" })).toHaveFocus();
    await user.tab();
    // Only the checked radio has tabIndex=0, so it receives focus
    expect(radios[1]).toHaveFocus();
    expect(radios[1]).toHaveAttribute("tabIndex", "0");
    expect(radios[0]).toHaveAttribute("tabIndex", "-1");
    expect(radios[2]).toHaveAttribute("tabIndex", "-1");
    // Tab again exits to "After"
    await user.tab();
    expect(screen.getByRole("button", { name: "After" })).toHaveFocus();
  });

  it("renders nothing when options is empty", () => {
    const { container } = render(
      <TierSelector options={[]} selectedLock={0} onSelect={vi.fn()} hasContribution={false} fixedYieldBps={null} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});

describe("TierSelector — contract quote", () => {
  it("shows the contract quote with yield and lock end date", () => {
    render(
      <TierSelector
        options={OPTIONS}
        selectedLock={2592000}
        onSelect={vi.fn()}
        hasContribution={false}
        fixedYieldBps={null}
        amount="1"
        quote={{ effective_yield_bps: 950, lock_end_secs: 1733011200 }}
        quoteLoading={false}
        quoteError={null}
        quoteEnabled={true}
      />,
    );
    expect(screen.getByText(/Contract quote/i)).toBeInTheDocument();
    expect(screen.getByText("9.50%")).toBeInTheDocument();
    // Lock end date should be displayed (Dec 2024)
    expect(screen.getByText(/lock ends/i)).toBeInTheDocument();
  });

  it("shows loading state while fetching quote", () => {
    render(
      <TierSelector
        options={OPTIONS}
        selectedLock={2592000}
        onSelect={vi.fn()}
        hasContribution={false}
        fixedYieldBps={null}
        amount="1"
        quote={null}
        quoteLoading={true}
        quoteError={null}
        quoteEnabled={true}
      />,
    );
    const loadingMsg = screen.getByText(/Getting contract quote/i);
    expect(loadingMsg).toBeInTheDocument();
    // aria-live is on the container, not the individual message element
    expect(loadingMsg.closest("[aria-live]")).toHaveAttribute("aria-live", "polite");
  });

  it("shows error state when quote fails", () => {
    render(
      <TierSelector
        options={OPTIONS}
        selectedLock={2592000}
        onSelect={vi.fn()}
        hasContribution={false}
        fixedYieldBps={null}
        amount="1"
        quote={null}
        quoteLoading={false}
        quoteError="Network error"
        quoteEnabled={true}
      />,
    );
    expect(screen.getByText("Network error")).toBeInTheDocument();
    expect(screen.getByText("Network error")).toHaveAttribute("role", "alert");
  });

  it("does not show the quote region when no lock is selected", () => {
    render(
      <TierSelector
        options={OPTIONS}
        selectedLock={0}
        onSelect={vi.fn()}
        hasContribution={false}
        fixedYieldBps={null}
        amount="1"
        quote={{ effective_yield_bps: 950, lock_end_secs: 1733011200 }}
        quoteLoading={false}
        quoteError={null}
        quoteEnabled={true}
      />,
    );
    expect(screen.queryByText(/Contract quote/i)).not.toBeInTheDocument();
  });
});
