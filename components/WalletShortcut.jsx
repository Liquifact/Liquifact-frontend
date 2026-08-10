/**
 * @file components/WalletShortcut.jsx
 *
 * Registers the `w` keyboard shortcut to focus the wallet connect / disconnect
 * button. Uses a MutationObserver to retry until the button appears in the DOM
 * (WalletStatus is lazy-loaded, so the button may not be present on first
 * render).
 *
 * Pattern matches InvoiceSearch (which focuses the search input on `/`) and
 * is registered in the shared KEYBOARD_SHORTCUTS registry so the `?` help
 * dialog picks it up automatically.
 */
"use client";

import { useEffect, useRef } from "react";
import { WALLET_SHORTCUT_KEY, createShortcutMatcher } from "../lib/shortcuts";

/**
 * WalletShortcut — rendered once in the root layout so the shortcut is
 * available on every page.
 *
 * Because WalletStatus is lazy-loaded (via WalletStatusLazy), the button
 * element may not exist when the shortcut fires. We use a MutationObserver
 * as a fallback: if the button isn't found immediately, we observe the
 * document body for up to 3 seconds.
 */
export default function WalletShortcut() {
  const observerRef = useRef(null);

  useEffect(() => {
    const handler = createShortcutMatcher(WALLET_SHORTCUT_KEY, (e) => {
      e.preventDefault();

      // Try to find the wallet button by aria-label
      const walletBtn = findWalletButton();
      if (walletBtn) {
        walletBtn.focus();
        return;
      }

      // Button not yet in DOM — use a MutationObserver to wait for it.
      // Only start one observer per effect lifecycle.
      if (!observerRef.current) {
        startWalletObserver(observerRef);
      }
    });

    document.addEventListener("keydown", handler);
    return () => {
      document.removeEventListener("keydown", handler);
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
    };
  }, []);

  return null;
}

/**
 * Attempt to find the wallet button using aria-label queries.
 * WalletStatus renders a button with aria-label="Connect Wallet" or
 * aria-label="Disconnect" depending on the current wallet state.
 */
function findWalletButton() {
  const selectors = [
    'button[aria-label*="Connect" i]',
    'button[aria-label*="Disconnect" i]',
    'button[aria-label*="Wallet" i]',
    'button[aria-label*="wallet" i]',
  ];

  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el && el instanceof HTMLElement) return el;
  }
  return null;
}

/**
 * Set up a MutationObserver that watches for the wallet button to appear
 * in the DOM and focuses it when found. Cleans up after 3 seconds or on
 * first success, whichever comes first.
 */
function startWalletObserver(observerRef) {
  const timeout = setTimeout(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
  }, 3000);

  const observer = new MutationObserver(() => {
    const btn = findWalletButton();
    if (btn) {
      btn.focus();
      clearTimeout(timeout);
      observer.disconnect();
      observerRef.current = null;
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
  observerRef.current = observer;
}