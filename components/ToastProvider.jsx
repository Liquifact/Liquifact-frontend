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

      <div
        aria-live="polite"
        role="status"
        ref={containerRef}
        className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4 sm:justify-end sm:px-6"
      >
        <div className="flex w-full max-w-md flex-col gap-3">
          {toasts.map((toast) => {
            const variant = VARIANT_STYLES[toast.variant] || VARIANT_STYLES.info;

            return (
              <div
                key={toast.id}
                // tabIndex={0} makes the card itself focusable so keyboard users can
                // reach it via Tab and then use Escape to dismiss without having to
                // navigate to the Close button first.
                tabIndex={0}
                onMouseEnter={() => pauseToast(toast.id)}
                onMouseLeave={() => resumeToast(toast.id)}
                // Mirror hover pause/resume for keyboard users: focusing the card (or
                // any element inside it) pauses the timer; blurring resumes it.
                onFocus={(e) => {
                  // Record the previously-focused element the first time focus enters
                  // this toast so we can restore it on dismissal.
                  if (!containerRef.current?.contains(e.relatedTarget)) {
                    preDismissFocusRef.current = e.relatedTarget;
                  }
                  pauseToast(toast.id);
                }}
                onBlur={(e) => {
                  // Only resume if focus has left this toast entirely (not just moved
                  // between the card and its Close button).
                  if (!containerRef.current?.contains(e.relatedTarget)) {
                    resumeToast(toast.id);
                  }
                }}
                // Escape dismisses the currently-focused toast, matching common dialog
                // and menu patterns so keyboard users have a single consistent shortcut.
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    e.preventDefault();
                    dismissAndReturnFocus(toast.id);
                  }
                }}
                className={`pointer-events-auto overflow-hidden rounded-3xl border p-4 shadow-2xl shadow-slate-950/30 transition duration-200 ${variant.base}`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 text-xl" aria-hidden="true">
                    {variant.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-100">{toast.title}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-300">{toast.message}</p>
                  </div>
                  <button
                    type="button"
                    className="rounded-full border border-slate-700/80 bg-slate-950/70 px-2.5 py-1 text-xs font-semibold text-slate-100 outline-none transition duration-150 hover:bg-slate-900 focus-visible:ring-2 focus-visible:ring-cyan-400"
                    aria-label="Dismiss notification"
                    onClick={() => dismissAndReturnFocus(toast.id)}
                  >
                    Close
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
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
