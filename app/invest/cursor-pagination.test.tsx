import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { InvestMarketplace } from "./page";

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

jest.mock("@/components/NavMenu", () => {
  function MockNavMenu() {
    return <nav aria-label="site navigation" />;
  }

  return { __esModule: true, default: MockNavMenu };
});

function buildInvoice(id, issuer = `Issuer ${id}`) {
  return {
    id,
    issuer,
    amount: "1000",
    currency: "USD",
    dueDate: "2026-12-31",
    yield: "7.5%",
    status: "Open",
  };
}

describe("InvestMarketplace cursor pagination", () => {
  it("uses the backend cursor contract on the first page and preserves sort/filter params", async () => {
    const firstPage = Array.from({ length: 12 }, (_, index) => buildInvoice(`inv-${index + 1}`));
    const secondPage = Array.from({ length: 3 }, (_, index) => buildInvoice(`inv-${index + 13}`, `Issuer ${index + 13}`));
    const loadInvoices = jest.fn(async ({ cursor, filters, search, sort, sortDir }) => {
      if (cursor == null) {
        expect(filters).toEqual(
          expect.objectContaining({
            currency: "USD",
            statuses: ["Open"],
          })
        );
        expect(search).toBe("acme");
        expect(sort).toBe("yield");
        expect(sortDir).toBe("desc");
        return { items: firstPage, nextCursor: "cursor-2", hasMore: true };
      }
      expect(cursor).toBe("cursor-2");
      expect(filters).toEqual(
        expect.objectContaining({
          currency: "USD",
          statuses: ["Open"],
        })
      );
      return { items: secondPage, nextCursor: null, hasMore: false };
    });

    render(
      <InvestMarketplace
        loadInvoices={loadInvoices}
      />
    );

    const searchInput = screen.getByLabelText("Search by issuer name");
    fireEvent.change(searchInput, { target: { value: "acme" } });

    const statusChip = screen.getByRole("button", { name: "Open" });
    fireEvent.click(statusChip);

    fireEvent.change(screen.getByLabelText(/currency/i), { target: { value: "USD" } });

    await waitFor(() => {
      expect(loadInvoices).toHaveBeenCalled();
    });

    const initialRequest = loadInvoices.mock.calls[0][0];
    expect(initialRequest).toEqual(
      expect.objectContaining({
        cursor: null,
        filters: expect.objectContaining({ currency: "USD", statuses: ["Open"] }),
        search: "acme",
      })
    );

    fireEvent.click(await screen.findByRole("button", { name: /load more/i }));

    await waitFor(() => {
      expect(loadInvoices).toHaveBeenCalledTimes(2);
    });

    expect(loadInvoices.mock.calls[1][0]).toEqual(
      expect.objectContaining({
        cursor: "cursor-2",
        filters: expect.objectContaining({ currency: "USD", statuses: ["Open"] }),
        search: "acme",
      })
    );
  });

  it("shows the end-of-list state and ignores rapid duplicate next-page clicks", async () => {
    const firstPage = Array.from({ length: 12 }, (_, index) => buildInvoice(`inv-${index + 1}`));
    const secondPage = [buildInvoice("inv-013", "Issuer 13")];
    const loadInvoices = jest.fn(async ({ cursor }) => {
      if (cursor == null) {
        return { items: firstPage, nextCursor: "next-page", hasMore: true };
      }
      return { items: secondPage, nextCursor: null, hasMore: false };
    });

    render(<InvestMarketplace loadInvoices={loadInvoices} />);
    const loadMoreButton = await screen.findByRole("button", { name: /load more/i });

    fireEvent.click(loadMoreButton);
    fireEvent.click(loadMoreButton);

    await waitFor(() => {
      expect(loadInvoices).toHaveBeenCalledTimes(2);
    });

    await waitFor(() => {
      expect(screen.getByText(/You have reached the end of the list\./i)).toBeInTheDocument();
    });
  });

  it("surfaces an invalid cursor state and allows the user to refresh the list", async () => {
    const firstPage = Array.from({ length: 12 }, (_, index) => buildInvoice(`inv-${index + 1}`));
    const loadInvoices = jest.fn(async ({ cursor }) => {
      if (cursor == null) {
        return { items: firstPage, nextCursor: "stale-cursor", hasMore: true };
      }
      if (cursor === "stale-cursor") {
        return { invalidCursor: true, items: [], nextCursor: null, hasMore: false };
      }
      return { items: firstPage, nextCursor: null, hasMore: false };
    });

    render(<InvestMarketplace loadInvoices={loadInvoices} />);

    fireEvent.click(await screen.findByRole("button", { name: /load more/i }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /This result set is no longer valid\./i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /try again/i }));

    await waitFor(() => {
      expect(loadInvoices).toHaveBeenCalledTimes(3);
    });
  });

  it("renders an empty first page state without crashing", async () => {
    const loadInvoices = jest.fn(async () => ({ items: [], nextCursor: null, hasMore: false }));

    render(<InvestMarketplace loadInvoices={loadInvoices} />);

    expect(await screen.findByText(/No investable invoices\./i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /load more/i })).not.toBeInTheDocument();
  });

  it("deduplicates rows when new invoices arrive between pages", async () => {
    const firstPage = Array.from({ length: 12 }, (_, index) => buildInvoice(`inv-${index + 1}`));
    const secondPage = [buildInvoice("inv-002"), buildInvoice("inv-013")];
    const loadInvoices = jest.fn(async ({ cursor }) => {
      if (cursor == null) {
        return { items: firstPage, nextCursor: "cursor-2", hasMore: true };
      }
      return { items: secondPage, nextCursor: null, hasMore: false };
    });

    render(<InvestMarketplace loadInvoices={loadInvoices} />);

    fireEvent.click(await screen.findByRole("button", { name: /load more/i }));

    await waitFor(() => {
      expect(screen.getAllByRole("listitem")).toHaveLength(13);
    });

    expect(screen.getAllByRole("listitem").map((item) => item.textContent)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("Issuer 1"),
        expect.stringContaining("Issuer 2"),
        expect.stringContaining("Issuer 13"),
      ])
    );
  });
});
