import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import ErrorBoundary from "./ErrorBoundary";
import * as report from "@/lib/observability/reportError";

function Exploding() {
  throw new Error("boom");
}

function OK() {
  return <div data-testid="ok">OK</div>;
}

test("shows fallback and calls reportError when child throws", () => {
  const spy = jest.spyOn(report, "reportError").mockImplementation(() => {});

  render(
    <ErrorBoundary>
      <Exploding />
    </ErrorBoundary>
  );

  expect(screen.getByTestId("error-boundary-fallback")).toBeInTheDocument();
  expect(screen.getByTestId("error-boundary-retry")).toBeInTheDocument();
  expect(spy).toHaveBeenCalled();

  spy.mockRestore();
});

test("retry re-renders children", () => {
  let shouldThrow = true;
  const Dynamic = () => (shouldThrow ? <Exploding /> : <OK />);

  const { rerender } = render(
    <ErrorBoundary>
      <Dynamic />
    </ErrorBoundary>
  );

  expect(screen.getByTestId("error-boundary-fallback")).toBeInTheDocument();

  shouldThrow = false;
  fireEvent.click(screen.getByTestId("error-boundary-retry"));

  rerender(
    <ErrorBoundary>
      <Dynamic />
    </ErrorBoundary>
  );

  expect(screen.queryByTestId("error-boundary-fallback")).not.toBeInTheDocument();
  expect(screen.getByTestId("ok")).toBeInTheDocument();
});

test("normal render unaffected when child does not throw", () => {
  render(
    <ErrorBoundary>
      <OK />
    </ErrorBoundary>
  );

  expect(screen.queryByTestId("error-boundary-fallback")).not.toBeInTheDocument();
  expect(screen.getByTestId("ok")).toBeInTheDocument();
});
