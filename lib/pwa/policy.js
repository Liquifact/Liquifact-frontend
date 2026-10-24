// Shared by node:test and the worker (copied into public/ by prepare-pwa.mjs).
const walletAddress = /(?:G[A-Z2-7]{55}|M[A-Z2-7]{68})/;
export function isCacheableApi(input, apiUrl) {
  const url = new URL(input);
  const base = new URL(apiUrl);
  const prefix = base.pathname.replace(/\/$/, "");
  if (url.origin !== base.origin || url.username || url.password || walletAddress.test(url.href)) return false;
  const path = url.pathname.slice(prefix.length);
  if (!url.pathname.startsWith(`${prefix}/`)) return false;
  if (path === "/api/stats") return !url.search;
  if (path === "/api/invoices") {
    return [...url.searchParams].every(([key, value]) =>
      key === "status" && ["open", "funded", "settled"].includes(value));
  }
  return /^\/api\/invoices\/[A-Za-z0-9_-]+$/.test(path) && !url.search;
}

export function routeFor(request, { origin, apiUrl }) {
  if (request.method !== "GET" || request.headers?.has("authorization")) return "network";
  const url = new URL(request.url);
  if (isCacheableApi(url, apiUrl)) return "api";
  if (url.origin !== origin) return "network";
  if (url.pathname.startsWith("/_next/static/") && !walletAddress.test(url.href) &&
    [...url.searchParams.keys()].every((key) => key === "dpl")) return "static";
  if (["/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png", "/icons/maskable-512.png"].includes(url.pathname)) return "static";
  if (request.mode === "navigate") return "navigation";
  return "network";
}

export function isPublicNavigation(input, origin) {
  const url = new URL(input);
  return url.origin === origin && !url.search && !walletAddress.test(url.href) &&
    (/^\/(?:marketplace(?:\/[A-Za-z0-9_-]+)?|offline)?$/.test(url.pathname));
}

// Cache only display fields. In particular, never persist smeAddress, wallets,
// signed XDR, transaction metadata, or new API fields without explicit review.
export function publicApiBody(body, input) {
  if (new URL(input).pathname.endsWith("/api/stats")) {
    return Object.fromEntries(["invoices", "open", "totalFaceValue", "averageYieldBps"]
      .filter((key) => typeof body[key] === "number").map((key) => [key, body[key]]));
  }
  const fields = ["id", "sme", "debtor", "amount", "currency", "fundedAmount", "yieldBps", "dueDate", "status", "onChain"];
  const invoice = (value) => Object.fromEntries(fields.filter((key) =>
    ["string", "number", "boolean"].includes(typeof value?.[key]) && !walletAddress.test(String(value[key])))
    .map((key) => [key, value[key]]));
  return { data: Array.isArray(body.data) ? body.data.map(invoice) : body.data ? invoice(body.data) : null };
}

export async function cacheableApiResponse(response, url, now = Date.now()) {
  if (!response.ok || response.type === "opaque" || response.redirected) return null;
  try {
    const body = publicApiBody(await response.clone().json(), url);
    return new Response(JSON.stringify(body), { headers: {
      "Content-Type": "application/json",
      "x-liquifact-cached-at": new Date(now).toISOString(),
    } });
  } catch { return null; }
}

export function staleResponse(response) {
  const headers = new Headers(response.headers);
  headers.set("x-liquifact-cache", "stale");
  return new Response(response.clone().body, { status: response.status, statusText: response.statusText, headers });
}
