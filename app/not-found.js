import Link from "next/link";
import { copy } from "./copy/en";

/**
 * App Router not-found boundary.
 *
 * Rendered automatically by Next.js when {@link notFound} is called anywhere
 * in the segment tree, or when no matching route is found for an incoming URL.
 * Provides a branded 404 page consistent with the dark slate/cyan theme used
 * across the rest of the application.
 *
 * Accessibility notes:
 * - The page has a single `<h1>` so heading structure is clear.
 * - The "Back to LiquiFact" link is the first interactive element and is fully
 *   keyboard-navigable via the `.focus-ring` utility class.
 * - The decorative "404" badge is hidden from assistive technologies with
 *   `aria-hidden` — the visible `<h1>` provides the meaningful heading.
 */
export default function NotFound() {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4 py-16 text-slate-50"
      data-testid="not-found-page"
    >
      <main
        id="main-content"
        className="w-full max-w-lg text-center"
        aria-labelledby="not-found-heading"
      >
        {/* Decorative status code — hidden from screen readers */}
        <p
          aria-hidden="true"
          className="mb-4 text-8xl font-extrabold tracking-tight text-cyan-500/30 select-none"
        >
          {copy.notFound.statusLabel}
        </p>

        <h1 id="not-found-heading" className="mb-4 text-3xl font-bold tracking-tight text-slate-50">
          {copy.notFound.heading}
        </h1>

        <p className="mb-8 text-base leading-7 text-slate-400">{copy.notFound.description}</p>

        <Link
          href="/"
          className="focus-ring inline-flex items-center justify-center rounded-full bg-cyan-500/20 px-6 py-3 text-sm font-medium text-cyan-400 transition-colors duration-200 hover:bg-cyan-500/30 active:bg-cyan-500/40"
          data-testid="not-found-home-link"
        >
          {copy.notFound.homeLabel}
        </Link>
      </main>
    </div>
  );
}
