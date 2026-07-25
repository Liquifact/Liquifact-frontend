import "@testing-library/jest-dom";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { axe } from "jest-axe";

import { ToastProvider, useToast } from "../ToastProvider";

function TestHarness() {
  const toast = useToast();
  return (
    <div>
      <button type="button" onClick={() => toast.info("First info toast")}>
        trigger-one
      </button>
      <button type="button" onClick={() => toast.success("Second success toast")}>
        trigger-two
      </button>
      <button type="button" onClick={() => toast.error("Third error toast")}>
        trigger-three
      </button>
    </div>
  );
}

function renderWithToastProvider(ui = <TestHarness />) {
  return render(<ToastProvider>{ui}</ToastProvider>);
}

jest.setTimeout(20000);

describe("ToastProvider - jest-axe accessibility", () => {
  it("empty state: no toasts visible, no accessibility violations", async () => {
    const { container } = renderWithToastProvider();
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("loaded state: info toast visible, no accessibility violations", async () => {
    const { container } = renderWithToastProvider();
    const one = screen.getByText("trigger-one");
    fireEvent.click(one);
    expect(screen.getByText("First info toast")).toBeInTheDocument();

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("loaded state: success toast visible, no accessibility violations", async () => {
    const { container } = renderWithToastProvider();
    const two = screen.getByText("trigger-two");
    fireEvent.click(two);
    expect(screen.getByText("Second success toast")).toBeInTheDocument();

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("error state: error toast visible, no accessibility violations", async () => {
    const { container } = renderWithToastProvider();
    const three = screen.getByText("trigger-three");
    fireEvent.click(three);
    expect(screen.getByText("Third error toast")).toBeInTheDocument();

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("mixed state: multiple toasts of different variants, no accessibility violations", async () => {
    const { container } = renderWithToastProvider();
    const one = screen.getByText("trigger-one");
    const two = screen.getByText("trigger-two");
    const three = screen.getByText("trigger-three");

    fireEvent.click(one);
    fireEvent.click(two);
    fireEvent.click(three);

    expect(screen.getByText("First info toast")).toBeInTheDocument();
    expect(screen.getByText("Second success toast")).toBeInTheDocument();
    expect(screen.getByText("Third error toast")).toBeInTheDocument();

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("status region is accessible via role=status", async () => {
    const { container } = renderWithToastProvider();
    expect(container.querySelector('[role="status"]')).toBeInTheDocument();
    expect(container.querySelector('[aria-live="polite"]')).toBeInTheDocument();

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("dismiss buttons have descriptive aria-labels", async () => {
    const { container } = renderWithToastProvider();
    const one = screen.getByText("trigger-one");
    fireEvent.click(one);

    const dismissButton = screen.getByRole("button", { name: "Dismiss notification" });
    expect(dismissButton).toBeInTheDocument();

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
