/**
 * @deprecated Import from `@/components/WalletProvider` instead.
 *
 * This file is a compatibility shim. All wallet state, hooks, and constants
 * now live in `components/WalletProvider.jsx` — the single source of truth.
 *
 * Re-exports every public symbol so existing imports keep working without
 * any changes at call sites.
 */
export {
  WalletProvider,
  useWallet,
  WALLET_STATES,
  WalletContext,
  truncateAddress,
  sanitizeSnapshot,
  isBrowser,
  readStoredSnapshot,
  writeStoredSnapshot,
  clearStoredSnapshot,
} from "./WalletProvider";
