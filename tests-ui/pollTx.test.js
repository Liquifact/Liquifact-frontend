/**
 * pollTx tests — run with `npm run test:ui` (vitest + jsdom).
 * Uses vitest's fake timers with setSystemTime for Date.now().
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { pollTransaction, RESULT } from "@/lib/stellar/pollTx.js";
import { rpc as SorobanRpc } from "@stellar/stellar-sdk";

// ── Mock RPC Server ──────────────────────────────────────────────────────────

function createMockServer(responses) {
  let callIndex = 0;
  return {
    getTransaction: vi.fn(async (hash) => {
      const response = responses[callIndex] ?? responses[responses.length - 1];
      callIndex++;
      return response;
    }),
  };
}

const SUCCESS_RESPONSE = { status: SorobanRpc.Api.GetTransactionStatus.SUCCESS };
const FAILED_RESPONSE = { status: SorobanRpc.Api.GetTransactionStatus.FAILED };
const NOT_FOUND_RESPONSE = { status: SorobanRpc.Api.GetTransactionStatus.NOT_FOUND };
const PENDING_RESPONSE = { status: SorobanRpc.Api.GetTransactionStatus.PENDING };

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("pollTransaction - success scenarios", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns SUCCESS immediately when transaction succeeds", async () => {
    const server = createMockServer([SUCCESS_RESPONSE]);
    const result = await pollTransaction(server, "a".repeat(64), { intervalMs: 100, timeoutMs: 5000 });
    expect(result).toBe(RESULT.SUCCESS);
  });

  it("returns SUCCESS after multiple NOT_FOUND polls", async () => {
    const server = createMockServer([NOT_FOUND_RESPONSE, NOT_FOUND_RESPONSE, SUCCESS_RESPONSE]);
    const promise = pollTransaction(server, "b".repeat(64), { intervalMs: 100, timeoutMs: 5000 });
    vi.advanceTimersByTime(100);
    await vi.runOnlyPendingTimersAsync();
    vi.advanceTimersByTime(100);
    await vi.runOnlyPendingTimersAsync();
    vi.advanceTimersByTime(100);
    await vi.runOnlyPendingTimersAsync();
    const result = await promise;
    expect(result).toBe(RESULT.SUCCESS);
  });

  it("returns SUCCESS after PENDING status", async () => {
    const server = createMockServer([PENDING_RESPONSE, PENDING_RESPONSE, SUCCESS_RESPONSE]);
    const promise = pollTransaction(server, "c".repeat(64), { intervalMs: 100, timeoutMs: 5000 });
    vi.advanceTimersByTime(100);
    await vi.runOnlyPendingTimersAsync();
    vi.advanceTimersByTime(100);
    await vi.runOnlyPendingTimersAsync();
    vi.advanceTimersByTime(100);
    await vi.runOnlyPendingTimersAsync();
    const result = await promise;
    expect(result).toBe(RESULT.SUCCESS);
  });
});

describe("pollTransaction - failure scenarios", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns FAILED when transaction fails", async () => {
    const server = createMockServer([FAILED_RESPONSE]);
    const result = await pollTransaction(server, "d".repeat(64), { intervalMs: 100, timeoutMs: 5000 });
    expect(result).toBe(RESULT.FAILED);
  });

  it("returns FAILED after NOT_FOUND then FAILED", async () => {
    const server = createMockServer([NOT_FOUND_RESPONSE, NOT_FOUND_RESPONSE, FAILED_RESPONSE]);
    const promise = pollTransaction(server, "e".repeat(64), { intervalMs: 100, timeoutMs: 5000 });
    vi.advanceTimersByTime(100);
    await vi.runOnlyPendingTimersAsync();
    vi.advanceTimersByTime(100);
    await vi.runOnlyPendingTimersAsync();
    vi.advanceTimersByTime(100);
    await vi.runOnlyPendingTimersAsync();
    const result = await promise;
    expect(result).toBe(RESULT.FAILED);
  });
});

describe("pollTransaction - timeout", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns NOT_FOUND_TIMEOUT when transaction never found", async () => {
    const server = createMockServer([NOT_FOUND_RESPONSE]);
    const promise = pollTransaction(server, "f".repeat(64), { intervalMs: 100, timeoutMs: 1000 });
    for (let i = 0; i < 12; i++) {
      vi.advanceTimersByTime(100);
      await vi.runOnlyPendingTimersAsync();
    }
    const result = await promise;
    expect(result).toBe(RESULT.NOT_FOUND_TIMEOUT);
  });

  it("returns NOT_FOUND_TIMEOUT when pending indefinitely", async () => {
    const server = createMockServer([PENDING_RESPONSE]);
    const promise = pollTransaction(server, "g".repeat(64), { intervalMs: 100, timeoutMs: 1000 });
    for (let i = 0; i < 12; i++) {
      vi.advanceTimersByTime(100);
      await vi.runOnlyPendingTimersAsync();
    }
    const result = await promise;
    expect(result).toBe(RESULT.NOT_FOUND_TIMEOUT);
  });
});

describe("pollTransaction - abort signal", () => {
  // No fake timers needed for abort tests
  it("aborts cleanly when signal fires before first poll", async () => {
    const controller = new AbortController();
    const server = createMockServer([NOT_FOUND_RESPONSE]);
    const promise = pollTransaction(server, "h".repeat(64), {
      intervalMs: 100,
      timeoutMs: 5000,
      signal: controller.signal,
    });
    controller.abort();
    await expect(promise).rejects.toMatchObject({ name: "AbortError" });
  });

  it("aborts cleanly when signal fires during polling", async () => {
    const controller = new AbortController();
    const server = createMockServer([NOT_FOUND_RESPONSE, NOT_FOUND_RESPONSE, NOT_FOUND_RESPONSE]);
    const promise = pollTransaction(server, "i".repeat(64), {
      intervalMs: 100,
      timeoutMs: 5000,
      signal: controller.signal,
    });
    // Allow polling to start
    await new Promise(r => setTimeout(r, 10));
    controller.abort();
    await expect(promise).rejects.toMatchObject({ name: "AbortError" });
  });

  it("throws if signal already aborted before call", async () => {
    const controller = new AbortController();
    controller.abort();
    const server = createMockServer([SUCCESS_RESPONSE]);
    await expect(pollTransaction(server, "j".repeat(64), {
      intervalMs: 100,
      timeoutMs: 5000,
      signal: controller.signal,
    })).rejects.toMatchObject({ name: "AbortError" });
  });
});

describe("pollTransaction - exponential backoff", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("uses exponential backoff after 10 seconds", async () => {
    // With 1000ms interval, 10s backoff start, 60s timeout:
    // First 10 polls at 1000ms intervals (0-9000ms)
    // Then backoff: 1500, 2250, 3375, 5062, 7593, 10000 (capped)
    // Total polls before 60s: ~19
    const responses = Array(14).fill(NOT_FOUND_RESPONSE);
    responses.push(SUCCESS_RESPONSE);
    const server = createMockServer(responses);

    const promise = pollTransaction(server, "k".repeat(64), {
      intervalMs: 1000,
      timeoutMs: 60000,
    });

    // Advance in steps to allow polling loop to progress
    for (let i = 0; i < 60; i++) {
      vi.advanceTimersByTime(1000);
      await vi.runOnlyPendingTimersAsync();
      // Check if promise resolved
      const result = await Promise.race([promise, Promise.resolve(null)]);
      if (result !== null) {
        expect(result).toBe(RESULT.SUCCESS);
        return;
      }
    }
    // If we get here, promise didn't resolve in time
    const result = await promise;
    expect(result).toBe(RESULT.SUCCESS);
  });
});

describe("pollTransaction - network errors", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("continues polling on network error", async () => {
    let callCount = 0;
    const server = {
      getTransaction: vi.fn(async () => {
        callCount++;
        if (callCount === 1) throw new Error("Network error");
        return SUCCESS_RESPONSE;
      }),
    };
    const promise = pollTransaction(server, "l".repeat(64), { intervalMs: 100, timeoutMs: 5000 });
    vi.advanceTimersByTime(100);
    await vi.runOnlyPendingTimersAsync();
    vi.advanceTimersByTime(100);
    await vi.runOnlyPendingTimersAsync();
    const result = await promise;
    expect(result).toBe(RESULT.SUCCESS);
    expect(callCount).toBe(2);
  });
});

describe("pollTransaction - RESULT constants", () => {
  it("RESULT object has expected values", () => {
    expect(RESULT.SUCCESS).toBe("SUCCESS");
    expect(RESULT.FAILED).toBe("FAILED");
    expect(RESULT.NOT_FOUND_TIMEOUT).toBe("NOT_FOUND_TIMEOUT");
  });
});