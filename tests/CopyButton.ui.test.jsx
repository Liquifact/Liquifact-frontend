/**
 * Component tests for CopyButton.
 *
 * Covers inline "Copied ✓" + 1500 ms reset (fake timers), ToastProvider success
 * toast, clipboard-unavailable / rejection error toast, and unmount safety.
 *
 * Run with: npx vitest run tests/CopyButton.ui.test.jsx
 */

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CopyButton from "@/components/CopyButton";
import ToastProvider from "@/components/toast/ToastProvider";

const originalClipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, "clipboard");

function setClipboard(value) {
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    writable: true,
    value,
  });
}

function restoreClipboard() {
  if (originalClipboardDescriptor) {
    Object.defineProperty(navigator, "clipboard", originalClipboardDescriptor);
  } else {
    delete navigator.clipboard;
  }
}

describe("CopyButton component", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    restoreClipboard();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("shows inline 'Copied ✓' outside ToastProvider and resets after 1500 ms", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    setClipboard({ writeText });

    render(<CopyButton value="GABC1234" label="Copy ID" />);

    const button = screen.getByRole("button", { name: "Copy ID" });
    await act(async () => {
      fireEvent.click(button);
      await Promise.resolve();
    });

    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText).toHaveBeenCalledWith("GABC1234");
    expect(button).toHaveTextContent("Copied ✓");

    act(() => {
      vi.advanceTimersByTime(1499);
    });
    expect(button).toHaveTextContent("Copied ✓");

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(button).toHaveTextContent("Copy ID");
  });

  it("pushes a success toast inside ToastProvider and keeps the button label", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    setClipboard({ writeText });

    render(
      <ToastProvider>
        <CopyButton value="0xdeadbeef" />
      </ToastProvider>
    );

    const button = screen.getByRole("button", { name: "Copy" });
    await act(async () => {
      fireEvent.click(button);
      await Promise.resolve();
    });

    expect(writeText).toHaveBeenCalledWith("0xdeadbeef");
    expect(screen.getByText("Copied to clipboard")).toBeInTheDocument();
    expect(button).toHaveTextContent("Copy");
  });

  it("shows an error toast when navigator.clipboard is unavailable", async () => {
    setClipboard(undefined);

    render(
      <ToastProvider>
        <CopyButton value="GXYZ9999" />
      </ToastProvider>
    );

    const button = screen.getByRole("button", { name: "Copy" });
    await act(async () => {
      fireEvent.click(button);
      await Promise.resolve();
    });

    expect(
      screen.getByText("Couldn't copy — select and copy manually")
    ).toBeInTheDocument();
  });

  it("shows an error toast when navigator.clipboard.writeText rejects", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("permission denied"));
    setClipboard({ writeText });

    render(
      <ToastProvider>
        <CopyButton value="GXYZ9999" />
      </ToastProvider>
    );

    const button = screen.getByRole("button", { name: "Copy" });
    await act(async () => {
      fireEvent.click(button);
      await Promise.resolve();
    });

    expect(writeText).toHaveBeenCalledWith("GXYZ9999");
    expect(
      screen.getByText("Couldn't copy — select and copy manually")
    ).toBeInTheDocument();
  });

  it("does not update state or leak timers after unmount", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");

    // 1) Unmount while inline reset timer is pending
    const writeTextImmediate = vi.fn().mockResolvedValue(undefined);
    setClipboard({ writeText: writeTextImmediate });

    const { unmount } = render(<CopyButton value="G1111" />);
    const button = screen.getByRole("button", { name: "Copy" });

    await act(async () => {
      fireEvent.click(button);
      await Promise.resolve();
    });
    expect(button).toHaveTextContent("Copied ✓");

    unmount();
    expect(clearTimeoutSpy).toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    // 2) Unmount while clipboard writeText promise is still pending
    let resolveWrite;
    const pendingWrite = new Promise((resolve) => {
      resolveWrite = resolve;
    });
    setClipboard({ writeText: vi.fn(() => pendingWrite) });

    const secondRender = render(<CopyButton value="G2222" />);
    fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    secondRender.unmount();

    await act(async () => {
      resolveWrite();
      await pendingWrite;
    });

    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });
});
