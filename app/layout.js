import "./globals.css";
import { NotificationsProvider } from "@/components/NotificationsProvider";
import SiteHeader from "@/components/SiteHeader";
import ServiceWorkerRegistrar from "@/components/pwa/ServiceWorkerRegistrar";
import SiteFooter from "@/components/SiteFooter";
import { SITE_URL } from "@/lib/config";
import SkipLink from "@/components/SkipLink";
import ToastProvider from "@/components/toast/ToastProvider";
import { TxTrackerProvider } from "@/components/TxTrackerProvider";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import { headers } from "next/headers";
import { getDictionary } from "@/lib/i18n";
import { I18nProvider } from "@/lib/i18n/I18nProvider";
import { getLocale } from "@/lib/i18n/server";

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "LiquiFact — Invoice liquidity on Stellar", template: "%s · LiquiFact" },
  description:
    "LiquiFact turns unpaid invoices into instant liquidity. SMEs tokenize invoices, investors fund them, and a Soroban escrow on Stellar holds funds until settlement.",
  openGraph: { title: "LiquiFact", description: "Invoice liquidity on Stellar", type: "website" },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f8fc" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0e1f" },
  ],
};

export default async function RootLayout({ children }) {
  const headersList = await headers();
  const nonce = headersList.get("x-nonce") || undefined;

  const locale = await getLocale();
  const dict = getDictionary(locale);
  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}
        />
      </head>
      <body>
        <I18nProvider locale={locale} dict={dict}>
          <SkipLink />
          <ToastProvider>
            <TxTrackerProvider>
              <NotificationsProvider>
                <SiteHeader />
                <main id="main" tabIndex={-1}>{children}</main>
                <SiteFooter />
              </NotificationsProvider>
            </TxTrackerProvider>
          </ToastProvider>
          <ServiceWorkerRegistrar />
        </I18nProvider>
      </body>
    </html>
  );
}