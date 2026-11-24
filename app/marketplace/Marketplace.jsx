"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import OfflineNotice from "@/components/pwa/OfflineNotice";
import InvoiceCard from "@/components/InvoiceCard";
import InvoiceTable from "@/components/InvoiceTable";
import { listInvoices } from "@/lib/api";
import { useT } from "@/lib/i18n/I18nProvider";
import { computeListMedians } from "@/lib/risk";
import { MAX_COMPARE, serializeCompareIds } from "@/lib/compare";
import { defaultFilename, exportInvoicesCsv } from "@/lib/csv";
import { canonicalQuery } from "@/lib/savedSearches";
import SavedSearches from "./SavedSearches";
import {
  getNetworkName,
  getPublicKey,
  hasFreighter,
  isConnected,
} from "@/lib/stellar/freighter";
import { getAccountState } from "@/lib/stellar/horizon";
import { CONFIGURED_NETWORK } from "@/lib/stellar/networks";
import { normalizeNetworkName } from "@/lib/stellar/networkGuard";
import {
  DEFAULTS,
  MIN_YIELD_OPTIONS,
  SORT_OPTIONS,
  STATUSES,
  applyQuery,
  parseQuery,
  serializeQuery,
} from "@/lib/marketplaceQuery";

// Status tab definitions: "" = All, plus each named status (labels are translated)
const STATUS_TABS = [
  { v: "", key: "marketplace.filter.all" },
  ...STATUSES.map((s) => ({ v: s, key: `marketplace.filter.${s}` })),
];

const VIEW_STORAGE_KEY = "liquifact-marketplace-view";

/**
 * Detect whether a connected wallet's account is absent from the ledger.
 * Returns true only when: Freighter is present + connected + on the right
 * network + the public key has no Horizon record.
 */
async function detectUnfundedWallet() {
  if (!hasFreighter()) return false;
  const conn = await isConnected();
  if (!conn) return false;
  const netName = await getNetworkName();
  if (!netName) return false;
  const configuredNet = CONFIGURED_NETWORK;
  const netOk = normalizeNetworkName(netName) === normalizeNetworkName(configuredNet);
  if (!netOk) return false;
  const pubkey = await getPublicKey();
  if (!pubkey) return false;
  const { exists } = await getAccountState(pubkey, netName);
  return !exists;
}

// Debounce helper
function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

export default function MarketplaceClient() {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Parse URL → filter state
  const urlState = parseQuery(searchParams);

  // Local search input value (debounced before syncing to URL)
  const [searchInput, setSearchInput] = useState(urlState.q);
  const debouncedSearch = useDebounce(searchInput, 250);
  const searchRef = useRef(null);

  // Master invoice list — fetched once
  const [fetchState, setFetchState] = useState({
    loading: true,
    data: [],
    offline: false,
  });

  const [showOnboardNotice, setShowOnboardNotice] = useState(false);
  const [exportStatus, setExportStatus] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);

  const toggleCompare = useCallback((id) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((item) => item !== id);
      if (prev.length >= MAX_COMPARE) return prev;
      return [...prev, id];
    });
  }, []);

  const compareHref = `/marketplace/compare?ids=${encodeURIComponent(serializeCompareIds(selectedIds))}`;

  // Detect unfunded wallet once on mount
  useEffect(() => {
    detectUnfundedWallet().then((unfunded) => {
      if (unfunded) setShowOnboardNotice(true);
    });
  }, []);

  useEffect(() => {
    let alive = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Initial invoice list fetch on mount
    setFetchState((s) => ({ ...s, loading: true }));
    // Fetch the full list once — filter client-side
    listInvoices().then((r) => {
      // Keep cache metadata (stale / cachedAt) for the offline notice.
      if (alive) setFetchState({ loading: false, ...r, data: r.data || [] });
    });
    return () => {
      alive = false;
    };
  }, []); // intentionally empty — one fetch for the lifetime of the component

  // Sync debounced search → URL (router.replace to not pollute history)
  useEffect(() => {
    const current = parseQuery(searchParams);
    if (debouncedSearch === current.q) return;
    const next = { ...current, q: debouncedSearch, page: 1 };
    const qs = serializeQuery(next);
    router.replace(`/marketplace${qs ? `?${qs}` : ""}`, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  // Push a discrete filter change (status / currency / minYield / sort / page)
  const pushFilter = useCallback(
    (patch) => {
      const current = parseQuery(searchParams);
      const next = { ...current, ...patch, page: "page" in patch ? patch.page : 1 };
      const qs = serializeQuery(next);
      router.push(`/marketplace${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [router, searchParams],
  );

  // An explicit URL view wins; otherwise restore the saved non-default view.
  useEffect(() => {
    if (searchParams.has("view")) {
      try {
        window.localStorage.setItem(VIEW_STORAGE_KEY, urlState.view);
      } catch {
        // The URL remains authoritative when browser storage is unavailable.
      }
      return;
    }

    let rememberedView;
    try {
      rememberedView = window.localStorage.getItem(VIEW_STORAGE_KEY);
    } catch {
      return;
    }

    if (rememberedView === "table") {
      const qs = serializeQuery({ ...parseQuery(searchParams), view: "table" });
      router.replace(`/marketplace?${qs}`, { scroll: false });
    }
  }, [router, searchParams, urlState.view]);

  // Keep search input in sync when URL changes externally (e.g. Back/Forward)
  const prevQRef = useRef(urlState.q);
  useEffect(() => {
    if (urlState.q !== prevQRef.current) {
      prevQRef.current = urlState.q;
      setSearchInput(urlState.q);
    }
  }, [urlState.q]);

  // "/" keyboard shortcut — focus the search input (unless already in an input)
  useEffect(() => {
    function handler(e) {
      if (e.key !== "/") return;
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
      e.preventDefault();
      searchRef.current?.focus();
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // Apply filters/sort/pagination on the already-fetched list
  const { items, total, pages, from, to } = applyQuery(fetchState.data, urlState);

  // Clamp page if URL has a page beyond range (replace without adding history entry)
  useEffect(() => {
    if (!fetchState.loading && urlState.page > pages && pages > 0) {
      const next = { ...urlState, page: pages };
      const qs = serializeQuery(next);
      router.replace(`/marketplace${qs ? `?${qs}` : ""}`, { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchState.loading, pages, urlState.page]);

  // Risk-band medians are computed once per dataset (#1384).
  const medians = useMemo(() => computeListMedians(fetchState.data), [fetchState.data]);

  // Build currency options from loaded data
  const currencies = [
    "",
    ...Array.from(new Set(fetchState.data.map((i) => i.currency).filter(Boolean))).sort(),
  ];

  const isFiltered =
    urlState.status !== DEFAULTS.status ||
    urlState.currency !== DEFAULTS.currency ||
    urlState.minYieldBps !== DEFAULTS.minYieldBps ||
    urlState.q !== DEFAULTS.q ||
    urlState.sort !== DEFAULTS.sort;

  // CSV export (#1387): every invoice matching the current filters, across pages.
  const exportRows = applyQuery(fetchState.data, { ...urlState, page: 1, pageSize: Math.max(1, fetchState.data.length) }).items;
  const canExport = !fetchState.loading && exportRows.length > 0;
  const exportLabel = fetchState.offline ? "Export CSV (demo data)" : "Export CSV";

  function handleExport() {
    if (!canExport) return;
    try {
      exportInvoicesCsv(exportRows, defaultFilename(), { context: { medians, now: Date.now() } });
      setExportStatus(`Exported ${exportRows.length} invoice${exportRows.length === 1 ? "" : "s"} to CSV.`);
    } catch {
      setExportStatus("Export failed. Please try again.");
    }
  }

  function clearFilters() {
    setSearchInput("");
    const qs = serializeQuery({ ...DEFAULTS, view: urlState.view });
    router.push(`/marketplace${qs ? `?${qs}` : ""}`, { scroll: false });
  }

  // Apply a saved preset (#1526): its filters replace the current ones, the
  // viewer's cards/table choice is kept, and the URL stays shareable.
  function applyPreset(preset) {
    const next = { ...parseQuery(new URLSearchParams(preset.query)), view: urlState.view, page: 1 };
    setSearchInput(next.q);
    const qs = serializeQuery(next);
    router.push(`/marketplace${qs ? `?${qs}` : ""}`, { scroll: false });
  }

  function changeView(view) {
    try {
      window.localStorage.setItem(VIEW_STORAGE_KEY, view);
    } catch {
      // Keep the URL toggle usable when browser storage is unavailable.
    }
    pushFilter({ view });
  }

  return (
    <section className="section">
      <div className="container">
        <div className="eyebrow">{t("marketplace.eyebrow")}</div>
        <h1 style={{ fontSize: "clamp(1.8rem,4vw,2.6rem)" }}>{t("marketplace.heading")}</h1>
        <p className="lead">{t("marketplace.lead")}</p>

        {showOnboardNotice && (
          <div className="notice notice-warn" style={{ marginBottom: 20 }}>
            {t("marketplace.unfundedWallet")}{" "}
            <Link href="/get-started" style={{ fontWeight: 600 }}>
              {t("marketplace.unfundedWalletCta")}
            </Link>
          </div>
        )}

        {/* ---- Toolbar row 1: status tabs + submit button ---- */}
        <div className="toolbar" style={{ marginTop: 28 }}>
          <div className="tabs" role="group" aria-label={t("marketplace.filterLabel")}>
            {STATUS_TABS.map((f) => (
              <button
                key={f.v || "all"}
                aria-pressed={urlState.status === f.v}
                onClick={() => pushFilter({ status: f.v })}
              >
                {t(f.key)}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <div className="tabs" role="group" aria-label="Marketplace view">
              <button
                type="button"
                aria-pressed={urlState.view === "cards"}
                onClick={() => changeView("cards")}
              >
                Cards
              </button>
              <button
                type="button"
                aria-pressed={urlState.view === "table"}
                onClick={() => changeView("table")}
              >
                Table
              </button>
            </div>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={handleExport}
              disabled={!canExport}
              aria-describedby="csv-export-status"
              title={fetchState.offline ? "Export the demo invoices currently shown" : "Export the invoices currently shown"}
            >
              {exportLabel}
            </button>
            <Link href="/submit" className="btn btn-primary">
              {t("marketplace.submit")}
            </Link>
          </div>
        </div>
        <div id="csv-export-status" role="status" aria-live="polite" className="muted" style={{ fontSize: "0.85rem", minHeight: "1.25em", marginBottom: 8 }}>
          {exportStatus}
        </div>

        {/* ---- Toolbar row 2: search + filters ---- */}
        <div className="mq-filters" role="search" aria-label="Invoice filters">
          {/* Search */}
          <div className="mq-search-wrap">
            <label htmlFor="mq-search" className="sr-only">
              Search invoices
            </label>
            <span className="mq-search-icon" aria-hidden="true">🔍</span>
            <input
              id="mq-search"
              ref={searchRef}
              type="search"
              className="mq-search"
              placeholder="Search ID, company, debtor… (/)"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              aria-label="Search invoices"
            />
          </div>

          {/* Currency */}
          <div className="mq-filter-field">
            <label htmlFor="mq-currency" className="sr-only">
              Currency
            </label>
            <select
              id="mq-currency"
              className="mq-select"
              value={urlState.currency}
              onChange={(e) => pushFilter({ currency: e.target.value })}
              aria-label="Filter by currency"
            >
              {currencies.map((c) => (
                <option key={c} value={c}>
                  {c || "All currencies"}
                </option>
              ))}
            </select>
          </div>

          {/* Min yield */}
          <div className="mq-filter-field">
            <label htmlFor="mq-minyield" className="sr-only">
              Minimum yield
            </label>
            <select
              id="mq-minyield"
              className="mq-select"
              value={urlState.minYieldBps}
              onChange={(e) => pushFilter({ minYieldBps: Number(e.target.value) })}
              aria-label="Minimum yield filter"
            >
              {MIN_YIELD_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label === "Any" ? "Min yield: Any" : `Min yield: ${o.label}`}
                </option>
              ))}
            </select>
          </div>

          {/* Sort */}
          <div className="mq-filter-field">
            <label htmlFor="mq-sort" className="sr-only">
              Sort
            </label>
            <select
              id="mq-sort"
              className="mq-select"
              value={urlState.sort}
              onChange={(e) => pushFilter({ sort: e.target.value })}
              aria-label="Sort invoices"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          {/* Saved searches */}
          <SavedSearches currentQuery={canonicalQuery(urlState)} onApply={applyPreset} />

          {/* Clear */}
          {isFiltered && (
            <button className="btn btn-ghost mq-clear" onClick={clearFilters} type="button">
              Clear filters
            </button>
          )}
        </div>

        {/* ---- Offline notice ---- */}
        <OfflineNotice {...fetchState} />

        {/* ---- Result count (aria-live for async announcements) ---- */}
        {!fetchState.loading && (
          <p
            className="mq-count muted"
            aria-live="polite"
            aria-atomic="true"
          >
            {total === 0
              ? "No invoices match these filters"
              : `Showing ${from}–${to} of ${total} invoice${total !== 1 ? "s" : ""}`}
          </p>
        )}

        {/* ---- Invoice grid ---- */}
        {fetchState.loading ? (
          <div className="grid grid-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="card center">
            <h2>{isFiltered ? "No invoices match these filters" : t("marketplace.empty.title")}</h2>
            <p className="muted">
              {isFiltered ? (
                <>
                  <button
                    className="btn btn-ghost"
                    style={{ marginTop: 12 }}
                    onClick={clearFilters}
                    type="button"
                  >
                    Clear filters
                  </button>
                </>
              ) : (
                <>
                  {t("marketplace.empty.body")}
                  <br />
                  <Link href="/submit" className="btn btn-primary" style={{ marginTop: 12 }}>
                    {t("marketplace.empty.cta")}
                  </Link>
                </>
              )}
            </p>
          </div>
        ) : (
          urlState.view === "table" ? (
            <InvoiceTable
              invoices={items}
              sort={urlState.sort}
              onSortChange={(sort) => pushFilter({ sort })}
              medians={medians}
            />
          ) : (
            <div className="grid grid-3">
              {items.map((inv) => (
                <InvoiceCard
                  key={inv.id}
                  invoice={inv}
                  medians={medians}
                  compareSelected={selectedIds.includes(inv.id)}
                  compareDisabled={selectedIds.length >= MAX_COMPARE}
                  onToggleCompare={toggleCompare}
                />
              ))}
            </div>
          )
        )}

        {/* ---- Pagination ---- */}
        {!fetchState.loading && pages > 1 && (
          <nav className="mq-pagination" aria-label="Pagination">
            <button
              className="btn btn-ghost mq-page-btn"
              disabled={urlState.page <= 1}
              onClick={() => pushFilter({ page: urlState.page - 1 })}
              aria-label="Previous page"
            >
              ← Prev
            </button>

            {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                className={`btn mq-page-btn ${p === urlState.page ? "btn-primary" : "btn-ghost"}`}
                aria-current={p === urlState.page ? "page" : undefined}
                onClick={() => pushFilter({ page: p })}
                aria-label={`Page ${p}`}
              >
                {p}
              </button>
            ))}

            <button
              className="btn btn-ghost mq-page-btn"
              disabled={urlState.page >= pages}
              onClick={() => pushFilter({ page: urlState.page + 1 })}
              aria-label="Next page"
            >
              Next →
            </button>
          </nav>
        )}
        {/* ---- Sticky compare bar ---- */}
        {selectedIds.length > 0 && (
          <div className="compare-bar" role="region" aria-label="Invoice comparison selection">
            <div className="compare-bar-inner">
              <div className="compare-bar-info">
                <strong>{selectedIds.length} / {MAX_COMPARE} selected</strong>
                <span className="muted compare-bar-ids">{selectedIds.join(", ")}</span>
              </div>
              <div className="compare-bar-actions">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setSelectedIds([])}
                >
                  Clear
                </button>
                <Link href={compareHref} className="btn btn-primary">
                  Compare ({selectedIds.length})
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
