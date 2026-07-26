import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import UploadErrorBoundary from "./UploadErrorBoundary";
import { reportError } from "../lib/observability/reportError";
import { copy } from "../app/copy/en";

jest.mock("../lib/observability/reportError", () => ({
  reportError: jest.fn(),
}));

const ThrowError = ({ shouldThrow }) => {
  if (shouldThrow) {
    throw new Error("Test error");
  }
  return <div data-testid="child">Normal render</div>;
};

describe("UploadErrorBoundary", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("renders children normally when there is no error", () => {
    render(
      <UploadErrorBoundary>
        <ThrowError shouldThrow={false} />
      </UploadErrorBoundary>
    );

    expect(screen.getByTestId("child")).toBeInTheDocument();
    expect(screen.getByText("Normal render")).toBeInTheDocument();
  });

  it("renders fallback UI when a child throws an error", () => {
    render(
      <UploadErrorBoundary>
        <ThrowError shouldThrow={true} />
      </UploadErrorBoundary>
    );

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText(copy.error.title)).toBeInTheDocument();
    expect(screen.getByText(copy.error.description)).toBeInTheDocument();
  });

  it("logs the error via reportError", () => {
    render(
      <UploadErrorBoundary>
        <ThrowError shouldThrow={true} />
      </UploadErrorBoundary>
    );

    expect(reportError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ component: "UploadErrorBoundary" })
    );
  });

  it("re-renders the child when the retry button is clicked", () => {
    const { rerender } = render(
      <UploadErrorBoundary>
        <ThrowError shouldThrow={true} />
      </UploadErrorBoundary>
    );

    expect(screen.getByRole("alert")).toBeInTheDocument();

    rerender(
      <UploadErrorBoundary>
        <ThrowError shouldThrow={false} />
      </UploadErrorBoundary>
    );

    fireEvent.click(screen.getByRole("button", { name: copy.error.actionLabel }));

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByTestId("child")).toBeInTheDocument();
  });
});
