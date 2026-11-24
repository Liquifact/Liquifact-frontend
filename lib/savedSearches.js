/**
 * lib/savedSearches.js
 *
 * Saved marketplace searches (#1526): named filter presets kept in
 * localStorage. Each preset stores the canonical query string produced by
 * serializeQuery(), so applying one is just navigating to that URL and a
 * preset can be shared as a link.
 *
 * Storage shape (versioned so future changes can migrate or discard safely):
 *   { "version": 1, "items": [{ "id", "name", "query", "createdAt" }] }
 *
 * Everything read back from storage is untrusted: entries are re-validated
 * through parseQuery() and anything malformed is dropped. Corrupt or
 * unreadable storage behaves like an empty list.
 *
 * Framework-free; the storage is injectable so the module runs under node:test.
 */

import { DEFAULTS, parseQuery, serializeQuery } from "./marketplaceQuery.js";

export const STORAGE_KEY = "liquifact-saved-searches";
export const STORE_VERSION = 1;
export const MAX_SAVED_SEARCHES = 10;
export const MAX_NAME_LENGTH = 40;

/** Error codes returned by save / rename / remove. */
export const ERRORS = Object.freeze({
  EMPTY_NAME: "EMPTY_NAME",
  DUPLICATE: "DUPLICATE",
  LIMIT: "LIMIT",
  NOT_FOUND: "NOT_FOUND",
  STORAGE: "STORAGE",
});

function defaultStorage() {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    // Accessing localStorage throws when site data is blocked.
    return null;
  }
}

/**
 * Trim, collapse internal whitespace and cap the length of a preset name.
 * Returns "" for anything that is not a usable name.
 * @param {unknown} name
 * @returns {string}
 */
export function normalizeName(name) {
  if (typeof name !== "string") return "";
  return name.replace(/\s+/g, " ").trim().slice(0, MAX_NAME_LENGTH).trim();
}

const nameKey = (name) => name.toLocaleLowerCase();

/**
 * Canonical query string for a preset. Accepts a filter state object or a
 * query string, re-validates it through parseQuery and keeps only the filters
 * and sort: pagination is dropped (a preset opens on page 1) and so is the
 * cards/table view, which is a per-viewer display preference.
 * @param {string | URLSearchParams | object} input
 * @returns {string}
 */
export function canonicalQuery(input) {
  let params;
  if (typeof input === "string") {
    params = new URLSearchParams(input.startsWith("?") ? input.slice(1) : input);
  } else if (input instanceof URLSearchParams) {
    params = input;
  } else {
    // A filter state object: serialise first so it goes through the same validation.
    params = new URLSearchParams(serializeQuery({ ...DEFAULTS, ...(input || {}) }));
  }
  return serializeQuery({ ...parseQuery(params), page: DEFAULTS.page, view: DEFAULTS.view });
}

function newId() {
  try {
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  } catch {
    // fall through
  }
  return `ss_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function sanitizeItems(rawItems) {
  if (!Array.isArray(rawItems)) return [];
  const seenNames = new Set();
  const seenIds = new Set();
  const items = [];
  for (const raw of rawItems) {
    if (items.length >= MAX_SAVED_SEARCHES) break;
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
    const name = normalizeName(raw.name);
    const id = typeof raw.id === "string" && raw.id ? raw.id.slice(0, 64) : null;
    if (!name || !id || typeof raw.query !== "string") continue;
    if (seenNames.has(nameKey(name)) || seenIds.has(id)) continue;
    seenNames.add(nameKey(name));
    seenIds.add(id);
    const createdAt = Number.isFinite(raw.createdAt) ? raw.createdAt : 0;
    items.push({ id, name, query: canonicalQuery(raw.query), createdAt });
  }
  return items;
}

function read(storage) {
  if (!storage) return [];
  let raw;
  try {
    raw = storage.getItem(STORAGE_KEY);
  } catch {
    return [];
  }
  if (!raw) return [];
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  // Unknown versions are ignored rather than guessed at.
  if (!parsed || typeof parsed !== "object" || parsed.version !== STORE_VERSION) return [];
  return sanitizeItems(parsed.items);
}

function write(storage, items) {
  if (!storage) return false;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify({ version: STORE_VERSION, items }));
    return true;
  } catch {
    // Quota exceeded or storage disabled.
    return false;
  }
}

const fail = (error, items) => ({ ok: false, error, items });

/**
 * All saved searches, oldest first. Never throws.
 * @param {{ storage?: Storage | null }} [opts]
 * @returns {Array<{ id: string, name: string, query: string, createdAt: number }>}
 */
export function listSavedSearches({ storage = defaultStorage() } = {}) {
  return read(storage);
}

/**
 * Save the given filter state (or query string) under `name`.
 * Names are unique (case-insensitive); an existing name is rejected unless
 * `overwrite` is set, in which case that preset's query is replaced.
 * @param {string} name
 * @param {string | URLSearchParams | object} query
 * @param {{ storage?: Storage | null, overwrite?: boolean, now?: number }} [opts]
 * @returns {{ ok: boolean, error?: string, item?: object, items: object[] }}
 */
export function saveSearch(name, query, { storage = defaultStorage(), overwrite = false, now = Date.now() } = {}) {
  const items = read(storage);
  const clean = normalizeName(name);
  if (!clean) return fail(ERRORS.EMPTY_NAME, items);
  const qs = canonicalQuery(query);

  const existing = items.find((item) => nameKey(item.name) === nameKey(clean));
  let next;
  let item;
  if (existing) {
    if (!overwrite) return fail(ERRORS.DUPLICATE, items);
    item = { ...existing, name: clean, query: qs };
    next = items.map((it) => (it.id === existing.id ? item : it));
  } else {
    if (items.length >= MAX_SAVED_SEARCHES) return fail(ERRORS.LIMIT, items);
    item = { id: newId(), name: clean, query: qs, createdAt: now };
    next = [...items, item];
  }
  if (!write(storage, next)) return fail(ERRORS.STORAGE, items);
  return { ok: true, item, items: next };
}

/**
 * Delete a saved search by id.
 * @param {string} id
 * @param {{ storage?: Storage | null }} [opts]
 * @returns {{ ok: boolean, error?: string, items: object[] }}
 */
export function removeSearch(id, { storage = defaultStorage() } = {}) {
  const items = read(storage);
  if (!items.some((item) => item.id === id)) return fail(ERRORS.NOT_FOUND, items);
  const next = items.filter((item) => item.id !== id);
  if (!write(storage, next)) return fail(ERRORS.STORAGE, items);
  return { ok: true, items: next };
}

/**
 * Rename a saved search. The new name must be non-empty and not used by
 * another preset (renaming to a different capitalisation of itself is fine).
 * @param {string} id
 * @param {string} name
 * @param {{ storage?: Storage | null }} [opts]
 * @returns {{ ok: boolean, error?: string, item?: object, items: object[] }}
 */
export function renameSearch(id, name, { storage = defaultStorage() } = {}) {
  const items = read(storage);
  const target = items.find((item) => item.id === id);
  if (!target) return fail(ERRORS.NOT_FOUND, items);
  const clean = normalizeName(name);
  if (!clean) return fail(ERRORS.EMPTY_NAME, items);
  if (items.some((item) => item.id !== id && nameKey(item.name) === nameKey(clean))) {
    return fail(ERRORS.DUPLICATE, items);
  }
  const item = { ...target, name: clean };
  const next = items.map((it) => (it.id === id ? item : it));
  if (!write(storage, next)) return fail(ERRORS.STORAGE, items);
  return { ok: true, item, items: next };
}
