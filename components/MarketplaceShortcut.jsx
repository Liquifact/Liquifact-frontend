"use client";

import { useEffect } from "react";
import { MARKETPLACE_SHORTCUT_KEY, createShortcutMatcher } from "../lib/shortcuts";
import { useRouter } from "next/navigation";

export default function MarketplaceShortcut() {
  const router = useRouter();

  useEffect(() => {
    const handler = createShortcutMatcher(MARKETPLACE_SHORTCUT_KEY, () => {
      router.push("/invest");
    });

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [router]);

  return null;
}
