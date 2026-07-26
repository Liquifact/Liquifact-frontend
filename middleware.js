import { Buffer } from "node:buffer";
import { NextResponse } from "next/server";
import { buildSecurityHeaders } from "./lib/securityHeaders.mjs";

function createNonce() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString("base64");
}

export function middleware(request) {
  const nonce = createNonce();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  const securityHeaders = buildSecurityHeaders({
    apiUrl: process.env.NEXT_PUBLIC_API_URL,
    nonce,
  });

  for (const { key, value } of securityHeaders) {
    response.headers.set(key, value);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
