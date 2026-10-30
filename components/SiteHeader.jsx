"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { isActivePath } from "@/lib/nav";
import ThemeToggle from "@/components/ThemeToggle";
import { useT } from "@/lib/i18n/I18nProvider";
import NotificationBell from "@/components/NotificationBell";
import TxActivityButton from "@/components/TxActivityButton";

const LINKS = [
  { href: "/", labelKey: "nav.home" },
  { href: "/marketplace", labelKey: "nav.marketplace" },
  { href: "/portfolio", labelKey: "nav.portfolio" },
  { href: "/submit", labelKey: "nav.submit" },
  { href: "/get-started", labelKey: "nav.getStarted" },
  { href: "/docs", labelKey: "nav.docs" },
];

export default function SiteHeader() {
  const t = useT();
  const pathname = usePathname() || "/";
  const [open, setOpen] = useState(false);
  const navRef = useRef(null);
  const btnRef = useRef(null);

  // Close on any route change (link click, Back/Forward).
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    navRef.current?.querySelector("a")?.focus();

    const onKeyDown = (e) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      btnRef.current?.focus();
    };
    const onPointerDown = (e) => {
      if (navRef.current?.contains(e.target) || btnRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    document.body.classList.add("menu-open");
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
      document.body.classList.remove("menu-open");
    };
  }, [open]);

  // Disclosure, not a modal trap: tabbing out of the menu closes it.
  const onNavBlur = (e) => {
    const next = e.relatedTarget;
    if (!open || !next) return;
    if (navRef.current?.contains(next) || btnRef.current?.contains(next)) return;
    setOpen(false);
  };

  return (
    <header className="site-header">
      <div className="container bar">
        <Link href="/" className="brand" aria-label="LiquiFact home">
          <span className="logo" aria-hidden="true">L</span>
          LiquiFact
        </Link>
        <button
          ref={btnRef}
          type="button"
          className="menu-btn"
          aria-expanded={open}
          aria-controls="main-nav"
          aria-label={open ? t("nav.closeMenu") : t("nav.openMenu")}
          onClick={() => setOpen((o) => !o)}
        >
          <span aria-hidden="true">{open ? "✕" : "☰"}</span>
        </button>
        <nav
          ref={navRef}
          id="main-nav"
          className={`nav${open ? " open" : ""}`}
          aria-label={t("nav.label")}
          onBlur={onNavBlur}
        >
          {LINKS.map((l) => {
            const active = isActivePath(pathname, l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={active ? "active" : undefined}
                aria-current={active ? "page" : undefined}
                onClick={() => setOpen(false)}
              >
                {t(l.labelKey)}
              </Link>
            );
          })}
          <ThemeToggle />
        </nav>
        <TxActivityButton />
        <NotificationBell />
      </div>
    </header>
  );
}