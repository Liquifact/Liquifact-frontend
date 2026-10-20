import { SITE_URL } from "@/lib/config";

export default function sitemap() {
  return ["", "/marketplace", "/submit", "/docs"].map((p) => ({ url: `${SITE_URL}${p}`, lastModified: new Date() }));
}
