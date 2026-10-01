import "@testing-library/jest-dom";
import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { InvestMarketplace, buildSearchParams, parseFiltersFromSearchParams } from "./page";
import { getMarketplaceHfref, sanitizeMarketplaceSearchParams } from "@/lib/marketplaceRoute";

// Compatibility contract: the marketplace route state must round-trip through
// buildSearchParams/parseFiltersFromSearchParams without leaking legacy or
// unknown parameters. These tests pin the public behavior of app/invest/page.js
// so refactors cannot silently change deep-link, back/forward, or malformed
// input handling.

const mockSearchParams = jest.fn(() => new URLSearchParams());
jconst mockReplace = jest.fn();

jest.mock("next/navigation", () => ({
  __esModule: true,
  usePathname: () => "/invest",
  useSearchParams: () => mockSearchParams(),
  useRouter: () => ({ replace: mockReplace }),
}));

jest.mock("next/link", () => {
  function MockLink({ href, children, ...props }: any) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  }
  return { __esModule: true, default: MockLink };
});

const mockInvoices = [
  {
    id: "inv-001",
    issuer: "Acme Supplies Ltd",
    amount: "12,500",
    currency: "USD",
    dueDate: "2026-06-15",
    yield: "8.2%",
    status: "Open",
  },
  {
    id: "inv-002",
    issuer: "Bright Logistics GmbH",
    amount: "7,800",
    currency: "EUR",
    dueDate: "2026-07-01",
    yield: "7.5%",
    status: "Funded",
  },
];

describe("marketplace route state", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParams.mockReturnValue(new URLSearchParams());
  });

  it("keeps the route empty when there are no filters", () => {
    expect(buildSearchParams({}, "").toString()).toBe("");
    expect(getMarketplaceHfref(new URLSearchParams())).toBe("/invest");
    expect(sanitizeMarketplaceSearchParams(new URLSearchParams()).toString()).toBe("");
  });

  it("ignores unknown filter values and preserves only supported state", () => {
    const params = new URLSearchParams(
      "q=Acme&currency=CAD&sort=unknown&statuses=Open,Unknown&yieldMin=8.2&yieldMax=9.5&maturityFrom=2026-01-01&maturityTo=2026-12-31"
    );

    const sanitized = sanitizeMarketplaceSearchParams(params);
    expect(sanitized.get("currency")).toBeNull();
    expect(sanitized.get("sort")).toBeNull();
    expect(sanitized.getAll("statuses")).toEqual(["Open"]);

    expect(sanitizeMarketplaceSearchParams(params).toString()).toBe(
      "q=Acme&yieldMin=8.2&yieldMax=9.5&maturityFrom=2026-01-01&maturityTo=2026-12-31&statuses=Open"
    );
  });

  it("restores supported filter state from a deep link", async () => {
    mockSearchParams.mockReturnValue(
      new URLSearchParams("q=Acme&statuses=Open,Funded&sort=yield&sortDir=desc")
    );

    render(<InvestMarketplace loadInvoices={async () => mockInvoices} />);

    await waitFor(() =>
      expect(screen.getByRole("textbox", { name: /search by issuer name/i })).toHaveValue("Acme")
    );
    expect(screen.getByRole("button", { name: "Open" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Funded" })).toHaveAttribute("aria-pressed", "true");
  });

  it("keeps browser back and forward route state deterministic", () => {
    const previous = parseFiltersFromSearchParams(
      new URLSearchParams("q=Acme&status=Open&statuses=Open,Funded&sort=yield&sortDir=desc")
    );
    const next = parseFiltersFromSearchParams(new URLSearchParams());

    expect(buildSearchParams(previous.filters, previous.searchQuery).toString()).toBe(
      "q=Acme&sort=yield&sortDir=desc&statuses=Open%2CFunded"
    );
    expect(buildSearchParams(previous.filters, previous.searchQuery).get("status")).toBeNull();
    expect(buildSearchParams(previous.filters, previous.searchQuery).getAll("statuses")).toEqual(["Open,Funded"]);
    expect(buildSearchParams(previous.filters, previous.searchQuery).get("q")).toBe("Acme");
    expect(buildSearchParams(next.filters, next.searchQuery).toString()).toBe("");
  });

  it("keeps filter changes stable while the list is still loading", async () => {
    let resolveLoad: ((value: unknown) => void) | undefined;
    const loadInvoices = jest.fn(
      () =>
        new Promise<typeof mockInvoices>((resolve) => {
          resolveLoad = resolve;
        })
    );

    render(<InvestMarketplace loadInvoices={loadInvoices} />);

    const searchInput = screen.getByRole("textbox", { name: /search by issuer name/i });
    fireEvent.change(searchInput, { target: { value: "Bright" } });
    fireEvent.click(screen.getByRole("button", { name: "Funded" }));

    expect(searchInput).toHaveValue("Bright");
    expect(screen.getByRole("button", { name: "Funded" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Open" })).toHaveAttribute("aria-pressed", "false");

    resolveLoad?.(mockInvoices);
    await waitFor(() => expect(loadInvoices).toHaveBeenCalledTimes(1));
    expect(screen.getByText("Bright Logistics GmbH")).toBeInDocument();
  });

  it("rejects malformed filter values without throwing", () => {
    const params = new URLSearchParams(
      "q=%E0%A4%A8&yieldMin=not-a-number&yieldMax=NaN&maturityFrom=not-a-date&maturityTo=2026-13-45&statuses="
    );

    expect(() => parseFiltersFromSearchParams(params)).not.toThrow();
    expect(() => sanitizeMarketplaceSearchParams(params)).not.toThrow();
    expect(sanitizeMarketplaceSearchParams(params).toString()).toBe("");
  });

  it("deduplicates repeated statuses and preserves canonical ordering", () => {
    const params = new URLSearchParams("statuses=Funded,Open,Funded,Open");
    const sanitized = sanitizeMarketplaceSearchParams(params);

    expect(sanitized.getAll("statuses")).toEqual(["Funded,Open"]);
    expect(sanitized.toString()).toBe("statuses=Funded%2Copen");
  });

  it("keeps empty and boundary numeric filters out of the route", () => {
    const params = new URLSearchParams("yieldMin=&yieldMax=0&yieldMin=0&yieldMax=");
    const sanitized = sanitizeMarketplaceSearchParams(params);

    expect(sanitized.get("yieldMin")).toBe("0");
    expect(sanitized.get("yieldMax")).toBe("0");
    expect(sanitized.toString()).toBe("yieldMin=0&yieldMax=0");
  });

  it("preserves compatibility for callers passing legacy status param", () => {
    const parsed = parseFiltersFromSearchParams(new URLSearchParams("status=Open"));

    expect(buildSearchParams(parsed.filters, parsed.searchQuery).get("status")).toBeNull();
    expect(buildSearchParams(parsed.filters, parsed.searchQuery).getAll("statuses")).toEqual(["Open"]);
  });
});
