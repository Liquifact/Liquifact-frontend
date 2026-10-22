import OnboardingChecklist from "./OnboardingChecklist";

export const metadata = {
  title: "Get started",
  description:
    "Set up your Stellar wallet and fund a testnet account in minutes. LiquiFact detects each prerequisite and offers one-click Friendbot funding.",
};

export default function GetStartedPage() {
  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 720 }}>
        <div className="eyebrow">Investor onboarding</div>
        <h1 style={{ fontSize: "clamp(1.8rem,4vw,2.6rem)" }}>
          Get started on the testnet
        </h1>
        <p className="lead">
          Complete the steps below to set up your Stellar wallet and fund your
          first invoice. All five steps are detected automatically — click any
          action to resolve them one by one.
        </p>

        {/* Static explanation — visible without JavaScript */}
        <noscript>
          <div className="notice notice-warn" style={{ marginBottom: 24 }}>
            JavaScript is disabled. The live checklist requires JS, but you can
            follow these steps manually:
            <ol style={{ marginTop: 10, paddingLeft: "1.3em" }}>
              <li>
                Install the{" "}
                <a
                  href="https://freighter.app"
                  target="_blank"
                  rel="noreferrer"
                >
                  Freighter
                </a>{" "}
                browser extension.
              </li>
              <li>Open Freighter and create or import a wallet.</li>
              <li>
                Switch Freighter to <strong>Test Network</strong>.
              </li>
              <li>
                Visit{" "}
                <a
                  href="https://friendbot.stellar.org"
                  target="_blank"
                  rel="noreferrer"
                >
                  friendbot.stellar.org
                </a>{" "}
                and paste your public key to receive testnet XLM.
              </li>
              <li>
                In Freighter, add the USDC trustline if you plan to fund USDC
                invoices.
              </li>
            </ol>
          </div>
        </noscript>

        <OnboardingChecklist />
      </div>
    </section>
  );
}
