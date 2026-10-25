'use client';

import { createContext, useCallback, useContext, useMemo, useReducer } from "react";
import Toaster from "./Toaster";
import { reducer } from "../../lib/toast/queue.js";

const ToastContext = createContext(null);

/** Toast API, or null when rendered outside a <ToastProvider> (standalone components/tests). */
export function useOptionalToast() {
  return useContext(ToastContext);
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a <ToastProvider>");
  }
  return ctx;
}

export default function ToastProvider({ children }) {
  const [toasts, dispatch] = useReducer(reducer, []);

  const push = useCallback((toast) => {
    dispatch({ type: "push", toast });
  }, []);

  const dismiss = useCallback((id) => {
    dispatch({ type: "dismiss", id });
  }, []);

  const clear = useCallback(() => {
    dispatch({ type: "clear" });
  }, []);

  const value = useMemo(() => ({ toasts, push, dismiss, clear }), [toasts, push, dismiss, clear]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Toaster toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}
