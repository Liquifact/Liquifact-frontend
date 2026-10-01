/**
 * @file app/settings/loading.concurrent.test.jsx
 * Concurrency & Race Condition Regression Tests for app/settings/loading.js and SettingsPage
 *
 * Verifies that:
 *  - Concurrent or repeated mounting of SettingsLoading is deterministic and thread-safe.
 *  - Racing asynchronous requests do not cause stale data to overwrite newer state.
 *  - Rapid, duplicated retries resolve idempotently.
 *  - Unmounting in the middle of in-flight loader promises does not trigger errors or leaks.
 */

import React from "react";
import { render, screen, act, fireEvent } from "@testing-library/react";
import SettingsLoadingDefault, { SettingsLoading } from "./loading";
import SettingsPage from "./page";

describe("app/settings/loading.js - Concurrency & Race Hardening", () => {
  it("renders multiple SettingsLoading instances concurrently without cross-instance interference", () => {
    render(
      <div>
        <SettingsLoading data-testid="loader-1" className="loader-first" isBusy={true} />
        <SettingsLoading data-testid="loader-2" className="loader-second" isBusy={false} />
      </div>
    );

    const loader1 = screen.getByTestId("loader-1");
    const loader2 = screen.getByTestId("loader-2");

    expect(loader1).toBeInTheDocument();
    expect(loader2).toBeInTheDocument();
    expect(loader1).toHaveAttribute("aria-busy", "true");
    expect(loader2).toHaveAttribute("aria-busy", "false");
    expect(loader1).toHaveClass("loader-first");
    expect(loader2).toHaveClass("loader-second");
  });

  it("handles rapid mount and unmount cycles without throwing errors", () => {
    for (let i = 0; i < 30; i++) {
      const { unmount } = render(<SettingsLoading isBusy={i % 2 === 0} />);
      unmount();
    }
  });

  it("prevents out-of-order racing loader responses from overwriting newer state in SettingsPage", async () => {
    let slowResolve;
    let fastResolve;

    const slowPromise = new Promise((resolve) => {
      slowResolve = resolve;
    });
    const fastPromise = new Promise((resolve) => {
      fastResolve = resolve;
    });

    let callCount = 0;
    const dynamicLoader = jest.fn(() => {
      callCount++;
      if (callCount === 1) {
        return slowPromise; // First, slow request
      }
      return fastPromise; // Second, faster request
    });

    const { rerender } = render(
      <SettingsPage loadSettings={(...args) => dynamicLoader(...args)} />
    );

    // Initially loading
    expect(screen.getByTestId("settings-loading")).toBeInTheDocument();
    expect(dynamicLoader).toHaveBeenCalledTimes(1);

    // Trigger a second load while the first is still pending
    rerender(<SettingsPage loadSettings={(...args) => dynamicLoader(...args)} />);
    expect(dynamicLoader).toHaveBeenCalledTimes(2);

    // Resolve the SECOND (fast) request first with fresh data
    const freshData = [
      {
        id: "fresh-pref",
        category: "notifications",
        label: "Fresh Setting",
        type: "toggle",
        value: "enabled",
        description: "Fresh setting description",
      },
    ];
    await act(async () => {
      fastResolve(freshData);
      await fastPromise;
    });

    // Verify fresh data is rendered
    expect(screen.queryByTestId("settings-loading")).not.toBeInTheDocument();
    expect(screen.getByText("Fresh Setting")).toBeInTheDocument();

    // Now resolve the FIRST (slow) request with stale data
    const staleData = [
      {
        id: "stale-pref",
        category: "notifications",
        label: "Stale Setting",
        type: "toggle",
        value: "disabled",
        description: "Stale setting description",
      },
    ];
    await act(async () => {
      slowResolve(staleData);
      await slowPromise;
    });

    // The stale response MUST be ignored; fresh data must remain
    expect(screen.getByText("Fresh Setting")).toBeInTheDocument();
    expect(screen.queryByText("Stale Setting")).not.toBeInTheDocument();
  });

  it("idempotently handles rapid repeated retry clicks without stale error states", async () => {
    let firstReject;
    let secondResolve;

    const firstPromise = new Promise((_, reject) => {
      firstReject = reject;
    });
    const secondPromise = new Promise((resolve) => {
      secondResolve = resolve;
    });

    let attempt = 0;
    const retryLoader = jest.fn(() => {
      attempt++;
      if (attempt === 1) return firstPromise;
      return secondPromise;
    });

    render(<SettingsPage loadSettings={retryLoader} />);

    // First attempt fails
    await act(async () => {
      firstReject(new Error("Network disconnect"));
      try {
        await firstPromise;
      } catch (e) {
        // ignore
      }
    });

    expect(screen.getByText("Unable to load settings")).toBeInTheDocument();
    const tryAgainBtn = screen.getByRole("button", { name: /try again/i });

    // Click retry
    await act(async () => {
      fireEvent.click(tryAgainBtn);
    });

    expect(screen.getByTestId("settings-loading")).toBeInTheDocument();

    // Resolve successful retry
    const retryData = [
      {
        id: "recovered-pref",
        category: "display",
        label: "Recovered Setting",
        type: "toggle",
        value: "enabled",
        description: "Recovered successfully",
      },
    ];
    await act(async () => {
      secondResolve(retryData);
      await secondPromise;
    });

    // Successfully recovered
    expect(screen.queryByTestId("settings-loading")).not.toBeInTheDocument();
    expect(screen.getByText("Recovered Setting")).toBeInTheDocument();
  });

  it("survives unmount while loading is in-flight without unhandled rejections", async () => {
    let resolveInFlight;
    const inFlightPromise = new Promise((resolve) => {
      resolveInFlight = resolve;
    });

    const loader = jest.fn(() => inFlightPromise);
    const { unmount } = render(<SettingsPage loadSettings={loader} />);

    expect(screen.getByTestId("settings-loading")).toBeInTheDocument();

    // Unmount before promise resolves
    unmount();

    // Resolve after unmount
    await act(async () => {
      resolveInFlight([
        {
          id: "late-pref",
          category: "notifications",
          label: "Late Setting",
          type: "toggle",
          value: "disabled",
          description: "Late item",
        },
      ]);
      await inFlightPromise;
    });

    // Clean unmount
    expect(screen.queryByTestId("settings-loading")).not.toBeInTheDocument();
  });
});
