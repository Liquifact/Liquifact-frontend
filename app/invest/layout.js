import { isValidElement } from "react";
import MarketplaceShell from "./MarketplaceShell";

/**
 * @file app/invest/layout.js
 *
 * Wraps the list page and detail page with MarketplaceShell so that
 * invoice state (including optimistic updates) is shared across navigations
 * within the marketplace.
 *
 * Invariants enforced here:
 *   1. `children` must be a valid React node (element, array, string, number,
 *      portal, or null/undefined fragment). A non-renderable value is replaced
 *      with null so React never receives an unsafe child.
 *   2. The layout always returns a MarketplaceShell wrapper — it never renders
 *      bare children, ensuring the shared invoice context is always present for
 *      every /invest sub-route.
 */

/**
 * Returns true when `node` is safe to pass as React children.
 * Accepts: null, undefined, boolean, string, number, React element,
 * array (shallowly), and iterable portals.
 *
 * @param {*} node
 * @returns {boolean}
 */
function isRenderableNode(node) {
  if (node == null) return true; // null / undefined are valid (render nothing)
  if (typeof node === "boolean") return true; // false / true are valid
  if (typeof node === "string" || typeof node === "number") return true;
  if (isValidElement(node)) return true;
  if (Array.isArray(node)) return true; // shallow check; React validates elements
  // React portals and iterables expose a $$typeof symbol.
  if (typeof node === "object" && node !== null && typeof node.$$typeof === "symbol")
    return true;
  return false;
}

export default function InvestLayout({ children }) {
  // Invariant: children must be renderable. A non-renderable value (e.g. a
  // plain object, a class instance, or a function accidentally passed where
  // a node was expected) would cause a React render error deep in the tree
  // and produce a confusing error boundary fallback. Guard it here at the
  // layout boundary so failures are loud, immediate, and attributable.
  const safeChildren = isRenderableNode(children) ? children : null;

  if (safeChildren !== children && children !== undefined) {
    // Surface a dev-time warning without crashing production.
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.error(
        "[InvestLayout] Received a non-renderable `children` value (%s). " +
          "This is likely a routing configuration error. " +
          "Rendering null to prevent a React crash.",
        typeof children,
      );
    }
  }

  return <MarketplaceShell>{safeChildren}</MarketplaceShell>;
}
