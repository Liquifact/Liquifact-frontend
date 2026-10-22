import "./globals.css";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import { headers } from "next/headers";

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

export default async function RootLayout({ children }) {
  const headersList = await headers();
  const nonce = headersList.get("x-nonce") || undefined;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}
        />
      </head>
      <body>
        <SiteHeader />
        <main id="main">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
