"use client";

import { useEffect, useId, useRef, useState } from "react";
import { EXPLORER_ACCOUNT_URL } from "@/lib/config";
import { shortAddress } from "@/lib/format";
import { WALLET_STATUS } from "@/lib/stellar/walletState";
import { useWallet } from "./WalletProvider";

const FREIGHTER_URL = "https://www.freighter.app/";

/**
 * Header button for the Freighter wallet.
 *
 * Renders one of:
 *
 * * **disconnected** — a "Connect wallet" button;
 * * **connecting** — a disabled button with a spinner;
 * * **connected** — the short address, opening a menu with *Copy address*,
 *   *View on stellar.expert* and *Disconnect*;
 * * **no_wallet** — an "Install Freighter" call to action;
 * * **error** — the button plus an inline `role="alert"` message and a retry.
 */
export function WalletButton() {
  const { status, address, error, connect, disconnect } = useWallet();
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const menuId = useId();

  // Escape closes the menu and returns the focus to the trigger.
  useEffect(() => {
    if (!open) return undefined;
    function onKeyDown(event) {
      if (event.key !== "Escape") return;
      setOpen(false);
      setNotice("");
      if (triggerRef.current) triggerRef.current.focus();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  // A pointer press outside of the button and the menu closes the menu.
  useEffect(() => {
    if (!open) return undefined;
    function onPointerDown(event) {
      const target = event.target;
      if (menuRef.current && menuRef.current.contains(target)) return;
      if (triggerRef.current && triggerRef.current.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(address || "");
      setNotice("Address copied to the clipboard.");
    } catch {
      setNotice("Copying failed — the address is shown above the menu.");
    }
    setOpen(false);
    if (triggerRef.current) triggerRef.current.focus();
  }

  const liveMessage = {
    [WALLET_STATUS.CONNECTING]: "Connecting to the wallet.",
    [WALLET_STATUS.CONNECTED]: `Wallet connected as ${address || "an unknown account"}.`,
    [WALLET_STATUS.ERROR]: error || "The wallet connection failed.",
    [WALLET_STATUS.NO_WALLET]: "No Stellar wallet extension was detected.",
    [WALLET_STATUS.WRONG_NETWORK]: "The wallet is on the wrong Stellar network.",
  }[status] || "";

  if (status === WALLET_STATUS.NO_WALLET) {
    return (
      <div className="wallet">
        <a
          className="wallet-btn wallet-btn-install"
          href={FREIGHTER_URL}
          target="_blank"
          rel="noreferrer"
        >
          Install Freighter&nbsp;↗
        </a>
        <p className="sr-only" role="status" aria-live="polite">
          {liveMessage}
        </p>
      </div>
    );
  }

  if (status === WALLET_STATUS.CONNECTING) {
    return (
      <div className="wallet">
        <button
          type="button"
          className="wallet-btn"
          disabled
          aria-busy="true"
        >
          <span className="wallet-spinner" aria-hidden="true" />
          Connecting…
        </button>
        <p className="sr-only" role="status" aria-live="polite">
          {liveMessage}
        </p>
      </div>
    );
  }

  if (status === WALLET_STATUS.CONNECTED) {
    return (
      <div className="wallet">
        <button
          type="button"
          className="wallet-btn wallet-btn-connected"
          ref={triggerRef}
          aria-expanded={open}
          aria-haspopup="menu"
          aria-controls={menuId}
          onClick={() => setOpen((value) => !value)}
        >
          <span className="wallet-dot" aria-hidden="true" />
          {shortAddress(address, 6)}
        </button>
        {open ? (
          <div className="wallet-menu" id={menuId} role="menu" ref={menuRef}>
            <button type="button" role="menuitem" onClick={copyAddress}>
              Copy address
            </button>
            <a
              role="menuitem"
              href={EXPLORER_ACCOUNT_URL(address || "")}
              target="_blank"
              rel="noreferrer"
            >
              View on stellar.expert
            </a>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                setNotice("");
                disconnect();
              }}
            >
              Disconnect
            </button>
          </div>
        ) : null}
        {notice ? (
          <p className="wallet-notice" role="status" aria-live="polite">
            {notice}
          </p>
        ) : null}
        <p className="sr-only" role="status" aria-live="polite">
          {liveMessage}
        </p>
      </div>
    );
  }

  return (
    <div className="wallet">
      <button
        type="button"
        className="wallet-btn"
        onClick={() => void connect()}
      >
        Connect wallet
      </button>
      {status === WALLET_STATUS.ERROR && error ? (
        <p className="wallet-alert" role="alert">
          {error}{" "}
          <button
            type="button"
            className="wallet-retry"
            onClick={() => void connect()}
          >
            Retry
          </button>
        </p>
      ) : null}
      <p className="sr-only" role="status" aria-live="polite">
        {liveMessage}
      </p>
    </div>
  );
}

export default WalletButton;
