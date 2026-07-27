/**
 * @file components/InlineEditRow.test.tsx
 *
 * Behavioural contract tests for the reusable `<InlineEditRow />` component
 * that powers the Settings page (issue #741).
 *
 * Coverage targets:
 *   1. View-mode rendering (label / value / edit button).
 *   2. Switching edit → view mode on Edit click (focus moves to input).
 *   3. Live validation while the user types: error text + Save disabled.
 *   4. Save flow: persists via onSave, announces saved, returns focus to Edit.
 *   5. Submit via Enter (form submit).
 *   6. Cancel button: revert draft, exit edit, focus Edit, announce cancelled.
 *   7. Escape key on the form: cancel without losing input (draft restored).
 *   8. Trim before save.
 *   9. Empty value renders `emptyText`.
 *  10. Custom validator behaviour.
 *  11. Description renders under the label.
 *  12. Announcement region is always mounted with role="status" aria-live="polite".
 *  13. data-row-id attribute is emitted on the `<li>`.
 *  14. Escape on Cancel button vs on input both cancel.
 *  15. Pressing Enter on Save button submits the form.
 *  16. Required prop blocks save on empty values.
 *  17. No-op Escape is silent (live region is empty).
 *  18. Empty-string validator return is treated as valid.
 */

import "@testing-library/jest-dom";
import { useState } from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import InlineEditRow, { applyTemplate, defaultRequiredValidator } from "./InlineEditRow";

// ─── Helpers ────────────────────────────────────────────────────────────────

// Note: the savedAnnouncement and cancelledAnnouncement templates passed to
// InlineEditRow below are required for the announce-save / announce-cancel
// assertions. Without them, applyTemplate() returns "" and the live region
// stays empty. Keep these two props when copying this Harness to other tests.
function Harness({ id = "row", initial = "", validate, type, required }) {
  const [value, setValue] = useState(initial);
  return (
    <>
      <InlineEditRow
        id={id}
        label="Display name"
        value={value}
        onSave={(next) => setValue(next)}
        validate={validate}
        type={type}
        required={required}
        placeholder="Type here"
        description="A short description."
        savedAnnouncement="{label} saved."
        cancelledAnnouncement="Edit cancelled. {label} unchanged."
      />
      <span data-testid="current-value">{value}</span>
    </>
  );
}

// ─── Template helper ────────────────────────────────────────────────────────

describe("applyTemplate", () => {
  it("substitutes {label}/{error} placeholders", () => {
    expect(applyTemplate("{label} saved", { label: "Email" })).toBe("Email saved");
    expect(applyTemplate("err: {error}", { error: "bad" })).toBe("err: bad");
  });

  it("leaves unknown tokens intact", () => {
    expect(applyTemplate("hi {x}", {})).toBe("hi {x}");
  });

  it("returns empty string for non-string input", () => {
    expect(applyTemplate(undefined, {})).toBe("");
    expect(applyTemplate(null, {})).toBe("");
  });
});

describe("defaultRequiredValidator", () => {
  it("rejects empty strings", () => {
    expect(defaultRequiredValidator("")).toBe("This field cannot be empty.");
    expect(defaultRequiredValidator("   ")).toBe("This field cannot be empty.");
  });

  it("accepts non-empty strings", () => {
    expect(defaultRequiredValidator("hello")).toBeNull();
  });

  it("handles non-string input as invalid", () => {
    expect(defaultRequiredValidator(undefined)).toBe("This field cannot be empty.");
    expect(defaultRequiredValidator(null)).toBe("This field cannot be empty.");
  });
});

// ─── View-mode rendering ────────────────────────────────────────────────────

describe("InlineEditRow — view mode", () => {
  it("renders label and current value", () => {
    render(<Harness initial="Alex" />);
    expect(screen.getByText("Display name")).toBeInTheDocument();
    // The display <p> and harness's current-value <span> both contain
    // 'Alex' — assert on the row testid rather than a text query.
    expect(screen.getByTestId("row-display")).toHaveTextContent("Alex");
  });

  it("renders emptyText when value is empty", () => {
    render(<Harness initial="" />);
    expect(screen.getByText("Not set")).toBeInTheDocument();
  });

  it("renders the description in view mode", () => {
    render(<Harness initial="Alex" />);
    expect(screen.getByText("A short description.")).toBeInTheDocument();
  });

  it("emits data-row-id for test selectors", () => {
    render(<Harness id="row-x" />);
    expect(screen.getByTestId("row-x-display").closest("[data-row-id]")).toHaveAttribute(
      "data-row-id",
      "row-x"
    );
  });

  it("renders an Edit button with a descriptive aria-label", () => {
    render(<Harness id="row-x" />);
    expect(screen.getByRole("button", { name: "Edit Display name" })).toBeInTheDocument();
  });

  it("always mounts the live region (role=status aria-live=polite)", () => {
    render(<Harness />);
    const live = screen.getByRole("status");
    expect(live).toHaveAttribute("aria-live", "polite");
  });
});

// ─── Edit-mode entry ────────────────────────────────────────────────────────

describe("InlineEditRow — entering edit mode", () => {
  it("switches to edit mode on Edit click and focuses the input", async () => {
    const user = userEvent.setup();
    render(<Harness initial="Initial" />);

    await user.click(screen.getByRole("button", { name: /edit display name/i }));

    const input = screen.getByTestId("row-input");
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue("Initial");

    await waitFor(() => expect(input).toHaveFocus());
  });
});

// ─── Validation ─────────────────────────────────────────────────────────────

describe("InlineEditRow — validation", () => {
  it("disables Save when the validator returns an error message", async () => {
    const validate = (v) => (v.trim().length < 2 ? "too short" : null);
    const user = userEvent.setup();
    render(<Harness validate={validate} />);

    await user.click(screen.getByRole("button", { name: /edit display name/i }));

    const input = screen.getByTestId("row-input");
    await user.clear(input);
    await user.type(input, "x");

    expect(screen.getByTestId("row-error")).toHaveTextContent("too short");
    expect(screen.getByRole("button", { name: /save display name/i })).toBeDisabled();
  });

  it("does not disable Save when the validator returns null", async () => {
    const validate = (v) => (v.trim().length < 2 ? "too short" : null);
    const user = userEvent.setup();
    render(<Harness validate={validate} />);

    await user.click(screen.getByRole("button", { name: /edit display name/i }));

    const input = screen.getByTestId("row-input");
    await user.clear(input);
    await user.type(input, "ab");

    expect(screen.queryByTestId("row-error")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /save display name/i })).not.toBeDisabled();
  });

  it("marks the input aria-invalid=true when invalid", async () => {
    const validate = () => "nope";
    const user = userEvent.setup();
    render(<Harness validate={validate} />);

    await user.click(screen.getByRole("button", { name: /edit display name/i }));
    const input = screen.getByTestId("row-input");
    await user.type(input, "abc");

    expect(input).toHaveAttribute("aria-invalid", "true");
  });

  it("clicking Save while invalid is a no-op (does not call onSave)", async () => {
    const validate = () => "nope";
    const user = userEvent.setup();
    render(<Harness initial="Initial" validate={validate} />);

    await user.click(screen.getByRole("button", { name: /edit display name/i }));
    const saveBtn = screen.getByRole("button", { name: /save display name/i });
    expect(saveBtn).toBeDisabled();

    await user.click(saveBtn);

    expect(screen.getByTestId("current-value")).toHaveTextContent("Initial");
  });

  it("the required prop blocks Save for empty values", async () => {
    const user = userEvent.setup();
    render(<Harness initial="Stored" required />);

    await user.click(screen.getByRole("button", { name: /edit display name/i }));
    await user.clear(screen.getByTestId("row-input"));

    expect(screen.getByTestId("row-error")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /save display name/i })).toBeDisabled();
  });

  it("the required prop allows save for non-empty values", async () => {
    const onSave = jest.fn();
    function RequiredRow() {
      const [v, setV] = useState("");
      return (
        <InlineEditRow
          id="row"
          label="Display name"
          value={v}
          required
          onSave={(n) => {
            onSave(n);
            setV(n);
          }}
        />
      );
    }
    const user = userEvent.setup();
    render(<RequiredRow />);

    await user.click(screen.getByRole("button", { name: /edit display name/i }));
    await user.type(screen.getByTestId("row-input"), "OK");
    await user.click(screen.getByRole("button", { name: /save display name/i }));

    expect(onSave).toHaveBeenCalledWith("OK");
  });

  it("treats an empty-string validator return as no error (Save enabled)", async () => {
    const user = userEvent.setup();
    render(<Harness validate={() => ""} />);

    await user.click(screen.getByRole("button", { name: /edit display name/i }));
    await user.type(screen.getByTestId("row-input"), "x");

    expect(screen.queryByTestId("row-error")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /save display name/i })).not.toBeDisabled();
  });
});

// ─── Save flow ──────────────────────────────────────────────────────────────

describe("InlineEditRow — save", () => {
  it("persists the trimmed value via onSave and returns to view mode", async () => {
    const user = userEvent.setup();
    render(<Harness initial="" />);

    await user.click(screen.getByRole("button", { name: /edit display name/i }));
    const input = screen.getByTestId("row-input");
    await user.type(input, "  Alex  ");

    await user.click(screen.getByRole("button", { name: /save display name/i }));

    expect(screen.getByTestId("current-value")).toHaveTextContent("Alex");
    expect(screen.queryByTestId("row-input")).not.toBeInTheDocument();
  });

  it("announces the save via the live region", async () => {
    const user = userEvent.setup();
    render(<Harness initial="" validate={(v) => (v.trim() === "" ? "required" : null)} />);
    await user.click(screen.getByRole("button", { name: /edit display name/i }));
    await user.type(screen.getByTestId("row-input"), "Alex");

    await user.click(screen.getByRole("button", { name: /save display name/i }));

    await waitFor(() => {
      const statuses = screen.getAllByRole("status");
      expect(statuses.some((el) => /display name/i.test(el.textContent || ""))).toBe(true);
    });
  });

  it("returns focus to the Edit button after save", async () => {
    const user = userEvent.setup();
    render(<Harness initial="Initial" validate={(v) => (v.trim() === "" ? "req" : null)} />);

    await user.click(screen.getByRole("button", { name: /edit display name/i }));
    await user.clear(screen.getByTestId("row-input"));
    await user.type(screen.getByTestId("row-input"), "Upd");

    await user.click(screen.getByRole("button", { name: /save display name/i }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /edit display name/i })).toHaveFocus()
    );
  });

  it("saves on Enter (form submit)", async () => {
    const user = userEvent.setup();
    render(<Harness initial="" validate={(v) => (v.trim() === "" ? "required" : null)} />);

    await user.click(screen.getByRole("button", { name: /edit display name/i }));
    const input = screen.getByTestId("row-input");
    await user.type(input, "Brian{enter}");

    expect(screen.getByTestId("current-value")).toHaveTextContent("Brian");
    expect(screen.queryByTestId("row-input")).not.toBeInTheDocument();
  });
});

// ─── Cancel / Escape ────────────────────────────────────────────────────────

describe("InlineEditRow — cancel", () => {
  it("Cancel button restores the persisted value and exits edit mode", async () => {
    const user = userEvent.setup();
    render(<Harness initial="Original" />);

    await user.click(screen.getByRole("button", { name: /edit display name/i }));
    await user.clear(screen.getByTestId("row-input"));
    await user.type(screen.getByTestId("row-input"), "Changed");

    await user.click(screen.getByRole("button", { name: /cancel/i }));

    expect(screen.getByTestId("current-value")).toHaveTextContent("Original");
    expect(screen.getByTestId("row-display")).toHaveTextContent("Original");
  });

  it("Escape restores the persisted value and exits edit mode", async () => {
    const user = userEvent.setup();
    render(<Harness initial="Original" />);

    await user.click(screen.getByRole("button", { name: /edit display name/i }));
    await user.clear(screen.getByTestId("row-input"));
    await user.type(screen.getByTestId("row-input"), "Discarded");

    await user.keyboard("{Escape}");

    expect(screen.getByTestId("current-value")).toHaveTextContent("Original");
    expect(screen.getByTestId("row-display")).toHaveTextContent("Original");
    expect(screen.queryByTestId("row-input")).not.toBeInTheDocument();
  });

  it("Escape from the Cancel button also cancels and returns focus", async () => {
    const user = userEvent.setup();
    render(<Harness initial="Initial" />);

    await user.click(screen.getByRole("button", { name: /edit display name/i }));
    const cancelBtn = screen.getByRole("button", { name: /cancel/i });
    cancelBtn.focus();
    await user.keyboard("{Escape}");

    expect(screen.queryByTestId("row-input")).not.toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /edit display name/i })).toHaveFocus()
    );
  });

  it("Cancel announces cancelled state and returns focus to Edit", async () => {
    const user = userEvent.setup();
    render(<Harness initial="Initial" validate={(v) => (v.trim() === "" ? "req" : null)} />);

    await user.click(screen.getByRole("button", { name: /edit display name/i }));
    await user.clear(screen.getByTestId("row-input"));
    await user.type(screen.getByTestId("row-input"), "Modified");

    await user.click(screen.getByRole("button", { name: /cancel/i }));

    await waitFor(() => {
      const statuses = screen.getAllByRole("status");
      expect(statuses.some((el) => /cancelled|unchanged/i.test(el.textContent || ""))).toBe(true);
    });
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /edit display name/i })).toHaveFocus()
    );
  });

  it("Escape on a no-op edit does NOT announce (silent cancel)", async () => {
    const user = userEvent.setup();
    render(<Harness initial="Initial" />);

    await user.click(screen.getByRole("button", { name: /edit display name/i }));
    await user.keyboard("{Escape}");

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /edit display name/i })).toHaveFocus()
    );

    // Wait for any pending state to settle, then assert the live region is empty.
    await waitFor(() => {
      const statuses = screen.getAllByRole("status");
      expect(statuses.every((el) => (el.textContent || "").trim() === "")).toBe(true);
    });
  });

  it("Escape does NOT call onSave", async () => {
    const onSave = jest.fn();
    const user = userEvent.setup();
    render(
      <InlineEditRow
        id="row"
        label="Field"
        value="Stored"
        onSave={onSave}
        validate={(v) => (v.trim() === "" ? "required" : null)}
      />
    );

    await user.click(screen.getByRole("button", { name: /edit field/i }));
    await user.clear(screen.getByTestId("row-input"));
    await user.type(screen.getByTestId("row-input"), "Typed");
    await user.keyboard("{Escape}");

    expect(onSave).not.toHaveBeenCalled();
  });
});

// ─── Edge cases ─────────────────────────────────────────────────────────────

describe("InlineEditRow — edge cases", () => {
  it("renders the email input type when type='email'", async () => {
    const user = userEvent.setup();
    render(<Harness type="email" validate={(v) => (v.trim() === "" ? "req" : null)} />);

    await user.click(screen.getByRole("button", { name: /edit display name/i }));
    const input = screen.getByTestId("row-input");
    expect(input).toHaveAttribute("type", "email");
  });

  it("blanks the input gesture but re-type reads existing value", async () => {
    const user = userEvent.setup();
    render(<Harness initial="Alpha" />);

    await user.click(screen.getByRole("button", { name: /edit display name/i }));
    await user.clear(screen.getByTestId("row-input"));
    await user.type(screen.getByTestId("row-input"), "Beta");

    await user.keyboard("{Escape}");

    expect(screen.getByTestId("row-display")).toHaveTextContent("Alpha");

    await user.click(screen.getByRole("button", { name: /edit display name/i }));
    expect(screen.getByTestId("row-input")).toHaveValue("Alpha");
  });

  it("renders without a validator (any value is accepted)", async () => {
    const user = userEvent.setup();
    render(<Harness initial="" />);

    await user.click(screen.getByRole("button", { name: /edit display name/i }));
    const input = screen.getByTestId("row-input");
    await user.type(input, "Anything");

    expect(screen.queryByTestId("row-error")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /save display name/i })).not.toBeDisabled();
  });

  it("preserves an existing value exactly (no trim or mutation)", async () => {
    const user = userEvent.setup();
    render(<Harness initial="Exact" />);

    await user.click(screen.getByRole("button", { name: /edit display name/i }));
    await user.keyboard("{Escape}");

    expect(screen.getByTestId("current-value")).toHaveTextContent("Exact");
  });

  it("the live region is always present while in edit mode", async () => {
    const user = userEvent.setup();
    render(<Harness initial="" validate={(v) => (v.trim() === "" ? "req" : null)} />);
    await user.click(screen.getByRole("button", { name: /edit display name/i }));

    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
  });
});

// ─── FireEvent direct keydown (escape both targets) ─────────────────────────

describe("InlineEditRow — keyboard interactions via fireEvent", () => {
  it("fireEvent.keyDown(Escape) on the form exits edit mode", () => {
    const onSave = jest.fn();
    render(
      <InlineEditRow
        id="row"
        label="Field"
        value="Stored"
        onSave={onSave}
        validate={(v) => (v.trim() === "" ? "req" : null)}
      />
    );

    fireEvent.click(screen.getByTestId("row-edit"));
    const input = screen.getByTestId("row-input");
    fireEvent.change(input, { target: { value: "X" } });
    const form = input.closest("form");
    fireEvent.keyDown(form, { key: "Escape" });

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.queryByTestId("row-input")).not.toBeInTheDocument();
  });

  it("fireEvent.submit on the form triggers save", () => {
    const onSave = jest.fn();
    render(<InlineEditRow id="row" label="Field" value="" onSave={onSave} validate={() => null} />);
    fireEvent.click(screen.getByTestId("row-edit"));
    const input = screen.getByTestId("row-input");
    fireEvent.change(input, { target: { value: "Submitted" } });
    const form = input.closest("form");
    act(() => {
      fireEvent.submit(form);
    });
    expect(onSave).toHaveBeenCalledWith("Submitted");
  });
});

// ─── Coverage: optional props / branches ─────────────────────────────────────

describe("InlineEditRow — optional props", () => {
  it("formatDisplay is applied to the displayed value", () => {
    render(
      <InlineEditRow
        id="row"
        label="Amount"
        value="1234567"
        onSave={() => {}}
        validate={() => null}
        formatDisplay={(v) => `USD ${v.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`}
      />
    );
    expect(screen.getByTestId("row-display")).toHaveTextContent("USD 1,234,567");
  });

  it("falls back to the raw value when formatDisplay is undefined", () => {
    render(
      <InlineEditRow id="row" label="Amount" value="100" onSave={() => {}} validate={() => null} />
    );
    expect(screen.getByTestId("row-display")).toHaveTextContent("100");
  });

  it("uses editLabel/saveLabel/cancelLabel overrides verbatim", async () => {
    const user = userEvent.setup();
    render(
      <InlineEditRow
        id="row"
        label="Amount"
        value=""
        onSave={() => {}}
        validate={() => null}
        editLabel="Modify amount"
        saveLabel="Confirm amount"
        cancelLabel="Discard amount"
        savedAnnouncement="{label} saved."
        cancelledAnnouncement="Edit cancelled."
      />
    );
    expect(screen.getByRole("button", { name: "Modify amount" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /modify amount/i }));
    await user.type(screen.getByTestId("row-input"), "42");

    expect(screen.getByRole("button", { name: "Confirm amount" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Discard amount" })).toBeInTheDocument();
  });

  it("omit description cleanly (no <p> rendered, no aria-describedby)", async () => {
    const user = userEvent.setup();
    render(
      <InlineEditRow id="row" label="Field" value="" onSave={() => {}} validate={() => null} />
    );
    // View mode only contains the label, the value, the Edit button, and the live region.
    expect(screen.queryByText(/[Dd]escription/)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /edit field/i }));
    const input = screen.getByTestId("row-input");
    expect(input.getAttribute("aria-describedby")).toBeNull();
  });

  it("defaults the input type to 'text' when type is omitted", async () => {
    const user = userEvent.setup();
    render(
      <InlineEditRow id="row" label="Token" value="" onSave={() => {}} validate={() => null} />
    );
    await user.click(screen.getByRole("button", { name: /edit token/i }));
    expect(screen.getByTestId("row-input")).toHaveAttribute("type", "text");
  });

  it("the validate prop wins over the required prop", async () => {
    const user = userEvent.setup();
    render(
      <InlineEditRow
        id="row"
        label="Field"
        value=""
        required
        onSave={() => {}}
        validate={(v) => (v === "magic" ? "must not be 'magic'" : null)}
      />
    );

    await user.click(screen.getByRole("button", { name: /edit field/i }));
    await user.type(screen.getByTestId("row-input"), "magic");
    expect(screen.getByTestId("row-error")).toHaveTextContent("must not be 'magic'");

    await user.clear(screen.getByTestId("row-input"));
    await user.type(screen.getByTestId("row-input"), "ok");
    expect(screen.queryByTestId("row-error")).not.toBeInTheDocument();
  });

  it("when save() runs while invalid it sets a 'not saved' announcement", () => {
    const onSave = jest.fn();
    render(
      <InlineEditRow
        id="row"
        label="Field"
        value=""
        onSave={onSave}
        validate={() => "always invalid"}
      />
    );
    fireEvent.click(screen.getByTestId("row-edit"));
    const input = screen.getByTestId("row-input");
    fireEvent.change(input, { target: { value: "anything" } });
    const form = input.closest("form");
    act(() => {
      fireEvent.submit(form);
    });
    expect(onSave).not.toHaveBeenCalled();
    // Live-region surfaces the rejection even though Save was disabled.
    expect(screen.getByRole("status").textContent).toMatch(/not saved/i);
  });
});
