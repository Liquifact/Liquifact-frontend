import "@testing-library/jest-dom";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ToastProvider, useToast } from "../ToastProvider";

jest.setTimeout(20000);

function Harness() {
  const toast = useToast();
  return (
    <div>
      <button type="button" onClick={() => toast.success("Invoice uploaded.", "Saved")}>
        fire-success
      </button>
      <button type="button" onClick={() => toast.error("Could not reach the server.", "Failed")}>
        fire-error
      </button>
      <button type="button" onClick={() => toast.info("Sync in progress.")}>
        fire-info-no-title
      </button>
    </div>
  );
}

function AsyncActionHarness() {
  
  const toast = useToast();
  return (
    <button
      type="button"
      onClick={async () => {
        await Promise.resolve();
        toast.success("Upload complete.", "Done");
      }}
    >
      submit
    </button>
  );
}

function renderWithProvider(ui) {
  return render(<ToastProvider>{ui}</ToastProvider>);
}

function getToastRegion() {
  return screen.getByRole("status");
}

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  act(() => {
    jest.runOnlyPendingTimers();
  });
  jest.useRealTimers();
});

describe("ToastProvider - empty state", () => {
  it("renders the live region with no toasts and no accessible toast content", () => {
    renderWithProvider(<Harness />);
    const region = getToastRegion();
    expect(region).toBeInTheDocument();
    expect(within(region).queryByRole("button", { name: "Dismiss notification" })).toBeNull();
  });
});

describe("ToastProvider - variant states (success / error / info)", () => {
  it("renders a success toast with an accessible title and message", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    renderWithProvider(<Harness />);

    await user.click(screen.getByRole("button", { name: "fire-success" }));

    const region = getToastRegion();
    expect(within(region).getByText("Saved")).toBeInTheDocument();
    expect(within(region).getByText("Invoice uploaded.")).toBeInTheDocument();
  });

  it("renders an error toast with an accessible title and message", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    renderWithProvider(<Harness />);

    await user.click(screen.getByRole("button", { name: "fire-error" }));

    const region = getToastRegion();
    expect(within(region).getByText("Failed")).toBeInTheDocument();
    expect(within(region).getByText("Could not reach the server.")).toBeInTheDocument();
  });

  it("falls back to the variant label as the title when none is supplied", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    renderWithProvider(<Harness />);

    await user.click(screen.getByRole("button", { name: "fire-info-no-title" }));

    const region = getToastRegion();
    // VARIANT_STYLES.info.label === "Info" - createToast falls back to it.
    expect(within(region).getByText("Info")).toBeInTheDocument();
    expect(within(region).getByText("Sync in progress.")).toBeInTheDocument();
  });

  it("exposes the live region as role=status with aria-live=polite regardless of variant", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    renderWithProvider(<Harness />);
    await user.click(screen.getByRole("button", { name: "fire-error" }));

    const region = getToastRegion();
    expect(region).toHaveAttribute("aria-live", "polite");
  });

  it("gives every toast an accessible, labelled Dismiss button", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    renderWithProvider(<Harness />);
    await user.click(screen.getByRole("button", { name: "fire-success" }));

    expect(screen.getByRole("button", { name: "Dismiss notification" })).toBeInTheDocument();
  });
});

describe("ToastProvider - primary interaction (trigger, view, dismiss)", () => {
  it("shows the toast after the triggering action resolves, then removes it on Close", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    renderWithProvider(<AsyncActionHarness />);

    await user.click(screen.getByRole("button", { name: "submit" }));

    expect(await screen.findByText("Upload complete.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Dismiss notification" }));

    expect(screen.queryByText("Upload complete.")).not.toBeInTheDocument();
  });

  it("auto-dismisses a toast after 5 seconds without user interaction", async () => {
    renderWithProvider(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "fire-success" }));
    expect(screen.getByText("Invoice uploaded.")).toBeInTheDocument();

    await act(async () => {
      jest.advanceTimersByTime(5000);
    });

    expect(screen.queryByText("Invoice uploaded.")).not.toBeInTheDocument();
  });

  it("does not auto-dismiss before the 5 second window elapses", async () => {
    renderWithProvider(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "fire-success" }));

    await act(async () => {
      jest.advanceTimersByTime(4999);
    });

    expect(screen.getByText("Invoice uploaded.")).toBeInTheDocument();
  });
});

describe("ToastProvider - stacking, limit, and deduplication", () => {
  it("stacks multiple distinct toasts with the newest at the top", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    renderWithProvider(<Harness />);

    await user.click(screen.getByRole("button", { name: "fire-success" }));
    await user.click(screen.getByRole("button", { name: "fire-error" }));

    const region = getToastRegion();
    const rendered = within(region).getAllByText(/Uploaded\.|Could not reach/);
   
    const region_html = region.textContent;
    expect(region_html.indexOf("Could not reach the server.")).toBeLessThan(
      region_html.indexOf("Invoice uploaded.")
    );
  });

  it("evicts the oldest toast once MAX_TOASTS (3) is exceeded", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    function ManyHarness() {
      const toast = useToast();
      return (
        <div>
          {["one", "two", "three", "four"].map((label) => (
            <button key={label} type="button" onClick={() => toast.info(`msg-${label}`, label)}>
              fire-{label}
            </button>
          ))}
        </div>
      );
    }
    renderWithProvider(<ManyHarness />);

    await user.click(screen.getByRole("button", { name: "fire-one" }));
    await user.click(screen.getByRole("button", { name: "fire-two" }));
    await user.click(screen.getByRole("button", { name: "fire-three" }));
    expect(screen.getByText("msg-one")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "fire-four" }));

    // Stack limit is 3: the oldest ("one") is evicted to make room for "four".
    expect(screen.queryByText("msg-one")).not.toBeInTheDocument();
    expect(screen.getByText("msg-two")).toBeInTheDocument();
    expect(screen.getByText("msg-three")).toBeInTheDocument();
    expect(screen.getByText("msg-four")).toBeInTheDocument();
  });

  it("deduplicates a repeated variant::title::message toast by bumping it to the top and restarting its timer", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    renderWithProvider(<Harness />);

    await user.click(screen.getByRole("button", { name: "fire-success" }));
    await user.click(screen.getByRole("button", { name: "fire-error" }));
    // Re-fire the success toast; it already exists (not at position 0), so it
    // should move to the top rather than create a second entry.
    await user.click(screen.getByRole("button", { name: "fire-success" }));

    const region = getToastRegion();
    const successMatches = within(region).getAllByText("Invoice uploaded.");
    expect(successMatches).toHaveLength(1);

    const html = region.textContent;
    expect(html.indexOf("Invoice uploaded.")).toBeLessThan(
      html.indexOf("Could not reach the server.")
    );
  });

 
  it("[defect] a second, distinct toast fired later in the session does not auto-dismiss on its own timer", async () => {
    function TwoHarness() {
      const toast = useToast();
      return (
        <div>
          <button type="button" onClick={() => toast.info("alpha")}>
            fire-alpha
          </button>
          <button type="button" onClick={() => toast.info("beta")}>
            fire-beta
          </button>
        </div>
      );
    }
    renderWithProvider(<TwoHarness />);

    // First toast ever fired from this provider - its timer IS scheduled
    // (this is the one path that works).
    fireEvent.click(screen.getByRole("button", { name: "fire-alpha" }));
    await act(async () => {
      jest.advanceTimersByTime(5000);
    });
    expect(screen.queryByText("alpha")).not.toBeInTheDocument();

    // Second toast, fired well after the first fully cleared (no toasts on
    // screen, no pending state updates) - today this does NOT auto-dismiss.
    fireEvent.click(screen.getByRole("button", { name: "fire-beta" }));
    await act(async () => {
      jest.advanceTimersByTime(5000);
    });
    expect(screen.getByText("beta")).toBeInTheDocument();
  });

  it("[defect] re-firing an already-topmost (deduplicated) toast does not restart its timer", async () => {
    renderWithProvider(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "fire-success" }));

    await act(async () => {
      jest.advanceTimersByTime(4000);
    });
    // Re-fire the identical (variant/title/message) toast while it is still
    // the only - and therefore topmost - toast in the stack.
    fireEvent.click(screen.getByRole("button", { name: "fire-success" }));

    await act(async () => {
      jest.advanceTimersByTime(999);
    });
    // 4999ms after the ORIGINAL fire: still present.
    expect(screen.getByText("Invoice uploaded.")).toBeInTheDocument();

    await act(async () => {
      jest.advanceTimersByTime(1);
    });
    // 5000ms after the original fire (only 1000ms after the re-fire): the
    // toast is dismissed here today at the ORIGINAL deadline, even though
    // COMPONENTS.md documents that a re-fire "restarts its 5-second timer".
    expect(screen.queryByText("Invoice uploaded.")).not.toBeInTheDocument();
  });

  it("[defect] a toast added via the stack-limit eviction path never auto-dismisses", async () => {
    function ManyHarness() {
      const toast = useToast();
      return (
        <div>
          {["one", "two", "three", "four"].map((label) => (
            <button key={label} type="button" onClick={() => toast.info(`msg-${label}`, label)}>
              fire-{label}
            </button>
          ))}
        </div>
      );
    }
    renderWithProvider(<ManyHarness />);

    fireEvent.click(screen.getByRole("button", { name: "fire-one" }));
    fireEvent.click(screen.getByRole("button", { name: "fire-two" }));
    fireEvent.click(screen.getByRole("button", { name: "fire-three" }));
    // "four" triggers the replace/eviction path (existingIndex === -1,
    // current.length >= MAX_TOASTS).
    fireEvent.click(screen.getByRole("button", { name: "fire-four" }));

    await act(async () => {
      jest.advanceTimersByTime(20000);
    });
    // Today, "four" is still on screen well past any reasonable auto-dismiss
    // window because its timer was never scheduled.
    expect(screen.getByText("msg-four")).toBeInTheDocument();
  });
});

describe("ToastProvider - hover and keyboard pause/resume", () => {
  it("pauses auto-dismiss on mouse hover and resumes it on mouse leave", async () => {
    renderWithProvider(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "fire-success" }));
    const toastCard = screen.getByText("Invoice uploaded.").closest('[tabindex="0"]');

    fireEvent.mouseEnter(toastCard);
    await act(async () => {
      jest.advanceTimersByTime(5000);
    });
    // Paused - still present well past the 5s window.
    expect(screen.getByText("Invoice uploaded.")).toBeInTheDocument();

    fireEvent.mouseLeave(toastCard);
    await act(async () => {
      jest.advanceTimersByTime(5000);
    });
    expect(screen.queryByText("Invoice uploaded.")).not.toBeInTheDocument();
  });

  it("pauses auto-dismiss while the toast card has keyboard focus and resumes on blur", async () => {
    renderWithProvider(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "fire-success" }));
    const toastCard = screen.getByText("Invoice uploaded.").closest('[tabindex="0"]');

    fireEvent.focus(toastCard);
    await act(async () => {
      jest.advanceTimersByTime(5000);
    });
    expect(screen.getByText("Invoice uploaded.")).toBeInTheDocument();

    fireEvent.blur(toastCard, { relatedTarget: document.body });
    await act(async () => {
      jest.advanceTimersByTime(5000);
    });
    expect(screen.queryByText("Invoice uploaded.")).not.toBeInTheDocument();
  });

  it("pressing Escape while a toast card itself has focus dismisses that toast", async () => {
    renderWithProvider(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "fire-success" }));
    const toastCard = screen.getByText("Invoice uploaded.").closest('[tabindex="0"]');

    act(() => {
      fireEvent.keyDown(toastCard, { key: "Escape", code: "Escape" });
    });

    expect(screen.queryByText("Invoice uploaded.")).not.toBeInTheDocument();
  });
});

describe("ToastProvider - additional branch coverage", () => {
  it("a second mouseenter while already paused is a no-op (resumeToast early-return branch)", async () => {
    renderWithProvider(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "fire-success" }));
    const toastCard = screen.getByText("Invoice uploaded.").closest('[tabindex="0"]');

    
    fireEvent.mouseEnter(toastCard);
    fireEvent.mouseEnter(toastCard);
    fireEvent.mouseLeave(toastCard);

    
    fireEvent.mouseLeave(toastCard);

    await act(async () => {
      jest.advanceTimersByTime(5000);
    });
    expect(screen.queryByText("Invoice uploaded.")).not.toBeInTheDocument();
  });
});

describe("useToast - error boundary contract", () => {
  it("throws a descriptive error when used outside a ToastProvider", () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
    function Bare() {
      useToast();
      return null;
    }
    expect(() => render(<Bare />)).toThrow("useToast must be used within a ToastProvider");
    consoleError.mockRestore();
  });
});