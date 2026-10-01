import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

const mockRefresh = jest.fn();

// next/navigation is not available in jsdom; mock the parts we need.
jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

describe("InvoiceNotFound", () => {
  beforeEach(() => {
    mockRefresh.mockClear();
  });

  it("retries the current route when requested", () => {
    render(<InvoiceNotFound />);

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it("keeps the marketplace recovery link available", () => {
    render(<InvoiceNotFound />);

    expect(screen.getByRole("link", { name: "Browse marketplace" })).toHaveAttribute(
      "href",
      "/invest"
    );
  });
});