import "@testing-library/jest-dom";
import { act, render, screen } from "@testing-library/react";
import InvoiceList from "./InvoiceList";
import { copy } from "../app/copy/en";

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

const SUCCESS_INVOICES = [
  {
    id: "inv-1001",
    issuer: "Test Supplier",
    amount: "12,500",
    currency: "USD",
    dueDate: "2026-06-15",
    yield: "8.2%",
    status: "Tokenized",
  },
  {
    id: "inv-1002",
    issuer: "Another LLC",
    amount: "7,800",
    currency: "EUR",
    dueDate: "2026-07-01",
    yield: "7.5%",
    status: "Settled",
  },
];

function expectLoadingState() {
  expect(
    screen.getByRole("list", {
      name: /loading investable invoices/i,
    })
  ).toHaveAttribute("aria-busy", "true");
  expect(screen.getByRole("status")).toHaveTextContent("Loading invoices...");
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  expect(screen.queryByText("No invoices yet")).not.toBeInTheDocument();
  expect(screen.queryByText("Test Supplier")).not.toBeInTheDocument();
}

function expectSuccessState() {
  expect(
    screen.queryByRole("list", { name: /loading investable invoices/i })
  ).not.toBeInTheDocument();
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  expect(screen.queryByText("No invoices yet")).not.toBeInTheDocument();
  expect(screen.getByText("Test Supplier")).toBeInTheDocument();
  expect(screen.getByText("Another LLC")).toBeInTheDocument();
  expect(screen.getByRole("status")).toHaveTextContent("2 invoices available.");
}

function expectEmptyState() {
  expect(
    screen.queryByRole("list", { name: /loading investable invoices/i })
  ).not.toBeInTheDocument();
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  expect(screen.getByText("No invoices yet")).toBeInTheDocument();
  expect(screen.getByText(/upload your first invoice to get started/i)).toBeInTheDocument();
  expect(screen.queryByText("Test Supplier")).not.toBeInTheDocument();
  expect(screen.getByRole("status")).toHaveTextContent("No invoices are currently available.");
}

function expectErrorState() {
  expect(
    screen.queryByRole("list", { name: /loading investable invoices/i })
  ).not.toBeInTheDocument();
  expect(screen.getByRole("alert")).toHaveTextContent(copy.invoices.errorTitle);
  expect(screen.getByRole("alert")).toHaveTextContent(copy.invoices.errorDescription);
  expect(screen.queryByText("No invoices yet")).not.toBeInTheDocument();
  expect(screen.queryByText("Test Supplier")).not.toBeInTheDocument();
  expect(screen.getByRole("status")).toHaveTextContent(copy.invoices.errorDescription);
}

async function resolveDeferred<T>(deferred: ReturnType<typeof createDeferred<T>>, value: T) {
  await act(async () => {
    deferred.resolve(value);
    await deferred.promise;
  });
}

async function rejectDeferred(
  deferred: ReturnType<typeof createDeferred<unknown>>,
  error: Error
) {
  await act(async () => {
    deferred.reject(error);
    try {
      await deferred.promise;
    } catch {
      // The component handles the rejection by moving into its error state.
    }
  });
}

describe("InvoiceList state transitions", () => {
  it("renders only the loading UI before the loader settles", () => {
    const deferred = createDeferred<typeof SUCCESS_INVOICES>();
    render(<InvoiceList loadInvoices={() => deferred.promise} />);

    expectLoadingState();
  });

  it("transitions from loading to success and keeps the settled UI exclusive", async () => {
    const deferred = createDeferred<typeof SUCCESS_INVOICES>();
    render(<InvoiceList loadInvoices={() => deferred.promise} />);

    expectLoadingState();

    await resolveDeferred(deferred, SUCCESS_INVOICES);

    expectSuccessState();
  });

  it("transitions from loading to empty and keeps the settled UI exclusive", async () => {
    const deferred = createDeferred<unknown[]>();
    render(<InvoiceList loadInvoices={() => deferred.promise} />);

    expectLoadingState();

    await resolveDeferred(deferred, []);

    expectEmptyState();
  });

  it("treats a non-array loader result as the empty state", async () => {
    const deferred = createDeferred<{ unexpected: string }>();
    render(<InvoiceList loadInvoices={() => deferred.promise} />);

    expectLoadingState();

    await resolveDeferred(deferred, { unexpected: "shape" });

    expectEmptyState();
  });

  it("transitions from loading to error and keeps the settled UI exclusive", async () => {
    const deferred = createDeferred<typeof SUCCESS_INVOICES>();
    render(<InvoiceList loadInvoices={() => deferred.promise} />);

    expectLoadingState();

    await rejectDeferred(deferred, new Error("Network failure"));

    expectErrorState();
  });

  it("returns to loading and settles again when the loader function changes", async () => {
    const firstDeferred = createDeferred<typeof SUCCESS_INVOICES>();
    const secondDeferred = createDeferred<unknown[]>();
    const firstLoader = jest.fn(() => firstDeferred.promise);
    const secondLoader = jest.fn(() => secondDeferred.promise);

    const { rerender } = render(<InvoiceList loadInvoices={firstLoader} />);

    await resolveDeferred(firstDeferred, SUCCESS_INVOICES);
    expectSuccessState();

    rerender(<InvoiceList loadInvoices={secondLoader} />);

    expectLoadingState();

    await resolveDeferred(secondDeferred, []);

    expectEmptyState();
    expect(firstLoader).toHaveBeenCalledTimes(1);
    expect(secondLoader).toHaveBeenCalledTimes(1);
  });

  it("optimistically prepends new invoices without losing loaded results", async () => {
    const deferred = createDeferred<typeof SUCCESS_INVOICES>();
    const loadInvoices = jest.fn(() => deferred.promise);
    const optimisticInvoice = {
      id: "upload-123",
      issuer: "New Upload.pdf",
      amount: "Pending",
      currency: "USD",
      dueDate: "Pending",
      yield: "Pending",
      status: "Pending tokenization",
    };

    const { rerender } = render(
      <InvoiceList loadInvoices={loadInvoices} optimisticInvoices={[]} />
    );

    await resolveDeferred(deferred, SUCCESS_INVOICES);
    expectSuccessState();

    rerender(
      <InvoiceList loadInvoices={loadInvoices} optimisticInvoices={[optimisticInvoice]} />
    );

    expect(screen.getByText("New Upload.pdf")).toBeInTheDocument();
    expect(screen.getByText("Pending tokenization")).toBeInTheDocument();
    expect(screen.getByText("Test Supplier")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("3 invoices available.");
  });
});
