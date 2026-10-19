const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://liquifact-frontend.vercel.app";

// /portfolio is a private, per-wallet view and is deliberately excluded from the sitemap.
export default function sitemap() {
  return ["", "/marketplace", "/submit", "/docs"]
    .filter((p) => p !== "/portfolio")
    .map((p) => ({ url: `${BASE}${p}`, lastModified: new Date() }));
}
