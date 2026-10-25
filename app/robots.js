const BASE = process.env.NEXT_PUBLIC_SITE_URL || "https://liquifact-frontend.vercel.app";

export default function robots() {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${BASE}/sitemap.xml`,
    host: new URL(BASE).host,
  };
}
