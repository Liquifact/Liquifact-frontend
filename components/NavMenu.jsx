"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

// Lazy-load WalletStatus so the wallet chunk (Stellar/Freighter SDK) is not
// in the initial JS bundle. The placeholder prevents CLS while the chunk
// downloads. ssr: false avoids "window is not defined" during server render.
import WalletStatusLazy from "./WalletStatusLazy";
import NetworkBadge from "./NetworkBadge";

/**
 * @typedef {Object} NavLink
 * @property {string} href - The route path.
 * @property {string} label - The display label.
 */

/** @type {NavLink[]} */
const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/invoices", label: "Invoices" },
  { href: "/invest", label: "Invest" },
];

/**
 * NavMenu — responsive site navigation.
 *
 * Renders links inline on desktop (md+). On mobile, hides links behind a
 * hamburger toggle button with full ARIA disclosure semantics
 * (aria-expanded, aria-controls). The mobile dropdown is absolutely
 * positioned so it overlays page content rather than pushing it down.
 * Closes on Escape, on navigation, and returns focus to the toggle button
 * when dismissed.
 *
 * The wallet UI is lazy-loaded via next/dynamic so the Stellar wallet SDK
 * does not ship in the initial bundle for pages that don't need it
 * immediately (e.g. the static home page).
 */
export default function NavMenu() {
  const pathname = usePathname();
  const toggleRef = useRef(null);
  const menuRef = useRef(null);

  const [openPathname, setOpenPathname] = useState(null);
  const open = openPathname !== null && openPathname === pathname;
  const isHomePage = pathname === "/" || pathname === "/home";

  // Drive the CSS enter/exit transition.
  // Both branches use async callbacks so setState is never called
  // synchronously inside the effect body (avoids react-hooks/set-state-in-effect).
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      const raf = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(raf);
    }

    const t = setTimeout(() => setVisible(false), 0);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    // Mobile-only disclosure: when the panel opens, place focus on the first
    // available menu link so keyboard users land inside the revealed content.
    const raf = requestAnimationFrame(() => {
      const firstFocusable = menuRef.current?.querySelector("a[href], button:not([disabled])");
      firstFocusable?.focus();
      if (!firstFocusable) {
        menuRef.current?.focus();
      }
    });

    return () => cancelAnimationFrame(raf);
  }, [open]);

  // Close on Escape and return focus to toggle
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setOpenPathname(null);
        toggleRef.current?.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  // Close when clicking outside the header
  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target) &&
        toggleRef.current &&
        !toggleRef.current.contains(e.target)
      ) {
        setOpenPathname(null);
        toggleRef.current?.focus();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const toggle = useCallback(() => {
    setOpenPathname((prev) => (prev === null ? pathname : null));
  }, [pathname]);

  return (
    <header className="relative sticky top-0 z-40 border-b border-slate-800 bg-slate-950/90 backdrop-blur-sm px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Brand */}
        {/* <Link
          href="/"
          className="md:text-2xl text-xl font-semibold tracking-tight text-slate-100 hover:text-cyan-400 active:text-cyan-300 transition-colors focus-ring rounded"
        >
          LiquiFact
        </Link> */}
        <Link
          href="/"
          className="inline-block py-3 text-xl font-semibold tracking-tight text-cyan-400 hover:underline focus-ring rounded"
        >
          {isHomePage ? "LiquiFact" : "← LiquiFact"}
        </Link>

        {/* Desktop nav */}
        <nav aria-label="Main navigation" className="hidden md:flex items-center gap-6">
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              aria-current={pathname === href ? "page" : undefined}
              className={`text-sm font-medium transition-colors focus-ring rounded ${
                pathname === href
                  ? "text-cyan-400"
                  : "text-slate-300 hover:text-cyan-400 active:text-cyan-300"
              }`}
            >
              {label}
            </Link>
          ))}
          {/* Stellar network badge — tells users which ledger is configured */}
          <NetworkBadge />
          {/* Lazy-loaded wallet UI — chunk fetched on demand, not in initial bundle */}
          <WalletStatusLazy />
        </nav>

        <div className="flex items-center gap-3">
          {/* Network badge — visible on mobile too, alongside the wallet button */}
          <NetworkBadge className="md:hidden" />
          {/* Wallet button — lazy-loaded on mobile too */}
          <div className="md:hidden">
            <WalletStatusLazy />
          </div>

          {/* Mobile hamburger */}
          <button
            ref={toggleRef}
            type="button"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Close navigation menu" : "Open navigation menu"}
            onClick={toggle}
            className="md:hidden rounded-lg p-2 text-slate-300 hover:text-cyan-400 hover:bg-slate-800 active:text-cyan-300 active:bg-slate-700 transition-colors focus-ring"
          >
            {/* Animated hamburger → X morphing in place */}
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line
                x1="3"
                y1="6"
                x2="21"
                y2="6"
                style={{
                  transformOrigin: "12px 6px",
                  transition: "transform 0.25s ease",
                  transform: open ? "translateY(6px) rotate(45deg)" : "none",
                }}
              />
              <line
                x1="3"
                y1="12"
                x2="21"
                y2="12"
                style={{
                  transition: "opacity 0.2s ease",
                  opacity: open ? 0 : 1,
                }}
              />
              <line
                x1="3"
                y1="18"
                x2="21"
                y2="18"
                style={{
                  transformOrigin: "12px 18px",
                  transition: "transform 0.25s ease",
                  transform: open ? "translateY(-6px) rotate(-45deg)" : "none",
                }}
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile dropdown — absolutely positioned so it overlays page content */}
      {open && (
        <nav
          id="mobile-menu"
          ref={menuRef}
          tabIndex={-1}
          aria-label="Mobile navigation"
          style={{
            transition: "opacity 0.2s ease, transform 0.2s ease",
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(-6px)",
          }}
          className="md:hidden absolute left-0 right-0 top-full z-50 border-b border-slate-800 bg-slate-950/95 backdrop-blur-sm px-6 py-3 flex flex-col gap-1"
        >
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              aria-current={pathname === href ? "page" : undefined}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-ring ${
                pathname === href
                  ? "text-cyan-400 bg-slate-800/60"
                  : "text-slate-300 hover:text-cyan-400 hover:bg-slate-800/40 active:text-cyan-300 active:bg-slate-800/50"
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
