/**
 * #516 — Marketplace component states + primary interactions
 *
 * Covers loading / empty / error / success and primary click + keyboard paths
 * on InvestMarketplace. Uses injectable loadInvoices so each state is isolated.
 * Does not change production behaviour beyond the missing-import defect fix
 * required for the module to load under Jest (see page.js import restore).
 */
import React from "react";
import { act, render, screen, within, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { copy } from "@/app/copy/en";
import { InvestMarketplace, PAGE_SIZE } from "../page";

jest.mock("next/link", () => {
  function MockLink({ href, children, ...props }) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  }
  return { __esModule: true, default: MockLink };
});

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/invest",
}));

jest.mock("@/components/NavMenu", () => {
  function MockNavMenu() {
    return <nav aria-label="site navigation" />;
  }
  return { __esModule: true, default: MockNavMenu };
});

jest.mock("@/utils/export", () => ({
  exportAsCSV: jest.fn(),
  exportAsJSON: jest.fn(),
}));

function makeInvoices(count) {
  return Array.from({ length: count }, (_, i) => ({
    id: `inv-${String(i + 1).padStart(3, "0")}`,
    issuer: `Issuer ${i + 1}`,
    amount: String((i + 1) * 1000),
    currency: "USD",
    dueDate: "2026-12-31",
    yield: `${(5 + i * 0.1).toFixed(1)}%`,
    status: "Open",
  }));
}

function createPendingLoader() {
  return jest.fn(() => new Promise(() => {}));
}

function createResolvedLoader(invoices) {
  return jest.fn(() => Promise.resolve(invoices));
}

function createRejectedLoader(message = "boom") {
  return jest.fn(() => Promise.reject(new Error(message)));
}

async function settle() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe("InvestMarketplace — loading state", () => {
  it("shows accessible loading status + skeleton while invoices pending", () => {
    render(<InvestMarketplace loadInvoices={createPendingLoader()} />);

    const loading = screen.getByRole("status", { name: /loading marketplace invoices/i });
    expect(loading).toBeInTheDocument();
    expect(loading).toHaveAttribute("aria-live", "polite");

    // Skeleton is presentational (aria-hidden) inside the loading region.
    const skeleton = loading.querySelector("ul");
    expect(skeleton).toBeTruthy();
    expect(skeleton).toHaveAttribute("aria-busy", "true");
  });

  it("loading exclusivity — no invoice list, empty copy, or error alert while pending", () => {
    render(<InvestMarketplace loadInvoices={createPendingLoader()} />);

    expect(screen.queryByRole("list", { name: copy.invest.listAriaLabel })).not.toBeInTheDocument();
    expect(screen.queryByText(copy.invest.emptyState)).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: copy.invest.retryAction })).not.toBeInTheDocument();
  });
});

describe("InvestMarketplace — empty state", () => {
  it("announces empty marketplace with role=status and empty copy", async () => {
    render(<InvestMarketplace loadInvoices={createResolvedLoader([])} />);
    await settle();

    expect(screen.getByText(copy.invest.emptyState)).toBeInTheDocument();
    const emptyRegion = screen.getByText(copy.invest.emptyState).closest("[role='status']");
    expect(emptyRegion).toHaveAttribute("aria-live", "polite");

    expect(screen.queryByRole("list", { name: copy.invest.listAriaLabel })).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("status", { name: /loading marketplace invoices/i })
    ).not.toBeInTheDocument();
  });
});

describe("InvestMarketplace — error state", () => {
  it("shows ErrorBanner alert with retry control and accessible names", async () => {
    render(<InvestMarketplace loadInvoices={createRejectedLoader()} />);
    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent(copy.invest.errorTitle);
    expect(alert).toHaveTextContent(copy.invest.errorDescription);

    const retry = screen.getByRole("button", { name: copy.invest.retryAction });
    expect(retry).toBeInTheDocument();
    expect(retry).not.toBeDisabled();

    // Error exclusivity — no list / empty / loading region
    expect(screen.queryByRole("list", { name: copy.invest.listAriaLabel })).not.toBeInTheDocument();
    expect(screen.queryByText(copy.invest.emptyState)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("status", { name: /loading marketplace invoices/i })
    ).not.toBeInTheDocument();
  });

  it("primary interaction: Try again reloads and recovers to success", async () => {
    const user = userEvent.setup();
    const loadInvoices = jest
      .fn()
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce(makeInvoices(2));

    render(<InvestMarketplace loadInvoices={loadInvoices} />);
    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: copy.invest.retryAction }));
    await waitFor(() => {
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(screen.getByRole("list", { name: copy.invest.listAriaLabel })).toBeInTheDocument();
    });

    expect(loadInvoices).toHaveBeenCalledTimes(2);
    expect(screen.getByText("Issuer 1")).toBeInTheDocument();
    expect(screen.getByText("Issuer 2")).toBeInTheDocument();
  });

  it("keyboard interaction: Enter on Try again triggers reload", async () => {
    const user = userEvent.setup();
    const loadInvoices = jest
      .fn()
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce(makeInvoices(1));

    render(<InvestMarketplace loadInvoices={loadInvoices} />);
    await settle();

    const retry = screen.getByRole("button", { name: copy.invest.retryAction });
    retry.focus();
    expect(retry).toHaveFocus();
    await user.keyboard("{Enter}");
    await settle();

    expect(loadInvoices).toHaveBeenCalledTimes(2);
    expect(screen.getByText("Issuer 1")).toBeInTheDocument();
  });
});

describe("InvestMarketplace — success state", () => {
  it("renders invoice list with accessible name and row content", async () => {
    const invoices = makeInvoices(3);
    render(<InvestMarketplace loadInvoices={createResolvedLoader(invoices)} />);
    await settle();

    const list = screen.getByRole("list", { name: copy.invest.listAriaLabel });
    expect(list).toBeInTheDocument();

    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent("Issuer 1");
    expect(items[1]).toHaveTextContent("Issuer 2");
    expect(items[2]).toHaveTextContent("Issuer 3");

    // Each issuer is a link into the detail route
    const link = screen.getByRole("link", { name: "Issuer 1" });
    expect(link).toHaveAttribute("href", "/invest/inv-001");

    expect(screen.getByRole("heading", { name: copy.invest.title })).toBeInTheDocument();
    expect(
      screen.queryByRole("status", { name: /loading marketplace invoices/i })
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("success exclusivity — no empty copy and no error banner", async () => {
    render(<InvestMarketplace loadInvoices={createResolvedLoader(makeInvoices(1))} />);
    await settle();

    expect(screen.queryByText(copy.invest.emptyState)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: copy.invest.retryAction })).not.toBeInTheDocument();
  });
});

describe("InvestMarketplace — primary Load more interaction", () => {
  it("Load more appends next page; keyboard Enter works", async () => {
    const user = userEvent.setup();
    const invoices = makeInvoices(PAGE_SIZE + 3);
    render(<InvestMarketplace loadInvoices={createResolvedLoader(invoices)} />);
    await settle();

    const list = screen.getByRole("list", { name: copy.invest.listAriaLabel });
    expect(within(list).getAllByRole("listitem")).toHaveLength(PAGE_SIZE);

    const loadMore = screen.getByRole("button", { name: copy.invest.loadMoreAriaLabel });
    expect(loadMore).toHaveTextContent(copy.invest.loadMore);

    await user.click(loadMore);
    await settle();

    expect(within(list).getAllByRole("listitem")).toHaveLength(PAGE_SIZE + 3);
    // All rows visible → Load more gone
    expect(
      screen.queryByRole("button", { name: copy.invest.loadMoreAriaLabel })
    ).not.toBeInTheDocument();
  });

  it("keyboard: Tab to Load more then Enter expands the list", async () => {
    const user = userEvent.setup();
    const invoices = makeInvoices(PAGE_SIZE + 2);
    render(<InvestMarketplace loadInvoices={createResolvedLoader(invoices)} />);
    await settle();

    const loadMore = screen.getByRole("button", { name: copy.invest.loadMoreAriaLabel });
    loadMore.focus();
    expect(loadMore).toHaveFocus();
    await user.keyboard("{Enter}");
    await settle();

    const list = screen.getByRole("list", { name: copy.invest.listAriaLabel });
    expect(within(list).getAllByRole("listitem")).toHaveLength(PAGE_SIZE + 2);
  });
});

describe("InvestMarketplace — invoice link keyboard path", () => {
  it("issuer link is focusable and points at detail route", async () => {
    const user = userEvent.setup();
    render(<InvestMarketplace loadInvoices={createResolvedLoader(makeInvoices(1))} />);
    await settle();

    const link = screen.getByRole("link", { name: "Issuer 1" });
    link.focus();
    expect(link).toHaveFocus();
    expect(link).toHaveAttribute("href", "/invest/inv-001");

    // Space/Enter on a real <a> is browser-native; assert accessible name + href contract.
    expect(link).toHaveAccessibleName("Issuer 1");
  });
});
