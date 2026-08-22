import Link from "next/link";
import { copy } from "../app/copy/en";

/**
 * @typedef {Object} FooterLink
 * @property {string} label - Rendered link text.
 * @property {string} href - Destination URL.
 * @property {boolean} [external] - Whether the link opens in a new tab (defaults to true for external URLs).
 */

/**
 * Footer component displays navigation links defined in `copy.footer`.
 * Accepts an optional `links` prop for testing/customization. If omitted,
 * it falls back to the default hard‑coded list.
 */
export default function Footer({ links }) {
  /** @type {FooterLink[]} */
  const defaultLinks = [
    {
      label: copy.footer.docs,
      href: copy.footer.docsUrl,
      external: true,
    },
    {
      label: copy.footer.status,
      href: copy.footer.statusUrl,
      external: true,
    },
    {
      label: copy.footer.contact,
      href: copy.footer.contactUrl,
      external: true,
    },
    {
      label: copy.footer.discord,
      href: copy.footer.discordUrl,
      external: true,
    },
  ];

  const linksToRender = links ?? defaultLinks;

  return (
    <footer className="border-t border-slate-800 bg-slate-950 px-6 py-8">
      <div className="max-w-4xl mx-auto flex flex-wrap items-center gap-6 text-sm text-slate-300">
        {linksToRender.map((link) =>
          link.external ? (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block py-3 hover:text-cyan-400 transition-colors"
            >
              {link.label}
            </a>
          ) : (
            <Link
              key={link.href}
              href={link.href}
              className="inline-block py-3 hover:text-cyan-400 transition-colors"
            >
              {link.label}
            </Link>
          )
        )}
      </div>
    </footer>
  );
}
