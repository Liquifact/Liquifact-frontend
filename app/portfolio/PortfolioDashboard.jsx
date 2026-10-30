'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { formatAmount, bpsToPercent } from '../../lib/format.js';
import { summarise } from '../../lib/portfolio/summary.js';
import { listPositions, resolveSources } from '../../lib/portfolio/sources.js';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'settled', label: 'Settled' },
];

const ACTIVE_STATUSES = new Set(['funding', 'active', 'repaying', 'partially-repaid']);
const SETTLED_STATUSES = new Set(['settled', 'repaid', 'claimed']);

function statusBucket(status) {
  if (ACTIVE_STATUSES.has(status)) return 'active';
  if (SETTLED_STATUSES.has(status)) return 'settled';
  return 'other';
}

function formatDue(due) {
  if (!due) return '—';
  const date = new Date(due);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatPercent(bps) {
  if (typeof bps !== 'number' || !Number.isFinite(bps)) return '—';
  return bpsToPercent(bps);
}

function actionForPosition(position) {
  if (position.claimable > 0) {
    return { label: 'Claim', href: position.claimHref || `/marketplace/${encodeURIComponent(position.invoiceId)}#claim`, aria: `Claim payout for ${position.invoiceId}` };
  }
  if (position.invoiceId) {
    return { label: 'View', href: `/marketplace/${encodeURIComponent(position.invoiceId)}`, aria: `View invoice ${position.invoiceId}` };
  }
  return null;
}

export default function PortfolioDashboard({ address = null, demo = false }) {
  const [positions, setPositions] = useState([]);
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [nowMs, setNowMs] = useState(Date.now());
  const statusRef = useRef();

  useEffect(() => {
    setNowMs(Date.now());
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErrors([]);
    const sources = resolveSources({ address, demo });
    listPositions(sources, { address })
      .then((result) => {
        if (cancelled) return;
        setPositions(Array.isArray(result.positions) ? result.positions : []);
        setErrors(Array.isArray(result.errors) ? result.errors : []);
      })
      .catch((err) => {
        if (cancelled) return;
        setPositions([]);
        setErrors([{ message: err && err.message ? err.message : 'Unable to load portfolio' }]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [address, demo]);

  const summary = useMemo(() => summarise(positions, nowMs), [positions, nowMs]);

  const visiblePositions = useMemo(() => {
    if (filter === 'all') return positions;
    return positions.filter((p) => statusBucket(p.status) === filter);
  }, [positions, filter]);

  const currencies = summary.currencies || [];
  const disconnected = !address && positions.length === 0;
  const hasPositions = positions.length > 0;

  const onFilterKeyDown = (event, idx) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') {
      return;
    }
    event.preventDefault();
    const dir = event.key === 'ArrowRight' ? 1 : -1;
    const next = FILTERS[(idx + dir + FILTERS.length) % FILTERS.length];
    setFilter(next.id);
    const btn = statusRef.current?.querySelector(`[data-filter="${next.id}"]`);
    if (btn) btn.focus();
  };

  return (
    <section className="portfolio" aria-labelledby="portfolio-heading">
      <header className="portfolio-header">
        <h1 id="portfolio-heading">Portfolio</h1>
        <p className="portfolio-subtitle">
          {address
            ? `Positions for ${address.slice(0, 4)}…${address.slice(-4)}`
            : 'Showing anonymous local contributions and on-chain positions'}
        </p>
      </header>

      <div className="portfolio-live" role="status" aria-live="polite">
        {loading ? 'Loading positions...' : ''}
      </div>

      {errors.length > 0 && (
        <div className="portfolio-error" role="alert">
          <p><b>Some positions could not be loaded.</b></p>
          <ul>
            {errors.map((err, idx) => (
              <li key={`${err.invoiceId || 'error'}-${idx}`}>
                {err.invoiceId ? `${err.invoiceId}: ` : ''}
                {err.message || 'Unknown error'}
              </li>
            ))}
          </ul>
        </div>
      )}

      {disconnected ? (
        <div className="portfolio-empty">
          <h2>Connect your wallet</h2>
          <p>Connect a wallet to see your on-chain positions and projected yield.</p>
        </div>
      ) : !hasPositions && !loading ? (
        <div className="portfolio-empty">
          <h2>You haven&#x27;t funded any invoices yet</h2>
          <p>
            <a className="button" href="/marketplace">Browse the Marketplace</a>
          </p>
        </div>
      ) : (
        <>
          <div className="portfolio-kpis">
            {currencies.length === 0 ? (
              <p className="portfolio-kpi-empty">No active positions.</p>
            ) : (
              currencies.map((curr) => (
                <div className="portfolio-kpi-group" key={curr.currency}>
                  <h3 className="portfolio-kpi-currency">{curr.currency}</h3>
                  <dl className="portfolio-kpi-list">
                    <div className="portfolio-kpi">
                      <dt>Invested</dt>
                      <dd>{formatAmount(curr.invested, curr.currency)}</dd>
                    </div>
                    <div className="portfolio-kpi">
                      <dt>Projected payout</dt>
                      <dd>{formatAmount(curr.projectedPayout, curr.currency)}</dd>
                    </div>
                    <div className="portfolio-kpi">
                      <dt>Avg yield</dt>
                      <dd>{formatPercent(curr.weightedYieldBps).replace(' ', '')}</dd>
                    </div>
                    <div className="portfolio-kpi">
                      <dt>Claimable</dt>
                      <dd>{formatAmount(curr.claimable, curr.currency)}</dd>
                    </div>
                  </dl>
                </div>
              ))
            )}
          </div>

          <div className="portfolio-filters" role="group" aria-label="Filter positions" ref={statusRef}>
            {FILTERS.map((opt, idx) => (
              <button
                key={opt.id}
                type="button"
                data-filter={opt.id}
                className={`filter-btn${filter === opt.id ? ' is-active' : ''}`}
                aria-pressed={filter === opt.id}
                onClick={() => setFilter(opt.id)}
                onKeyDown={(ev) => onFilterKeyDown(ev, idx)}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="portfolio-table-wrap">
            <table className="portfolio-table">
              <caption className="visually-hidden">Investor positions</caption>
              <thead>
                <tr>
                  <th scope="col">Invoice</th>
                  <th scope="col">Status</th>
                  <th scope="col">Principal</th>
                  <th scope="col">Yield</th>
                  <th scope="col">Projected payout</th>
                  <th scope="col">Due</th>
                  <th scope="col">Action</th>
                </tr>
              </thead>
              <tbody>
                {visiblePositions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="portfolio-no-rows">No positions match this filter.</td>
                  </tr>
                ) : (
                  visiblePositions.map((pos) => {
                    const action = actionForPosition(pos);
                    return (
                      <tr key={`${pos.source || 'pos'}:${pos.invoiceId}:${pos.address || ''}`}>
                        <th scope="row">{pos.invoiceId}</th>
                        <td><span className={`badge badge-${statusBucket(pos.status)}`}>{pos.status || 'unknown'}</span></td>
                        <td>{formatAmount(pos.principal, pos.currency)}</td>
                        <td>{formatPercent(pos.yieldBps)}</td>
                        <td>{formatAmount(pos.projectedPayout, pos.currency)}</td>
                        <td>{formatDue(pos.due)}</td>
                        <td>
                          {action ? (
                            <a className="action-link" href={action.href} aria-label={action.aria}>{action.label}</a>
                          ) : (
                            <span aria-hidden="true">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {summary.upcomingMaturities && summary.upcomingMaturities.length > 0 && (
            <section className="portfolio-upcoming" aria-labelledby="portfolio-upcoming-heading">
              <h2 id="portfolio-upcoming-heading">Upcoming maturities (next 30 days)</h2>
              <ul>
                {summary.upcomingMaturities.map((pos) => (
                  <li key={`${pos.invoiceId}-${pos.due}`}>
                    {pos.invoiceId} — {formatDue(pos.due)} — {formatAmount(pos.projectedPayout, pos.currency)}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </section>
  );
}
