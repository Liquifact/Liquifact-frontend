import { Fragment, createElement } from "react";

const TOKEN_RE = /\{(\w+)\}/g;

/**
 * Interpolate React nodes into an already-translated string.
 *
 * `t()` leaves placeholders it has no value for untouched, so a translation
 * such as "Fund it with {link} on testnet." can be translated with the plain
 * variables first and then have `{link}` swapped for an element here. This
 * keeps word order in the dictionary (translators can move `{link}`) instead
 * of splitting sentences into before/after fragments.
 *
 * @param {string} text - translated string that may still contain `{name}` tokens
 * @param {Record<string, import("react").ReactNode>} nodes - elements keyed by token name
 * @returns {import("react").ReactNode[]}
 */
export function rich(text, nodes = {}) {
  const out = [];
  let last = 0;
  let i = 0;
  for (const match of String(text).matchAll(TOKEN_RE)) {
    const [token, name] = match;
    if (!Object.prototype.hasOwnProperty.call(nodes, name)) continue;
    if (match.index > last) out.push(text.slice(last, match.index));
    out.push(createElement(Fragment, { key: `${name}-${i++}` }, nodes[name]));
    last = match.index + token.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

/**
 * Translate a known English message produced outside the component (lib
 * helpers, hooks) by looking it up in `map` (English text -> dictionary key).
 * Unknown or dynamic messages (e.g. raw RPC errors) are returned unchanged.
 */
export function translateKnown(t, map, text) {
  if (!text) return text;
  const key = map[text];
  return key ? t(key) : text;
}
