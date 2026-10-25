import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { vi } from "vitest";

// next/link requires Next.js router context; render it as a plain anchor in tests.
vi.mock("next/link", () => ({
  default: (props) => <a href={props.href} {...(props)}>{props.children}</a>,
}));

import { NotificationsContext } from "@/components/NotificationsProvider";
import NotificationBell from "@/components/NotificationBell";

const makeValue = (overrides = {}) => ({
  events: [],
  unreadCount: 0,
  follow: vi.fn(),
  unfollow: vi.fn(),
  isFollowing: vi.fn(() => false),
  markAllRead: vi.fn(),
  permission: "default",
  requestPermission: vi.fn(() => Promise.resolve("granted")),
  supported: true,
  ...overrides,
});

function BellWrapper({ value }) {
  return (
    <NotificationsContext.Provider value={value}>
      <NotificationBell />
    </NotificationsContext.Provider>
  );
}

test("renders bell with unread badge and aria-label reflecting unread count", () => {
  const { rerender } = render(<BellWrapper value={makeValue({ unreadCount: 0 })} />);
  let bell = screen.getByRole("button", { name: "Notifications, 0 unread" });
  expect(bell).toBeInTheDocument();
  expect(document.querySelector(".unread-badge")).toBeNull();

  rerender(<BellWrapper value={makeValue({ unreadCount: 2 })} />);
  bell = screen.getByRole("button", { name: "Notifications, 2 unread" });
  expect(bell).toBeInTheDocument();
  expect(document.querySelector(".unread-badge").textContent).toBe("2");
});

test("opens popover on click and lists events with invoice links", () => {
  const value = makeValue({
    unreadCount: 1,
    events: [
      { id: "INV_0002", type: "funded", from: "open", to: "funded", at: Date.now() - 60000 },
    ],
  });
  render(<BellWrapper value={value} />);

  fireEvent.click(screen.getByRole("button", { name: "Notifications, 1 unread" }));
  const popover = screen.getByRole("region", { name: /notifications/i });
  expect(popover).toBeInTheDocument();
  expect(screen.getByText(/INV_0002 is now funded/i)).toBeInTheDocument();
  expect(screen.getByText(/1 minute ago/)).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /INV_0002 is now funded/i })).toHaveAttribute(
    "href",
    "/marketplace/INV_0002",
  );
});

test("Escape closes the popover and returns focus to the bell", () => {
  render(<BellWrapper value={makeValue({ unreadCount: 1 })} />);
  const bell = screen.getByRole("button", { name: "Notifications, 1 unread" });
  fireEvent.click(bell);
  expect(screen.getByRole("region", { name: /notifications/i })).toBeInTheDocument();

  fireEvent.keyDown(document, { key: "Escape" });
  expect(screen.queryByRole("region", { name: /notifications/i })).not.toBeInTheDocument();
  expect(document.activeElement).toBe(bell);
});

test("renders an empty state when there are no events", () => {
  render(<BellWrapper value={makeValue({ unreadCount: 0 })} />);
  fireEvent.click(screen.getByRole("button", { name: "Notifications, 0 unread" }));
  expect(screen.getByText(/No notifications yet/i)).toBeInTheDocument();
  expect(screen.getByText(/Follow an invoice/i)).toBeInTheDocument();
});

test("mark all read invokes markAllRead", () => {
  const markAllRead = vi.fn();
  render(<BellWrapper value={makeValue({ unreadCount: 3, markAllRead })} />);
  fireEvent.click(screen.getByRole("button", { name: "Notifications, 3 unread" }));
  fireEvent.click(screen.getByRole("button", { name: /mark all read/i }));
  expect(markAllRead).toHaveBeenCalledTimes(1);
});

test("browser notification permission is only requested after clicking the toggle", async () => {
  const user = userEvent.setup();
  const value = makeValue({ supported: true, permission: "default" });
  render(<BellWrapper value={value} />);

  fireEvent.click(screen.getByRole("button", { name: "Notifications, 0 unread" }));
  const toggle = screen.getByRole("switch", { name: /browser notifications/i });
  expect(toggle).toBeInTheDocument();
  expect(toggle).toHaveAttribute("aria-checked", "false");
  expect(value.requestPermission).not.toHaveBeenCalled();

  await user.click(toggle);
  expect(value.requestPermission).toHaveBeenCalledTimes(1);
});

test("keyboard opens popover with Enter and closes with Escape", () => {
  render(<BellWrapper value={makeValue({ unreadCount: 1 })} />);
  const bell = screen.getByRole("button", { name: "Notifications, 1 unread" });
  fireEvent.keyDown(bell, { key: "Enter" });
  expect(screen.getByRole("region", { name: /notifications/i })).toBeInTheDocument();

  fireEvent.keyDown(document, { key: "Escape" });
  expect(screen.queryByRole("region", { name: /notifications/i })).not.toBeInTheDocument();
  expect(document.activeElement).toBe(bell);
});
