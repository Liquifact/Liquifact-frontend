import { headers } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Footer from "../components/Footer";
import { ToastProvider } from "../components/ToastProvider";
import OfflineBanner from "../components/OfflineBanner";
import MarketplaceShortcut from "../components/MarketplaceShortcut";
import InvoiceDetailShortcut from "../components/InvoiceDetailShortcut";
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

/**
 * Validation boundaries for layout inputs.
 *
 * Invariants enforced here:
 *  - `siteUrl must be an absolute http(s) URL, or it is rejected (metadataBase omitted).
 *  - `themeStorageKey` must be a non-empty string matching a safe identifier pattern.
 *  - `themes` must be a non-empty array of unique, non-empty strings.
 *  - `nonce` must be a non-empty base64-ish string; otherwise it is dropped.
 *
 * Rejections never throw and never leak the rejected value: only a constant
 * reason code is emitted so logs remain diagnosable without exposing secrets.
 */
const LAYOUT_WARNINGS = Object.freeze({
  SITE_URL_INVALID: "site_url_invalid",
  SITE_URL_MISSING: "site_url_missing",
  THEME_KEY_INVALID: "theme_storage_key_invalid",
  THEMES_INVALID: "themes_invalid",
  THEMES_DUPLICATE: "themes_duplicate",
  NONCE_INVALID: "nonce_invalid",
});

const SAFE_IDENTIFIER = /^[A-Za-z0-9_.:-]{1,128}$/;
const SAFE_NONCE = /^[A-Za-z0-9+/_=-]{1,256}$/;

function normalizeSiteUrl(raw) {
  if (raw === undefined || raw === null || raw === "") {
    return { value: undefined, warning: LAYOUT_WARNINGS.SITE_URL_MISSING };
  }
  if (typeof raw !== "string") {
    return { value: undefined, warning: LAYOUT_WARNINGS.SITE_URL_INVALID };
  }
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return { value: undefined, warning: LAYOUT_WARNINGS.SITE_URL_INVALID };
    }
    return { value: parsed, warning: null };
  } catch {
    return { value: undefined, warning: LAYOUT_WARNINGS.SITE_URL_INVALID };
  }
}

function normalizeThemeStorageKey(raw) {
  if (typeof raw !== "string" || !SAFE_IDENTIFIER.test(raw)) {
    return { value: undefined, warning: LAYOUT_WARNINGS.THEME_KEY_INVALID };
  }
  return { value: raw, warning: null };
}

function normalizeThemes(raw) {
  if (!Array.isArray(raw) || raw.length === 0) {
    return { value: undefined, warning: LAYOUT_WARNINGS.THEMES_INVALID };
  }
  const seen = new Set();
  const out = [];
  for (const entry of raw) {
    if (typeof entry !== "string" || !SAFE_IDENTIFIER.test(entry)) {
      return { value: undefined, warning: LAYOUT_WARNINGS.THEMES_INVALID };
    }
    if (seen.has(entry)) {
      return { value: undefined, warning: LAYOUT_WARNINGS.THEMES_DUPLICATE };
    }
    seen.add(entry);
    out.push(entry);
  }
  return { value: Object.freeze(out), warning: null };
}

function normalizeNonce(raw) {
  if (raw === undefined || raw === null || raw === "") {
    return { value: undefined, warning: null };
  }
  if (typeof raw !== "string" || !SAFE_NONCE.test(raw)) {
    return { value: undefined, warning: LAYOUT_WARNINGS.NONCE_INVALID };
  }
  return { value: raw, warning: null };
}

/**
 * Build the pre-paint theme script from validated inputs only.
 * Returns `null` when any required input is invalid, so the caller can
 * omit the script tag entirely rather than emit a malformed payload.
 */
function buildThemeScript(themeStorageKey, themes) {
  if (!themeStorageKey || !themes) return null;
  const serializedThemes = JSON.stringify(themes);
  const serializedKey = JSON.stringify(themeStorageKey);
  return (
    "(function(){try{" +
    "var k=" + serializedKey + ";" +
    "var allowed=" + serializedThemes + ";" +
    "var stored=window.localStorage.getItem(k);" +
    "var theme=allowed.indexOf(stored)>=0?stored:'light';" +
    "document.documentElement.setAttribute('data-theme',theme);" +
    "}catch(e){}})();"
  );
}

/**
 * Resolve layout inputs with deterministic validation.
 * Accepts partial input; missing fields are treated as invalid where required.
 */
function resolveLayoutInputs(input = {}) {
  const warnings = [];

  const siteUrl = normalizeSiteUrl(input.siteUrl);
  if (siteUrl.warning) warnings.push(siteUrl.warning);

  const themeKey = normalizeThemeStorageKey(input.themeStorageKey);
  if (themeKey.warning) warnings.push(themeKey.warning);

  const themes = normalizeThemes(input.themes);
  if (themes.warning) warnings.push(themes.warning);

  const nonce = normalizeNonce(input.nonce);
  if (nonce.warning) warnings.push(nonce.warning);

  const themeScript =
    themeKey.value && themes.value
      ? buildThemeScript(themeKey.value, themes.value)
      : null;

  return {
    metadataBase: siteUrl.value,
    themeStorageKey: themeKey.value,
    themes: themes.value,
    themeScript,
    nonce: nonce.value,
    warnings,
  };
}

/**
 * Resolve layout inputs at module load time.
 *
 * The site URL and theme configuration are static for the lifetime
 * of the process, so we validate them once. The nonce is request-scoped
 * and is resolved inside the layout render.
 */
const staticInputs = resolveLayoutInputs({
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
  themeStorageKey: THEME_STORAGE_KEY,
  themes: THEMES,
});

/**
 * Emit a single, structured warning line for each invalid layout input.
 * The reason codes are constants and do not contain the rejected value,
 * so no sensitive data is exposed in logs.
 */
for (const warning of staticInputs.warnings) {
  // eslint-disable-next-line no-console
  console.warn(`[layout] invalid input rejected: ${warning}`);
}

export const metadata = {
  metadataBase: staticInputs.metadataBase,
  title: `LiquiFact — ${copy.home.heroTitle}`,
  description: copy.home.heroSub,
  openGraph: {},
  twitter: {},
};

const CSP_NONCE_PATTERN = /^[A-Za-z0-9+/]{22}==$/;

export default async function RootLayout({ children }) {
  const nonceResult = resolveLayoutInputs({
    nonce: (await headers()).get("x-nonce"),
  });

  // Request-scoped nonce issues are logged as constant reason codes.
  for (const warning of nonceResult.warnings) {
    // eslint-disable-next-line no-console
    console.warn(`[layout] invalid input rejected: ${warning}`);
  }

  return (
    <html lang="en">
      {/*
        Pre-paint theme script: runs synchronously before React hydrates,
        eliminating the flash of incorrect theme (FOIT-equivalent for themes).
        The script body is built from validated inputs only; if any input
        is invalid the script is omitted entirely rather than emitting
        a malformed or unsafe tag.
      */}
      {staticInputs.themeScript ? (
        <head>
          <script
            nonce={nonceResult.nonce}
            dangerouslySetInnerHTML={{ __html: staticInputs.themeScript }}
          />
        </head>
      ) : (
        <head />
      )}
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {/* Skip link: first focusable element so keyboard users can bypass the header */}
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        <ToastProvider>
          <OfflineBanner />
          <WalletProvider>{children}</WalletProvider>
          {/* Theme toggle — fixed to top-right, above all other content */}
          <div className="fixed top-3 right-16 z-50 md:right-20">
            <ThemeToggle />
          </div>
        </ToastProvider>
        {/* Marketplace shortcut — listens for `m` keystrokes to navigate to /invest */}
        <MarketplaceShortcut />
        {/* Invoice detail shortcut — listens for `i` keystrokes to navigate to /invest */}
        <InvoiceDetailShortcut />
        {/* Shortcut help dialog — listens for `?` keystrokes to surface every
            registered keyboard shortcut. Mounted here so the gesture works
            on every page. The dialog markup only renders while open. */}
        <ShortcutHelpDialog />
        <Footer />
      </body>
    </html>
  );
}
