"use client";

// Saved marketplace searches (#1526): a disclosure button that opens a
// non-modal popover to save the current filters under a name, apply a saved
// preset (which updates the URL) or delete one.
//
// Keyboard: the trigger is a native button (Enter/Space); on open, focus moves
// to the name field; Escape closes and returns focus to the trigger; Tab moves
// through the popover in DOM order; focus or clicks outside close it.

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useT } from "@/lib/i18n/I18nProvider";
import {
  ERRORS,
  MAX_NAME_LENGTH,
  MAX_SAVED_SEARCHES,
  listSavedSearches,
  removeSearch,
  saveSearch,
} from "@/lib/savedSearches";

const ERROR_KEYS = {
  [ERRORS.EMPTY_NAME]: "marketplace.presets.error.empty",
  [ERRORS.DUPLICATE]: "marketplace.presets.error.duplicate",
  [ERRORS.LIMIT]: "marketplace.presets.error.limit",
  [ERRORS.STORAGE]: "marketplace.presets.error.storage",
  [ERRORS.NOT_FOUND]: "marketplace.presets.error.storage",
};

/**
 * @param {{ currentQuery: string, onApply: (preset: { name: string, query: string }) => void }} props
 */
export default function SavedSearches({ currentQuery, onApply }) {
  const t = useT();
  const baseId = useId();
  const popoverId = `${baseId}-popover`;
  const inputId = `${baseId}-name`;
  const statusId = `${baseId}-status`;

  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [name, setName] = useState("");
  const [status, setStatus] = useState({ kind: "", text: "" });

  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const inputRef = useRef(null);

  // Read storage after mount only, so server and first client render match.
  useEffect(() => {
    setItems(listSavedSearches());
  }, []);

  const close = useCallback((restoreFocus) => {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    // Re-read in case another tab changed the list.
    setItems(listSavedSearches());
    inputRef.current?.focus();

    function onKeyDown(e) {
      if (e.key === "Escape") {
        e.preventDefault();
        close(true);
      }
    }
    function onPointerDown(e) {
      if (!rootRef.current?.contains(e.target)) close(false);
    }
    function onFocusIn(e) {
      if (!rootRef.current?.contains(e.target)) close(false);
    }
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("focusin", onFocusIn);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("focusin", onFocusIn);
    };
  }, [open, close]);

  function toggle() {
    setStatus({ kind: "", text: "" });
    setOpen((o) => !o);
  }

  function errorText(code) {
    return t(ERROR_KEYS[code] ?? "marketplace.presets.error.storage", { max: MAX_SAVED_SEARCHES });
  }

  function onSave(e) {
    e.preventDefault();
    const res = saveSearch(name, currentQuery);
    setItems(res.items);
    if (!res.ok) {
      setStatus({ kind: "err", text: errorText(res.error) });
      inputRef.current?.focus();
      return;
    }
    setName("");
    setStatus({ kind: "ok", text: t("marketplace.presets.saved", { name: res.item.name }) });
  }

  function onDelete(item, index) {
    const res = removeSearch(item.id);
    setItems(res.items);
    if (!res.ok) {
      setStatus({ kind: "err", text: errorText(res.error) });
      return;
    }
    setStatus({ kind: "ok", text: t("marketplace.presets.deleted", { name: item.name }) });
    // Keep focus inside the popover: next row's apply button, else the name field.
    requestAnimationFrame(() => {
      const buttons = rootRef.current?.querySelectorAll("[data-preset-apply]") ?? [];
      const target = buttons[Math.min(index, buttons.length - 1)];
      (target ?? inputRef.current)?.focus();
    });
  }

  function onApplyPreset(item) {
    onApply(item);
    close(true);
  }

  return (
    <div className="mq-presets" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className="btn btn-ghost mq-presets-trigger"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? popoverId : undefined}
        onClick={toggle}
      >
        {t("marketplace.presets.button")}
        {items.length > 0 && <span className="mq-presets-badge">{items.length}</span>}
      </button>

      {open && (
        <div id={popoverId} className="mq-presets-popover" role="dialog" aria-modal="false" aria-label={t("marketplace.presets.title")}>
          <form className="mq-presets-form" onSubmit={onSave}>
            <label htmlFor={inputId} className="mq-presets-label">
              {t("marketplace.presets.nameLabel")}
            </label>
            <div className="mq-presets-row">
              <input
                id={inputId}
                ref={inputRef}
                type="text"
                className="mq-search mq-presets-input"
                value={name}
                maxLength={MAX_NAME_LENGTH}
                autoComplete="off"
                onChange={(e) => setName(e.target.value)}
                aria-describedby={statusId}
                aria-invalid={status.kind === "err" ? true : undefined}
              />
              <button type="submit" className="btn btn-primary">
                {t("marketplace.presets.save")}
              </button>
            </div>
          </form>

          <p id={statusId} role="status" aria-live="polite" className={`mq-presets-status${status.kind === "err" ? " is-error" : ""}`}>
            {status.text}
          </p>

          {items.length === 0 ? (
            <p className="muted mq-presets-empty">{t("marketplace.presets.empty")}</p>
          ) : (
            <ul className="mq-presets-list" aria-label={t("marketplace.presets.title")}>
              {items.map((item, index) => (
                <li key={item.id} className={`mq-presets-item${item.query === currentQuery ? " is-current" : ""}`}>
                  <button
                    type="button"
                    data-preset-apply=""
                    className="mq-presets-apply"
                    aria-label={t("marketplace.presets.apply", { name: item.name })}
                    aria-current={item.query === currentQuery ? "true" : undefined}
                    onClick={() => onApplyPreset(item)}
                  >
                    {item.name}
                  </button>
                  <button
                    type="button"
                    className="btn-ghost mq-presets-delete"
                    aria-label={t("marketplace.presets.delete", { name: item.name })}
                    onClick={() => onDelete(item, index)}
                  >
                    <span aria-hidden="true">×</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="muted mq-presets-count">
            {t("marketplace.presets.count", { count: items.length, max: MAX_SAVED_SEARCHES })}
          </p>
        </div>
      )}
    </div>
  );
}
