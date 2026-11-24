import { t } from "@/lib/i18n";

export default function OfflineScreen({ dict }) {
  return (
    <section className="section">
      <div className="container center">
        <h1>{t(dict, "offline.title")}</h1>
        <p className="lead">{t(dict, "offline.lead")}</p>
        <p className="muted">{t(dict, "offline.muted")}</p>
        <a className="btn btn-ghost" href="/marketplace">{t(dict, "offline.cta")}</a>
      </div>
    </section>
  );
}
