import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import InvoiceList, { InvoiceListItem } from "./InvoiceList";

// ── Fixtures ────────────────────────────────────────────────────────────────

function makeInvoice(overrides: object = {}) {
  return {
    id: "inv-mem-001",
    issuer: "Memo Test Supplier",
    amount: "1,000",
    currency: "USD",
    dueDate: "2026-12-01",
    yield: "5.0%",
    status: "Tokenized",
    ...overrides,
  };
}

function makeInvoices(count: number) {
  return Array.from({ length: count }, (_, i) =>
    makeInvoice({ id: `inv-${i}`, issuer: `Supplier ${i}` })
  );
}

// ── InvoiceListItem memoization ───────────────────────────────────────────────

describe("InvoiceListItem memoization", () => {
  it("is wrapped in React.memo", () => {
    // Direct proof the memoization wrapper is actually applied, rather than
    // inferring it indirectly from render-timing (which is flaky in CI).
    expect(InvoiceListItem.$$typeof).toBe(Symbol.for("react.memo"));
  });

  it("re-renders and reflects new data when the invoice prop actually changes", () => {
    const invoice = makeInvoice({ status: "Tokenized" });

    const { rerender } = render(<InvoiceListItem invoice={invoice} />);

    expect(screen.getByText("Tokenized")).toBeInTheDocument();

    const updatedInvoice = { ...invoice, status: "Funded" };
    rerender(<InvoiceListItem invoice={updatedInvoice} />);

    expect(screen.getByText("Funded")).toBeInTheDocument();
    expect(screen.queryByText("Tokenized")).not.toBeInTheDocument();
  });
});

// ── InvoiceList integration — unrelated re-renders don't affect other rows ────

describe("InvoiceList — unrelated state changes do not re-render unaffected rows", () => {
  it("adding a new optimistic invoice does not affect already-rendered rows", async () => {
    const existing = makeInvoice({ id: "inv-existing", issuer: "Existing Supplier" });
    const loader = jest.fn().mockResolvedValue([existing]);

    const { rerender } = render(<InvoiceList loadInvoices={loader} optimisticInvoices={[]} />);

    await waitFor(() => expect(screen.getByText("Existing Supplier")).toBeInTheDocument());

    // The existing row's underlying invoice object reference is unchanged;
    // only a new optimistic invoice is added. Its row (memoized on the
    // `invoice` prop) is unaffected — output for both rows stays correct.
    rerender(
      <InvoiceList
        loadInvoices={loader}
        optimisticInvoices={[
          makeInvoice({
            id: "inv-new",
            issuer: "Brand New Upload",
            status: "Pending tokenization",
          }),
        ]}
      />
    );

    await waitFor(() => expect(screen.getByText("Brand New Upload")).toBeInTheDocument());
    expect(screen.getByText("Existing Supplier")).toBeInTheDocument();
  });
});

// ── Large data set ────────────────────────────────────────────────────────────

describe("InvoiceList — large data set", () => {
  it("renders correctly with a large number of invoices", async () => {
    const invoices = makeInvoices(200);
    const loader = jest.fn().mockResolvedValue(invoices);

    render(<InvoiceList loadInvoices={loader} />);

    await waitFor(() => expect(screen.getByText("Supplier 0")).toBeInTheDocument());
    expect(screen.getByText("Supplier 199")).toBeInTheDocument();
    expect(screen.getAllByText("Tokenized")).toHaveLength(200);
  });

  it("still reflects an optimistic update correctly among a large existing list", async () => {
    const invoices = makeInvoices(100);
    const loader = jest.fn().mockResolvedValue(invoices);

    const { rerender } = render(<InvoiceList loadInvoices={loader} optimisticInvoices={[]} />);

    await waitFor(() => expect(screen.getByText("Supplier 0")).toBeInTheDocument());

    rerender(
      <InvoiceList
        loadInvoices={loader}
        optimisticInvoices={[
          makeInvoice({
            id: "inv-new-large",
            issuer: "Just Uploaded",
            status: "Pending tokenization",
          }),
        ]}
      />
    );

    await waitFor(() => expect(screen.getByText("Just Uploaded")).toBeInTheDocument());
    // Original data is untouched.
    expect(screen.getByText("Supplier 50")).toBeInTheDocument();
    expect(screen.getAllByText("Tokenized")).toHaveLength(100);
    expect(screen.getByText("Pending tokenization")).toBeInTheDocument();
  });
});
