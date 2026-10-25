import { API_URL, VERSION } from "./pwa-config.js";
import { routeFor, isPublicNavigation, cacheableApiResponse, staleResponse } from "./pwa-policy.js";

const PREFIX = "liquifact-pwa-";
const SHELL = `${PREFIX}${VERSION}-shell`;
const API = `${PREFIX}${VERSION}-api`;
const STATIC = `${PREFIX}${VERSION}-static`;
const context = { origin: self.location.origin, apiUrl: API_URL };

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL);
    const assets = new Set(["/icons/icon-192.png", "/icons/icon-512.png", "/icons/maskable-512.png", "/manifest.webmanifest"]);
    for (const path of ["/", "/marketplace", "/offline"]) {
      const response = await fetch(new Request(path, { cache: "reload" }));
      if (!response.ok) throw new Error(`Could not precache ${path}`);
      const html = await response.clone().text();
      for (const match of html.matchAll(/(?:src|href)="(\/_next\/static\/[^"\s]+)"/g)) assets.add(match[1].replaceAll("&amp;", "&"));
      await cache.put(path, response);
    }
    await (await caches.open(STATIC)).addAll([...assets]);
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    await Promise.all((await caches.keys()).filter((key) => key.startsWith(PREFIX) && ![SHELL, API, STATIC].includes(key)).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("message", (event) => {
  // This message is sent only by the explicit Reload button.
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

async function apiResponse(event) {
  const cache = await caches.open(API);
  const cached = await cache.match(event.request.url);
  const refresh = fetch(event.request).then(async (response) => {
    const safe = await cacheableApiResponse(response, event.request.url);
    if (safe) await cache.put(event.request.url, safe);
    return response;
  });
  event.waitUntil(refresh.catch(() => {}));
  if (cached) return staleResponse(cached);
  return refresh;
}

async function navigation(event) {
  const cache = await caches.open(SHELL);
  let timer;
  const network = fetch(event.request).then(async (response) => {
    if (response.ok && !response.redirected && isPublicNavigation(event.request.url, context.origin)) {
      await cache.put(event.request.url, response.clone());
    }
    if (response.status >= 500) throw new Error("Navigation unavailable");
    return response;
  });
  event.waitUntil(network.catch(() => {}));
  try {
    return await Promise.race([network, new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error("Navigation timeout")), 3000);
    })]);
  } catch {
    return await cache.match(event.request) || await cache.match("/offline");
  } finally { clearTimeout(timer); }
}

self.addEventListener("fetch", (event) => {
  const route = routeFor(event.request, context);
  if (route === "api") event.respondWith(apiResponse(event));
  if (route === "navigation") event.respondWith(navigation(event));
  if (route === "static") event.respondWith((async () => {
    const cache = await caches.open(STATIC);
    const cached = await cache.match(event.request);
    if (cached) return cached;
    const response = await fetch(event.request);
    if (response.ok) await cache.put(event.request.url, response.clone());
    return response;
  })());
});
