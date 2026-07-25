import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe, toHaveNoViolations } from "jest-axe";
import "@testing-library/jest-dom";

import Button from "./Button";
import Spinner from "./Spinner";

expect.extend(toHaveNoViolations);

describe("Button", () => {
  it("renders children", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole("button", { name: /click me/i })).toBeInTheDocument();
  });

  it("forwards ref", () => {
    const ref = React.createRef<HTMLButtonElement>();
    render(<Button ref={ref}>Ref test</Button>);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });

  it("forwards additional props", () => {
    render(<Button data-testid="my-btn">Props test</Button>);
    expect(screen.getByTestId("my-btn")).toBeInTheDocument();
  });

  describe("variants", () => {
    const variants = ["primary", "secondary", "warning", "external", "danger"] as const;

    it.each(variants)("renders %s variant without visual regressions", (variant) => {
      const { container } = render(<Button variant={variant}>{variant}</Button>);
      expect(container.firstChild).toMatchSnapshot();
    });

    it.each(variants)("applies %s variant styles", (variant) => {
      render(<Button variant={variant}>{variant}</Button>);
      const btn = screen.getByRole("button");
      // Each variant has a distinct background/token class
      expect(btn.className).toContain(
        variant === "primary"
          ? "bg-cyan-500/20"
          : variant === "secondary"
            ? "border-slate-600"
            : variant === "warning"
              ? "bg-amber-500/20"
              : variant === "external"
                ? "bg-violet-500/20"
                : "bg-red-500/20"
      );
    });
  });

  it("has consistent focus-ring class across all variants", () => {
    const variants = ["primary", "secondary", "warning", "external", "danger"] as const;
    for (const variant of variants) {
      const { unmount } = render(<Button variant={variant}>{variant}</Button>);
      const btn = screen.getByRole("button");
      expect(btn.className).toContain("focus-ring");
      unmount();
    }
  });

  it("is disabled when disabled prop is true", () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
    expect(screen.getByRole("button")).toHaveClass("disabled:opacity-50");
    expect(screen.getByRole("button")).toHaveClass("disabled:cursor-not-allowed");
  });

  it("is disabled and shows spinner when loading", () => {
    render(<Button loading>Loading</Button>);
    const btn = screen.getByRole("button");
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("button").querySelector("svg")).toBeInTheDocument();
  });

  it("does not show spinner when not loading", () => {
    render(<Button>Not loading</Button>);
    expect(screen.getByRole("button").querySelector("svg")).not.toBeInTheDocument();
  });

  it("calls onClick when clicked", async () => {
    const user = userEvent.setup();
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click</Button>);
    await user.click(screen.getByRole("button"));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("does not call onClick when disabled", async () => {
    const user = userEvent.setup();
    const handleClick = jest.fn();
    render(
      <Button onClick={handleClick} disabled>
        Click
      </Button>
    );
    await user.click(screen.getByRole("button"));
    expect(handleClick).not.toHaveBeenCalled();
  });

  it("does not call onClick when loading", async () => {
    const user = userEvent.setup();
    const handleClick = jest.fn();
    render(
      <Button onClick={handleClick} loading>
        Click
      </Button>
    );
    await user.click(screen.getByRole("button"));
    expect(handleClick).not.toHaveBeenCalled();
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<Button>Accessible</Button>);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("has no a11y violations when loading", async () => {
    const { container } = render(<Button loading>Loading</Button>);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("has no a11y violations when disabled", async () => {
    const { container } = render(<Button disabled>Disabled</Button>);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe("Spinner", () => {
  it("renders an animated SVG", () => {
    render(<Spinner />);
    const svg = document.querySelector("svg");
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass("animate-spin");
  });

  it("is aria-hidden", () => {
    render(<Spinner />);
    const svg = document.querySelector("svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");
  });

  it("accepts custom className", () => {
    render(<Spinner className="h-8 w-8" />);
    const svg = document.querySelector("svg");
    expect(svg).toHaveClass("h-8");
    expect(svg).toHaveClass("w-8");
  });
});
