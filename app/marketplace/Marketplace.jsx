"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import OfflineNotice from "@/components/pwa/OfflineNotice";
import InvoiceCard from "@/components/InvoiceCard";
import { listInvoices } from "@/lib/api";
import { computeListMedians } from "@/lib/risk";
import {
  getNetworkName,
  getPublicKey,
  hasFreighter,
  isConnected,
} from "@/lib/stellar/freighter";
import { getAccountState } from "@/lib/stellar/horizon";
import { CONFIGURED_NETWORK } from "@/lib/stellar/networks";
import {
  DEFAULTS,
  MIN_YIELD_OPTIONS,
  SORT_OPTIONS,
  STATUSES,
  applyQuery,
  parseQuery,
  serializeQuery,
} from "@/lib/marketplaceQuery";

// Status tab definitions: "" = All, plus each named status
const STATUS_TABS = [
  { v: "", l: "All" },
  ...STATUSES.map((s) => ({ v: s, l: s.charAt(0).toUpperCase() + s.slice(1) })),
];

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
  const netOk =
    netName === configuredNet ||
    (configuredNet === "testnet" && netName.includes("test"));
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

  // Detect unfunded wallet once on mount
  useEffect(() => {
    detectUnfundedWallet().then((unfunded) => {
      if (unfunded) setShowOnboardNotice(true);
    });
  }, []);

  useEffect(() => {
    let alive = true;
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

  function clearFilters() {
    setSearchInput("");
    router.push("/marketplace", { scroll: false });
  }

  return (
    <section className="section">
      <div className="container">
        <div className="eyebrow">Marketplace</div>
        <h1 style={{ fontSize: "clamp(1.8rem,4vw,2.6rem)" }}>Invoices seeking funding</h1>
        <p className="lead">
          Pick an invoice, review its terms and contribute. Funds are escrowed until the debtor
          settles.
        </p>

        {showOnboardNotice && (
          <div className="notice notice-warn" style={{ marginBottom: 20 }}>
            Your wallet account doesn&apos;t exist on the ledger yet — any
            funding attempt will fail.{" "}
            <Link href="/get-started" style={{ fontWeight: 600 }}>
              Complete the Get&nbsp;started checklist →
            </Link>
          </div>
        )}

        {/* ---- Toolbar row 1: status tabs + submit button ---- */}
        <div className="toolbar" style={{ marginTop: 28 }}>
          <div className="tabs" role="group" aria-label="Filter by status">
            {STATUS_TABS.map((f) => (
              <button
                key={f.v || "all"}
                aria-pressed={urlState.status === f.v}
                onClick={() => pushFilter({ status: f.v })}
              >
                {f.l}
              </button>
            ))}
          </div>
          <Link href="/submit" className="btn btn-primary">
            + Submit invoice
          </Link>
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
            <h3>{isFiltered ? "No invoices match these filters" : "No invoices here yet"}</h3>
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
                  Try another filter or submit the first one.
                  <br />
                  <Link href="/submit" className="btn btn-primary" style={{ marginTop: 12 }}>
                    Submit invoice
                  </Link>
                </>
              )}
            </p>
          </div>
        ) : (
          <div className="grid grid-3">
            {items.map((inv) => (
              <InvoiceCard key={inv.id} invoice={inv} medians={medians} />
            ))}
          </div>
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
      </div>
    </section>
  );
}
