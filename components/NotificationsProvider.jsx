"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { listInvoices } from "@/lib/api";
import { createNotificationStore } from "@/lib/notifications/store";
import { createInvoiceMonitor } from "@/lib/notifications/monitor";
import { BROWSER_NOTIFICATIONS_KEY, LOCAL_DATA_CHANGED_EVENT } from "@/lib/localData";

const DEFAULT_PERMISSION = "default"; // "granted" | "denied" | "default"

export const NotificationsContext = createContext(null);

/**
 * Provides followed-invoice change tracking to the whole app.
 *
 * Polls listInvoices() every 60s while the tab is visible and at least one
 * invoice is followed (paused on visibilitychange, refreshed on focus).
 */
export function NotificationsProvider({ children }) {
  const store = useMemo(() => {
    let storage;
    try { storage = localStorage; } catch { storage = null; }
    return createNotificationStore({ storage });
  }, []);
  const monitor = useMemo(() => createInvoiceMonitor({ listInvoices, store }), [listInvoices, store]);

  const [events, setEvents] = useState(store.getEvents());
  const [unreadCount, setUnreadCount] = useState(store.unreadCount());
  const [followedIds, setFollowedIds] = useState(() => Array.from(store.getFollowed()));
  const [snapshot, setSnapshot] = useState(() => store.getSnapshot());
  const [permission, setPermission] = useState(DEFAULT_PERMISSION);
  const [supported, setSupported] = useState(false);
  const [browserEnabled, setEnabled] = useState(false);

  const refresh = useCallback(() => {
    setEvents(store.getEvents());
    setUnreadCount(store.unreadCount());
    setFollowedIds(Array.from(store.getFollowed()));
    setSnapshot(store.getSnapshot());
  }, [store]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const follow = useCallback(
    (id) => {
      store.follow(id);
      refresh();
      monitor.start();
    },
    [store, monitor, refresh]
  );

  const unfollow = useCallback(
    (id) => {
      store.unfollow(id);
      refresh();
      monitor.start(); // recomputes shouldPoll (stops when nothing followed)
    },
    [store, monitor, refresh]
  );

  const isFollowing = useCallback((id) => store.isFollowing(id), [store]);

  const markAllRead = useCallback(() => {
    store.markAllRead();
    refresh();
  }, [store, refresh]);

  const requestPermission = useCallback(async () => {
    if (!supported) return "unsupported";
    const perm = await Notification.requestPermission();
    setPermission(perm);
    return perm;
  }, [supported]);

  const setBrowserEnabled = useCallback(async (enabled) => {
    if (!supported) return "unsupported";
    const nextPermission = enabled && Notification.permission === "default" ? await requestPermission() : Notification.permission;
    const nextEnabled = enabled && nextPermission === "granted";
    setEnabled(nextEnabled);
    try { localStorage.setItem(BROWSER_NOTIFICATIONS_KEY, String(nextEnabled)); } catch { /* Keep session preference when storage is unavailable. */ }
    return enabled ? nextPermission : "disabled";
  }, [supported, requestPermission]);

  // Dispatch newly detected events: refresh UI and show a system notification
  // when the tab is hidden and browser notifications are enabled.
  useEffect(() => {
    monitor.setOnEvent((event) => {
      refresh();
      if (
        permission === "granted" && browserEnabled &&
        typeof document !== "undefined" &&
        document.visibilityState === "hidden"
      ) {
        new Notification(`LiquiFact · ${eventTitle(event)}`, {
          body: eventBody(event),
          icon: "/favicon.ico",
        });
      }
    });
  }, [monitor, permission, browserEnabled, refresh]);

  useEffect(() => {
    const syncPreference = () => {
      const available = typeof Notification !== "undefined";
      const current = available ? Notification.permission : DEFAULT_PERMISSION;
      setSupported(available);
      setPermission(current);
      let enabled = false;
      try { enabled = current === "granted" && localStorage.getItem(BROWSER_NOTIFICATIONS_KEY) === "true"; } catch { /* Keep alerts disabled. */ }
      setEnabled(enabled);
    };
    const syncData = (event) => {
      if (event.detail?.keys?.includes("liquifact.notifications.v1") || event.key === "liquifact.notifications.v1") {
        monitor.stop();
        store.reload();
        refresh();
        monitor.start();
      }
      syncPreference();
    };
    syncPreference();
    window.addEventListener("focus", syncPreference);
    window.addEventListener("storage", syncData);
    window.addEventListener(LOCAL_DATA_CHANGED_EVENT, syncData);
    return () => {
      window.removeEventListener("focus", syncPreference);
      window.removeEventListener("storage", syncData);
      window.removeEventListener(LOCAL_DATA_CHANGED_EVENT, syncData);
    };
  }, [store, monitor, refresh]);

  // Lifecycle: attach visibility/focus listeners, start polling when applicable.
  useEffect(() => {
    setSupported(typeof Notification !== "undefined");
    const onVisibility = () => monitor.onVisibilityChange();
    const onFocus = () => monitor.onFocus();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onFocus);
    if (document.visibilityState === "visible") monitor.start();
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onFocus);
      monitor.stop();
    };
  }, [monitor]);

  const value = {
    events,
    unreadCount,
    followedIds,
    snapshot,
    follow,
    unfollow,
    isFollowing,
    markAllRead,
    permission,
    requestPermission,
    supported,
    browserEnabled,
    setBrowserEnabled,
  };

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

/**
 * Consume notification context. Must be rendered within NotificationsProvider.
 */
export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications must be used within a NotificationsProvider");
  return ctx;
}

function eventTitle(event) {
  if (event.type === "progress") return `${event.id} funding update`;
  if (event.to === "removed") return `${event.id} removed from marketplace`;
  return `${event.id} is now ${event.to}`;
}

function eventBody(event) {
  if (event.to === "removed") return `${event.id} is no longer listed on the marketplace.`;
  return `${event.id} status changed from ${event.from} to ${event.to}.`;
}
