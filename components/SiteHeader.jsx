"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { isActivePath } from "@/lib/nav";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/marketplace", label: "Marketplace" },
  { href: "/submit", label: "Submit invoice" },
  { href: "/docs", label: "Docs" },
];

export default function SiteHeader() {
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
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((o) => !o)}
        >
          <span aria-hidden="true">{open ? "✕" : "☰"}</span>
        </button>
        <nav
          ref={navRef}
          id="main-nav"
          className={`nav${open ? " open" : ""}`}
          aria-label="Main"
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
                {l.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
