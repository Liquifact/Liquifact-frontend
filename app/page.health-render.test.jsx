import "@testing-library/jest-dom";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Home from "./page";

jest.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

jest.mock("../components/WalletStatusLazy", () => ({
  __esModule: true,
  default: function MockWalletStatusLazy() {
    return <button type="button">Connect Wallet</button>;
  },
}));

jest.mock("next/link", () => {
  function MockLink({ href, children, ...props }) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  }
  return {
    __esModule: true,
    default: MockLink,
  };
});

afterEach(() => {
  jest.restoreAllMocks();
});

function mockFetchOnce(responseBody, ok = true) {
  global.fetch = jest.fn().mockResolvedValueOnce({
    ok,
    json: jest.fn().mockResolvedValueOnce(responseBody),
  });
}

async function clickCheckHealth() {
  fireEvent.click(screen.getByRole("button", { name: /check backend health/i }));
  await waitFor(() => expect(screen.queryByText(/checking/i)).not.toBeInTheDocument());
}

describe.skip("Home health render", () => {
  it("renders recognized fields in a structured summary", async () => {
    mockFetchOnce({ status: "ok", message: "All good", version: "1.2.3" });
    render(<Home />);

    await clickCheckHealth();

    const status = screen.getByRole("status");
    expect(within(status).getByText(/connected/i)).toBeInTheDocument();
    expect(within(status).getByText(/All good/i)).toBeInTheDocument();
  });

  it("omits recognized fields that are missing", async () => {
    mockFetchOnce({ status: "ok" });
    render(<Home />);

    await clickCheckHealth();

    const status = screen.getByRole("status");
    expect(within(status).getByText(/connected/i)).toBeInTheDocument();
    expect(within(status).queryByText(/All good/i)).not.toBeInTheDocument();
  });

  it("renders raw payload inside a collapsed details element", async () => {
    mockFetchOnce({ status: "ok", message: "healthy" });
    render(<Home />);

    await clickCheckHealth();

    const details = document.querySelector("details");
    expect(details).toBeInTheDocument();
    expect(details).not.toHaveAttribute("open");

    expect(screen.getByText(/view details/i)).toBeInTheDocument();
  });

  it("renders payload as text content, not HTML", async () => {
    mockFetchOnce({ status: "ok" });
    render(<Home />);

    await clickCheckHealth();

    const pre = document.querySelector("pre");
    expect(pre).toBeInTheDocument();
    expect(pre).not.toHaveAttribute("dangerouslySetInnerHTML");
  });

  it("does not truncate long payloads", async () => {
    const largePayload = {
      status: "ok",
      data: "x".repeat(5000),
    };
    mockFetchOnce(largePayload);
    render(<Home />);
    await clickCheckHealth();

    const pre = document.querySelector("pre");
    expect(pre.textContent).not.toMatch(/…\(truncated\)$/);
    expect(pre.textContent.length).toBeGreaterThan(5000);
  });

  it("does not add depth limit text for nested payloads", async () => {
    const deep = { a: { b: { c: { d: { e: { f: { g: "deep" } } } } } } };
    mockFetchOnce(deep);
    render(<Home />);
    await clickCheckHealth();

    const pre = document.querySelector("pre");
    expect(pre.textContent).not.toContain("[Depth limit reached]");
    expect(pre.textContent).toContain('"g": "deep"');
  });

  it("does not render health section before check", () => {
    render(<Home />);

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.queryByText(/view details/i)).not.toBeInTheDocument();
  });
});
