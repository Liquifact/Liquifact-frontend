import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FormsErrorBoundary from "./FormsErrorBoundary";
import { reportError } from "../lib/observability/reportError";

jest.mock("../lib/observability/reportError", () => ({
  reportError: jest.fn(),
}));

const ThrowError = () => {
  throw new Error("Forms render error");
};

describe("FormsErrorBoundary", () => {
  let consoleError;
  beforeAll(() => {
    consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
  });
  afterAll(() => {
    consoleError.mockRestore();
  });
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("renders children when there is no error", () => {
    render(
      <FormsErrorBoundary>
        <div>Forms content</div>
      </FormsErrorBoundary>
    );
    expect(screen.getByText("Forms content")).toBeInTheDocument();
  });

  it("renders fallback UI when child throws", () => {
    render(
      <FormsErrorBoundary>
        <ThrowError />
      </FormsErrorBoundary>
    );
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("An error occurred while loading the forms section.")).toBeInTheDocument();
    expect(reportError).toHaveBeenCalled();
  });

  it("resets error state when retry button is clicked", async () => {
    const user = userEvent.setup();
    let shouldThrow = true;
    const ConditionalThrow = ({ shouldThrow }) => {
      if (shouldThrow) {
        throw new Error("Forms render error");
      }
      return <div>Forms recovered</div>;
    };

    const { rerender } = render(
      <FormsErrorBoundary>
        <ConditionalThrow shouldThrow={true} />
      </FormsErrorBoundary>
    );

    expect(screen.getByRole("alert")).toBeInTheDocument();
    
    // Simulate issue being fixed
    rerender(
      <FormsErrorBoundary>
        <ConditionalThrow shouldThrow={false} />
      </FormsErrorBoundary>
    );
    
    await user.click(screen.getByRole("button", { name: "Retry loading forms" }));
    
    expect(screen.getByText("Forms recovered")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
