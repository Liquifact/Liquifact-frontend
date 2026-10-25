import Link from "next/link";
import { API_DOCS_URL, API_URL, EXPLORER_URL, REPOS } from "@/lib/config";

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container cols">
        <div>
          <div className="brand" style={{ marginBottom: 10 }}>
            <span className="logo" aria-hidden="true">L</span>
            LiquiFact
          </div>
          <p className="muted">Invoice liquidity on Stellar. SMEs get paid today, investors earn real-economy yield.</p>
        </div>
        <div>
          <h4>Product</h4>
          <ul>
            <li><Link href="/marketplace">Marketplace</Link></li>
            <li><Link href="/submit">Submit invoice</Link></li>
            <li><Link href="/get-started">Get started</Link></li>
            <li><Link href="/docs">Documentation</Link></li>
          </ul>
        </div>
        <div>
          <h4>Developers</h4>
          <ul>
            <li><a href={API_DOCS_URL}>API docs</a></li>
            <li><a href={`${API_URL}/health`}>API status</a></li>
            <li><a href={EXPLORER_URL}>Escrow contract</a></li>
          </ul>
        </div>
        <div>
          <h4>Source</h4>
          <ul>
            <li><a href={REPOS.frontend}>Frontend</a></li>
            <li><a href={REPOS.backend}>Backend</a></li>
            <li><a href={REPOS.contracts}>Contracts</a></li>
          </ul>
        </div>
      </div>
      <div className="container muted" style={{ marginTop: 28, fontSize: "0.85rem" }}>
        © {new Date().getFullYear()} LiquiFact · Running on Stellar testnet · MIT licensed
      </div>
    </footer>
  );
}
