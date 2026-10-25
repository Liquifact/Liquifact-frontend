import Link from "next/link";
import ContractCard from "@/components/ContractCard";
import { API_DOCS_URL, API_URL, CONTRACT_ID, EXPLORER_URL, NETWORK, REPOS } from "@/lib/config";

export const metadata = { title: "Docs", description: "LiquiFact product overview, architecture and usage guide." };

const TOC = [
  ["overview", "Overview"],
  ["architecture", "Architecture"],
  ["how-to-use", "How to use"],
  ["lifecycle", "Invoice lifecycle"],
  ["api", "API"],
  ["contract", "Smart contract"],
  ["develop", "Run locally"],
];

const ENDPOINTS = [
  ["GET", "/health", "Liveness probe"],
  ["GET", "/api/stats", "Marketplace totals"],
  ["GET", "/api/invoices", "List invoices (?status=open|funded|settled|cancelled)"],
  ["GET", "/api/invoices/:id", "Get one invoice"],
  ["POST", "/api/invoices", "Submit an invoice"],
  ["POST", "/api/invoices/:id/fund", "Record an investor contribution"],
  ["GET", "/api/escrow", "Escrow contract metadata"],
  ["GET", "/api/escrow/live", "Live escrow state via Soroban RPC"],
];

const ENTRYPOINTS = [
  ["init", "Admin creates the escrow for one invoice: SME, amount, yield, maturity, funding token, treasury."],
  ["fund", "Investor deposits funding tokens; status moves to funded (1) when the target is reached."],
  ["withdraw", "SME withdraws the funded liquidity once the escrow is funded."],
  ["settle", "Marks the invoice settled (2) after the debtor pays."],
  ["claim_investor_payout", "Investors claim principal plus yield after settlement and maturity."],
  ["set_legal_hold / clear_legal_hold", "Compliance freeze that blocks risky transitions."],
  ["get_escrow", "Read the full escrow state (used by the API's live endpoint)."],
];

export default function DocsPage() {
  return (
    <section className="section">
      <div className="container docs-layout">
        <nav className="docs-nav" aria-label="Docs sections">
          {TOC.map(([id, label]) => (
            <a key={id} href={`#${id}`}>{label}</a>
          ))}
          <a href={API_DOCS_URL}>API reference ↗</a>
        </nav>
        <div className="docs-body">
          <section id="overview">
            <div className="eyebrow">Documentation</div>
            <h1 style={{ fontSize: "clamp(2rem,4vw,2.8rem)" }}>LiquiFact docs</h1>
            <p className="lead">
              LiquiFact is an invoice liquidity network on Stellar. Small and medium enterprises (SMEs) list unpaid
              invoices; investors fund them; a Soroban escrow contract holds the money until the debtor pays, then
              releases principal plus yield to investors.
            </p>
            <div className="grid grid-3" style={{ marginTop: 20 }}>
              <div className="card"><h3>For SMEs</h3><p className="muted" style={{ margin: 0 }}>Unlock cash tied up in 30–90 day payment terms without taking on debt.</p></div>
              <div className="card"><h3>For investors</h3><p className="muted" style={{ margin: 0 }}>Short-duration, real-economy yield with on-chain transparency.</p></div>
              <div className="card"><h3>For partners</h3><p className="muted" style={{ margin: 0 }}>Originate invoices through the REST API and settle on Stellar.</p></div>
            </div>
          </section>

          <section id="architecture">
            <h2>Architecture</h2>
            <p>The stack has three parts, each in its own repository:</p>
            <div className="diagram" role="img" aria-label="Frontend calls the API, the API reads the Soroban escrow contract on Stellar">
              <div className="node"><b>Frontend</b><small>Next.js web app (this site)</small></div>
              <div className="node"><b>Backend API</b><small>Express · serverless on Vercel</small></div>
              <div className="node"><b>Escrow contract</b><small>Soroban · Stellar {NETWORK}</small></div>
            </div>
            <ul>
              <li><strong>Frontend</strong> (<a href={REPOS.frontend}>repo</a>) — marketplace, invoice detail, submission flow and these docs. Talks to the API over HTTPS.</li>
              <li><strong>Backend API</strong> (<a href={REPOS.backend}>repo</a>) — REST endpoints for invoices and stats, OpenAPI docs, and a live read of the escrow contract through Soroban RPC. Base URL: <a href={API_URL}>{API_URL}</a>.</li>
              <li><strong>Escrow contract</strong> (<a href={REPOS.contracts}>repo</a>) — a Soroban smart contract per invoice that holds investor funds, enforces caps, holds and maturity, and pays out on settlement.</li>
            </ul>
          </section>

          <section id="how-to-use">
            <h2>How to use</h2>
            <h3>As an SME</h3>
            <ol>
              <li>Open <Link href="/submit">Submit invoice</Link> and enter your company, the debtor, amount, currency, due date and the yield you offer.</li>
              <li>Your invoice appears in the <Link href="/marketplace">Marketplace</Link> with status <em>open</em>.</li>
              <li>When investors reach the funding target the status becomes <em>funded</em> and you can withdraw liquidity from the escrow.</li>
              <li>At maturity the debtor pays; the escrow is settled and investors are repaid.</li>
            </ol>
            <h3>As an investor</h3>
            <ol>
              <li>Browse the <Link href="/marketplace">Marketplace</Link> and filter by status.</li>
              <li>Open an invoice to review face value, yield, due date and funding progress.</li>
              <li>Enter an amount and choose <em>Fund invoice</em>. On-chain, this maps to the escrow&apos;s <code>fund</code> entrypoint.</li>
              <li>After settlement, claim your payout (<code>claim_investor_payout</code>).</li>
            </ol>
            <div className="notice">This public deployment runs in demo mode on Stellar testnet: invoice data lives in the API&apos;s in-memory store, while invoice <code>INV_0001</code> is backed by the real escrow contract below.</div>
          </section>

          <section id="lifecycle">
            <h2>Invoice lifecycle</h2>
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Status</th><th>Code</th><th>Meaning</th></tr></thead>
                <tbody>
                  <tr><td>open</td><td>0</td><td>Accepting investor contributions.</td></tr>
                  <tr><td>funded</td><td>1</td><td>Target reached; SME may withdraw.</td></tr>
                  <tr><td>settled</td><td>2</td><td>Debtor paid; investors can claim principal + yield.</td></tr>
                  <tr><td>withdrawn / cancelled</td><td>3 / 4</td><td>Terminal states.</td></tr>
                </tbody>
              </table>
            </div>
          </section>

          <section id="api">
            <h2>API</h2>
            <p>
              Interactive reference (Swagger UI): <a href={API_DOCS_URL}>{API_DOCS_URL}</a> · OpenAPI document:{" "}
              <a href={`${API_URL}/openapi.json`}>/openapi.json</a>
            </p>
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Method</th><th>Path</th><th>Description</th></tr></thead>
                <tbody>
                  {ENDPOINTS.map(([m, p, d]) => (
                    <tr key={m + p}><td><code>{m}</code></td><td><code>{p}</code></td><td>{d}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            <pre>{`curl ${API_URL}/api/invoices?status=open

curl -X POST ${API_URL}/api/invoices \\
  -H 'Content-Type: application/json' \\
  -d '{"sme":"Acme","debtor":"Globex","amount":5000,"dueDate":"2027-01-31","yieldBps":750}'`}</pre>
          </section>

          <section id="contract">
            <h2>Smart contract</h2>
            <p>
              The escrow is deployed on Stellar <strong>{NETWORK}</strong> as{" "}
              <a href={EXPLORER_URL}><code>{CONTRACT_ID}</code></a>.
            </p>
            <ContractCard />
            <div className="table-wrap" style={{ marginTop: 20 }}>
              <table className="table">
                <thead><tr><th>Entrypoint</th><th>Purpose</th></tr></thead>
                <tbody>
                  {ENTRYPOINTS.map(([n, d]) => (
                    <tr key={n}><td><code>{n}</code></td><td>{d}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            <pre>{`stellar contract invoke --id ${CONTRACT_ID} \\
  --network ${NETWORK} --source <your-key> --send=no -- get_escrow`}</pre>
          </section>

          <section id="develop">
            <h2>Run locally</h2>
            <pre>{`git clone ${REPOS.frontend}
cd Liquifact-frontend
npm ci
NEXT_PUBLIC_API_URL=http://localhost:3001 npm run dev`}</pre>
            <p>Environment variables (all optional): <code>NEXT_PUBLIC_API_URL</code>, <code>NEXT_PUBLIC_CONTRACT_ID</code>, <code>NEXT_PUBLIC_STELLAR_NETWORK</code>.</p>
          </section>
        </div>
      </div>
    </section>
  );
}
