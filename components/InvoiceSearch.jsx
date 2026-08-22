import React, { useEffect, useRef } from "react";
import { SEARCH_SHORTCUT_KEY, createShortcutMatcher } from "../lib/shortcuts";

export default function InvoiceSearch({
  value,
  onChange,
  "aria-label": ariaLabel,
  placeholder,
  searchTerm,
  onSearchChange,
  sortOption,
  onSortChange,
  filters,
  onFiltersChange,
}) {
  // Support both controlled patterns: {value, onChange} and {searchTerm, onSearchChange}
  const inputValue = value !== undefined ? value : (searchTerm ?? "");
  const handleChange = onChange ?? ((e) => onSearchChange?.(e.target.value));

  const inputRef = useRef(null);

  // Global `/` shortcut: pressing `/` anywhere on the page (except inside an
  // editable control) focuses the search input. The matcher and key are
  // imported from the shared registry (`lib/shortcuts.js`) so the
  // ShortcutHelpDialog renders this shortcut from the same source of truth.
  useEffect(() => {
    const handler = createShortcutMatcher(SEARCH_SHORTCUT_KEY, (e) => {
      e.preventDefault();
      inputRef.current?.focus();
    });

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="mb-8 rounded-xl border border-slate-800 bg-slate-900/30 p-6">
      <div className="mb-4">
        <input
          ref={inputRef}
          type="text"
          placeholder={placeholder || "Search invoices..."}
          value={inputValue}
          onChange={handleChange}
          aria-label={ariaLabel}
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
        />
      </div>
      <div className="flex flex-wrap gap-4 items-center opacity-60">
        <button
          type="button"
          disabled
          className="rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-2 text-sm text-slate-500"
        >
          Sort: {sortOption || "Best Yield"}
        </button>
        <button
          type="button"
          disabled
          className="rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-2 text-sm text-slate-500"
        >
          Filters: {filters > 0 ? filters.join(", ") : "None"}
        </button>
      </div>
    </div>
  );
}
