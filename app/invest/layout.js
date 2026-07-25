import MarketplaceShell from "./MarketplaceShell";

/**
 * Layout for all /invest routes.
 *
 * Wraps the list page and detail page with MarketplaceShell so that
 * invoice state (including optimistic updates) is shared across navigations
 * within the marketplace.
 */
export default function InvestLayout({ children }) {
  return <MarketplaceShell>{children}</MarketplaceShell>;
}
