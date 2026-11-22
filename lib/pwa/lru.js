// Shared by node:test and the worker (copied into public/ by prepare-pwa.mjs).
export const LRU_INDEX_URL = "/__pwa_lru_index__";

export function responseByteSize(response) {
  if (!response || response.type === "opaque") return null;
  const raw = response.headers?.get?.("content-length");
  if (raw == null || raw === "") return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export function recordAccess(index, url, { bytes, now = Date.now(), isProtected = false } = {}) {
  const prev = index[url];
  return {
    ...index,
    [url]: {
      lastUsed: now,
      bytes: bytes !== undefined ? bytes : (prev ? prev.bytes : null),
      protected: Boolean(isProtected || prev?.protected),
    },
  };
}

export function selectEvictions(index, { maxEntries, maxBytes, protectedUrls = new Set(), indexUrl = LRU_INDEX_URL } = {}) {
  const next = { ...index };
  const evictable = [];

  for (const [url, meta] of Object.entries(next)) {
    if (url === indexUrl || meta?.protected || protectedUrls.has(url)) continue;
    evictable.push({
      url,
      lastUsed: typeof meta?.lastUsed === "number" ? meta.lastUsed : 0,
      bytes: typeof meta?.bytes === "number" ? meta.bytes : null,
    });
  }

  // Oldest (least recently used) first
  evictable.sort((a, b) => a.lastUsed - b.lastUsed);

  let count = evictable.length;
  let totalBytes = evictable.reduce((sum, item) => sum + (item.bytes ?? 0), 0);
  const toDelete = [];

  for (const item of evictable) {
    const overEntries = Number.isFinite(maxEntries) && count > maxEntries;
    const overBytes = Number.isFinite(maxBytes) && totalBytes > maxBytes;
    if (!overEntries && !overBytes) break;

    toDelete.push(item.url);
    delete next[item.url];
    count -= 1;
    if (item.bytes !== null) totalBytes -= item.bytes;
  }

  return { nextIndex: next, toDelete };
}

export async function readLruIndex(cache, indexUrl = LRU_INDEX_URL) {
  const res = await cache.match(indexUrl);
  if (!res) return {};
  try {
    const data = await res.json();
    return data && typeof data === "object" && !Array.isArray(data) ? data : {};
  } catch {
    return {};
  }
}

export async function writeLruIndex(cache, index, indexUrl = LRU_INDEX_URL) {
  await cache.put(
    indexUrl,
    new Response(JSON.stringify(index), {
      headers: { "Content-Type": "application/json" },
    })
  );
}

export async function markProtectedAssets(cache, urls, { origin, now = Date.now(), indexUrl = LRU_INDEX_URL } = {}) {
  let index = await readLruIndex(cache, indexUrl);
  for (const raw of urls) {
    const url = origin ? new URL(raw, origin).href : raw;
    index = recordAccess(index, url, { now, isProtected: true });
  }
  await writeLruIndex(cache, index, indexUrl);
}

export async function touchStaticEntry(cache, url, { now = Date.now(), indexUrl = LRU_INDEX_URL } = {}) {
  const index = await readLruIndex(cache, indexUrl);
  const next = recordAccess(index, url, { now });
  await writeLruIndex(cache, next, indexUrl);
}

export async function putAndTrimStatic(cache, url, response, limits = {}, { now = Date.now(), indexUrl = LRU_INDEX_URL } = {}) {
  await cache.put(url, response.clone());
  const index = await readLruIndex(cache, indexUrl);
  const updated = recordAccess(index, url, {
    bytes: responseByteSize(response),
    now,
  });
  const { nextIndex, toDelete } = selectEvictions(updated, {
    maxEntries: limits.maxEntries,
    maxBytes: limits.maxBytes,
    protectedUrls: limits.protectedUrls,
    indexUrl,
  });
  await Promise.all(toDelete.map((evictUrl) => cache.delete(evictUrl)));
  await writeLruIndex(cache, nextIndex, indexUrl);
  return toDelete;
}