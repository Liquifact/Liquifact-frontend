import "@testing-library/jest-dom";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import ConfirmDialog from "./ConfirmDialog";

// Button uses forwardRef and renders a native <button>
// No mocking needed

describe("ConfirmDialog", () => {
  const defaultProps = {
    open: true,
    onConfirm: jest.fn(),
    onCancel: jest.fn(),
    title: "Delete items?",
    message: "Are you sure?",
    confirmLabel: "Delete",
    confirmVariant: "danger" as const,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders nothing when closed", () => {
    const { container } = render(<ConfirmDialog {...defaultProps} open={false} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders dialog with title and message when open", () => {
    render(<ConfirmDialog {...defaultProps} />);

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute("aria-modal", "true");

    expect(screen.getByText("Delete items?")).toBeInTheDocument();
    expect(screen.getByText("Are you sure?")).toBeInTheDocument();
  });

  it("renders without optional message", () => {
    render(<ConfirmDialog {...defaultProps} message={undefined} />);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Delete items?")).toBeInTheDocument();
    expect(screen.queryByText("Are you sure?")).not.toBeInTheDocument();
  });

  it("calls onConfirm when confirm button is clicked", () => {
    render(<ConfirmDialog {...defaultProps} />);

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1);
    expect(defaultProps.onCancel).not.toHaveBeenCalled();
  });

  it("calls onCancel when Cancel button is clicked", () => {
    render(<ConfirmDialog {...defaultProps} />);

    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
    expect(defaultProps.onConfirm).not.toHaveBeenCalled();
  });

  it("calls onCancel on backdrop click", () => {
    render(<ConfirmDialog {...defaultProps} />);

    const backdrop = screen.getByTestId("confirm-dialog-backdrop");
    fireEvent.click(backdrop);
    expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
  });

  it("does NOT call onCancel on dialog content click", () => {
    render(<ConfirmDialog {...defaultProps} />);

    const dialog = screen.getByRole("dialog");
    fireEvent.click(dialog);
    expect(defaultProps.onCancel).not.toHaveBeenCalled();
  });

  it("calls onCancel on Escape key", () => {
    render(<ConfirmDialog {...defaultProps} />);

    const dialog = screen.getByRole("dialog");
    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
  });

  it("calls onCancel on Escape key on backdrop", () => {
    render(<ConfirmDialog {...defaultProps} />);

    const backdrop = screen.getByTestId("confirm-dialog-backdrop");
    fireEvent.keyDown(backdrop, { key: "Escape" });
    expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
  });

  it("disables Cancel button when isLoading", () => {
    render(<ConfirmDialog {...defaultProps} isLoading={true} />);

    expect(screen.getByRole("button", { name: /cancel/i })).toBeDisabled();
  });

  it("shows loading state on confirm button when isLoading", () => {
    render(<ConfirmDialog {...defaultProps} isLoading={true} />);

    const confirmBtn = screen.getByRole("button", { name: "Delete" });
    expect(confirmBtn).toBeDisabled();
    expect(confirmBtn).toHaveAttribute("aria-busy", "true");
  });

  it("renders with custom confirm variant", () => {
    render(<ConfirmDialog {...defaultProps} confirmVariant="primary" />);

    const confirmBtn = screen.getByRole("button", { name: "Delete" });
    expect(confirmBtn).toBeInTheDocument();
  });

  it("renders with custom confirm label", () => {
    render(<ConfirmDialog {...defaultProps} confirmLabel="Remove" />);

    expect(screen.getByRole("button", { name: "Remove" })).toBeInTheDocument();
  });

  it("traps focus: Tab cycles between Cancel and Delete", () => {
    render(<ConfirmDialog {...defaultProps} />);

    const cancelBtn = screen.getByRole("button", { name: /cancel/i });
    const confirmBtn = screen.getByRole("button", { name: "Delete" });

    cancelBtn.focus();
    expect(cancelBtn).toHaveFocus();

    fireEvent.keyDown(cancelBtn, { key: "Tab" });
    confirmBtn.focus();
    expect(confirmBtn).toHaveFocus();

    fireEvent.keyDown(confirmBtn, { key: "Tab", shiftKey: true });
    cancelBtn.focus();
    expect(cancelBtn).toHaveFocus();
  });

  it("keeps focus on dialog when no focusable elements exist (loading state)", () => {
    render(<ConfirmDialog {...defaultProps} isLoading={true} />);

    const dialog = screen.getByRole("dialog");

    fireEvent.keyDown(dialog, { key: "Tab" });
    expect(dialog).toHaveFocus();
  });

  it("focuses Cancel button on open via requestAnimationFrame", () => {
    jest.useFakeTimers();
    render(<ConfirmDialog {...defaultProps} />);

    jest.advanceTimersByTime(20);

    const cancelBtn = screen.getByRole("button", { name: /cancel/i });
    expect(cancelBtn).toHaveFocus();
    jest.useRealTimers();
  });

  it("restores focus to previously focused element on close", async () => {
    const { rerender } = render(
      <div>
        <button data-testid="trigger">Trigger</button>
        <ConfirmDialog {...defaultProps} open={false} />
      </div>
    );

    screen.getByTestId("trigger").focus();

    rerender(
      <div>
        <button data-testid="trigger">Trigger</button>
        <ConfirmDialog {...defaultProps} open={true} />
      </div>
    );

    rerender(
      <div>
        <button data-testid="trigger">Trigger</button>
        <ConfirmDialog {...defaultProps} open={false} />
      </div>
    );

    await waitFor(() => expect(screen.getByTestId("trigger")).toHaveFocus());
  });
});
