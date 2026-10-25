import Link from "next/link";
import { API_DOCS_URL, API_URL, EXPLORER_URL, REPOS } from "@/lib/config";
import { getDictionary, t } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n/server";
import LocaleSwitcher from "@/components/LocaleSwitcher";

export default async function SiteFooter() {
  const dict = getDictionary(await getLocale());
  const tr = (key, vars) => t(dict, key, vars);
  return (
    <footer className="site-footer">
      <div className="container cols">
        <div>
          <div className="brand" style={{ marginBottom: 10 }}>
            <span className="logo" aria-hidden="true">L</span>
            LiquiFact
          </div>
          <p className="muted">{tr("footer.tagline")}</p>
        </div>
        <div>
          <h4>{tr("footer.product")}</h4>
          <ul>
            <li><Link href="/marketplace">{tr("nav.marketplace")}</Link></li>
            <li><Link href="/submit">{tr("nav.submit")}</Link></li>
            <li><Link href="/get-started">{tr("nav.getStarted")}</Link></li>
            <li><Link href="/docs">{tr("footer.documentation")}</Link></li>
          </ul>
        </div>
        <div>
          <h4>{tr("footer.developers")}</h4>
          <ul>
            <li><a href={API_DOCS_URL}>{tr("footer.apiDocs")}</a></li>
            <li><a href={`${API_URL}/health`}>{tr("footer.apiStatus")}</a></li>
            <li><a href={EXPLORER_URL}>{tr("footer.escrow")}</a></li>
          </ul>
        </div>
        <div>
          <h4>{tr("footer.source")}</h4>
          <ul>
            <li><a href={REPOS.frontend}>{tr("footer.frontend")}</a></li>
            <li><a href={REPOS.backend}>{tr("footer.backend")}</a></li>
            <li><a href={REPOS.contracts}>{tr("footer.contracts")}</a></li>
          </ul>
        </div>
      </div>
      <div className="container muted footer-bottom" style={{ marginTop: 28, fontSize: "0.85rem" }}>
        <div>{tr("footer.legal", { year: new Date().getFullYear() })}</div>
        <LocaleSwitcher />
      </div>
    </footer>
  );
}
