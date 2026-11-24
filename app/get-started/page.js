import { pageMeta } from "@/lib/seo";
import { getDictionary, t } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n/server";
import OnboardingChecklist from "./OnboardingChecklist";

export async function generateMetadata() {
  const dict = getDictionary(await getLocale());
  return pageMeta({
    path: "/get-started",
    title: t(dict, "getStarted.meta.title"),
    description: t(dict, "getStarted.meta.description"),
  });
}

export default async function GetStartedPage() {
  const dict = getDictionary(await getLocale());
  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 720 }}>
        <div className="eyebrow">{t(dict, "getStarted.eyebrow")}</div>
        <h1 style={{ fontSize: "clamp(1.8rem,4vw,2.6rem)" }}>
          {t(dict, "getStarted.title")}
        </h1>
        <p className="lead">
          {t(dict, "getStarted.lead")}
        </p>

        {/* Static explanation — visible without JavaScript */}
        <noscript>
          <div className="notice notice-warn" style={{ marginBottom: 24 }}>
            {t(dict, "getStarted.noscript.title")}
            <ol style={{ marginTop: 10, paddingLeft: "1.3em" }}>
              <li>
                {t(dict, "getStarted.noscript.installPrefix")}
                <a
                  href="https://freighter.app"
                  target="_blank"
                  rel="noreferrer"
                >
                  {t(dict, "getStarted.noscript.installLink")}
                </a>
                {t(dict, "getStarted.noscript.installSuffix")}
              </li>
              <li>{t(dict, "getStarted.noscript.open")}</li>
              <li>
                {t(dict, "getStarted.noscript.networkPrefix")}
                <strong>{t(dict, "getStarted.noscript.networkStrong")}</strong>
                {t(dict, "getStarted.noscript.networkSuffix")}
              </li>
              <li>
                {t(dict, "getStarted.noscript.friendbotPrefix")}
                <a
                  href="https://friendbot.stellar.org"
                  target="_blank"
                  rel="noreferrer"
                >
                  {t(dict, "getStarted.noscript.friendbotLink")}
                </a>
                {t(dict, "getStarted.noscript.friendbotSuffix")}
              </li>
              <li>{t(dict, "getStarted.noscript.trustline")}</li>
            </ol>
          </div>
        </noscript>

        <OnboardingChecklist />
      </div>
    </section>
  );
}
