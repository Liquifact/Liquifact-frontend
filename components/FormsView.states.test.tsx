import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FormsView from "./FormsView";

describe("FormsView states", () => {
  describe("mutual exclusivity", () => {
    it("renders only the loading indicator in the loading state", () => {
      render(<FormsView status="loading" />);

      expect(screen.getByTestId("forms-view-loading")).toBeInTheDocument();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(screen.queryByText(/no forms yet/i)).not.toBeInTheDocument();
      expect(screen.queryByRole("heading", { name: /forms/i })).not.toBeInTheDocument();
      expect(screen.getByTestId("forms-view-loading")).toHaveAttribute("aria-busy", "true");
      expect(screen.getByText(/loading forms, please wait/i)).toBeInTheDocument();
    });

    it("renders only the error banner in the error state", () => {
      render(<FormsView status="error" error={{ message: "Network down" }} onRetry={() => {}} />);

      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(screen.queryByTestId("forms-view-loading")).not.toBeInTheDocument();
      expect(screen.queryByText(/no forms yet/i)).not.toBeInTheDocument();
    });

    it("renders only the empty state when status is empty", () => {
      render(<FormsView status="empty" />);

      expect(screen.getByText(/no forms yet/i)).toBeInTheDocument();
      expect(screen.queryByTestId("forms-view-loading")).not.toBeInTheDocument();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("renders the empty state when status is loaded but data is empty", () => {
      render(<FormsView status="loaded" data={[]} />);

      expect(screen.getByText(/no forms yet/i)).toBeInTheDocument();
      expect(screen.queryByRole("heading", { name: /^forms$/i })).not.toBeInTheDocument();
    });

    it("renders only the list when status is loaded with data", () => {
      render(<FormsView status="loaded" data={[{ id: "1", title: "Onboarding form" }]} />);

      expect(screen.getByRole("heading", { name: /^forms$/i })).toBeInTheDocument();
      expect(screen.getByText("Onboarding form")).toBeInTheDocument();
      expect(screen.queryByTestId("forms-view-loading")).not.toBeInTheDocument();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(screen.queryByText(/no forms yet/i)).not.toBeInTheDocument();
    });
  });

  describe("accessible announcements", () => {
    it("marks the loading state as an aria-busy, polite status region", () => {
      render(<FormsView status="loading" />);

      const region = screen.getByTestId("forms-view-loading");
      expect(region).toHaveAttribute("aria-busy", "true");
      expect(region.querySelector("[aria-hidden='true']")).toBeInTheDocument();
      expect(region).toHaveTextContent(/loading forms, please wait/i);
    });

    it("marks the empty state as a polite status region", () => {
      render(<FormsView status="empty" />);

      const region = screen.getByText(/no forms yet/i).closest('[role="status"]');
      expect(region).not.toBeNull();
      expect(region).toHaveAttribute("aria-live", "polite");
    });

    it("marks the error state as an assertive alert", () => {
      render(<FormsView status="error" error={{ message: "boom" }} onRetry={() => {}} />);

      const alert = screen.getByRole("alert");
      expect(alert).toHaveAttribute("aria-live", "assertive");
      expect(within(alert).getByText("boom")).toBeInTheDocument();
    });

    it("falls back to a generic message when no error message is provided", () => {
      render(<FormsView status="error" onRetry={() => {}} />);

      expect(
        screen.getByText(/something went wrong while loading your forms/i)
      ).toBeInTheDocument();
    });
  });

  describe("retry", () => {
    it("invokes onRetry when the retry button is clicked with a mouse", async () => {
      const user = userEvent.setup();
      const onRetry = jest.fn();
      render(<FormsView status="error" error={{ message: "boom" }} onRetry={onRetry} />);

      await user.click(screen.getByRole("button", { name: /retry/i }));

      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it("invokes onRetry via the keyboard (Tab then Enter)", async () => {
      const user = userEvent.setup();
      const onRetry = jest.fn();
      render(<FormsView status="error" error={{ message: "boom" }} onRetry={onRetry} />);

      await user.tab();
      expect(screen.getByRole("button", { name: /retry/i })).toHaveFocus();

      await user.keyboard("{Enter}");
      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it("invokes onRetry via the keyboard (Space)", async () => {
      const user = userEvent.setup();
      const onRetry = jest.fn();
      render(<FormsView status="error" error={{ message: "boom" }} onRetry={onRetry} />);

      screen.getByRole("button", { name: /retry/i }).focus();
      await user.keyboard(" ");

      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it("re-fetches on retry: a parent re-render with status=loading then loaded reflects the refreshed data", () => {
      const onRetry = jest.fn();
      const { rerender } = render(
        <FormsView status="error" error={{ message: "boom" }} onRetry={onRetry} />
      );

      // Simulate the parent re-fetching after retry is triggered.
      rerender(<FormsView status="loading" onRetry={onRetry} />);
      expect(screen.getByTestId("forms-view-loading")).toBeInTheDocument();

      rerender(<FormsView status="loaded" data={[{ id: "1", title: "Refreshed form" }]} />);
      expect(screen.getByText("Refreshed form")).toBeInTheDocument();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(screen.queryByTestId("forms-view-loading")).not.toBeInTheDocument();
    });

    it("replaces the skeleton with empty state once loading settles with no data", () => {
      const { rerender } = render(<FormsView status="loading" />);

      expect(screen.getByTestId("forms-view-loading")).toBeInTheDocument();

      rerender(<FormsView status="empty" />);

      expect(screen.queryByTestId("forms-view-loading")).not.toBeInTheDocument();
      expect(screen.getByText(/no forms yet/i)).toBeInTheDocument();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("replaces the skeleton with loaded content once data arrives", () => {
      const { rerender } = render(<FormsView status="loading" />);

      expect(screen.getByTestId("forms-view-loading")).toBeInTheDocument();

      rerender(<FormsView status="loaded" data={[{ id: "1", title: "Onboarding form" }]} />);

      expect(screen.queryByTestId("forms-view-loading")).not.toBeInTheDocument();
      expect(screen.getByRole("heading", { name: /^forms$/i })).toBeInTheDocument();
      expect(screen.getByText("Onboarding form")).toBeInTheDocument();
    });

    it("does not throw when onRetry is not provided", async () => {
      const user = userEvent.setup();
      render(<FormsView status="error" error={{ message: "boom" }} />);

      await expect(
        user.click(screen.getByRole("button", { name: /retry/i }))
      ).resolves.not.toThrow();
    });
  });
});
