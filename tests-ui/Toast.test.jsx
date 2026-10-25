import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ToastProvider, { useToast } from "@/components/toast/ToastProvider";
import CopyButton from "@/components/CopyButton";

function Pusher({ toast }) {
  const { push } = useToast();
  return (
    <button type="button" onClick={() => push(toast)}>
      push
    </button>
  );
}

describe("ToastProvider", () => {
  it("announces success politely and errors as alerts", async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <Pusher toast={{ kind: "success", title: "Saved" }} />
      </ToastProvider>
    );
    await user.click(screen.getByRole("button", { name: "push" }));
    expect(await screen.findByText("Saved")).toBeInTheDocument();
    expect(screen.getByTestId("toast-region-polite")).toHaveTextContent("Saved");
  });

  it("routes errors to the alert region and dismisses with the close button", async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <Pusher toast={{ kind: "error", title: "Broke" }} />
      </ToastProvider>
    );
    await user.click(screen.getByRole("button", { name: "push" }));
    expect(await screen.findByText("Broke")).toBeInTheDocument();
    expect(screen.getByTestId("toast-region-assertive")).toHaveTextContent("Broke");
    await user.click(screen.getByRole("button", { name: "Dismiss notification" }));
    await waitFor(() => expect(screen.queryByText("Broke")).toBeNull());
  });

  it("Escape dismisses the focused toast", async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <Pusher toast={{ kind: "error", title: "Esc me" }} />
      </ToastProvider>
    );
    await user.click(screen.getByRole("button", { name: "push" }));
    await screen.findByText("Esc me");
    act(() => screen.getByRole("button", { name: "Dismiss notification" }).focus());
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByText("Esc me")).toBeNull());
  });

  it("CopyButton reports clipboard failures with an error toast", async () => {
    const user = userEvent.setup();
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: vi.fn().mockRejectedValue(new Error("denied")) } });
    render(
      <ToastProvider>
        <CopyButton value="abc" />
      </ToastProvider>
    );
    await user.click(screen.getByRole("button", { name: "Copy" }));
    expect(await screen.findByText("Couldn't copy — select and copy manually")).toBeInTheDocument();
  });
});
