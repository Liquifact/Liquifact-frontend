"use client";

import { useEffect } from "react";
import { INVOICE_DETAIL_SHORTCUT_KEY, createShortcutMatcher } from "../lib/shortcuts";
import { useRouter, useSearchParams } from "next/navigation";
import { getMarketplaceHref } from "@/lib/marketplaceRoute";

/**
 * InvoiceDetailShortcut
 *
 * Registers the `i` keyboard shortcut to navigate to the invoice detail
 * marketplace listing page (`/invest`). Users can then click through to a
 * specific invoice from there.
 *
 * Pattern mirrors `MarketplaceShortcut.jsx` — rendered once in the root
 * layout so the shortcut is available on every page.  The `ShortcutHelpDialog`
 * picks up the matching `KEYBOARD_SHORTCUTS` registry entry automatically.
 */
export default function InvoiceDetailShortcut() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const handler = createShortcutMatcher(INVOICE_DETAIL_SHORTCUT_KEY, () => {
      router.push(getMarketplaceHref(searchParams));
    });

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [router, searchParams]);

  return null;
}
