/**
 * @file components/NavMenuSkeleton.jsx
 * Placeholder header shown in route-level `loading.js` boundaries while the
 * real page (and its <NavMenu />) is still resolving.
 *
 * Mirrors NavMenu's header structure and dimensions — brand, desktop link
 * row, network badge, wallet button, and mobile hamburger — so swapping in
 * the real NavMenu on settle causes no layout shift. Any structural change
 * to NavMenu's header must be reflected here.
 *
 * @see components/NavMenu.jsx             — canonical header markup
 * @see components/WalletStatusLazy.jsx     — wallet placeholder dimensions reused below
 */
export default function NavMenuSkeleton() {
  return (
    <header
      aria-hidden="true"
      aria-busy="true"
      className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/90 backdrop-blur-sm px-6 py-4"
    >
      <div className="flex items-center justify-between">
        {/* Brand */}
        <div className="h-7 w-28 rounded bg-slate-700 animate-pulse" />

        {/* Desktop nav: links + network badge + wallet button */}
        <div className="hidden md:flex items-center gap-6">
          <div className="h-3.5 w-12 rounded bg-slate-800 animate-pulse" />
          <div className="h-3.5 w-16 rounded bg-slate-800 animate-pulse" />
          <div className="h-3.5 w-12 rounded bg-slate-800 animate-pulse" />
          <div className="h-5 w-20 rounded-full bg-slate-800 animate-pulse" />
          <div className="h-12 w-80 rounded-full bg-slate-800/50 animate-pulse" />
        </div>

        <div className="flex items-center gap-3">
          {/* Network badge — mobile */}
          <div className="md:hidden h-5 w-20 rounded-full bg-slate-800 animate-pulse" />
          {/* Wallet button — mobile */}
          <div className="md:hidden h-12 w-80 rounded-full bg-slate-800/50 animate-pulse" />
          {/* Hamburger toggle */}
          <div className="md:hidden h-9 w-9 rounded-lg bg-slate-800 animate-pulse" />
        </div>
      </div>
    </header>
  );
}
