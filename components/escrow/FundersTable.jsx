"use client";

import { useCallback, useEffect, useState } from "react";
import CopyButton from "@/components/CopyButton";
import { shortAddress } from "@/lib/format";
import { formatStroops } from "@/lib/stellar/amount";
import { loadFunders, summariseFunders, DEFAULT_PAGE_SIZE } from "@/lib/escrow/funders";
import { NETWORK, EXPLORER_URL } from "@/lib/config";

const CONCENTRATION_LABEL = {
  low: "Low concentration",
  medium: "Medium concentration",
  high: "High concentration",
};

function accountExplorerUrl(address) {
  return `${EXPLORER_URL.replace(/\/contract\/.*$/, "")}/account/${address}`;
}

/**
 * Paginated table of on-chain funding records for one escrow.
 * @param {object} props
 * @param {string} [props.contractId] - escrow contract id
 * @param {string} [props.currency] - invoice asset code for amount display
 * @param {string} [props.connectedAddress] - connected wallet, tagged "You"
 * @param {number} [props.pageSize]
 * @param {function} [props.loadFundersFn] - injected loader (tests)
 */
export default function FundersTable({ contractId, currency = "XLM", connectedAddress, pageSize = DEFAULT_PAGE_SIZE, loadFundersFn = loadFunders }) {
  const [page, setPage] = useState(1);
  const [state, setState] = useState({ status: "loading", data: null, error: null });

  const load = useCallback(
    async (targetPage) => {
      setState((s) => ({ ...s, status: "loading", error: null }));
      try {
        const data = await loadFundersFn({ contractId, page: targetPage, pageSize });
        setState({ status: "ready", data, error: null });
        setPage(data.page);
      } catch (err) {
        setState((s) => ({ ...s, status: "error", error: err?.message || "Failed to load funders" }));
      }
    },
    [contractId, pageSize, loadFundersFn]
  );

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!alive) return;
      await load(1);
    })();
    return () => {
      alive = false;
    };
  }, [load]);

  const data = state.data;
  const summary = data ? summariseFunders(data.records) : null;
  const pageCount = data?.pageCount ?? 1;

  return (
    <div className="funders" aria-busy={state.status === "loading"}>
      <div className="funders-head">
        <h3>Funders</h3>
        {summary && summary.rows.length > 0 && (
          <span className={`badge concentration-${summary.concentration}`} role="status">
            {CONCENTRATION_LABEL[summary.concentration]} · top {summary.topShare}%
          </span>
        )}
      </div>

      {state.status === "loading" && !data && (
        <div className="table-wrap" aria-hidden="true">
          <div className="skeleton" style={{ minHeight: 140, borderRadius: 12 }} />
        </div>
      )}

      {state.status === "error" && (
        <div className="notice notice-err" role="alert">
          <p>Couldn’t load funding records. {state.error}</p>
          <button type="button" className="btn btn-ghost" onClick={() => load(page)}>
            Retry
          </button>
        </div>
      )}

      {state.status === "ready" && data && data.records.length === 0 && (
        <p className="muted">No funders yet — be the first.</p>
      )}

      {data && data.records.length > 0 && summary && (
        <>
          <div className="table-wrap">
            <table className="table funders-table">
              <caption>
                Funding records for this invoice, page {page} of {pageCount}
              </caption>
              <thead>
                <tr>
                  <th scope="col">Investor</th>
                  <th scope="col">Amount</th>
                  <th scope="col">Share</th>
                </tr>
              </thead>
              <tbody>
                {summary.rows.map((row) => {
                  const isYou = connectedAddress && row.address === connectedAddress;
                  return (
                    <tr key={row.address}>
                      <td>
                        <span className="mono">{shortAddress(row.address, 6)}</span>
                        {isYou && (
                          <span className="badge badge-chain" style={{ marginLeft: 8 }}>
                            You
                          </span>
                        )}
                        <span className="funders-actions">
                          <CopyButton value={row.address} label="Copy" />
                          <a className="funders-explorer" href={accountExplorerUrl(row.address)} target="_blank" rel="noreferrer" aria-label={`View investor ${shortAddress(row.address, 6)} on the ${NETWORK} explorer`}>
                            Explorer ↗
                          </a>
                        </span>
                      </td>
                      <td>{formatStroops(row.amount, currency)}</td>
                      <td>{row.sharePct.toFixed(2)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <nav className="pagination" aria-label="Funders pages">
            <button type="button" className="btn btn-ghost" disabled={page <= 1 || state.status === "loading"} onClick={() => load(page - 1)}>
              ← Prev
            </button>
            <span className="muted" aria-live="polite">
              Page {page} of {pageCount}
            </span>
            <button type="button" className="btn btn-ghost" disabled={page >= pageCount || state.status === "loading"} onClick={() => load(page + 1)}>
              Next →
            </button>
          </nav>
        </>
      )}
    </div>
  );
}
