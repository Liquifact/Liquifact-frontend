import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import Form from "./Form";

describe("Form Component", () => {
  it("renders the children correctly", () => {
    render(
      <Form onSubmit={() => {}}>
        <div data-testid="child">Child Content</div>
      </Form>
    );
    expect(screen.getByTestId("child")).toBeInTheDocument();
  });

  it("applies default classes and additional className", () => {
    const { container } = render(<Form onSubmit={() => {}} className="custom-class" />);
    const formElement = container.querySelector("form");
    expect(formElement).toHaveClass("rounded-xl", "border", "bg-slate-900/50", "custom-class");
  });

  it("calls onSubmit when submitted", () => {
    const handleSubmit = jest.fn((e) => e.preventDefault());
    render(
      <Form onSubmit={handleSubmit}>
        <button type="submit">Submit</button>
      </Form>
    );

    fireEvent.submit(screen.getByRole("button", { name: /submit/i }).closest("form")!);
    expect(handleSubmit).toHaveBeenCalledTimes(1);
  });

  it("defaults to noValidate=true", () => {
    const { container } = render(<Form onSubmit={() => {}} />);
    const formElement = container.querySelector("form");
    expect(formElement).toHaveAttribute("novalidate");
  });

  it("passes additional props to the form element", () => {
    const { container } = render(
      <Form onSubmit={() => {}} data-test="custom-data" aria-label="custom-form" />
    );
    const formElement = container.querySelector("form");
    expect(formElement).toHaveAttribute("data-test", "custom-data");
    expect(formElement).toHaveAttribute("aria-label", "custom-form");
  });
});
