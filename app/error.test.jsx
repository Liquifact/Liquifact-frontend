import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Error from "./error";
import { copy } from "./copy/en";

describe("Error boundary", () => {
  it("renders a themed alert with safe fallback details", () => {
    render(<Error error={new Error("Backend unavailable")} reset={jest.fn()} />);

    expect(screen.getByRole("alert")).toHaveTextContent(copy.errors.boundaryTitle);
    expect(screen.getByRole("alert")).toHaveTextContent(copy.errors.boundaryDetails);
    expect(
      screen.getByRole("button", { name: copy.errors.resetAction }),
    ).toBeInTheDocument();
  });

  it("calls reset when the retry action is clicked", async () => {
    const reset = jest.fn();
    const user = userEvent.setup();

    render(<Error error={new Error("boom")} reset={reset} />);
    await user.click(screen.getByRole("button", { name: copy.errors.resetAction }));

    expect(reset).toHaveBeenCalledTimes(1);
  });
});
