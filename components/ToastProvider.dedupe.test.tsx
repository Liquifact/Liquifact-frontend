import "@testing-library/jest-dom";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { ToastProvider, useToast } from "./ToastProvider";

function ToastHarness() {
  const toast = useToast();

  return (
    <div>
      <button type="button" onClick={() => toast.info("Repeated message", "Duplicate")}>
        Duplicate
      </button>
      <button type="button" onClick={() => toast.success("Toast A", "One")}>
        One
      </button>
      <button type="button" onClick={() => toast.success("Toast B", "Two")}>
        Two
      </button>
      <button type="button" onClick={() => toast.success("Toast C", "Three")}>
        Three
      </button>
      <button type="button" onClick={() => toast.success("Toast D", "Four")}>
        Four
      </button>
      <button type="button" onClick={() => toast.error("Hover message", "Hover")}>
        Hover
      </button>
    </div>
  );
}

function renderWithProvider() {
  return render(
    <ToastProvider>
      <ToastHarness />
    </ToastProvider>
  );
}

function getToastStack() {
  return screen.getByRole("status");
}

function getVisibleToasts() {
  return screen.getAllByRole("button", { name: "Dismiss notification" });
}

function getToastTitles() {
  return getVisibleToasts().map((button) => {
    const card = button.closest("div.pointer-events-auto");
    return within(card as Element).getByText(/^(Duplicate|One|Two|Three|Four|Hover)$/).textContent;
  });
}

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
  jest.restoreAllMocks();
});

test("caps the visible stack and evicts the oldest toast", () => {
  renderWithProvider();

  fireEvent.click(screen.getByRole("button", { name: "One" }));
  fireEvent.click(screen.getByRole("button", { name: "Two" }));
  fireEvent.click(screen.getByRole("button", { name: "Three" }));
  fireEvent.click(screen.getByRole("button", { name: "Four" }));

  expect(getVisibleToasts()).toHaveLength(3);
  expect(getToastTitles()).toEqual(["Four", "Three", "Two"]);
});

test("collapses duplicate toasts and refreshes the dismissal timer", () => {
  renderWithProvider();

  fireEvent.click(screen.getByRole("button", { name: "Duplicate" }));
  expect(getVisibleToasts()).toHaveLength(1);

  act(() => {
    jest.advanceTimersByTime(4000);
  });

  fireEvent.click(screen.getByRole("button", { name: "Duplicate" }));

  expect(getVisibleToasts()).toHaveLength(1);

  act(() => {
    jest.advanceTimersByTime(4500);
  });

  expect(screen.getByText("Duplicate")).toBeInTheDocument();

  act(() => {
    jest.advanceTimersByTime(500);
  });

  expect(within(getToastStack()).queryByText("Duplicate")).not.toBeInTheDocument();
});

test("pauses on hover, resumes on mouse leave, and clears timers on unmount", () => {
  const clearTimeoutSpy = jest.spyOn(global, "clearTimeout");
  const { unmount } = renderWithProvider();

  fireEvent.click(screen.getByRole("button", { name: "Hover" }));

  const toastTitle = within(getToastStack()).getByText("Hover");
  const toastCard = toastTitle.closest("div");
  expect(toastCard).toBeTruthy();

  fireEvent.mouseEnter(toastCard as Element);

  act(() => {
    jest.advanceTimersByTime(6000);
  });

  expect(getToastStack()).toHaveTextContent("Hover");

  fireEvent.mouseLeave(toastCard as Element);

  act(() => {
    jest.advanceTimersByTime(5000);
  });

  expect(getToastStack()).not.toHaveTextContent("Hover");

  fireEvent.click(screen.getByRole("button", { name: "Hover" }));
  expect(within(getToastStack()).getByText("Hover")).toBeInTheDocument();

  unmount();
  expect(jest.getTimerCount()).toBe(0);
  expect(clearTimeoutSpy).toHaveBeenCalled();
});
