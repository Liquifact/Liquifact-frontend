import Link from "next/link";
import { getDictionary, t } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n/server";

export default async function NotFound() {
  const dict = getDictionary(await getLocale());
  return (
    <section className="section">
      <div className="container center">
        <div className="eyebrow">404</div>
        <h1 style={{ fontSize: "2.2rem" }}>{t(dict, "notFound.title")}</h1>
        <p className="lead">{t(dict, "notFound.lead")}</p>
        <div className="btn-row" style={{ justifyContent: "center" }}>
          <Link href="/" className="btn btn-primary">{t(dict, "nav.home")}</Link>
          <Link href="/marketplace" className="btn btn-ghost">{t(dict, "nav.marketplace")}</Link>
          <Link href="/docs" className="btn btn-ghost">{t(dict, "nav.docs")}</Link>
        </div>
      </div>
    </section>
  );
}
