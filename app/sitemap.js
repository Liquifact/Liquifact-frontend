const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const routes = ["/", "/invoices", "/invest"];

export default function sitemap() {
  return routes.map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: "daily",
    priority: 0.8,
  }));
}
