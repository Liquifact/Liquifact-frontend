"use client";

/**
 * @file MarketplaceShell.jsx
 *
 * Thin client wrapper that manages the shared invoice state for the invest
 * routes and wraps child routes with the MarketplaceProvider.
 *
 * Extracted from layout.js so the Server Component layout can compose a
 * client boundary without pulling all state-management logic into the layout.
 */

import { useState } from "react";
import { MarketplaceProvider } from "./MarketplaceContext";

/**
 * @param {object} props
 * @param {React.ReactNode} props.children
 */
export default function MarketplaceShell({ children }) {
  const [invoices, setInvoices] = useState(null);

  return (
    <MarketplaceProvider invoices={invoices} setInvoices={setInvoices}>
      {children}
    </MarketplaceProvider>
  );
}
