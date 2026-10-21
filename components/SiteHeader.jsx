"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import ThemeToggle from "@/components/ThemeToggle";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/marketplace", label: "Marketplace" },
  { href: "/submit", label: "Submit invoice" },
  { href: "/get-started", label: "Get started" },
  { href: "/docs", label: "Docs" },
];

export default function SiteHeader() {
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
          aria-label="Toggle navigation"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? "✕" : "☰"}
        </button>
        <nav id="main-nav" className={`nav${open ? " open" : ""}`} aria-label="Main">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={isActive(l.href) ? "active" : undefined}
              aria-current={isActive(l.href) ? "page" : undefined}
              onClick={() => setOpen(false)}
            >
              {l.label}
            </Link>
          ))}
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
