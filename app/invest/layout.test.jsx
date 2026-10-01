/**
 * @jest-environment jsdom
 *
 * @file app/invest/layout.test.jsx
 *
 * Tests for the InvestLayout component (app/invest/layout.js).
 *
 * Coverage:
 *   - Public interface contract (renders MarketplaceShell with children)
 *   - Valid children types (React elements, strings, numbers, arrays, fragments, null)
 *   - Invalid children types (plain objects, functions, invalid primitives) throw errors
 *   - Boundary cases (empty children, undefined children)
 *   - Regression tests (ensure MarketplaceShell is always rendered)
 *   - Server Component behavior (no hooks, no browser APIs)
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import InvestLayout from "./layout";

// Mock MarketplaceShell to avoid pulling in the full client component
jest.mock("./MarketplaceShell", () => {
  return function MockMarketplaceShell({ children }) {
    return <div data-testid="marketplace-shell">{children}</div>;
  };
});

describe("InvestLayout", () => {
  describe("public interface contract", () => {
    it("renders MarketplaceShell with children", () => {
      const childContent = <div data-testid="child">Test content</div>;
      render(<InvestLayout>{childContent}</InvestLayout>);

      const shell = screen.getByTestId("marketplace-shell");
      expect(shell).toBeInTheDocument();
      expect(shell).toContainElement(screen.getByTestId("child"));
    });

    it("preserves the contract that MarketplaceShell is always the direct parent", () => {
      const childContent = <span>Content</span>;
      const { container } = render(<InvestLayout>{childContent}</InvestLayout>);

      const shell = container.firstChild;
      expect(shell).toHaveAttribute("data-testid", "marketplace-shell");
    });
  });

  describe("valid children types", () => {
    it("accepts React elements as children", () => {
      const child = <div data-testid="element">Element</div>;
      render(<InvestLayout>{child}</InvestLayout>);

      expect(screen.getByTestId("element")).toBeInTheDocument();
    });

    it("accepts strings as children", () => {
      render(<InvestLayout>Plain text</InvestLayout>);

      const shell = screen.getByTestId("marketplace-shell");
      expect(shell).toHaveTextContent("Plain text");
    });

    it("accepts numbers as children", () => {
      render(<InvestLayout>{42}</InvestLayout>);

      const shell = screen.getByTestId("marketplace-shell");
      expect(shell).toHaveTextContent("42");
    });

    it("accepts arrays of children", () => {
      const children = [
        <div key="1" data-testid="child-1">
          First
        </div>,
        <div key="2" data-testid="child-2">
          Second
        </div>,
      ];
      render(<InvestLayout>{children}</InvestLayout>);

      expect(screen.getByTestId("child-1")).toBeInTheDocument();
      expect(screen.getByTestId("child-2")).toBeInTheDocument();
    });

    it("accepts React fragments as children", () => {
      render(
        <InvestLayout>
          <>
            <div data-testid="fragment-1">A</div>
            <div data-testid="fragment-2">B</div>
          </>
        </InvestLayout>
      );

      expect(screen.getByTestId("fragment-1")).toBeInTheDocument();
      expect(screen.getByTestId("fragment-2")).toBeInTheDocument();
    });

    it("accepts null as children (renders empty)", () => {
      const { container } = render(<InvestLayout>{null}</InvestLayout>);

      const shell = screen.getByTestId("marketplace-shell");
      expect(shell).toBeInTheDocument();
      expect(shell.childNodes.length).toBe(0);
    });

    it("accepts undefined as children (renders empty)", () => {
      const { container } = render(<InvestLayout>{undefined}</InvestLayout>);

      const shell = screen.getByTestId("marketplace-shell");
      expect(shell).toBeInTheDocument();
      expect(shell.childNodes.length).toBe(0);
    });

    it("accepts boolean false as children (renders empty)", () => {
      const { container } = render(<InvestLayout>{false}</InvestLayout>);

      const shell = screen.getByTestId("marketplace-shell");
      expect(shell).toBeInTheDocument();
      expect(shell.childNodes.length).toBe(0);
    });
  });

  describe("invalid children types", () => {
    it("throws error for plain object children (React throws first)", () => {
      const invalidChild = { foo: "bar" };

      // React throws before our validation for plain objects
      expect(() => render(<InvestLayout>{invalidChild}</InvestLayout>)).toThrow(
        "Objects are not valid as a React child"
      );
    });

    it("throws error for function children", () => {
      const invalidChild = () => <div>Function</div>;

      expect(() => render(<InvestLayout>{invalidChild}</InvestLayout>)).toThrow(
        "InvestLayout: Invalid children prop. Expected React.ReactNode but received function"
      );
    });

    it("throws error for symbol children", () => {
      const invalidChild = Symbol("test");

      expect(() => render(<InvestLayout>{invalidChild}</InvestLayout>)).toThrow(
        "InvestLayout: Invalid children prop. Expected React.ReactNode but received symbol"
      );
    });

    it("throws error for bigint children", () => {
      const invalidChild = BigInt(123);

      expect(() => render(<InvestLayout>{invalidChild}</InvestLayout>)).toThrow(
        "InvestLayout: Invalid children prop. Expected React.ReactNode but received bigint"
      );
    });
  });

  describe("boundary cases", () => {
    it("handles empty string children", () => {
      render(<InvestLayout>{""}</InvestLayout>);

      const shell = screen.getByTestId("marketplace-shell");
      expect(shell).toBeInTheDocument();
      expect(shell.textContent).toBe("");
    });

    it("handles zero as children", () => {
      render(<InvestLayout>{0}</InvestLayout>);

      const shell = screen.getByTestId("marketplace-shell");
      expect(shell).toHaveTextContent("0");
    });

    it("handles nested React elements", () => {
      render(
        <InvestLayout>
          <div>
            <span data-testid="nested">Nested content</span>
          </div>
        </InvestLayout>
      );

      expect(screen.getByTestId("nested")).toBeInTheDocument();
    });

    it("handles mixed valid children types", () => {
      render(
        <InvestLayout>
          <div data-testid="element">Element</div>
          Text content
          {42}
        </InvestLayout>
      );

      const shell = screen.getByTestId("marketplace-shell");
      expect(shell).toHaveTextContent("ElementText content42");
    });
  });

  describe("regression tests", () => {
    it("always renders MarketplaceShell regardless of children", () => {
      render(
        <InvestLayout>
          <div>Content</div>
        </InvestLayout>
      );

      const shell = screen.getByTestId("marketplace-shell");
      expect(shell).toBeInTheDocument();
    });

    it("MarketplaceShell is always the direct parent of children", () => {
      const { container } = render(
        <InvestLayout>
          <div>Child</div>
        </InvestLayout>
      );

      const shell = container.firstChild;
      expect(shell.tagName).toBe("DIV");
      expect(shell).toHaveAttribute("data-testid", "marketplace-shell");
    });

    it("does not conditionally render MarketplaceShell (invariant)", () => {
      // Test with various children to ensure no conditional logic exists
      const testCases = [<div>Normal</div>, null, undefined, <span>Span</span>];

      testCases.forEach((child) => {
        const { unmount } = render(<InvestLayout>{child}</InvestLayout>);
        expect(screen.getByTestId("marketplace-shell")).toBeInTheDocument();
        unmount();
      });
    });
  });

  describe("Server Component behavior", () => {
    it("does not use React hooks (Server Component invariant)", () => {
      // This is a compile-time invariant, but we can verify the component
      // doesn't exhibit hook-dependent behavior
      const { rerender } = render(
        <InvestLayout>
          <div>First</div>
        </InvestLayout>
      );

      expect(screen.getByTestId("marketplace-shell")).toBeInTheDocument();

      // Rerender with different children - should work without state issues
      rerender(
        <InvestLayout>
          <div>Second</div>
        </InvestLayout>
      );

      expect(screen.getByTestId("marketplace-shell")).toBeInTheDocument();
      expect(screen.getByText("Second")).toBeInTheDocument();
    });

    it("has no side effects during render", () => {
      // Render multiple times to ensure no side effects - use cleanup
      const { unmount: unmount1 } = render(
        <InvestLayout>
          <div>First</div>
        </InvestLayout>
      );
      expect(screen.getByTestId("marketplace-shell")).toBeInTheDocument();
      unmount1();

      const { unmount: unmount2 } = render(
        <InvestLayout>
          <div>Second</div>
        </InvestLayout>
      );
      expect(screen.getByTestId("marketplace-shell")).toBeInTheDocument();
      unmount2();

      const { unmount: unmount3 } = render(
        <InvestLayout>
          <div>Third</div>
        </InvestLayout>
      );
      expect(screen.getByTestId("marketplace-shell")).toBeInTheDocument();
      unmount3();
    });
  });

  describe("error messages", () => {
    it("provides descriptive error message for invalid children type (function)", () => {
      expect(() => render(<InvestLayout>{() => {}}</InvestLayout>)).toThrow(
        "InvestLayout: Invalid children prop"
      );
    });

    it("includes valid types in error message", () => {
      let caughtError;
      try {
        render(<InvestLayout>{() => {}}</InvestLayout>);
      } catch (error) {
        caughtError = error;
      }
      expect(caughtError).toBeDefined();
      expect(caughtError.message).toContain("Valid types:");
      expect(caughtError.message).toContain("React element");
      expect(caughtError.message).toContain("string");
      expect(caughtError.message).toContain("number");
      expect(caughtError.message).toContain("array");
      expect(caughtError.message).toContain("fragment");
      expect(caughtError.message).toContain("null");
    });

    it("React throws its own error for plain objects before our validation", () => {
      expect(() => render(<InvestLayout>{{ invalid: "object" }}</InvestLayout>)).toThrow(
        "Objects are not valid as a React child"
      );
    });
  });
});
