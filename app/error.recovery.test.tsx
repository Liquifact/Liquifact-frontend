/**
 * Determinism regression tests for app/error.js — the route-level boundary.
 *
 * These complement app/error.test.tsx (which pins the existing rendering and
 * reporting contract) by asserting the failure-recovery invariants that were
 * previously unguarded:
 *  - exactly-once reporting per distinct error instance
 *  - single-flight recovery (re-entrant clicks are ignored)
 *  - a missing/throwing reset is caught and surfaced deterministically
 */
import React from "react";
import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";

expect.extend(toHaveNoViolations);

jest.mock("../lib/observability/reportError", () => ({
  reportError: jest.fn(),
}));

import GlobalError, { ERROR_RECOVERY_FAILED } from "./error";
import { reportError } from "../lib/observability/reportError";
import { copy } from "./copy/en";

function makeError(message = "boom") {
  const err = new Error(message);
  err.digest = "digest-1";
  return err;
}

describe("GlobalError (app/error.js) — deterministic recovery", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("does not re-report the same error instance on re-render", () => {
    const error = makeError();
    const reset = jest.fn();
    const { rerender } = render(<GlobalError error={error} reset={reset} />);
    rerender(<GlobalError error={error} reset={reset} />);
    expect(reportError).toHaveBeenCalledTimes(1);
  });

  it("invokes reset once when the action button is clicked", () => {
    const reset = jest.fn();
    render(<GlobalError error={makeError()} reset={reset} />);
    fireEvent.click(screen.getByRole("button"));
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it("ignores a re-entrant click while recovery is in flight (single-flight)", () => {
    const reset = jest.fn(() => {
      // Force a nested click before reset returns.
      fireEvent.click(screen.getByRole("button"));
    });
    render(<GlobalError error={makeError()} reset={reset} />);

    fireEvent.click(screen.getByRole("button"));

    expect(reset).toHaveBeenCalledTimes(1);
  });

  it("catches a throwing reset, reports it, and shows the fallback", () => {
    const reset = jest.fn(() => {
      throw new Error("reset exploded");
    });
    render(<GlobalError error={makeError()} reset={reset} />);
    jest.clearAllMocks();

    expect(() => fireEvent.click(screen.getByRole("button"))).not.toThrow();

    expect(screen.getByText(ERROR_RECOVERY_FAILED)).toBeInTheDocument();
    expect(reportError).toHaveBeenCalledTimes(1);
    expect(reportError).toHaveBeenCalledWith(expect.any(Error), {
      digest: undefined,
      boundary: "route-error-recovery",
    });
  });

  it("handles a missing reset handler without crashing", () => {
    render(<GlobalError error={makeError()} reset={undefined} />);
    jest.clearAllMocks();

    expect(() => fireEvent.click(screen.getByRole("button"))).not.toThrow();

    expect(screen.getByText(ERROR_RECOVERY_FAILED)).toBeInTheDocument();
    expect(reportError).toHaveBeenCalledWith(expect.any(TypeError), {
      digest: undefined,
      boundary: "route-error-recovery",
    });
  });

  it("does not report when no error is provided", () => {
    render(<GlobalError error={null} reset={jest.fn()} />);
    expect(reportError).not.toHaveBeenCalled();
  });

  it("does not report again when recovery succeeds", () => {
    render(<GlobalError error={makeError()} reset={jest.fn()} />);
    jest.clearAllMocks();
    fireEvent.click(screen.getByRole("button"));
    expect(reportError).not.toHaveBeenCalled();
  });

  it("keeps the branded title visible even after recovery fails", () => {
    render(
      <GlobalError
        error={makeError()}
        reset={() => {
          throw new Error("nope");
        }}
      />
    );
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getAllByText(copy.error.title).length).toBeGreaterThanOrEqual(1);
  });

  it("has no axe violations", async () => {
    const { container } = render(<GlobalError error={makeError()} reset={jest.fn()} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
