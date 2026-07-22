import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Footer from "../components/Footer";
import { ToastProvider } from "../components/ToastProvider";
import { WalletProvider } from "../components/WalletProvider";
import ThemeToggle, { THEME_STORAGE_KEY, THEMES } from "../components/ThemeToggle";
import ShortcutHelpDialog from "../components/ShortcutHelpDialog";
import { copy } from "./copy/en";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: `LiquiFact — ${copy.home.heroTitle}`,
  description: copy.home.heroSub,
  openGraph: {
    title: `LiquiFact — ${copy.home.heroTitle}`,
    description: copy.home.heroSub,
    url: "/",
    siteName: "LiquiFact",
    images: [
      {
        url: "/opengraph-image", // Next.js App Router dynamic route
        width: 1200,
        height: 630,
        alt: "LiquiFact Social Preview",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `LiquiFact — ${copy.home.heroTitle}`,
    description: copy.home.heroSub,
    images: ["/opengraph-image"],
  },
};

/**
 * Inline script that runs synchronously before the first paint to set the
 * correct data-theme attribute on <html>.  Reads the user's stored preference
 * from localStorage (or falls back to the OS colour-scheme media query).
 * Inlining avoids the "flash of incorrect theme" that would occur if we let
 * React hydrate first.
 *
 * The script must be a string constant because Next.js serialises it into
 * a <script> tag at the HTML level.  dangerouslySetInnerHTML is intentional
 * and safe here — the content is a static literal, not user-supplied data.
 */
const THEME_SCRIPT = `(function(){
  var key = '${THEME_STORAGE_KEY}';
  var themes = ${JSON.stringify(THEMES)};
  var pref = 'system';
  try { var s = localStorage.getItem(key); if (s && themes.indexOf(s) !== -1) pref = s; } catch(e){}
  var effective = pref;
  if (pref === 'system') {
    effective = (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) ? 'light' : 'dark';
  }
  document.documentElement.setAttribute('data-theme', effective);
})();`;

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      {/*
        Pre-paint theme script: runs synchronously before React hydrates,
        eliminating the flash of incorrect theme (FOIT-equivalent for themes).
      */}
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {/* Skip link: first focusable element so keyboard users can bypass the header */}
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        <ToastProvider>
          <WalletProvider>{children}</WalletProvider>
        </ToastProvider>
        {/* Theme toggle — fixed to top-right, above all other content */}
        <div className="fixed top-3 right-16 z-50 md:right-20">
          <ThemeToggle />
        </div>
        {/* Shortcut help dialog — listens for `?` keystrokes to surface every
            registered keyboard shortcut. Mounted here so the gesture works
            on every page. The dialog markup only renders while open. */}
        <ShortcutHelpDialog />
        <Footer />
      </body>
    </html>
  );
}
