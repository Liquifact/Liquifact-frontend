import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import NotFound from "./not-found";
import { copy } from "./copy/en";

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

describe("NotFound", () => {
  it("renders a branded 404 with a focusable home link", () => {
    render(<NotFound />);

    expect(
      screen.getByRole("heading", { level: 1, name: copy.errors.notFoundTitle }),
    ).toBeInTheDocument();
    expect(screen.getByText(copy.errors.notFoundDescription)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: copy.errors.homeAction }),
    ).toHaveAttribute("href", "/");
  });
});
