import "./globals.css";
import { NotificationsProvider } from "@/components/NotificationsProvider";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { THEME_INIT_SCRIPT } from "@/lib/theme";

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://liquifact-frontend.vercel.app"),
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

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        <NotificationsProvider>
          <SiteHeader />
          <main id="main">{children}</main>
          <SiteFooter />
        </NotificationsProvider>
      </body>
    </html>
  );
}
