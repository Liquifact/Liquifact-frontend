import { describe, it, expect, vi, beforeEach } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FundersTable from "@/components/escrow/FundersTable";

const G = (n) => `G${String(n).padStart(55, "A")}`;
const ME = G(777);

function makeLoader(pages) {
  // pages: { 1: [[addr, amt]...], 2: [...] }
  return vi.fn(async ({ page = 1, pageSize = 10 }) => {
    const all = Object.values(pages).flat();
    const records = pages[page] || [];
    return {
      records,
      totalCount: all.length,
      page,
      pageSize,
      pageCount: Object.keys(pages).length,
    };
  });
}

describe("FundersTable", () => {
  beforeEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders the table with a caption, columns and rows", async () => {
    const loader = makeLoader({ 1: [[G(1), "10000000"], [G(2), "30000000"]] });
    render(<FundersTable loadFundersFn={loader} />);
    await waitFor(() => expect(screen.getByRole("table")).toBeTruthy());
    expect(screen.getByRole("table").querySelector("caption")?.textContent).toContain("Funding records");
    expect(screen.getByText("Investor")).toBeTruthy();
    expect(screen.getByText("Amount")).toBeTruthy();
    expect(screen.getByText("Share")).toBeTruthy();
    expect(screen.getByText("25.00%")).toBeTruthy();
    expect(screen.getByText("75.00%")).toBeTruthy();
  });

  it("tags the connected wallet row as You", async () => {
    const loader = makeLoader({ 1: [[ME, "10000000"], [G(2), "10000000"]] });
    render(<FundersTable loadFundersFn={loader} connectedAddress={ME} />);
    await waitFor(() => expect(screen.getByText("You")).toBeTruthy());
  });

  it("paginates with Prev/Next and disables at bounds", async () => {
    const user = userEvent.setup();
    const loader = makeLoader({
      1: Array.from({ length: 10 }, (_, i) => [G(i + 1), "10000000"]),
      2: [[G(11), "10000000"]],
    });
    render(<FundersTable loadFundersFn={loader} pageSize={10} />);
    await waitFor(() => expect(screen.getByText("Page 1 of 2")).toBeTruthy());
    const prev = screen.getByRole("button", { name: /Prev/ });
    const next = screen.getByRole("button", { name: /Next/ });
    expect(prev.disabled).toBe(true);
    expect(next.disabled).toBe(false);
    await user.click(next);
    await waitFor(() => expect(screen.getByText("Page 2 of 2")).toBeTruthy());
    expect(screen.getByRole("button", { name: /Next/ }).disabled).toBe(true);
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it("shows the empty state", async () => {
    const loader = vi.fn(async () => ({ records: [], totalCount: 0, page: 1, pageSize: 10, pageCount: 1 }));
    render(<FundersTable loadFundersFn={loader} />);
    await waitFor(() => expect(screen.getByText(/No funders yet/)).toBeTruthy());
  });

  it("shows the error state and retries", async () => {
    const user = userEvent.setup();
    let fail = true;
    const loader = vi.fn(async () => {
      if (fail) throw new Error("rpc down");
      return { records: [[G(1), "10000000"]], totalCount: 1, page: 1, pageSize: 10, pageCount: 1 };
    });
    render(<FundersTable loadFundersFn={loader} />);
    await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
    expect(screen.getByText(/rpc down/)).toBeTruthy();
    fail = false;
    await user.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() => expect(screen.getByRole("table")).toBeTruthy());
  });

  it("shows a concentration pill for funded invoices", async () => {
    const loader = makeLoader({ 1: [[G(1), "90000000"], [G(2), "10000000"]] });
    render(<FundersTable loadFundersFn={loader} />);
    await waitFor(() => expect(screen.getByText(/High concentration/)).toBeTruthy());
  });
});
