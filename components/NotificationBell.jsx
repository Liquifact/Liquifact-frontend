"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useNotifications } from "./NotificationsProvider";
import { relativeTime } from "@/lib/notifications/diff";

/**
 * Header bell button with a notification popover.
 *
 * - Badge shows the unread count (aria-label reflects it).
 * - Popover lists events with relative time and a link to the invoice.
 * - "Mark all read", empty state, and an opt-in browser-notifications toggle.
 * - Keyboard: Enter/Space opens, Escape closes and returns focus, Tab cycles
 *   through the popover controls in a logical order.
 */
export default function NotificationBell() {
  const { unreadCount, events, markAllRead, permission, requestPermission, supported } = useNotifications();

  const bellRef = useRef(null);
  const panelRef = useRef(null);
  const [open, setOpen] = useState(false);

  const toggle = useCallback(() => setOpen((o) => !o), []);
  const close = useCallback(() => {
    setOpen(false);
    bellRef.current?.focus();
  }, []);

  // Escape closes the popover and returns focus to the bell.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close]);

  // Clicking outside the bell and popover closes it.
  useEffect(() => {
    if (!open) return;
    const onClick = (e) => {
      if (
        bellRef.current &&
        !bellRef.current.contains(e.target) &&
        panelRef.current &&
        !panelRef.current.contains(e.target)
      ) {
        close();
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open, close]);

  const handleEnableClick = useCallback(() => {
    // Permission is only ever requested as a direct result of a user click.
    if (permission !== "granted") {
      requestPermission();
    }
  }, [permission, requestPermission]);

  return (
    <div className="notification-wrapper" style={{ display: "inline-flex", position: "relative" }}>
      <button
        ref={bellRef}
        className="bell-btn"
        aria-label={`Notifications, ${unreadCount} unread`}
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls="notifications-popover"
        onClick={toggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggle();
          }
        }}
      >
        <span className="bell-icon" aria-hidden="true">
          {unreadCount > 0 ? "🔔" : "🔕"}
        </span>
        {unreadCount > 0 && (
          <span className="unread-badge" aria-hidden="true">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          id="notifications-popover"
          className="notifications-popover"
          role="region"
          aria-labelledby="notifications-heading"
          tabIndex={-1}
        >
          <div className="notifications-header">
            <h3 id="notifications-heading" className="popover-heading">
              Notifications
            </h3>
            <div className="popover-actions">
              {unreadCount > 0 && (
                <button
                  className="mark-all-read"
                  onClick={(e) => {
                    e.preventDefault();
                    markAllRead();
                    close();
                  }}
                >
                  Mark all read
                </button>
              )}
              <button className="close-popover" onClick={close} aria-label="Close notifications">
                ✕
              </button>
            </div>
          </div>

          <div className="notifications-list">
            {events.length === 0 ? (
              <div className="empty-state">
                <p className="empty-title">No notifications yet</p>
                <p className="empty-hint">
                  Follow an invoice from its detail page to track funding and status changes.
                </p>
              </div>
            ) : (
              events.map((event) => (
                <div key={`${event.id}-${event.at}`} className="notification-event">
                  <Link
                    href={`/marketplace/${event.id}`}
                    onClick={close}
                    className="event-link"
                  >
                    <div className="event-body">
                      <div className="event-title">{eventTitle(event)}</div>
                      <div className="event-meta">
                        {eventMeta(event)} &middot; {relativeTime(event.at)}
                      </div>
                    </div>
                  </Link>
                </div>
              ))
            )}
          </div>

          {supported && (
            <div className="notifications-footer">
              <span id="bn-label" className="toggle-label">
                Browser notifications
              </span>
              <button
                id="bn-toggle"
                role="switch"
                aria-labelledby="bn-label"
                aria-checked={permission === "granted"}
                className={`toggle-btn ${permission === "granted" ? "on" : ""}`}
                onClick={handleEnableClick}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleEnableClick();
                  }
                }}
              >
                {permission === "granted" ? "On" : permission === "denied" ? "Blocked" : "Enable"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function eventTitle(event) {
  if (event.to === "removed") return `${event.id} removed`;
  return `${event.id} is now ${event.to}`;
}

function eventMeta(event) {
  return event.type === "progress" ? "Funding update" : `Status: ${event.from} &rarr; ${event.to}`;
}
