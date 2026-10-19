import "./globals.css";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import I18nProvider from "@/components/I18nProvider";
import { getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n/server";

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://liquifact-frontend.vercel.app"),
  title: { default: "LiquiFact — Invoice liquidity on Stellar", template: "%s · LiquiFact" },
  description:
    "LiquiFact turns unpaid invoices into instant liquidity. SMEs tokenize invoices, investors fund them, and a Soroban escrow on Stellar holds funds until settlement.",
  openGraph: { title: "LiquiFact", description: "Invoice liquidity on Stellar", type: "website" },
};

export const viewport = { width: "device-width", initialScale: 1, themeColor: "#0b1024" };

export default async function RootLayout({ children }) {
  const locale = await getLocale();
  const dict = getDictionary(locale);
  return (
    <html lang={locale}>
      <body>
        <I18nProvider locale={locale} dict={dict}>
          <SiteHeader />
          <main id="main">{children}</main>
          <SiteFooter dict={dict} />
        </I18nProvider>
      </body>
    </html>
  );
}
