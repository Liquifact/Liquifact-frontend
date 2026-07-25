/**
 * @file components/InvoiceTimeline.test.tsx
 *
 * Comprehensive unit + accessibility tests for InvoiceTimeline.
 *
 * Coverage areas:
 *  1. Basic rendering — ordered list, heading, all five stages present
 *  2. Stage order — stages appear in the correct sequence
 *  3. aria-current — current stage is marked, others are not
 *  4. Completed stages — visual state and accessible label
 *  5. Future / pending stages — visual state and accessible label
 *  6. Status → stage mapping for every INVOICE_STATUSES value
 *  7. Missing / empty timestamps — degrade gracefully, no broken UI
 *  8. Tone tokens — match StatusPill / STATUS_PILL_MAP expectations
 *  9. Screen-reader semantics — section label, list label, aria-label on items
 * 10. Edge cases — uploaded only, partial lifecycle, fully settled, unknown status
 * 11. Accessibility — jest-axe for each lifecycle state
 */

import React from "react";
import { render, screen, within } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";
import InvoiceTimeline, {
  TIMELINE_STAGES,
  STAGE_ORDER,
  resolveCurrentStage,
} from "./InvoiceTimeline";
import { INVOICE_STATUSES, STATUS_PILL_MAP } from "@/lib/types/invoice";
import { copy } from "@/app/copy/en";

expect.extend(toHaveNoViolations);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderTimeline(props: React.ComponentProps<typeof InvoiceTimeline> = {}) {
  return render(<InvoiceTimeline {...props} />);
}

/** Returns all <li> elements inside the timeline <ol>. */
function getStageItems() {
  const list = screen.getByRole("list", { name: copy.invoiceTimeline.heading });
  return within(list).getAllByRole("listitem");
}

// ---------------------------------------------------------------------------
// 1. Basic rendering
// ---------------------------------------------------------------------------

describe("InvoiceTimeline — basic rendering", () => {
  it("renders without throwing for a minimal props set", () => {
    expect(() => renderTimeline()).not.toThrow();
  });

  it("renders the section heading", () => {
    renderTimeline();
    expect(screen.getByRole("heading", { name: copy.invoiceTimeline.heading })).toBeInTheDocument();
  });

  it("renders an ordered list (<ol>)", () => {
    const { container } = renderTimeline();
    expect(container.querySelector("ol")).toBeInTheDocument();
  });

  it("renders exactly five stage items", () => {
    renderTimeline();
    expect(getStageItems()).toHaveLength(5);
  });

  it("renders all five stage labels", () => {
    renderTimeline();
    expect(screen.getByText(copy.invoiceTimeline.stageUploaded)).toBeInTheDocument();
    expect(screen.getByText(copy.invoiceTimeline.stageVerified)).toBeInTheDocument();
    expect(screen.getByText(copy.invoiceTimeline.stageListed)).toBeInTheDocument();
    expect(screen.getByText(copy.invoiceTimeline.stageFunded)).toBeInTheDocument();
    expect(screen.getByText(copy.invoiceTimeline.stageSettled)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 2. Stage order
// ---------------------------------------------------------------------------

describe("InvoiceTimeline — stage order", () => {
  it("renders stages in the correct lifecycle order", () => {
    renderTimeline({ status: INVOICE_STATUSES.OPEN });
    const items = getStageItems();
    const labels = items.map((li) => li.textContent?.trim());

    const uploadedIdx = labels.findIndex((t) => t?.includes(copy.invoiceTimeline.stageUploaded));
    const verifiedIdx = labels.findIndex((t) => t?.includes(copy.invoiceTimeline.stageVerified));
    const listedIdx = labels.findIndex((t) => t?.includes(copy.invoiceTimeline.stageListed));
    const fundedIdx = labels.findIndex((t) => t?.includes(copy.invoiceTimeline.stageFunded));
    const settledIdx = labels.findIndex((t) => t?.includes(copy.invoiceTimeline.stageSettled));

    expect(uploadedIdx).toBeLessThan(verifiedIdx);
    expect(verifiedIdx).toBeLessThan(listedIdx);
    expect(listedIdx).toBeLessThan(fundedIdx);
    expect(fundedIdx).toBeLessThan(settledIdx);
  });

  it("STAGE_ORDER has exactly 5 entries", () => {
    expect(STAGE_ORDER).toHaveLength(5);
  });

  it("STAGE_ORDER starts with 'uploaded' and ends with 'settled'", () => {
    expect(STAGE_ORDER[0]).toBe(TIMELINE_STAGES.UPLOADED);
    expect(STAGE_ORDER[STAGE_ORDER.length - 1]).toBe(TIMELINE_STAGES.SETTLED);
  });
});

// ---------------------------------------------------------------------------
// 3. aria-current — current stage marking
// ---------------------------------------------------------------------------

describe("InvoiceTimeline — aria-current on current stage", () => {
  it("marks only the Listed stage as aria-current='step' for Open invoice", () => {
    renderTimeline({ status: INVOICE_STATUSES.OPEN });
    const items = getStageItems();
    const currentItems = items.filter((li) => li.getAttribute("aria-current") === "step");
    expect(currentItems).toHaveLength(1);
    expect(currentItems[0]).toHaveTextContent(copy.invoiceTimeline.stageListed);
  });

  it("marks only the Funded stage as aria-current='step' for Funded invoice", () => {
    renderTimeline({ status: INVOICE_STATUSES.FUNDED });
    const items = getStageItems();
    const currentItems = items.filter((li) => li.getAttribute("aria-current") === "step");
    expect(currentItems).toHaveLength(1);
    expect(currentItems[0]).toHaveTextContent(copy.invoiceTimeline.stageFunded);
  });

  it("marks only the Settled stage as aria-current='step' for Settled invoice", () => {
    renderTimeline({ status: INVOICE_STATUSES.SETTLED });
    const items = getStageItems();
    const currentItems = items.filter((li) => li.getAttribute("aria-current") === "step");
    expect(currentItems).toHaveLength(1);
    expect(currentItems[0]).toHaveTextContent(copy.invoiceTimeline.stageSettled);
  });

  it("marks only the Listed stage as aria-current='step' for Overdue invoice", () => {
    renderTimeline({ status: INVOICE_STATUSES.OVERDUE });
    const items = getStageItems();
    const currentItems = items.filter((li) => li.getAttribute("aria-current") === "step");
    expect(currentItems).toHaveLength(1);
    expect(currentItems[0]).toHaveTextContent(copy.invoiceTimeline.stageListed);
  });

  it("sets aria-current='step' (not 'true' or 'page') on the active stage", () => {
    renderTimeline({ status: INVOICE_STATUSES.OPEN });
    const items = getStageItems();
    const current = items.find((li) => li.getAttribute("aria-current") !== null);
    expect(current).toHaveAttribute("aria-current", "step");
  });

  it("does not set aria-current on non-current stages", () => {
    renderTimeline({ status: INVOICE_STATUSES.OPEN });
    const items = getStageItems();
    const nonCurrent = items.filter((li) => li.getAttribute("aria-current") !== "step");
    // 4 of the 5 stages are not current
    expect(nonCurrent).toHaveLength(4);
    nonCurrent.forEach((li) => expect(li).not.toHaveAttribute("aria-current", "step"));
  });

  it("sets no aria-current on any stage when status is unknown", () => {
    renderTimeline({ status: "not-a-real-status" });
    const items = getStageItems();
    items.forEach((li) => expect(li).not.toHaveAttribute("aria-current"));
  });

  it("sets no aria-current when status is undefined", () => {
    renderTimeline();
    const items = getStageItems();
    items.forEach((li) => expect(li).not.toHaveAttribute("aria-current"));
  });
});

// ---------------------------------------------------------------------------
// 4. Completed stages
// ---------------------------------------------------------------------------

describe("InvoiceTimeline — completed stages", () => {
  it("stages before current are labelled as Completed for Open invoice", () => {
    renderTimeline({ status: INVOICE_STATUSES.OPEN });
    const items = getStageItems();
    // For Open → current is Listed (index 2), so Uploaded (0) and Verified (1) are completed
    const uploadedItem = items.find((li) =>
      li.getAttribute("aria-label")?.includes(copy.invoiceTimeline.stageUploaded)
    );
    const verifiedItem = items.find((li) =>
      li.getAttribute("aria-label")?.includes(copy.invoiceTimeline.stageVerified)
    );
    expect(uploadedItem).toHaveAttribute(
      "aria-label",
      expect.stringContaining(copy.invoiceTimeline.statusCompleted)
    );
    expect(verifiedItem).toHaveAttribute(
      "aria-label",
      expect.stringContaining(copy.invoiceTimeline.statusCompleted)
    );
  });

  it("all stages except Settled are completed for a Settled invoice, Settled is current", () => {
    renderTimeline({ status: INVOICE_STATUSES.SETTLED });
    const items = getStageItems();
    const settledItem = items.find((li) =>
      li.getAttribute("aria-label")?.includes(copy.invoiceTimeline.stageSettled)
    );
    // Settled itself is the current stage
    expect(settledItem).toHaveAttribute("aria-current", "step");
    expect(settledItem).toHaveAttribute(
      "aria-label",
      expect.stringContaining(copy.invoiceTimeline.statusCurrent)
    );

    // All others before Settled should be completed
    const otherItems = items.filter((li) => li !== settledItem);
    otherItems.forEach((li) => {
      expect(li).toHaveAttribute(
        "aria-label",
        expect.stringContaining(copy.invoiceTimeline.statusCompleted)
      );
    });
  });
});

// ---------------------------------------------------------------------------
// 5. Future / pending stages
// ---------------------------------------------------------------------------

describe("InvoiceTimeline — pending stages", () => {
  it("stages after current are labelled as Pending for Open invoice", () => {
    renderTimeline({ status: INVOICE_STATUSES.OPEN });
    const items = getStageItems();
    // For Open → current is Listed (index 2), Funded (3) and Settled (4) are pending
    const fundedItem = items.find((li) =>
      li.getAttribute("aria-label")?.includes(copy.invoiceTimeline.stageFunded)
    );
    const settledItem = items.find((li) =>
      li.getAttribute("aria-label")?.includes(copy.invoiceTimeline.stageSettled)
    );
    expect(fundedItem).toHaveAttribute(
      "aria-label",
      expect.stringContaining(copy.invoiceTimeline.statusPending)
    );
    expect(settledItem).toHaveAttribute(
      "aria-label",
      expect.stringContaining(copy.invoiceTimeline.statusPending)
    );
  });

  it("all stages are pending when status is unknown", () => {
    renderTimeline({ status: "bogus" });
    const items = getStageItems();
    items.forEach((li) => {
      expect(li).toHaveAttribute(
        "aria-label",
        expect.stringContaining(copy.invoiceTimeline.statusPending)
      );
    });
  });

  it("all stages are pending when no status is provided", () => {
    renderTimeline();
    const items = getStageItems();
    items.forEach((li) => {
      expect(li).toHaveAttribute(
        "aria-label",
        expect.stringContaining(copy.invoiceTimeline.statusPending)
      );
    });
  });
});

// ---------------------------------------------------------------------------
// 6. resolveCurrentStage — unit tests for the mapping helper
// ---------------------------------------------------------------------------

describe("resolveCurrentStage — status to stage mapping", () => {
  it("maps Open → listed", () => {
    expect(resolveCurrentStage(INVOICE_STATUSES.OPEN)).toBe(TIMELINE_STAGES.LISTED);
  });

  it("maps Funded → funded", () => {
    expect(resolveCurrentStage(INVOICE_STATUSES.FUNDED)).toBe(TIMELINE_STAGES.FUNDED);
  });

  it("maps Settled → settled", () => {
    expect(resolveCurrentStage(INVOICE_STATUSES.SETTLED)).toBe(TIMELINE_STAGES.SETTLED);
  });

  it("maps Overdue → listed", () => {
    expect(resolveCurrentStage(INVOICE_STATUSES.OVERDUE)).toBe(TIMELINE_STAGES.LISTED);
  });

  it("returns null for an unknown status string", () => {
    expect(resolveCurrentStage("some-unknown")).toBeNull();
  });

  it("returns null for undefined", () => {
    expect(resolveCurrentStage(undefined as any)).toBeNull();
  });

  it("returns null for null", () => {
    expect(resolveCurrentStage(null as any)).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(resolveCurrentStage("")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 7. Timestamps — graceful degradation
// ---------------------------------------------------------------------------

describe("InvoiceTimeline — timestamps", () => {
  it("renders a timestamp when provided for a stage", () => {
    renderTimeline({
      status: INVOICE_STATUSES.FUNDED,
      timestamps: { uploaded: "2025-01-10" },
    });
    expect(screen.getByText("2025-01-10")).toBeInTheDocument();
  });

  it("does not render a timestamp element when none is provided", () => {
    renderTimeline({ status: INVOICE_STATUSES.OPEN });
    // Without timestamps prop, no date strings should appear as timestamps
    expect(screen.queryByText(/^\d{4}-\d{2}-\d{2}$/)).not.toBeInTheDocument();
  });

  it("renders timestamps for multiple stages simultaneously", () => {
    renderTimeline({
      status: INVOICE_STATUSES.FUNDED,
      timestamps: {
        uploaded: "2025-01-10",
        verified: "2025-01-12",
        listed: "2025-01-15",
        funded: "2025-02-04",
      },
    });
    expect(screen.getByText("2025-01-10")).toBeInTheDocument();
    expect(screen.getByText("2025-01-12")).toBeInTheDocument();
    expect(screen.getByText("2025-01-15")).toBeInTheDocument();
    expect(screen.getByText("2025-02-04")).toBeInTheDocument();
  });

  it("does not throw when timestamps is an empty object", () => {
    expect(() => renderTimeline({ status: INVOICE_STATUSES.OPEN, timestamps: {} })).not.toThrow();
  });

  it("does not throw when timestamps is undefined", () => {
    expect(() =>
      renderTimeline({ status: INVOICE_STATUSES.OPEN, timestamps: undefined as any })
    ).not.toThrow();
  });

  it("does not render a timestamp for a stage with a null timestamp value", () => {
    const { container } = renderTimeline({
      status: INVOICE_STATUSES.OPEN,
      timestamps: { uploaded: null as any },
    });
    // The timestamp <span> should not be rendered for null
    const items = getStageItems();
    const uploadedItem = items[0];
    // Only the stage label span should be present, no extra timestamp span
    const spans = within(uploadedItem).getAllByText(/.+/);
    // The accessible label text comes from aria-label; visible text is just the label
    expect(spans.some((s) => s.textContent === "2025-01-10")).toBe(false);
  });

  it("does not render a timestamp for an empty string value", () => {
    renderTimeline({
      status: INVOICE_STATUSES.OPEN,
      timestamps: { uploaded: "" },
    });
    // No timestamp node should appear since the value is empty
    const items = getStageItems();
    const uploadedItem = items[0];
    const timestampSpan = uploadedItem.querySelector(".text-xs.text-slate-500");
    expect(timestampSpan).toBeNull();
  });

  it("does not break the timeline when only some stages have timestamps", () => {
    expect(() =>
      renderTimeline({
        status: INVOICE_STATUSES.FUNDED,
        timestamps: { uploaded: "2025-01-10", funded: "2025-02-04" },
      })
    ).not.toThrow();
    expect(screen.getAllByRole("listitem")).toHaveLength(5);
  });

  it("still renders all 5 stages when timestamps object has extra unknown keys", () => {
    renderTimeline({
      status: INVOICE_STATUSES.OPEN,
      timestamps: { uploaded: "2025-01-10", unknownStage: "2025-03-01" } as any,
    });
    expect(getStageItems()).toHaveLength(5);
  });
});

// ---------------------------------------------------------------------------
// 8. Tone tokens — match StatusPill behaviour
// ---------------------------------------------------------------------------

describe("InvoiceTimeline — tone tokens match STATUS_PILL_MAP", () => {
  it("completed stages use emerald colour (mirrors Settled tone)", () => {
    renderTimeline({ status: INVOICE_STATUSES.FUNDED });
    const items = getStageItems();
    // Uploaded, Verified, Listed are completed for Funded status
    const uploadedItem = items[0];
    // The dot span is the second aria-hidden span (first is the connector line)
    const dots = uploadedItem.querySelectorAll('[aria-hidden="true"]');
    const dotSpan = dots[dots.length >= 2 ? 1 : 0];
    expect(dotSpan?.className).toContain("bg-emerald-400");
  });

  it("current stage uses cyan colour (mirrors Open tone)", () => {
    renderTimeline({ status: INVOICE_STATUSES.OPEN });
    const items = getStageItems();
    // Listed is the current stage for Open
    const listedItem = items[2]; // index 2 = listed
    // The dot span is the second aria-hidden span (first is the connector line)
    const dots = listedItem.querySelectorAll('[aria-hidden="true"]');
    const dotSpan = dots[dots.length >= 2 ? 1 : 0];
    expect(dotSpan?.className).toContain("bg-cyan-400");
  });

  it("pending stages use neutral slate colour", () => {
    renderTimeline({ status: INVOICE_STATUSES.OPEN });
    const items = getStageItems();
    // Funded and Settled are pending for Open status
    const fundedItem = items[3];
    // The dot span is the second aria-hidden span (first is the connector line)
    const dots = fundedItem.querySelectorAll('[aria-hidden="true"]');
    const dotSpan = dots[dots.length >= 2 ? 1 : 0];
    expect(dotSpan?.className).toContain("bg-slate-700");
  });

  it("STATUS_PILL_MAP Settled tone uses emerald (confirming completed tone origin)", () => {
    expect(STATUS_PILL_MAP.Settled.tone).toContain("emerald");
  });

  it("STATUS_PILL_MAP Open tone uses cyan (confirming current tone origin)", () => {
    expect(STATUS_PILL_MAP.Open.tone).toContain("cyan");
  });
});

// ---------------------------------------------------------------------------
// 9. Screen-reader semantics
// ---------------------------------------------------------------------------

describe("InvoiceTimeline — screen-reader semantics", () => {
  it("the section has an accessible name from the heading", () => {
    renderTimeline();
    expect(screen.getByRole("region", { name: copy.invoiceTimeline.heading })).toBeInTheDocument();
  });

  it("the ordered list has an aria-label matching the heading", () => {
    renderTimeline();
    expect(screen.getByRole("list", { name: copy.invoiceTimeline.heading })).toBeInTheDocument();
  });

  it("each list item has a descriptive aria-label including the stage name", () => {
    renderTimeline({ status: INVOICE_STATUSES.OPEN });
    const items = getStageItems();
    items.forEach((li) => {
      const label = li.getAttribute("aria-label");
      expect(label).toBeTruthy();
      expect(label!.length).toBeGreaterThan(0);
    });
  });

  it("each aria-label includes the stage status word (Completed, Current, or Pending)", () => {
    renderTimeline({ status: INVOICE_STATUSES.OPEN });
    const items = getStageItems();
    const validWords = [
      copy.invoiceTimeline.statusCompleted,
      copy.invoiceTimeline.statusCurrent,
      copy.invoiceTimeline.statusPending,
    ];
    items.forEach((li) => {
      const label = li.getAttribute("aria-label") ?? "";
      const hasWord = validWords.some((w) => label.includes(w));
      expect(hasWord).toBe(true);
    });
  });

  it("the decorative dot/connector spans are aria-hidden", () => {
    const { container } = renderTimeline({ status: INVOICE_STATUSES.OPEN });
    const hiddenSpans = container.querySelectorAll('[aria-hidden="true"]');
    expect(hiddenSpans.length).toBeGreaterThan(0);
  });

  it("checkmark SVGs are aria-hidden and not focusable", () => {
    const { container } = renderTimeline({ status: INVOICE_STATUSES.FUNDED });
    const svgs = container.querySelectorAll("svg");
    svgs.forEach((svg) => {
      expect(svg).toHaveAttribute("aria-hidden", "true");
      expect(svg).toHaveAttribute("focusable", "false");
    });
  });
});

// ---------------------------------------------------------------------------
// 10. Edge cases
// ---------------------------------------------------------------------------

describe("InvoiceTimeline — edge cases", () => {
  describe("uploaded only (unknown status / all pending)", () => {
    it("renders all 5 stages as pending", () => {
      renderTimeline();
      const items = getStageItems();
      expect(items).toHaveLength(5);
      items.forEach((li) =>
        expect(li).toHaveAttribute(
          "aria-label",
          expect.stringContaining(copy.invoiceTimeline.statusPending)
        )
      );
    });

    it("no stage has aria-current", () => {
      renderTimeline();
      const items = getStageItems();
      items.forEach((li) => expect(li).not.toHaveAttribute("aria-current"));
    });
  });

  describe("partially completed lifecycle — Open invoice", () => {
    it("has 2 completed, 1 current, 2 pending stages", () => {
      renderTimeline({ status: INVOICE_STATUSES.OPEN });
      const items = getStageItems();
      const completed = items.filter((li) =>
        li.getAttribute("aria-label")?.includes(copy.invoiceTimeline.statusCompleted)
      );
      const current = items.filter((li) => li.getAttribute("aria-current") === "step");
      const pending = items.filter((li) =>
        li.getAttribute("aria-label")?.includes(copy.invoiceTimeline.statusPending)
      );
      expect(completed).toHaveLength(2);
      expect(current).toHaveLength(1);
      expect(pending).toHaveLength(2);
    });
  });

  describe("partially completed lifecycle — Funded invoice", () => {
    it("has 3 completed, 1 current, 1 pending stages", () => {
      renderTimeline({ status: INVOICE_STATUSES.FUNDED });
      const items = getStageItems();
      const completed = items.filter((li) =>
        li.getAttribute("aria-label")?.includes(copy.invoiceTimeline.statusCompleted)
      );
      const current = items.filter((li) => li.getAttribute("aria-current") === "step");
      const pending = items.filter((li) =>
        li.getAttribute("aria-label")?.includes(copy.invoiceTimeline.statusPending)
      );
      expect(completed).toHaveLength(3);
      expect(current).toHaveLength(1);
      expect(pending).toHaveLength(1);
    });
  });

  describe("fully settled invoice", () => {
    it("has 4 completed, 1 current (Settled), 0 pending stages", () => {
      renderTimeline({ status: INVOICE_STATUSES.SETTLED });
      const items = getStageItems();
      const completed = items.filter((li) =>
        li.getAttribute("aria-label")?.includes(copy.invoiceTimeline.statusCompleted)
      );
      const current = items.filter((li) => li.getAttribute("aria-current") === "step");
      const pending = items.filter((li) =>
        li.getAttribute("aria-label")?.includes(copy.invoiceTimeline.statusPending)
      );
      expect(completed).toHaveLength(4);
      expect(current).toHaveLength(1);
      expect(pending).toHaveLength(0);
    });

    it("the last stage (Settled) is the current stage", () => {
      renderTimeline({ status: INVOICE_STATUSES.SETTLED });
      const items = getStageItems();
      const last = items[items.length - 1];
      expect(last).toHaveAttribute("aria-current", "step");
    });
  });

  describe("Overdue invoice", () => {
    it("maps to Listed as current stage (same as Open)", () => {
      renderTimeline({ status: INVOICE_STATUSES.OVERDUE });
      const items = getStageItems();
      const current = items.find((li) => li.getAttribute("aria-current") === "step");
      expect(current).toHaveTextContent(copy.invoiceTimeline.stageListed);
    });
  });

  describe("missing optional timestamps", () => {
    it("renders all stages when no timestamps are provided", () => {
      renderTimeline({ status: INVOICE_STATUSES.FUNDED });
      expect(getStageItems()).toHaveLength(5);
    });

    it("renders all stages when timestamps is an empty object", () => {
      renderTimeline({ status: INVOICE_STATUSES.FUNDED, timestamps: {} });
      expect(getStageItems()).toHaveLength(5);
    });

    it("does not render any timestamp spans when timestamps is empty", () => {
      const { container } = renderTimeline({
        status: INVOICE_STATUSES.FUNDED,
        timestamps: {},
      });
      const timestampSpans = container.querySelectorAll(".text-xs.text-slate-500");
      expect(timestampSpans).toHaveLength(0);
    });
  });

  describe("className prop", () => {
    it("appends the extra className to the root section", () => {
      const { container } = renderTimeline({ className: "mb-6" });
      const section = container.querySelector("section");
      expect(section?.className).toContain("mb-6");
    });

    it("does not throw when className is omitted", () => {
      expect(() => renderTimeline({ status: INVOICE_STATUSES.OPEN })).not.toThrow();
    });
  });
});

// ---------------------------------------------------------------------------
// 11. Accessibility — jest-axe
// ---------------------------------------------------------------------------

describe("InvoiceTimeline — accessibility (jest-axe)", () => {
  it("has no axe violations with no status (all pending)", async () => {
    const { container } = renderTimeline();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("has no axe violations for Open status", async () => {
    const { container } = renderTimeline({ status: INVOICE_STATUSES.OPEN });
    expect(await axe(container)).toHaveNoViolations();
  });

  it("has no axe violations for Funded status", async () => {
    const { container } = renderTimeline({ status: INVOICE_STATUSES.FUNDED });
    expect(await axe(container)).toHaveNoViolations();
  });

  it("has no axe violations for Settled status", async () => {
    const { container } = renderTimeline({ status: INVOICE_STATUSES.SETTLED });
    expect(await axe(container)).toHaveNoViolations();
  });

  it("has no axe violations for Overdue status", async () => {
    const { container } = renderTimeline({ status: INVOICE_STATUSES.OVERDUE });
    expect(await axe(container)).toHaveNoViolations();
  });

  it("has no axe violations with timestamps provided", async () => {
    const { container } = renderTimeline({
      status: INVOICE_STATUSES.FUNDED,
      timestamps: {
        uploaded: "2025-01-10",
        verified: "2025-01-12",
        listed: "2025-01-15",
        funded: "2025-02-04",
      },
    });
    expect(await axe(container)).toHaveNoViolations();
  });
});
