import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SettingsView from "./SettingsView";
import SettingsSkeleton from "./SettingsSkeleton";

describe("SettingsView Skeleton and Loading", () => {
  it("shows the skeleton during a slow load, then content", async () => {
    let resolveLoad;
    const loadData = () => new Promise((resolve) => {
      resolveLoad = resolve;
    });

    render(<SettingsView loadData={loadData} />);

    // Initially loading skeleton is visible
    expect(screen.getByRole("region", { name: /loading settings/i })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /loading settings/i })).toHaveAttribute("aria-busy", "true");
    
    // Resolve the load
    act(() => {
      resolveLoad({ email: "test@example.com", notifications: true });
    });

    // Content appears, skeleton disappears
    await waitFor(() => {
      expect(screen.queryByRole("region", { name: /loading settings/i })).not.toBeInTheDocument();
    });
    
    expect(screen.getByText("Settings")).toBeInTheDocument();
    expect(screen.getByDisplayValue("test@example.com")).toBeInTheDocument();
  });

  it("handles a fast load (no layout shift from empty to skeleton)", async () => {
    const loadData = () => Promise.resolve({ email: "fast@example.com", notifications: false });
    
    render(<SettingsView loadData={loadData} />);

    // Fast load will show content very quickly. The skeleton is in the DOM initially though
    // because it renders synchronously in loading state before effect resolves.
    expect(screen.getByRole("region", { name: /loading settings/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Settings")).toBeInTheDocument();
    });
    
    expect(screen.getByDisplayValue("fast@example.com")).toBeInTheDocument();
  });

  it("replaces skeleton with error state on failure", async () => {
    let rejectLoad;
    const loadData = () => new Promise((_, reject) => {
      rejectLoad = reject;
    });

    render(<SettingsView loadData={loadData} />);

    // Initially loading
    expect(screen.getByRole("region", { name: /loading settings/i })).toBeInTheDocument();

    // Reject the load
    act(() => {
      rejectLoad(new Error("Network Error"));
    });

    await waitFor(() => {
      expect(screen.queryByRole("region", { name: /loading settings/i })).not.toBeInTheDocument();
    });

    // Error state appears
    expect(screen.getByText("Failed to load settings")).toBeInTheDocument();
    expect(screen.getByText("Network Error")).toBeInTheDocument();
  });
});

describe("SettingsSkeleton", () => {
  it("renders a skeleton with aria-busy and aria-hidden elements", () => {
    render(<SettingsSkeleton />);
    
    const wrapper = screen.getByRole("region", { name: /loading settings/i });
    expect(wrapper).toHaveAttribute("aria-busy", "true");
    
    // There should be a sr-only label
    expect(screen.getByText("Loading settings, please wait…")).toHaveClass("sr-only");
  });
});
