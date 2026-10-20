import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TierSelector from "@/components/invest/TierSelector";

const DAY = 86400;
const OPTIONS = [
  { id: "base", lockSecs: 0, yieldBps: 800, label: "No lock (base 8.00%)", disabled: false, reason: null },
  { id: "lock-30", lockSecs: 30 * DAY, yieldBps: 950, label: "Lock 30 days → 9.50%", disabled: false, reason: null },
  {
    id: "lock-90",
    lockSecs: 90 * DAY,
    yieldBps: 1100,
    label: "Lock 90 days → 11.00%",
    disabled: true,
    reason: "Lock would end after the invoice matures",
  },
];

describe("TierSelector", () => {
  test("renders a radiogroup with one radio per option", () => {
    render(<TierSelector options={OPTIONS} value={0} onChange={() => {}} />);
    const group = screen.getByRole("radiogroup");
    expect(group).toBeTruthy();
    expect(group.getAttribute("aria-labelledby")).toBe("tier-legend");
    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(3);
    expect(radios[0].checked).toBe(true);
    expect(radios[2].disabled).toBe(true);
    expect(screen.getByText("Lock 90 days → 11.00%")).toBeTruthy();
    expect(screen.getByText("Lock would end after the invoice matures")).toBeTruthy();
  });

  test("arrow-right moves selection to the next enabled option", async () => {
    const user = userEvent.setup();
    let value = 0;
    function Controlled() {
      return <TierSelector options={OPTIONS} value={value} onChange={(v) => (value = v)} />;
    }
    const { rerender } = render(<Controlled />);
    const radios = screen.getAllByRole("radio");
    radios[0].focus();
    await user.keyboard("{ArrowRight}");
    rerender(<Controlled />);
    expect(value).toBe(30 * DAY);
    expect(screen.getAllByRole("radio")[1].checked).toBe(true);
    expect(document.activeElement).toBe(screen.getAllByRole("radio")[1]);
  });

  test("arrow keys skip disabled options", async () => {
    const user = userEvent.setup();
    let value = 30 * DAY;
    function Controlled() {
      return <TierSelector options={OPTIONS} value={value} onChange={(v) => (value = v)} />;
    }
    const { rerender } = render(<Controlled />);
    screen.getAllByRole("radio")[1].focus();
    await user.keyboard("{ArrowRight}"); // 90d is disabled → wraps to base
    rerender(<Controlled />);
    expect(value).toBe(0);
    expect(document.activeElement).toBe(screen.getAllByRole("radio")[0]);
  });

  test("arrow-left moves selection backwards with wrap-around", async () => {
    const user = userEvent.setup();
    let value = 0;
    function Controlled() {
      return <TierSelector options={OPTIONS} value={value} onChange={(v) => (value = v)} />;
    }
    const { rerender } = render(<Controlled />);
    screen.getAllByRole("radio")[0].focus();
    await user.keyboard("{ArrowLeft}"); // wraps to last enabled = 30d (90d disabled)
    rerender(<Controlled />);
    expect(value).toBe(30 * DAY);
  });

  test("space/click selects an option via native radio behavior", async () => {
    const user = userEvent.setup();
    let value = 0;
    function Controlled() {
      return <TierSelector options={OPTIONS} value={value} onChange={(v) => (value = v)} />;
    }
    const { rerender } = render(<Controlled />);
    await user.click(screen.getByText("Lock 30 days → 9.50%"));
    rerender(<Controlled />);
    expect(value).toBe(30 * DAY);
  });

  test("disabled group does not change selection", async () => {
    const user = userEvent.setup();
    let value = 0;
    render(<TierSelector options={OPTIONS} value={value} onChange={(v) => (value = v)} disabled />);
    await user.click(screen.getByText("Lock 30 days → 9.50%"));
    expect(value).toBe(0);
  });
});
