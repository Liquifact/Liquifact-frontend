import { buildSecurityHeaders } from "./lib/securityHeaders.mjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          ...buildSecurityHeaders({
            apiUrl: process.env.NEXT_PUBLIC_API_URL,
          }),
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
