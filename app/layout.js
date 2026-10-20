import "./globals.css";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { SITE_URL } from "@/lib/config";

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "LiquiFact — Invoice liquidity on Stellar", template: "%s · LiquiFact" },
  description:
    "LiquiFact turns unpaid invoices into instant liquidity. SMEs tokenize invoices, investors fund them, and a Soroban escrow on Stellar holds funds until settlement.",
  openGraph: { title: "LiquiFact", description: "Invoice liquidity on Stellar", type: "website" },
};

export const viewport = { width: "device-width", initialScale: 1, themeColor: "#0b1024" };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <SiteHeader />
        <main id="main">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
