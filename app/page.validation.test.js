/**
 * Unit tests for the exported validation-boundary helpers in app/page.js.
 *
 * Tests are isolated from React rendering — they exercise the pure functions
 * directly to give precise coverage of every boundary case:
 *
 *   - normalizeStatus: allowlist enforcement, fallback to "unreachable"
 *   - sanitizeHealthResult: status normalisation, message cap, field passthrough
 *
 * These helpers are the single enforcement point for all attacker-controlled
 * values that flow through the health-check pipeline (Issue #1215).
 */

import { normalizeStatus, sanitizeHealthResult } from "./page";

// ── normalizeStatus ───────────────────────────────────────────────────────────

describe("normalizeStatus", () => {
  // ── Valid allowlist members ──────────────────────────────────────────────

  it('returns "connected" for "connected"', () => {
    expect(normalizeStatus("connected")).toBe("connected");
  });

  it('returns "degraded" for "degraded"', () => {
    expect(normalizeStatus("degraded")).toBe("degraded");
  });

  it('returns "unreachable" for "unreachable"', () => {
    expect(normalizeStatus("unreachable")).toBe("unreachable");
  });

  // ── Unknown / invalid values normalise to "unreachable" ──────────────────

  it('falls back to "unreachable" for an unknown string', () => {
    expect(normalizeStatus("ok")).toBe("unreachable");
  });

  it('falls back to "unreachable" for an empty string', () => {
    expect(normalizeStatus("")).toBe("unreachable");
  });

  it('falls back to "unreachable" for null', () => {
    expect(normalizeStatus(null)).toBe("unreachable");
  });

  it('falls back to "unreachable" for undefined', () => {
    expect(normalizeStatus(undefined)).toBe("unreachable");
  });

  it('falls back to "unreachable" for a number', () => {
    expect(normalizeStatus(200)).toBe("unreachable");
  });

  it('falls back to "unreachable" for an object', () => {
    expect(normalizeStatus({ status: "connected" })).toBe("unreachable");
  });

  it('falls back to "unreachable" for an array', () => {
    expect(normalizeStatus(["connected"])).toBe("unreachable");
  });

  it('falls back to "unreachable" for a boolean', () => {
    expect(normalizeStatus(true)).toBe("unreachable");
  });

  it("is case-sensitive — 'Connected' is not a valid status", () => {
    expect(normalizeStatus("Connected")).toBe("unreachable");
  });

  it("rejects a script-injection attempt in the status field", () => {
    expect(normalizeStatus("<script>alert(1)</script>")).toBe("unreachable");
  });

  it("rejects a javascript: URI attempt in the status field", () => {
    expect(normalizeStatus("javascript:void(0)")).toBe("unreachable");
  });
});

// ── sanitizeHealthResult ──────────────────────────────────────────────────────

describe("sanitizeHealthResult", () => {
  // ── Status normalisation passthrough ─────────────────────────────────────

  it("preserves a valid status unchanged", () => {
    expect(sanitizeHealthResult({ status: "connected", message: "ok" }).status).toBe("connected");
  });

  it("normalises an unknown status to unreachable", () => {
    expect(sanitizeHealthResult({ status: "UNKNOWN", message: "x" }).status).toBe("unreachable");
  });

  it("normalises a null status to unreachable", () => {
    expect(sanitizeHealthResult({ status: null, message: "x" }).status).toBe("unreachable");
  });

  it("normalises a missing status key to unreachable", () => {
    expect(sanitizeHealthResult({ message: "no status" }).status).toBe("unreachable");
  });

  // ── Message capping ───────────────────────────────────────────────────────

  it("preserves a message shorter than 300 characters", () => {
    const msg = "short message";
    expect(sanitizeHealthResult({ status: "connected", message: msg }).message).toBe(msg);
  });

  it("preserves a message exactly 300 characters", () => {
    const msg = "A".repeat(300);
    const result = sanitizeHealthResult({ status: "connected", message: msg });
    expect(result.message).toBe(msg);
    expect(result.message.length).toBe(300);
  });

  it("truncates a message longer than 300 characters", () => {
    const msg = "B".repeat(500);
    const result = sanitizeHealthResult({ status: "connected", message: msg });
    expect(result.message.length).toBeLessThan(msg.length);
    expect(result.message).toMatch(/…\(truncated\)/);
  });

  it("returns an empty string when message is missing", () => {
    expect(sanitizeHealthResult({ status: "connected" }).message).toBe("");
  });

  it("returns an empty string when message is null", () => {
    expect(sanitizeHealthResult({ status: "connected", message: null }).message).toBe("");
  });

  it("coerces a non-string message to empty string", () => {
    expect(sanitizeHealthResult({ status: "connected", message: 12345 }).message).toBe("");
  });

  // ── Other fields passthrough ──────────────────────────────────────────────

  it("forwards the details field unchanged", () => {
    const details = { version: "1.0.0", extra: true };
    const result = sanitizeHealthResult({ status: "connected", message: "ok", details });
    expect(result.details).toEqual(details);
  });

  it("spreads unknown extra fields onto the result", () => {
    const result = sanitizeHealthResult({
      status: "connected",
      message: "ok",
      customField: "custom",
    });
    expect(result.customField).toBe("custom");
  });

  // ── Defensive guards for malformed inputs ─────────────────────────────────

  it("returns a safe unreachable object when given null", () => {
    const result = sanitizeHealthResult(null);
    expect(result.status).toBe("unreachable");
    expect(typeof result.message).toBe("string");
  });

  it("returns a safe unreachable object when given undefined", () => {
    const result = sanitizeHealthResult(undefined);
    expect(result.status).toBe("unreachable");
  });

  it("returns a safe unreachable object when given a string", () => {
    const result = sanitizeHealthResult("not-an-object");
    expect(result.status).toBe("unreachable");
  });

  it("returns a safe unreachable object when given a number", () => {
    const result = sanitizeHealthResult(42);
    expect(result.status).toBe("unreachable");
  });

  it("returns a safe unreachable object when given an array", () => {
    const result = sanitizeHealthResult([]);
    expect(result.status).toBe("unreachable");
  });

  // ── Idempotency ───────────────────────────────────────────────────────────

  it("calling sanitizeHealthResult twice on the same input is idempotent", () => {
    const input = { status: "degraded", message: "server error" };
    const first = sanitizeHealthResult(input);
    const second = sanitizeHealthResult(first);
    expect(second.status).toBe(first.status);
    expect(second.message).toBe(first.message);
  });

  // ── Boundary: message exactly at and one past the limit ───────────────────

  it("does not add truncation marker to a message of exactly 300 chars", () => {
    const msg = "C".repeat(300);
    expect(sanitizeHealthResult({ status: "connected", message: msg }).message).not.toMatch(
      /…\(truncated\)/
    );
  });

  it("adds truncation marker to a message of 301 chars", () => {
    const msg = "D".repeat(301);
    expect(sanitizeHealthResult({ status: "connected", message: msg }).message).toMatch(
      /…\(truncated\)/
    );
  });
});
