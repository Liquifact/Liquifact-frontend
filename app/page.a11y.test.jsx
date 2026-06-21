import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";
import Home from "./page";
import { copy } from "./copy/en";

expect.extend(toHaveNoViolations);

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

describe("Home accessibility semantics", () => {
  it("has no automated accessibility violations", async () => {
    const { container } = render(<Home />);

    await expect(axe(container)).resolves.toHaveNoViolations();
  });

  it("uses a single h1 followed by the primary CTA h2 headings", () => {
    render(<Home />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      copy.home.heroTitle,
    );
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(2);
    expect(
      screen.getByRole("heading", { level: 2, name: copy.home.boxBusinessTitle }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: copy.home.boxInvestTitle }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: copy.home.apiStatusLabel }),
    ).not.toBeInTheDocument();
  });

  it("exposes primary landmarks and descriptive card link names", () => {
    render(<Home />);

    expect(screen.getByRole("navigation", { name: "Primary" })).toBeInTheDocument();
    expect(screen.getByRole("main")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: copy.home.boxBusinessLabel }),
    ).toHaveAttribute("href", "/invoices");
    expect(
      screen.getByRole("link", { name: copy.home.boxInvestLabel }),
    ).toHaveAttribute("href", "/invest");
    expect(screen.getByText(copy.home.apiStatusLabel)).toBeInTheDocument();
  });
});
