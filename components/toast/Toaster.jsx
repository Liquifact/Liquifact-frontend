'use client';

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

function usePrefersReducedMotion() {
  const [prefers] = useState(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });
  return prefers;
}

function ToastItem({ toast, onDismiss, index }) {
  const [paused, setPaused] = useState(false);
  const remainingRef = useRef(toast.duration);
  const startedRef = useRef(0);
  const timerRef = useRef(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const schedule = useCallback(() => {
    clearTimer();
    if (!toast.duration || toast.duration <= 0) return;
    startedRef.current = Date.now();
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      onDismiss(toast.id);
    }, remainingRef.current);
  }, [toast.duration, toast.id, onDismiss, clearTimer]);

  useEffect(() => {
    if (paused) {
      clearTimer();
      if (startedRef.current) {
        const elapsed = Date.now() - startedRef.current;
        remainingRef.current = Math.max(0, remainingRef.current - elapsed);
        startedRef.current = 0;
      }
      return;
    }
    schedule();
    return clearTimer;
  }, [paused, schedule, clearTimer]);

  const onAction = useCallback(() => {
    if (toast.action) {
      const handler = toast.action.onPress || toast.action.onClick;
      if (typeof handler === "function") handler(toast);
    }
    onDismiss(toast.id);
  }, [toast, onDismiss]);

  return (
    <div
      className={`toast toast-${toast.kind}`}
      data-toast-id={toast.id}
      data-index={index}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setPaused(false);
      }}
    >
      <div className="toast-body">
        <div className="toast-title">{toast.title}</div>
        {toast.description ? (
          <div className="toast-description">{toast.description}</div>
        ) : null}
      </div>
      <div className="toast-actions">
        {toast.action ? (
          <button type="button" className="toast-action" onClick={onAction}>
            {toast.action.label ?? "Action"}
          </button>
        ) : null}
        <button
          type="button"
          className="toast-close"
          aria-label="Dismiss notification"
          onClick={() => onDismiss(toast.id)}
        >
          <span aria-hidden="true">×</span>
        </button>
      </div>
    </div>
  );
}

export default function Toaster({ toasts, onDismiss }) {
  const [mounted, setMounted] = useState(false);
  const politeRef = useRef(null);
  const assertiveRef = useRef(null);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    function onKeyDown(e) {
      const isF8 = e.key === "F8";
      const isAltT = e.altKey && (e.key === "t" || e.key === "T");
      if (!isF8 && !isAltT) return;
      const assertive = assertiveRef.current;
      const polite = politeRef.current;
      const region =
        assertive && assertive.querySelector("button") ? assertive : polite;
      if (!region) return;
      const focusable = region.querySelector("button, [href], [tabindex]");
      if (focusable) {
        e.preventDefault();
        focusable.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  if (!mounted || typeof document === "undefined") return null;

  const polite = toasts.filter((t) => t.kind !== "error");
  const assertive = toasts.filter((t) => t.kind === "error");

  const content = (
    <div
      className={`toaster${reducedMotion ? " toaster-reduced-motion" : ""}`}
      data-testid="toaster"
    >
      <div
        ref={politeRef}
        className="toast-region toast-region-polite"
        role="status"
        aria-live="polite"
        aria-relevant="additions"
        aria-atomic="false"
        data-testid="toast-region-polite"
      >
        {polite.map((toast, i) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} index={i} />
        ))}
      </div>
      <div
        ref={assertiveRef}
        className="toast-region toast-region-assertive"
        role="alert"
        aria-live="assertive"
        aria-relevant="additions"
        data-testid="toast-region-assertive"
      >
        {assertive.map((toast, i) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} index={i} />
        ))}
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
