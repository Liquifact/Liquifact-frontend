import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import SettingsView from "./SettingsView";
import * as observability from "../lib/observability/reportError";

jest.mock("../lib/observability/reportError", () => ({
  reportError: jest.fn(),
}));

describe("SettingsView", () => {
  let consoleErrorSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("renders settings view correctly by default", () => {
    render(<SettingsView />);
    expect(screen.getByTestId("settings-content")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Settings");
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/enable email notifications/i)).toBeInTheDocument();
  });

  it("handles loadData resolving successfully", async () => {
    const mockLoad = jest.fn().mockResolvedValue({
      email: "custom@example.com",
      notifications: false,
    });

    render(<SettingsView loadData={mockLoad} />);

    expect(screen.getByTestId("settings-loading")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId("settings-content")).toBeInTheDocument();
    });

    expect(screen.getByLabelText(/email address/i)).toHaveValue("custom@example.com");
  });

  it("catches render errors in SettingsView with SettingsErrorBoundary", () => {
    const ThrowingChild = () => {
      throw new Error("Inner child error");
    };

    render(
      <SettingsView>
        <ThrowingChild />
      </SettingsView>
    );

    expect(screen.getByTestId("settings-error-boundary")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(observability.reportError).toHaveBeenCalled();
  });
});
