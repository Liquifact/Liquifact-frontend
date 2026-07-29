/**
 * @file lib/a11y/liveRegion.test.js
 *
 * Tests for the wallet live-region announcer utility.
 *
 * Covers:
 *   - region creation and attributes
 *   - announce success / failure messages
 *   - debounce behaviour (rapid calls → single update)
 *   - no visual change (sr-only class)
 */

import { ensureLiveRegion, announce, resetAnnouncer, DEBOUNCE_MS } from "./liveRegion";

const REGION_ID = "a11y-wallet-live-region";

beforeEach(() => {
  resetAnnouncer();
  const existing = document.getElementById(REGION_ID);
  if (existing) existing.remove();
});

afterEach(() => {
  resetAnnouncer();
  const existing = document.getElementById(REGION_ID);
  if (existing) existing.remove();
});

describe("liveRegion — ensureLiveRegion", () => {
  it("creates a polite aria-live region on first call", () => {
    const region = ensureLiveRegion();
    expect(region).toBeTruthy();
    expect(region.id).toBe(REGION_ID);
    expect(region.getAttribute("role")).toBe("status");
    expect(region.getAttribute("aria-live")).toBe("polite");
    expect(region.getAttribute("aria-atomic")).toBe("true");
  });

  it("applies sr-only so there is no visual change", () => {
    const region = ensureLiveRegion();
    expect(region.classList.contains("sr-only")).toBe(true);
  });

  it("returns the same element on subsequent calls", () => {
    const first = ensureLiveRegion();
    const second = ensureLiveRegion();
    expect(first).toBe(second);
  });

  it("appends the region to document.body", () => {
    const region = ensureLiveRegion();
    expect(region.parentNode).toBe(document.body);
  });
});

describe("liveRegion — announce", () => {
  it("does not update the region immediately (debounce)", () => {
    ensureLiveRegion();
    announce("Wallet connected successfully");

    expect(document.getElementById(REGION_ID).textContent).toBe("");
  });

  it("updates the region after the debounce window", () => {
    jest.useFakeTimers();
    ensureLiveRegion();

    announce("Wallet connected successfully");
    jest.advanceTimersByTime(DEBOUNCE_MS);

    expect(document.getElementById(REGION_ID).textContent).toBe("Wallet connected successfully");
    jest.useRealTimers();
  });

  it("announces wallet connect failure", () => {
    jest.useFakeTimers();
    ensureLiveRegion();

    announce("Wallet connection failed");
    jest.advanceTimersByTime(DEBOUNCE_MS);

    expect(document.getElementById(REGION_ID).textContent).toBe("Wallet connection failed");
    jest.useRealTimers();
  });

  it("announces wallet disconnect", () => {
    jest.useFakeTimers();
    ensureLiveRegion();

    announce("Wallet disconnected");
    jest.advanceTimersByTime(DEBOUNCE_MS);

    expect(document.getElementById(REGION_ID).textContent).toBe("Wallet disconnected");
    jest.useRealTimers();
  });

  it("announces transaction sent successfully", () => {
    jest.useFakeTimers();
    ensureLiveRegion();

    announce("Transaction sent successfully");
    jest.advanceTimersByTime(DEBOUNCE_MS);

    expect(document.getElementById(REGION_ID).textContent).toBe("Transaction sent successfully");
    jest.useRealTimers();
  });

  it("announces transaction failure", () => {
    jest.useFakeTimers();
    ensureLiveRegion();

    announce("Transaction failed");
    jest.advanceTimersByTime(DEBOUNCE_MS);

    expect(document.getElementById(REGION_ID).textContent).toBe("Transaction failed");
    jest.useRealTimers();
  });
});

describe("liveRegion — debounce behaviour", () => {
  it("coalesces rapid calls so only the last message is announced", () => {
    jest.useFakeTimers();
    ensureLiveRegion();

    announce("Wallet connection failed");
    // Fire a second call before the debounce window elapses.
    announce("Wallet connected successfully");

    jest.advanceTimersByTime(DEBOUNCE_MS);

    expect(document.getElementById(REGION_ID).textContent).toBe("Wallet connected successfully");
    jest.useRealTimers();
  });

  it("does not announce before the debounce window elapses", () => {
    jest.useFakeTimers();
    ensureLiveRegion();

    announce("Wallet connected successfully");
    jest.advanceTimersByTime(DEBOUNCE_MS - 1);

    expect(document.getElementById(REGION_ID).textContent).toBe("");

    jest.advanceTimersByTime(1);
    expect(document.getElementById(REGION_ID).textContent).toBe("Wallet connected successfully");
    jest.useRealTimers();
  });

  it("resets the timer on each new call within the window", () => {
    jest.useFakeTimers();
    ensureLiveRegion();

    announce("First message");
    jest.advanceTimersByTime(100);
    announce("Second message");
    jest.advanceTimersByTime(100);
    announce("Third message");
    jest.advanceTimersByTime(DEBOUNCE_MS);

    expect(document.getElementById(REGION_ID).textContent).toBe("Third message");
    jest.useRealTimers();
  });
});

describe("liveRegion — resetAnnouncer", () => {
  it("cancels a pending debounce so the region is not updated", () => {
    jest.useFakeTimers();
    ensureLiveRegion();

    announce("Wallet connected successfully");
    resetAnnouncer();
    jest.advanceTimersByTime(DEBOUNCE_MS);

    expect(document.getElementById(REGION_ID).textContent).toBe("");
    jest.useRealTimers();
  });
});

describe("liveRegion — SSR safety", () => {
  it("ensureLiveRegion is safe to call and returns a valid element in browser", () => {
    const region = ensureLiveRegion();
    expect(region).toBeInstanceOf(HTMLElement);
    expect(region.id).toBe(REGION_ID);
  });
});
