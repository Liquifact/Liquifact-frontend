"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import ToastErrorBoundary from "./toast/ToastErrorBoundary";
import { ToastStack } from "./toast/ToastStack";

const ToastContext = createContext(null);
export { ToastContext };
const AUTO_DISMISS_MS = 5000;
// Keep the visible toast stack small so bursty errors do not cover the viewport.
const MAX_TOASTS = 3;
const VARIANT_STYLES = {
  success: {
    base: "border-emerald-500/30 bg-emerald-500/10 text-emerald-100",
    accent: "text-emerald-300",
    icon: "✅",
    label: "Success",
  },
  error: {
    base: "border-red-500/30 bg-red-500/10 text-red-100",
    accent: "text-red-300",
    icon: "❌",
    label: "Error",
  },
  info: {
    base: "border-cyan-500/20 bg-cyan-500/10 text-cyan-100",
    accent: "text-cyan-300",
    icon: "ℹ️",
    label: "Info",
  },
};

function getToastKey({ variant = "info", title, message }) {
  return `${variant}::${title || ""}::${message || ""}`;
}

function createToast({ variant = "info", title, message }) {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    variant,
    title: title || VARIANT_STYLES[variant]?.label || "Notice",
    message,
    key: getToastKey({ variant, title, message }),
    autoDismiss: true,
  };
}

function canReceiveFocus(el) {
  return (
    el instanceof HTMLElement &&
    typeof el.focus === "function" &&
    !el.hasAttribute("disabled") &&
    el.isConnected
  );
}

function restoreFocusTo(el) {
  if (!canReceiveFocus(el)) return;
  queueMicrotask(() => {
    if (canReceiveFocus(el)) {
      el.focus();
    }
  });
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());
  // Tracks the element that was focused before the user moved focus into a toast.
  // Used to restore focus after a toast is dismissed via keyboard so focus does not
  // fall back to <body> (which would lose the user's place in the page).
  const preDismissFocusRef = useRef(null);
  // Ref to the toast container so we can detect focus moving outside it.
  const containerRef = useRef(null);
  // Captures document.activeElement at the moment addToast is called. This is the
  // fallback for document-level Escape handling, where focus never enters the toast
  // (so onFocus never fires to populate preDismissFocusRef).
  const addTimeFocusRef = useRef(null);

  const clearToastTimer = useCallback((id) => {
    const timeout = timers.current.get(id);
    if (timeout) {
      clearTimeout(timeout);
      timers.current.delete(id);
    }
  }, []);

  const removeToast = useCallback(
    (id) => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
      clearToastTimer(id);
    },
    [clearToastTimer]
  );

  const scheduleToastTimer = useCallback(
    (id) => {
      clearToastTimer(id);
      const timeout = setTimeout(() => removeToast(id), AUTO_DISMISS_MS);
      timers.current.set(id, timeout);
    },
    [clearToastTimer, removeToast]
  );

  const addToast = useCallback(
    ({ variant, title, message }) => {
      // Snapshot the currently focused element so document-level Escape can
      // restore focus even when the toast never receives focus directly.
      const activeEl = document.activeElement;
      if (activeEl && activeEl !== document.body && canReceiveFocus(activeEl)) {
        addTimeFocusRef.current = activeEl;
      }

      const nextToast = createToast({ variant, title, message });
      const key = nextToast.key;
      let timerAction = null;

      setToasts((current) => {
        const existingIndex = current.findIndex((toast) => toast.key === key);

        if (existingIndex !== -1) {
          const existingToast = current[existingIndex];
          timerAction = { type: "refresh", id: existingToast.id };
          // Bump the existing toast to the front (newest position) so
          // re-triggered messages appear at the top of the stack.
          if (existingIndex === 0) return current;
          return [
            existingToast,
            ...current.slice(0, existingIndex),
            ...current.slice(existingIndex + 1),
          ];
        }

        if (current.length >= MAX_TOASTS) {
          timerAction = {
            type: "replace",
            removedId: current[current.length - 1].id,
            id: nextToast.id,
          };
          const next = [nextToast, ...current.slice(0, MAX_TOASTS - 1)];
          return next;
        }

        timerAction = { type: "add", id: nextToast.id };
        return [nextToast, ...current];
      });

      if (timerAction?.type === "refresh") {
        scheduleToastTimer(timerAction.id);
        return;
      }

      if (timerAction?.type === "replace") {
        clearToastTimer(timerAction.removedId);
        scheduleToastTimer(timerAction.id);
        return;
      }

      if (timerAction?.type === "add") {
        scheduleToastTimer(timerAction.id);
      }
    },
    [clearToastTimer, scheduleToastTimer]
  );

  // Pause auto-dismiss — used by both mouseenter (pointer) and focus (keyboard).
  const pauseToast = useCallback(
    (id) => {
      clearToastTimer(id);
    },
    [clearToastTimer]
  );

  // Resume auto-dismiss — used by both mouseleave (pointer) and blur (keyboard).
  const resumeToast = useCallback(
    (id) => {
      if (timers.current.has(id)) {
        return;
      }
      setToasts((current) => {
        const toastExists = current.some((toast) => toast.id === id);
        if (!toastExists) return current;
        scheduleToastTimer(id);
        return current;
      });
    },
    [scheduleToastTimer]
  );

  // Dismiss the toast and return focus to the element that was active before the
  // user tabbed into the toast region. This prevents focus from falling to <body>.
  // Falls back to the element captured at addToast time for document-level Escape.
  const dismissAndReturnFocus = useCallback(
    (id) => {
      const target = preDismissFocusRef.current || addTimeFocusRef.current;
      removeToast(id);
      // Restore focus after React has removed the toast from the DOM.
      if (target && typeof target.focus === "function") {
        // Use setTimeout(0) so the DOM has settled before we re-focus.
        setTimeout(() => target.focus(), 0);
      }
    },
    [removeToast]
  );

  // Document-level Escape listener so that pressing Escape dismisses the most
  // recent toast regardless of where focus is (e.g. still on a trigger button or
  // an unrelated input). The per-toast onKeyDown handles the case where the toast
  // card itself is focused.
  useEffect(() => {
    if (toasts.length === 0) return;

    const handleKeyDown = (e) => {
      if (e.key !== "Escape") return;
      // Let the per-toast onKeyDown handle it when focus is inside the toast region.
      if (containerRef.current?.contains(e.target)) return;
      e.preventDefault();
      const mostRecent = toasts[0];
      if (mostRecent) {
        dismissAndReturnFocus(mostRecent.id);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [toasts, dismissAndReturnFocus]);

  useEffect(() => {
    const currentTimers = timers.current;
    return () => {
      currentTimers.forEach((timeout) => clearTimeout(timeout));
      currentTimers.clear();
    };
  }, []);

  const value = useMemo(
    () => ({
      success: (message, title) => addToast({ variant: "success", title, message }),
      error: (message, title) => addToast({ variant: "error", title, message }),
      info: (message, title) => addToast({ variant: "info", title, message }),
    }),
    [addToast]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}

      <ToastErrorBoundary>
        <ToastStack
          toasts={toasts}
          variantStyles={VARIANT_STYLES}
          containerRef={containerRef}
          pauseToast={pauseToast}
          resumeToast={resumeToast}
          dismissAndReturnFocus={dismissAndReturnFocus}
          recordPreDismissFocus={(el) => {
            preDismissFocusRef.current = el;
          }}
        />
      </ToastErrorBoundary>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
