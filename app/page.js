import Link from "next/link";
import LiveStats from "@/components/LiveStats";
import ContractCard from "@/components/ContractCard";
import { API_DOCS_URL, EXPLORER_URL } from "@/lib/config";

const STEPS = [
  { t: "SME submits an invoice", d: "Upload an unpaid B2B invoice with amount, debtor and due date. LiquiFact lists it on the marketplace." },
  { t: "Investors fund it", d: "Investors browse open invoices and contribute stablecoins. Funds go straight into a Soroban escrow contract." },
  { t: "SME gets paid today", d: "Once the funding target is reached the SME withdraws liquidity instead of waiting 30–90 days." },
  { t: "Settlement pays investors", d: "When the debtor pays, the escrow settles and investors claim principal plus the agreed yield." },
];

const FEATURES = [
  { i: "⛓", t: "On-chain escrow", d: "A Soroban smart contract holds every investor contribution, with explicit states for open, funded and settled." },
  { i: "⚡", t: "Fast and low-cost", d: "Stellar settles in seconds for fractions of a cent, so small invoices are economical to finance." },
  { i: "🛡", t: "Built-in safeguards", d: "Legal holds, allowlists, investor caps, funding deadlines and maturity locks are enforced by the contract." },
  { i: "📈", t: "Transparent yield", d: "Yield is set in basis points per invoice and visible before you commit — no hidden spreads." },
  { i: "🌍", t: "Global by default", d: "Any SME with a Stellar wallet can raise against receivables; any investor can participate." },
  { i: "🧩", t: "Open API", d: "A documented REST API powers the app and lets partners integrate invoice origination." },
];

export default function Home() {
  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div>
            <div className="pill"><span className="dot" /> Live on Stellar testnet</div>
            <h1>
              Turn unpaid invoices into <span>instant liquidity</span>
            </h1>
            <p className="lead">
              LiquiFact is an invoice financing network on Stellar. SMEs tokenize receivables and get paid today;
              investors fund them through a transparent Soroban escrow and earn yield backed by real trade.
            </p>
            <div className="btn-row" style={{ marginTop: 28 }}>
              <Link href="/marketplace" className="btn btn-primary">Explore marketplace</Link>
              <Link href="/submit" className="btn btn-light">Submit an invoice</Link>
              <Link href="/docs" className="btn btn-light">Read the docs</Link>
            </div>
          </div>
          <div className="glass" aria-label="Example invoice">
            <div className="eyebrow" style={{ color: "var(--on-hero-eyebrow)" }}>Example listing</div>
            <h3 style={{ margin: "6px 0 14px" }}>INV_0002 · Northwind Textiles</h3>
            <div className="row"><span className="k">Face value</span><span>25,000 USDC</span></div>
            <div className="row"><span className="k">Investor yield</span><span>6.50%</span></div>
            <div className="row"><span className="k">Due</span><span>Dec 30, 2026</span></div>
            <div className="row"><span className="k">Funded</span><span>72%</span></div>
            <div className="progress" style={{ marginTop: 14, background: "rgba(255,255,255,0.12)" }}><span style={{ width: "72%" }} /></div>
          </div>
        </div>
      </section>

      <section className="section-sm">
        <div className="container">
          <LiveStats />
        </div>
      </section>

      <section className="section" id="how-it-works">
        <div className="container">
          <div className="center" style={{ marginBottom: 40 }}>
            <div className="eyebrow">How it works</div>
            <h2>From invoice to cash in four steps</h2>
            <p className="lead">Every step is backed by the escrow contract, so funds only move when the rules allow it.</p>
          </div>
          <div className="grid grid-4">
            {STEPS.map((s, i) => (
              <div className="card" key={s.t}>
                <div className="step-num">STEP {i + 1}</div>
                <h3>{s.t}</h3>
                <p className="muted" style={{ margin: 0 }}>{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="center" style={{ marginBottom: 40 }}>
            <div className="eyebrow">Why LiquiFact</div>
            <h2>Working capital without the waiting</h2>
          </div>
          <div className="grid grid-3">
            {FEATURES.map((f) => (
              <div className="card" key={f.t}>
                <div className="icon" aria-hidden="true">{f.i}</div>
                <h3>{f.t}</h3>
                <p className="muted" style={{ margin: 0 }}>{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container grid grid-2">
          <ContractCard />
          <div className="card">
            <div className="eyebrow">Developers</div>
            <h3 style={{ marginTop: 6 }}>Build on the LiquiFact API</h3>
            <p className="muted">List invoices, submit new ones, record funding and read live escrow state from Soroban — all documented with OpenAPI.</p>
            <div className="btn-row">
              <a className="btn btn-primary" href={API_DOCS_URL}>Open API docs ↗</a>
              <Link className="btn btn-ghost" href="/docs#architecture">Architecture</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="cta">
            <div>
              <h2 style={{ margin: "0 0 6px" }}>Ready to see it in action?</h2>
              <p>Browse live invoices or inspect the escrow contract on <a href={EXPLORER_URL} style={{ color: "var(--on-hero-link)" }}>stellar.expert</a>.</p>
            </div>
            <div className="btn-row">
              <Link href="/marketplace" className="btn btn-primary">Go to marketplace</Link>
              <Link href="/docs" className="btn btn-light">Docs</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
