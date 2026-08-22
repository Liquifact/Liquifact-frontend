"use client";

import { useEffect, useRef, useCallback } from "react";

/**
 * RouteFocus handles moving focus to the main content on mount
 * and restoring it to the previously focused element on unmount.
 */
export function RouteFocus() {
  const previousFocus = useRef(null);

  useEffect(() => {
    previousFocus.current = document.activeElement;

    const target = document.getElementById("main-content");
    if (target) {
      target.setAttribute("tabIndex", "-1");
      target.focus();
    }

    return () => {
      if (previousFocus.current && typeof previousFocus.current.focus === "function") {
        previousFocus.current.focus();
      }
    };
  }, []);

  return null;
}

/**
 * DialogFocusTrap creates a keyboard focus trap for accessibility.
 * It ensures that pressing Tab or Shift+Tab loops focus within the container.
 *
 * Used for any dialogs present on the invoice-detail page.
 */
export function DialogFocusTrap({ children, isActive = true }) {
  const containerRef = useRef(null);

  const handleKeyDown = useCallback(
    (e) => {
      if (!isActive || e.key !== "Tab") return;

      const container = containerRef.current;
      if (!container) return;

      const focusableElements = container.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement.focus();
          e.preventDefault();
        }
      }
    },
    [isActive]
  );

  return (
    <div ref={containerRef} onKeyDown={handleKeyDown}>
      {children}
    </div>
  );
}
