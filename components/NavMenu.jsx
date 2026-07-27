"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

// Lazy-load WalletStatus so the wallet chunk (Stellar/Freighter SDK) is not
// in the initial JS bundle. The placeholder prevents CLS while the chunk
// downloads. ssr: false avoids "window is not defined" during server render.
import WalletStatusLazy from "./WalletStatusLazy";
import NetworkBadge from "./NetworkBadge";
import { copy } from "../app/copy/en";

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
  { href: "/settings", label: "Settings" },
];

/**
 * Debounce delay (ms) for the navigation announcement.
 * Rapid route changes (e.g. prefetch-driven navigations) are collapsed into a
 * single announcement so the live region is not spammed.
 */
export const ANNOUNCE_DEBOUNCE_MS = 200;

// ---------------------------------------------------------------------------
// Memoized sub-components
// ---------------------------------------------------------------------------

/**
 * A single navigation link. Wrapped in React.memo so it only re-renders when
 * its own props change (href, label, isActive, or the variant used for
 * desktop vs. mobile styling).
 *
 * @param {{ href: string, label: string, isActive: boolean, variant: "desktop" | "mobile" }} props
 */
const NavLinkItem = memo(function NavLinkItem({ href, label, isActive, variant }) {
  const desktopClass = isActive
    ? "text-cyan-400"
    : "text-slate-300 hover:text-cyan-400 active:text-cyan-300";

  const mobileClass = isActive
    ? "text-cyan-400 bg-slate-800/60"
    : "text-slate-300 hover:text-cyan-400 hover:bg-slate-800/40 active:text-cyan-300 active:bg-slate-800/50";

  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={
        variant === "desktop"
          ? `text-sm font-medium transition-colors focus-ring rounded ${desktopClass}`
          : `rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-ring ${mobileClass}`
      }
    >
      {label}
    </Link>
  );
});

/**
 * Desktop navigation bar. Memoized — only re-renders when the active
 * pathname changes (via the `navItems` derived array).
 *
 * @param {{ navItems: Array<{ href: string, label: string, isActive: boolean }> }} props
 */
const DesktopNav = memo(function DesktopNav({ navItems }) {
  return (
    <nav aria-label="Main navigation" className="hidden md:flex items-center gap-6">
      {navItems.map(({ href, label, isActive }) => (
        <NavLinkItem key={href} href={href} label={label} isActive={isActive} variant="desktop" />
      ))}
      {/* Stellar network badge — tells users which ledger is configured */}
      <NetworkBadge />
      {/* Lazy-loaded wallet UI — chunk fetched on demand, not in initial bundle */}
      <WalletStatusLazy />
    </nav>
  );
});

/**
 * Mobile dropdown menu. Memoized — only re-renders when the active pathname
 * changes or the visibility transition state changes.
 *
 * @param {{ navItems: Array<{ href: string, label: string, isActive: boolean }>, visible: boolean, menuRef: React.RefObject }} props
 */
const MobileMenu = memo(function MobileMenu({ navItems, visible, menuRef }) {
  return (
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
      {navItems.map(({ href, label, isActive }) => (
        <NavLinkItem key={href} href={href} label={label} isActive={isActive} variant="mobile" />
      ))}
    </nav>
  );
});

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

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
 *
 * ## Memoization strategy
 *
 * NavMenu manages two pieces of volatile state — `openPathname` (the mobile
 * toggle) and `visible` (the enter/exit CSS transition flag). Neither should
 * cause the link rows or the desktop nav to re-render.
 *
 * - `navItems` — derived via `useMemo`, recomputed only when `pathname`
 *   changes. Passed into `DesktopNav` and `MobileMenu` as a stable array.
 * - `DesktopNav` / `MobileMenu` — wrapped in `React.memo` so they bail out
 *   when their props are reference-equal across renders.
 * - `NavLinkItem` — wrapped in `React.memo`; each link re-renders only when
 *   its own `isActive` flag, `href`, or `label` changes.
 * - `toggle` — wrapped in `useCallback` with `[pathname]` dependency.
 * - `brandLabel` — derived via `useMemo` so it isn't recomputed on every
 *   render caused by `open`/`visible` state changes.
 */
export default function NavMenu() {
  const pathname = usePathname();
  const toggleRef = useRef(null);
  const menuRef = useRef(null);

  const [openPathname, setOpenPathname] = useState(null);
  const open = openPathname !== null && openPathname === pathname;

  // Drive the CSS enter/exit transition.
  // Both branches use async callbacks so setState is never called
  // synchronously inside the effect body (avoids react-hooks/set-state-in-effect).
  const [visible, setVisible] = useState(false);

  // ---------------------------------------------------------------------------
  // Navigation announcement (aria-live, polite)
  // ---------------------------------------------------------------------------

  /**
   * Text injected into the sr-only live region. Empty string = nothing
   * announced (initial mount and any state where there is no matching label).
   */
  const [announcement, setAnnouncement] = useState("");

  /**
   * Tracks whether this is the very first render so we never announce on mount
   * (the user is already on the page — no navigation has occurred).
   */
  const isMounted = useRef(false);

  /**
   * Holds the debounce timer handle so it can be cancelled on rapid updates
   * or on unmount.
   */
  const announceTimer = useRef(null);

  useEffect(() => {
    // Skip the initial mount: no navigation has occurred yet.
    if (!isMounted.current) {
      isMounted.current = true;
      return;
    }

    // Cancel any pending announcement from a previous rapid update.
    if (announceTimer.current !== null) {
      clearTimeout(announceTimer.current);
    }

    // Find the label for the current pathname (e.g. "Home", "Invoices", …).
    // If the pathname does not match a known route (e.g. an invoice detail
    // page) we still announce with the raw pathname so the user is not left
    // completely in the dark.
    const matchedLink = NAV_LINKS.find((link) => link.href === pathname);
    const label = matchedLink ? matchedLink.label : pathname;

    announceTimer.current = setTimeout(() => {
      setAnnouncement(copy.nav.announceNavigation.replace("{label}", label));
      announceTimer.current = null;
    }, ANNOUNCE_DEBOUNCE_MS);

    return () => {
      if (announceTimer.current !== null) {
        clearTimeout(announceTimer.current);
        announceTimer.current = null;
      }
    };
  }, [pathname]);

  // ---------------------------------------------------------------------------
  // Derived / memoized data — stable across open/visible state changes
  // ---------------------------------------------------------------------------

  /**
   * Pre-compute the active flag for every link so the comparison runs once
   * per pathname change rather than inline on every render.
   */
  const navItems = useMemo(
    () => NAV_LINKS.map((link) => ({ ...link, isActive: pathname === link.href })),
    [pathname]
  );

  /**
   * Brand label depends only on the current pathname, not on open/visible.
   */
  const isHomePage = pathname === "/" || pathname === "/home";
  const brandLabel = useMemo(() => {
    return isHomePage ? "LiquiFact" : "← LiquiFact";
  }, [isHomePage]);

  // ---------------------------------------------------------------------------
  // Effects
  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <header className="relative sticky top-0 z-40 border-b border-slate-800 bg-slate-950/90 backdrop-blur-sm px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Brand */}
        <Link
          href="/"
          aria-current={isHomePage ? "page" : undefined}
          className="inline-block py-3 text-xl font-semibold tracking-tight text-cyan-400 hover:underline focus-ring rounded"
        >
          {isHomePage ? (
            "LiquiFact"
          ) : (
            <>
              <span aria-hidden="true">← </span> {/* CHANGED */}
              LiquiFact
            </>
          )}
        </Link>

        {/* Desktop nav — only re-renders when pathname changes */}
        <DesktopNav navItems={navItems} />

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
              focusable="false"
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
      {open && <MobileMenu navItems={navItems} visible={visible} menuRef={menuRef} />}

      {/* Polite live region — announces route changes to screen-reader users.
          Kept visually hidden (sr-only) so it never affects layout.
          Empty on mount so no announcement fires before any navigation occurs.
          aria-atomic ensures the full string is read, not just the changed part. */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        data-testid="nav-announce"
        className="sr-only"
      >
        {announcement}
      </div>
    </header>
  );
}
