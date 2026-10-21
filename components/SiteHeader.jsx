"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import ThemeToggle from "@/components/ThemeToggle";
import { useT } from "@/lib/i18n/I18nProvider";

const LINKS = [
  { href: "/", labelKey: "nav.home" },
  { href: "/marketplace", labelKey: "nav.marketplace" },
  { href: "/submit", labelKey: "nav.submit" },
  { href: "/get-started", labelKey: "nav.getStarted" },
  { href: "/docs", labelKey: "nav.docs" },
];

export default function SiteHeader() {
  const t = useT();
  const pathname = usePathname() || "/";
  const [open, setOpen] = useState(false);
  const isActive = (href) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  return (
    <header className="site-header">
      <div className="container bar">
        <Link href="/" className="brand" onClick={() => setOpen(false)}>
          <span className="logo" aria-hidden="true">L</span>
          LiquiFact
        </Link>
        <button
          className="menu-btn"
          aria-expanded={open}
          aria-controls="main-nav"
          aria-label={t("nav.toggle")}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? "✕" : "☰"}
        </button>
        <nav id="main-nav" className={`nav${open ? " open" : ""}`} aria-label={t("nav.label")}>
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={isActive(l.href) ? "active" : undefined}
              aria-current={isActive(l.href) ? "page" : undefined}
              onClick={() => setOpen(false)}
            >
              {t(l.labelKey)}
            </Link>
          ))}
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
