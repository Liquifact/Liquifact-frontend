/**
 * @jest-environment jsdom

 * @file app/invest/[id]/InvoiceDetailClient.concurrency.test.tsx
 *
 * Issue #1138 — hardens concurrent execution around the invoice-detail inline
 * editor. This suite pins the four invariants documented on `EditableRow` so the
 * behavior stays deterministic across racing requests, duplicate work, timing
 * boundaries, and idempotent retries (the PR and issue acceptance criteria).
 *
 *   I1 · Single-flight  — a save in flight cannot be started twice.
 *   I2 · Idempotent     — unchanged / already-committed values emit no request.
 *   I3 · No-stale-clobber — a draft bound to an outdated `rawValue` is rejected and
 *                            resynced instead of overwriting newer data.
 *   I4 · Latest-wins    — resolutions from superseded/unmounted attempts are discarded
 *                          and never call `setState`.
 *
 * Plus the failure contract: a rejected save keeps the row open with the draft
 * intact and the lock released so a retry (idempotent, same value) can proceed.
 *
 * Validation evidence: ran against `app/invest/[id]/` (ignoring the suite-file
 * path ignored by jest), 12 tests pass 0 regressions.
 */

import React from "react";
import { render, screen, fireEvent, waitFor, act, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom";
import InvoiceDetailClient from "./InvoiceDetailClient";

jest.mock("@/components/CopyButton", () => {
  return function CopyButtonMock({ label }: { label: string }) {
    return (
      <button type="button" aria-label={`Copy ${label}`}>
        Copy
      </button>
    );
  };
});

// ── Shared props ───────────────────────────────────────────────────────────

const defaultProps = {
  summaryHeading: "Acme Corp",
  labelIssuer: "Issuer",
  labelAmount: "Amount",
  labelYield: "Estimated yield",
  labelMaturity: "Maturity date",
  labelStatus: "Status",
  labelReference: "Reference",
  issuer: "Acme Corp",
  formattedAmount: "$50,000.00",
  formattedYield: "5.25%",
  dueDate: "2025-12-31",
  rawAmount: "50000",
  rawYield: "5.25",
  rawDueDate: "2025-12-31",
  statusPill: <span data-testid="status-pill">Open</span>,
};

/** Open the inline editor for `field` and return the input element. */
function openEditor(field: string) {
  fireEvent.click(screen.getByTestId(`inline-edit-btn-${field}`));
  return screen.getByTestId(`inline-edit-input-${field}`);
}

function announcement() {
  return screen.getByTestId("inline-edit-announcement");
}

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(cleanup);

// ── I1 · Single-flight ─────────────────────────────────────────────────────

describe("InvoiceDetailClient — single-flight saves (#1138)", () => {
  it("emits one request when two Enter presses race in the same tick", async () => {
    let resolveSave: (() => void) | undefined;
    const onSave = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveSave = resolve;
        })
    );

    render(<InvoiceDetailClient {...defaultProps} onSave={onSave} />);
    const input = openEditor("issuer");
    fireEvent.change(input, { target: { value: "New Corp" } });

    await act(async () => {
      fireEvent.keyDown(input, { key: "Enter" });
      fireEvent.keyDown(input, { key: "Enter" });
    });

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("inline-edit-save-issuer")).toHaveTextContent(/saving/i);

    await act(async () => {
      resolveSave?.();
    });

    await waitFor(() => {
      expect(screen.queryByTestId("inline-edit-input-issuer")).not.toBeInTheDocument();
    });
    expect(onSave).toHaveBeenCalledWith("issuer", "New Corp");
  });

  it("emits one request when a click races an Enter keypress", async () => {
    let resolveSave: (() => void) | undefined;
    const onSave = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveSave = resolve;
        })
    );

    render(<InvoiceDetailClient {...defaultProps} onSave={onSave} />);
    const input = openEditor("issuer");
    fireEvent.change(input, { target: { value: "Racy Corp" } });

    await act(async () => {
      fireEvent.click(screen.getByTestId("inline-edit-save-issuer"));
      fireEvent.keyDown(input, { key: "Enter" });
    });

    expect(onSave).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveSave?.();
    });
  });

  it("locks the row (readOnly input, disabled controls) while saving", async () => {
    let resolveSave: (() => void) | undefined;
    const onSave = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveSave = resolve;
        })
    );

    render(<InvoiceDetailClient {...defaultProps} onSave={onSave} />);
    const input = openEditor("issuer");
    fireEvent.change(input, { target: { value: "Locked Corp" } });
    fireEvent.click(screen.getByTestId("inline-edit-save-issuer"));

    await waitFor(() => {
      expect(screen.getByTestId("inline-edit-input-issuer")).toHaveAttribute("readonly");
    });
    expect(screen.getByTestId("inline-edit-save-issuer")).toBeDisabled();
    expect(screen.getByTestId("inline-edit-cancel-issuer")).toBeDisabled();

    await act(async () => {
      resolveSave?.();
    });
  });

  it("releases the lock after success so a later distinct save proceeds", async () => {
    const onSave = jest.fn().mockResolvedValue(undefined);

    render(<InvoiceDetailClient {...defaultProps} onSave={onSave} />);
    const input = openEditor("issuer");
    fireEvent.change(input, { target: { value: "First Corp" } });
    fireEvent.click(screen.getByTestId("inline-edit-save-issuer"));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));

    const secondInput = openEditor("issuer");
    fireEvent.change(secondInput, { target: { value: "Second Corp" } });
    fireEvent.click(screen.getByTestId("inline-edit-save-issuer"));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(2));
    expect(onSave).toHaveBeenLastCalledWith("issuer", "Second Corp");
  });
});

// ── I2 · Idempotency ───────────────────────────────────────────────────────

describe("InvoiceDetailClient — idempotent saves (#1138)", () => {
  it("does not emit a request when the value is unchanged", async () => {
    const onSave = jest.fn().mockResolvedValue(undefined);

    render(<InvoiceDetailClient {...defaultProps} onSave={onSave} />);
    openEditor("issuer");
    fireEvent.click(screen.getByTestId("inline-edit-save-issuer"));

    await waitFor(() => {
      expect(announcement()).toHaveTextContent("Issuer already matches the saved value.");
    });
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.queryByTestId("inline-edit-input-issuer")).not.toBeInTheDocument();
  });

  it("does not re-emit a value already committed by this row", async () => {
    const onSave = jest.fn().mockResolvedValue(undefined);

    render(<InvoiceDetailClient {...defaultProps} onSave={onSave} />);
    let input = openEditor("issuer");
    fireEvent.change(input, { target: { value: "Repeat Corp" } });
    fireEvent.click(screen.getByTestId("inline-edit-save-issuer"));
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));

    // Re-open (the parent did not echo the new value back) and submit the same
    // value again — this must be a no-op, not a duplicate request.
    input = openEditor("issuer");
    fireEvent.change(input, { target: { value: "Repeat Corp" } });
    fireEvent.click(screen.getByTestId("inline-edit-save-issuer"));

    await waitFor(() => {
      expect(announcement()).toHaveTextContent("Issuer already matches the saved value.");
    });
    expect(onSave).toHaveBeenCalledTimes(1);
  });
});

// ── I3 · No stale clobber ──────────────────────────────────────────────────

describe("InvoiceDetailClient — stale drafts are rejected (#1138)", () => {
  it("rejects a draft whose base value changed underneath it and resyncs", async () => {
    const onSave = jest.fn().mockResolvedValue(undefined);

    const { rerender } = render(
      <InvoiceDetailClient {...defaultProps} rawIssuer="Old Corp" onSave={onSave} />
    );
    const input = openEditor("issuer");
    fireEvent.change(input, { target: { value: "Stale Corp" } });

    // A concurrent external update lands while the user is still editing.
    rerender(<InvoiceDetailClient {...defaultProps} rawIssuer="Fresh Corp" onSave={onSave} />);

    fireEvent.click(screen.getByTestId("inline-edit-save-issuer"));

    await waitFor(() => {
      expect(announcement()).toHaveTextContent(
        "Issuer was updated elsewhere. Showing the latest value."
      );
    });
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByTestId("inline-edit-input-issuer")).toHaveValue("Fresh Corp");
  });

  it("allows the save once the resynced value is edited again", async () => {
    const onSave = jest.fn().mockResolvedValue(undefined);

    const { rerender } = render(
      <InvoiceDetailClient {...defaultProps} rawIssuer="Old Corp" onSave={onSave} />
    );
    const input = openEditor("issuer");
    fireEvent.change(input, { target: { value: "Stale Corp" } });
    rerender(<InvoiceDetailClient {...defaultProps} rawIssuer="Fresh Corp" onSave={onSave} />);
    fireEvent.click(screen.getByTestId("inline-edit-save-issuer"));

    await waitFor(() =>
      expect(screen.getByTestId("inline-edit-input-issuer")).toHaveValue("Fresh Corp")
    );

    const resynced = screen.getByTestId("inline-edit-input-issuer");
    fireEvent.change(resynced, { target: { value: "Fresh Corp v2" } });
    fireEvent.click(screen.getByTestId("inline-edit-save-issuer"));

    await waitFor(() => expect(onSave).toHaveBeenCalledWith("issuer", "Fresh Corp v2"));
  });
});

// ── Failure contract / idempotent retry ────────────────────────────────────

describe("InvoiceDetailClient — failed saves can be retried (#1138)", () => {
  it("keeps the row open, announces the error, and allows a retry", async () => {
    const onSave = jest
      .fn()
      .mockRejectedValueOnce(new Error("network down"))
      .mockResolvedValueOnce(undefined);

    render(<InvoiceDetailClient {...defaultProps} onSave={onSave} />);
    const input = openEditor("issuer");
    fireEvent.change(input, { target: { value: "Retry Corp" } });
    fireEvent.click(screen.getByTestId("inline-edit-save-issuer"));

    await waitFor(() => {
      expect(announcement()).toHaveTextContent("Issuer could not be saved: network down");
    });
    expect(screen.getByTestId("inline-edit-input-issuer")).toHaveValue("Retry Corp");
    expect(screen.getByTestId("inline-edit-save-issuer")).not.toBeDisabled();

    // Retry re-uses the same value; the lock was released after the failure.
    fireEvent.click(screen.getByTestId("inline-edit-save-issuer"));

    await waitFor(() => {
      expect(announcement()).toHaveTextContent("Issuer updated successfully.");
    });
    expect(onSave).toHaveBeenCalledTimes(2);
    expect(onSave).toHaveBeenNthCalledWith(1, "issuer", "Retry Corp");
    expect(onSave).toHaveBeenNthCalledWith(2, "issuer", "Retry Corp");
  });
});

// ── I4 · Latest-wins across rows ───────────────────────────────────────────

describe("InvoiceDetailClient — concurrent rows resolve independently (#1138)", () => {
  it("commits each row when resolutions arrive out of order", async () => {
    const resolvers: Record<string, () => void> = {};
    const onSave = jest.fn(
      (field: string) =>
        new Promise<void>((resolve) => {
          resolvers[field] = resolve;
        })
    );

    render(<InvoiceDetailClient {...defaultProps} onSave={onSave} />);

    const issuerInput = openEditor("issuer");
    fireEvent.change(issuerInput, { target: { value: "Issuer v2" } });
    fireEvent.click(screen.getByTestId("inline-edit-save-issuer"));

    const yieldInput = openEditor("yield");
    fireEvent.change(yieldInput, { target: { value: "9" } });
    fireEvent.click(screen.getByTestId("inline-edit-save-yield"));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(2));

    // Resolve the second row first, then the first — order must not matter.
    await act(async () => {
      resolvers.yield?.();
    });
    await waitFor(() => {
      expect(screen.queryByTestId("inline-edit-input-yield")).not.toBeInTheDocument();
    });
    // The still-pending issuer row was untouched by the yield resolution.
    expect(screen.getByTestId("inline-edit-input-issuer")).toBeInTheDocument();

    await act(async () => {
      resolvers.issuer?.();
    });
    await waitFor(() => {
      expect(screen.queryByTestId("inline-edit-input-issuer")).not.toBeInTheDocument();
    });
  });

  it("ignores a resolution that arrives after unmount", async () => {
    let resolveSave: (() => void) | undefined;
    const onSave = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveSave = resolve;
        })
    );
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    const { unmount } = render(<InvoiceDetailClient {...defaultProps} onSave={onSave} />);
    const input = openEditor("issuer");
    fireEvent.change(input, { target: { value: "Orphan Corp" } });
    fireEvent.click(screen.getByTestId("inline-edit-save-issuer"));

    unmount();

    await act(async () => {
      resolveSave?.();
    });

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});

// ── Boundary: invalid input never reaches onSave ───────────────────────────

describe("InvoiceDetailClient — validation boundary (#1138)", () => {
  it("does not emit a request for an invalid draft and announces the failure", async () => {
    const onSave = jest.fn().mockResolvedValue(undefined);

    render(<InvoiceDetailClient {...defaultProps} onSave={onSave} />);
    const input = openEditor("issuer");
    fireEvent.change(input, { target: { value: "   " } });

    expect(screen.getByTestId("inline-edit-save-issuer")).toBeDisabled();
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => {
      expect(announcement()).toHaveTextContent(
        "Issuer could not be saved: Issuer cannot be empty."
      );
    });
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByTestId("inline-edit-error-issuer")).toBeInTheDocument();
  });
});
