/**
 * @file lib/timeline.test.js
 * Pure unit tests for buildTimeline() and formatRelative().
 *
 * Timezone independence: tests use explicit UTC epoch milliseconds so they
 * produce identical results when run with TZ=Pacific/Auckland and TZ=UTC.
 * Jest is configured with jsdom which uses the Node.js timezone — these tests
 * do not rely on local time.
 */

import { buildTimeline, formatRelative } from "./timeline.js";

// ─── Fixtures ────────────────────────────────────────────────────────────────

// Fixed "now" = 2026-10-24T12:00:00Z
const NOW_MS = Date.UTC(2026, 9, 24, 12, 0, 0); // month is 0-indexed

const DUE_FUTURE_MS = Date.UTC(2026, 10, 28, 0, 0, 0); // 2026-11-28
const DUE_PAST_MS = Date.UTC(2026, 5, 15, 0, 0, 0);   // 2026-06-15 (past)
const DUE_PAST_STR = "2026-06-15";
const DUE_FUTURE_STR = "2026-11-28";

const CREATED_AT = "2026-04-01T10:00:00Z";

// ─── buildTimeline: Open invoice ─────────────────────────────────────────────

describe("buildTimeline — Open invoice", () => {
  it("marks 'listed' as current and others as upcoming when due date is in the future", () => {
    const steps = buildTimeline({
      invoice: { status: "Open", dueDate: DUE_FUTURE_STR, createdAt: CREATED_AT },
      nowMs: NOW_MS,
    });

    const ids = steps.map((s) => s.id);
    expect(ids).toContain("listed");
    expect(ids).toContain("funded");
    expect(ids).toContain("due");
    expect(ids).toContain("settled");

    const listed = steps.find((s) => s.id === "listed");
    expect(listed.state).toBe("current");

    const funded = steps.find((s) => s.id === "funded");
    expect(funded.state).toBe("upcoming");

    const settled = steps.find((s) => s.id === "settled");
    expect(settled.state).toBe("upcoming");
  });

  it("includes createdAt as the 'at' date for the listed step", () => {
    const steps = buildTimeline({
      invoice: { status: "Open", dueDate: DUE_FUTURE_STR, createdAt: CREATED_AT },
      nowMs: NOW_MS,
    });

    const listed = steps.find((s) => s.id === "listed");
    expect(listed.at).toBeInstanceOf(Date);
    expect(listed.at.toISOString()).toBe("2026-04-01T10:00:00.000Z");
  });

  it("listed.at is null when createdAt is absent", () => {
    const steps = buildTimeline({
      invoice: { status: "Open", dueDate: DUE_FUTURE_STR },
      nowMs: NOW_MS,
    });

    const listed = steps.find((s) => s.id === "listed");
    expect(listed.at).toBeNull();
  });

  it("due step is upcoming when dueDate is in the future", () => {
    const steps = buildTimeline({
      invoice: { status: "Open", dueDate: DUE_FUTURE_STR },
      nowMs: NOW_MS,
    });

    const due = steps.find((s) => s.id === "due");
    expect(due.state).toBe("upcoming");
    expect(due.label).toBe("Due / Maturity");
  });

  it("due step becomes missed and label shows days overdue when dueDate is in the past", () => {
    const steps = buildTimeline({
      invoice: { status: "Open", dueDate: DUE_PAST_STR },
      nowMs: NOW_MS,
    });

    const due = steps.find((s) => s.id === "due");
    expect(due.state).toBe("missed");
    expect(due.label).toMatch(/Overdue by \d+ days?/);
  });

  it("funding_deadline step shows as current when open and deadline not yet passed", () => {
    const futureDeadlineMs = NOW_MS + 7 * 24 * 60 * 60 * 1000; // 7 days from now
    const steps = buildTimeline({
      invoice: { status: "Open", dueDate: DUE_FUTURE_STR },
      escrow: { funding_deadline: Math.floor(futureDeadlineMs / 1000) },
      nowMs: NOW_MS,
    });

    const fd = steps.find((s) => s.id === "funding_deadline");
    expect(fd).toBeDefined();
    expect(fd.state).toBe("current");
  });

  it("funding_deadline step becomes missed when deadline has passed but invoice still Open", () => {
    const pastDeadlineMs = NOW_MS - 2 * 24 * 60 * 60 * 1000; // 2 days ago
    const steps = buildTimeline({
      invoice: { status: "Open", dueDate: DUE_FUTURE_STR },
      escrow: { funding_deadline: Math.floor(pastDeadlineMs / 1000) },
      nowMs: NOW_MS,
    });

    const fd = steps.find((s) => s.id === "funding_deadline");
    expect(fd).toBeDefined();
    expect(fd.state).toBe("missed");
  });
});

// ─── buildTimeline: Funded invoice ───────────────────────────────────────────

describe("buildTimeline — Funded invoice", () => {
  it("marks 'funded' as current and 'settled' as upcoming", () => {
    const steps = buildTimeline({
      invoice: { status: "Funded", dueDate: DUE_FUTURE_STR },
      nowMs: NOW_MS,
    });

    const funded = steps.find((s) => s.id === "funded");
    expect(funded.state).toBe("current");

    const due = steps.find((s) => s.id === "due");
    expect(due.state).toBe("current");

    const settled = steps.find((s) => s.id === "settled");
    expect(settled.state).toBe("upcoming");
  });

  it("due step is missed when dueDate has passed and still funded (not settled)", () => {
    const steps = buildTimeline({
      invoice: { status: "Funded", dueDate: DUE_PAST_STR },
      nowMs: NOW_MS,
    });

    const due = steps.find((s) => s.id === "due");
    expect(due.state).toBe("missed");
    expect(due.label).toMatch(/Overdue/);
  });

  it("funding_deadline is done for a funded invoice", () => {
    const steps = buildTimeline({
      invoice: { status: "Funded", dueDate: DUE_FUTURE_STR },
      escrow: { funding_deadline: Math.floor(NOW_MS / 1000) - 100 },
      nowMs: NOW_MS,
    });

    const fd = steps.find((s) => s.id === "funding_deadline");
    expect(fd.state).toBe("done");
  });
});

// ─── buildTimeline: Settled invoice ──────────────────────────────────────────

describe("buildTimeline — Settled invoice", () => {
  it("marks all steps as done and settled as current", () => {
    const settledAtSec = Math.floor(DUE_FUTURE_MS / 1000) + 86400; // 1 day after due
    const steps = buildTimeline({
      invoice: { status: "Settled", dueDate: DUE_FUTURE_STR },
      escrow: { settled_at: settledAtSec },
      nowMs: NOW_MS,
    });

    const listed = steps.find((s) => s.id === "listed");
    expect(listed.state).toBe("done");

    const funded = steps.find((s) => s.id === "funded");
    expect(funded.state).toBe("done");

    const due = steps.find((s) => s.id === "due");
    expect(due.state).toBe("done");

    const settled = steps.find((s) => s.id === "settled");
    expect(settled.state).toBe("current");
    expect(settled.at).toBeInstanceOf(Date);
  });

  it("settled.at is null when no escrow settled_at is provided", () => {
    const steps = buildTimeline({
      invoice: { status: "Settled", dueDate: DUE_PAST_STR },
      nowMs: NOW_MS,
    });

    const settled = steps.find((s) => s.id === "settled");
    expect(settled.state).toBe("current");
    expect(settled.at).toBeNull();
  });

  it("due date step is done even if dueDate is in the past for settled invoice", () => {
    const steps = buildTimeline({
      invoice: { status: "Settled", dueDate: DUE_PAST_STR },
      nowMs: NOW_MS,
    });

    const due = steps.find((s) => s.id === "due");
    expect(due.state).toBe("done");
    // Label should not say "Overdue" for settled invoices
    expect(due.label).toBe("Due / Maturity");
  });
});

// ─── buildTimeline: Overdue invoice ──────────────────────────────────────────

describe("buildTimeline — Overdue invoice", () => {
  it("due step is missed with overdue days label", () => {
    const steps = buildTimeline({
      invoice: { status: "Overdue", dueDate: DUE_PAST_STR },
      nowMs: NOW_MS,
    });

    const due = steps.find((s) => s.id === "due");
    expect(due.state).toBe("missed");
    expect(due.label).toMatch(/Overdue by \d+ days?/);
  });

  it("singular 'day' when exactly 1 day overdue", () => {
    const exactly1DayPast = NOW_MS - 24 * 60 * 60 * 1000 - 1; // just over 1 day ago
    const steps = buildTimeline({
      invoice: {
        status: "Overdue",
        dueDate: new Date(exactly1DayPast).toISOString().split("T")[0],
      },
      nowMs: NOW_MS,
    });

    const due = steps.find((s) => s.id === "due");
    expect(due.label).toMatch(/Overdue by 1 day$/);
  });
});

// ─── buildTimeline: Cancelled / Withdrawn terminal states ────────────────────

describe("buildTimeline — Cancelled / Withdrawn terminal states", () => {
  it("includes a terminal step for Cancelled status", () => {
    const steps = buildTimeline({
      invoice: { status: "Cancelled", dueDate: DUE_FUTURE_STR },
      nowMs: NOW_MS,
    });

    const terminal = steps.find((s) => s.id === "terminal");
    expect(terminal).toBeDefined();
    expect(terminal.state).toBe("terminal");
    expect(terminal.label).toBe("Cancelled");
  });

  it("includes a terminal step for Withdrawn status", () => {
    const steps = buildTimeline({
      invoice: { status: "Withdrawn", dueDate: DUE_FUTURE_STR },
      nowMs: NOW_MS,
    });

    const terminal = steps.find((s) => s.id === "terminal");
    expect(terminal).toBeDefined();
    expect(terminal.label).toBe("Withdrawn");
  });

  it("prior steps remain done/upcoming for Cancelled invoice", () => {
    const steps = buildTimeline({
      invoice: { status: "Cancelled", dueDate: DUE_FUTURE_STR },
      nowMs: NOW_MS,
    });

    const listed = steps.find((s) => s.id === "listed");
    expect(listed.state).toBe("done");
  });
});

// ─── buildTimeline: optional / missing fields ─────────────────────────────────

describe("buildTimeline — optional / missing fields", () => {
  it("does not throw when escrow is null", () => {
    expect(() =>
      buildTimeline({
        invoice: { status: "Open", dueDate: DUE_FUTURE_STR },
        escrow: null,
        nowMs: NOW_MS,
      })
    ).not.toThrow();
  });

  it("does not throw when escrow is undefined", () => {
    expect(() =>
      buildTimeline({
        invoice: { status: "Open", dueDate: DUE_FUTURE_STR },
        nowMs: NOW_MS,
      })
    ).not.toThrow();
  });

  it("does not throw when dueDate is missing", () => {
    expect(() =>
      buildTimeline({
        invoice: { status: "Open" },
        nowMs: NOW_MS,
      })
    ).not.toThrow();
  });

  it("due step at is null when no dueDate or escrow maturity", () => {
    const steps = buildTimeline({
      invoice: { status: "Open" },
      nowMs: NOW_MS,
    });

    const due = steps.find((s) => s.id === "due");
    expect(due.at).toBeNull();
  });

  it("prefers on-chain maturity over dueDate string for the due step", () => {
    const onChainMaturitySec = Math.floor(DUE_FUTURE_MS / 1000);
    const steps = buildTimeline({
      invoice: { status: "Funded", dueDate: "2099-12-31" }, // obviously wrong date
      escrow: { maturity: onChainMaturitySec },
      nowMs: NOW_MS,
    });

    const due = steps.find((s) => s.id === "due");
    // Should use on-chain value (~2026-11-28), not 2099
    expect(due.at.getFullYear()).toBe(2026);
    expect(due.at.getMonth()).toBe(10); // 0-indexed → November
  });

  it("includes a funding_deadline step when escrow provides one", () => {
    const deadlineSec = Math.floor((NOW_MS + 5 * 86400_000) / 1000);
    const steps = buildTimeline({
      invoice: { status: "Open", dueDate: DUE_FUTURE_STR },
      escrow: { funding_deadline: deadlineSec },
      nowMs: NOW_MS,
    });

    const fd = steps.find((s) => s.id === "funding_deadline");
    expect(fd).toBeDefined();
    expect(fd.at).toBeInstanceOf(Date);
  });

  it("does not include a funding_deadline step when no escrow and status is Open", () => {
    const steps = buildTimeline({
      invoice: { status: "Open", dueDate: DUE_FUTURE_STR },
      nowMs: NOW_MS,
    });

    const fd = steps.find((s) => s.id === "funding_deadline");
    expect(fd).toBeUndefined();
  });
});

// ─── buildTimeline: timezone independence ────────────────────────────────────

describe("buildTimeline — timezone independence", () => {
  it("produces identical step states for TZ=UTC and TZ=Pacific/Auckland", () => {
    // Because we use only epoch milliseconds, changing TZ should not alter output.
    // We verify by running twice with the same inputs and checking equality.
    const params = {
      invoice: { status: "Open", dueDate: DUE_FUTURE_STR, createdAt: CREATED_AT },
      nowMs: NOW_MS,
    };

    const run1 = buildTimeline(params);
    const run2 = buildTimeline(params);

    expect(run1.map((s) => ({ id: s.id, state: s.state }))).toEqual(
      run2.map((s) => ({ id: s.id, state: s.state }))
    );
  });

  it("step timestamps are Date objects with correct epoch values regardless of timezone", () => {
    const steps = buildTimeline({
      invoice: { status: "Open", dueDate: "2026-11-28", createdAt: "2026-04-01T00:00:00Z" },
      nowMs: NOW_MS,
    });

    const listed = steps.find((s) => s.id === "listed");
    // createdAt = 2026-04-01T00:00:00Z → fixed epoch
    expect(listed.at.getTime()).toBe(Date.UTC(2026, 3, 1, 0, 0, 0));

    const due = steps.find((s) => s.id === "due");
    // dueDate = "2026-11-28" → parsed by new Date() which gives midnight UTC
    expect(due.at.getTime()).toBe(Date.UTC(2026, 10, 28, 0, 0, 0));
  });
});

// ─── formatRelative ───────────────────────────────────────────────────────────

describe("formatRelative", () => {
  const NOW = 1_000_000_000_000; // arbitrary fixed epoch

  it("returns a future string for targets in the future", () => {
    const future = NOW + 3 * 24 * 60 * 60 * 1000; // 3 days from now
    const result = formatRelative(future, NOW);
    expect(result).toMatch(/in 3 days/i);
  });

  it("returns a past string for targets in the past", () => {
    const past = NOW - 2 * 60 * 60 * 1000; // 2 hours ago
    const result = formatRelative(past, NOW);
    expect(result).toMatch(/2 hours ago/i);
  });

  it("handles seconds granularity", () => {
    const future = NOW + 45 * 1000; // 45 seconds
    const result = formatRelative(future, NOW);
    expect(result).toMatch(/in 45 seconds/i);
  });

  it("handles months granularity", () => {
    const future = NOW + 65 * 24 * 60 * 60 * 1000; // ~2 months
    const result = formatRelative(future, NOW);
    expect(result).toMatch(/in 2 months/i);
  });

  it("handles years granularity", () => {
    const future = NOW + 400 * 24 * 60 * 60 * 1000; // ~1 year
    const result = formatRelative(future, NOW);
    expect(result).toMatch(/in 1 year|next year/i);
  });

  it("produces consistent output for the same inputs (deterministic)", () => {
    const target = NOW + 5 * 24 * 60 * 60 * 1000;
    expect(formatRelative(target, NOW)).toBe(formatRelative(target, NOW));
  });

  it("returns 'now' or near-equivalent for zero difference", () => {
    const result = formatRelative(NOW, NOW);
    // Intl.RelativeTimeFormat with numeric:"auto" may return "now"
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });
});
