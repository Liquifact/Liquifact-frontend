export default function manifest() {
  return {
    id: "/", name: "LiquiFact – Invoice liquidity", short_name: "LiquiFact",
    description: "Browse invoice liquidity on Stellar, including your last-seen marketplace offline.",
    start_url: "/marketplace", scope: "/", display: "standalone",
    theme_color: "#4f46e5", background_color: "#f7f8fc",
    categories: ["finance", "business"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      {
        name: "Marketplace",
        short_name: "Market",
        url: "/marketplace",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Submit Invoice",
        short_name: "Submit",
        url: "/submit",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
    ],
  };
}
