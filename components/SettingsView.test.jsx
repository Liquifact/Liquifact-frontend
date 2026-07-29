import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
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

    expect(screen.getByTestId("settings-loading")).toHaveAttribute("aria-busy", "true");

    await waitFor(() => {
      expect(screen.getByTestId("settings-content")).toBeInTheDocument();
    });

    expect(screen.getByLabelText(/email address/i)).toHaveValue("custom@example.com");
  });

  it("handles loadData failure with retry", async () => {
    const mockLoad = jest.fn()
      .mockRejectedValueOnce(new Error("Failed to load"))
      .mockResolvedValueOnce({ email: "recovered@example.com", notifications: true });

    render(<SettingsView loadData={mockLoad} />);

    // Initial loading
    expect(screen.getByTestId("settings-loading")).toBeInTheDocument();

    // Error state
    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
    expect(screen.getByText(/Unable to load settings/i)).toBeInTheDocument();

    // Retry
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));

    expect(screen.getByTestId("settings-loading")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId("settings-content")).toBeInTheDocument();
    });

    expect(mockLoad).toHaveBeenCalledTimes(2);
  });

  it("handles empty data state", async () => {
    const mockLoad = jest.fn().mockResolvedValue({});

    render(<SettingsView loadData={mockLoad} />);

    await waitFor(() => {
      expect(screen.getByText(/No settings found/i)).toBeInTheDocument();
    });
    expect(screen.queryByTestId("settings-content")).not.toBeInTheDocument();
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
