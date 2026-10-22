import { NextResponse } from "next/server";
import { buildCsp } from "./lib/security/csp.js";
import { API_URL } from "./lib/config.js";
import { getNetwork, CONFIGURED_NETWORK } from "./lib/stellar/networks.js";

export function proxy(request) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const dev = process.env.NODE_ENV === "development";

  const networkConfig = getNetwork(CONFIGURED_NETWORK);
  const horizonUrl = process.env.NEXT_PUBLIC_HORIZON_URL || networkConfig?.horizonUrl;
  const rpcUrl = process.env.NEXT_PUBLIC_SOROBAN_RPC_URL || process.env.SOROBAN_RPC_URL;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || API_URL;

  const reportUri = process.env.CSP_REPORT_URI || process.env.NEXT_PUBLIC_CSP_REPORT_URI;
  const reportTo = process.env.CSP_REPORT_TO || process.env.NEXT_PUBLIC_CSP_REPORT_TO;

  const csp = buildCsp({
    nonce,
    apiUrl,
    rpcUrl,
    horizonUrl,
    dev,
    reportUri,
    reportTo,
  });

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  const reportOnly = process.env.NEXT_PUBLIC_CSP_REPORT_ONLY === "1";
  const headerName = reportOnly
    ? "Content-Security-Policy-Report-Only"
    : "Content-Security-Policy";

  response.headers.set(headerName, csp);

  return response;
}

export default proxy;

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
