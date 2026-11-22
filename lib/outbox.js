export const OUTBOX_KEY = "liquifact-outbox";
export const DEFAULT_MAX_SIZE = 20;

function generateIdempotencyKey() {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function isNetworkError(err) {
  if (!err) return false;
  return typeof err.status !== "number";
}

function isClientError(err) {
  return typeof err?.status === "number" && err.status >= 400 && err.status < 500;
}

function isValidEntry(entry) {
  return (
    entry !== null &&
    typeof entry === "object" &&
    typeof entry.idempotencyKey === "string" &&
    entry.idempotencyKey.length > 0 &&
    entry.payload !== null &&
    typeof entry.payload === "object"
  );
}

export function createOutbox(storage, { key = OUTBOX_KEY, maxSize = DEFAULT_MAX_SIZE } = {}) {
  const cap = Number.isInteger(maxSize) && maxSize > 0 ? maxSize : DEFAULT_MAX_SIZE;

  function read() {
    if (!storage || typeof storage.getItem !== "function") return [];
    try {
      const raw = storage.getItem(key);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(isValidEntry);
    } catch {
      return [];
    }
  }

  function write(items) {
    if (!storage || typeof storage.setItem !== "function") return;
    try {
      storage.setItem(key, JSON.stringify(items));
    } catch {
      // Ignore quota or storage access errors so corrupt/locked storage never throws.
    }
  }

  function list() {
    return read();
  }

  function enqueue(payload) {
    const entry = {
      idempotencyKey: generateIdempotencyKey(),
      payload,
      createdAt: new Date().toISOString(),
    };
    const items = [...read(), entry];
    const capped = items.length > cap ? items.slice(items.length - cap) : items;
    write(capped);
    return entry;
  }

  function remove(idempotencyKey) {
    const items = read();
    const next = items.filter((item) => item.idempotencyKey !== idempotencyKey);
    if (next.length !== items.length) {
      write(next);
    }
    return next;
  }

  async function flush(send) {
    const delivered = [];
    const dropped = [];
    const snapshot = read();

    for (const item of snapshot) {
      try {
        const result = await send(item);
        remove(item.idempotencyKey);
        delivered.push({ item, result });
      } catch (err) {
        if (isClientError(err)) {
          remove(item.idempotencyKey);
          dropped.push({ item, error: err });
          continue;
        }
        // Network error (or 5xx): stop flushing and keep remaining items for retry.
        break;
      }
    }

    return { delivered, dropped, remaining: read() };
  }

  return { enqueue, list, remove, flush };
}
