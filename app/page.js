import Link from "next/link";
import { Suspense } from "react";
import LiveStats from "@/components/LiveStats";
import ContractCard from "@/components/ContractCard";
import FeaturedInvoice, { FeaturedInvoiceSkeleton } from "@/components/FeaturedInvoice";
import { API_DOCS_URL, CONTRACT_ID, EXPLORER_URL, NETWORK } from "@/lib/config";
import { getDictionary, t } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n/server";
import { pageMeta } from "@/lib/seo";

const STEPS = ["submit", "fund", "paid", "settle"];

const FEATURES = [
  { id: "escrow", icon: "⛍" },
  { id: "speed", icon: "⚡" },
  { id: "safeguards", icon: "🛡" },
  { id: "yield", icon: "📈" },
  { id: "global", icon: "🌍" },
  { id: "api", icon: "🧩" },
];

export async function generateMetadata() {
  const dict = getDictionary(await getLocale());
  const meta = pageMeta({
    path: "/",
    title: t(dict, "home.meta.title"),
    description: t(dict, "home.meta.description"),
  });
  return { ...meta, title: { absolute: meta.title } };
}

export default async function Home() {
  const dict = getDictionary(await getLocale());
  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div>
            <div className="pill"><span className="dot" /> {t(dict, "home.pill")}</div>
            <h1>
              {t(dict, "home.titlePrefix")}<span>{t(dict, "home.titleHighlight")}</span>
            </h1>
            <p className="lead">
              {t(dict, "home.lead")}
            </p>
            <div className="btn-row" style={{ marginTop: 28 }}>
              <Link href="/marketplace" className="btn btn-primary">{t(dict, "home.cta.explore")}</Link>
              <Link href="/submit" className="btn btn-light">{t(dict, "home.cta.submit")}</Link>
              <Link href="/docs" className="btn btn-light">{t(dict, "home.cta.readDocs")}</Link>
            </div>
          </div>
          <Suspense fallback={<FeaturedInvoiceSkeleton />}>
            <FeaturedInvoice />
          </Suspense>
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
            <div className="eyebrow">{t(dict, "home.how.eyebrow")}</div>
            <h2>{t(dict, "home.how.title")}</h2>
            <p className="lead">{t(dict, "home.how.lead")}</p>
          </div>
          <div className="grid grid-4">
            {STEPS.map((id, i) => (
              <div className="card" key={id}>
                <div className="step-num">{t(dict, "home.stepLabel", { n: i + 1 })}</div>
                <h3>{t(dict, `home.step.${id}.title`)}</h3>
                <p className="muted" style={{ margin: 0 }}>{t(dict, `home.step.${id}.desc`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="center" style={{ marginBottom: 40 }}>
            <div className="eyebrow">{t(dict, "home.why.eyebrow")}</div>
            <h2>{t(dict, "home.why.title")}</h2>
          </div>
          <div className="grid grid-3">
            {FEATURES.map((feature) => (
              <div className="card" key={feature.id}>
                <div className="icon" aria-hidden="true">{feature.icon}</div>
                <h3>{t(dict, `home.feature.${feature.id}.title`)}</h3>
                <p className="muted" style={{ margin: 0 }}>{t(dict, `home.feature.${feature.id}.desc`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container grid grid-2">
          <ContractCard contractId={CONTRACT_ID} network={NETWORK} />
          <div className="card">
            <div className="eyebrow">{t(dict, "home.dev.eyebrow")}</div>
            <h3 style={{ marginTop: 6 }}>{t(dict, "home.dev.title")}</h3>
            <p className="muted">{t(dict, "home.dev.lead")}</p>
            <div className="btn-row">
              <a className="btn btn-primary" href={API_DOCS_URL}>{t(dict, "home.dev.apiDocs")}</a>
              <Link className="btn btn-ghost" href="/docs#architecture">{t(dict, "home.dev.architecture")}</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="cta">
            <div>
              <h2 style={{ margin: "0 0 6px" }}>{t(dict, "home.cta.title")}</h2>
              <p>
                {t(dict, "home.cta.leadPrefix")}
                <a href={EXPLORER_URL} style={{ color: "var(--on-hero-link)" }}>{t(dict, "home.cta.leadLink")}</a>
                {t(dict, "home.cta.leadSuffix")}
              </p>
            </div>
            <div className="btn-row">
              <Link href="/marketplace" className="btn btn-primary">{t(dict, "home.cta.goMarketplace")}</Link>
              <Link href="/docs" className="btn btn-light">{t(dict, "home.cta.docs")}</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
