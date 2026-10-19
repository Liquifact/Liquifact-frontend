import Link from "next/link";
import { API_DOCS_URL, API_URL, EXPLORER_URL, REPOS } from "@/lib/config";
import { t } from "@/lib/i18n";
import LocaleSwitcher from "./LocaleSwitcher";

export default function SiteFooter({ dict }) {
  return (
    <footer className="site-footer">
      <div className="container cols">
        <div>
          <div className="brand" style={{ marginBottom: 10 }}>
            <span className="logo" aria-hidden="true">L</span>
            LiquiFact
          </div>
          <p className="muted">{t(dict, "footer.tagline")}</p>
        </div>
        <div>
          <h4>{t(dict, "footer.product")}</h4>
          <ul>
            <li><Link href="/marketplace">{t(dict, "nav.marketplace")}</Link></li>
            <li><Link href="/submit">{t(dict, "nav.submit")}</Link></li>
            <li><Link href="/docs">{t(dict, "footer.documentation")}</Link></li>
          </ul>
        </div>
        <div>
          <h4>{t(dict, "footer.developers")}</h4>
          <ul>
            <li><a href={API_DOCS_URL}>{t(dict, "footer.apiDocs")}</a></li>
            <li><a href={`${API_URL}/health`}>{t(dict, "footer.apiStatus")}</a></li>
            <li><a href={EXPLORER_URL}>{t(dict, "footer.escrow")}</a></li>
          </ul>
        </div>
        <div>
          <h4>{t(dict, "footer.source")}</h4>
          <ul>
            <li><a href={REPOS.frontend}>{t(dict, "footer.frontend")}</a></li>
            <li><a href={REPOS.backend}>{t(dict, "footer.backend")}</a></li>
            <li><a href={REPOS.contracts}>{t(dict, "footer.contracts")}</a></li>
          </ul>
        </div>
      </div>
      <div className="container muted" style={{ marginTop: 28, fontSize: "0.85rem" }}>
        © {new Date().getFullYear()} LiquiFact · {t(dict, "footer.legal")}
      </div>
      <div className="container" style={{ marginTop: 14 }}>
        <LocaleSwitcher />
      </div>
    </footer>
  );
}
