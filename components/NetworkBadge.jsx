import { env } from "../lib/config/env";

/**
 * Small header badge that tells investors which Stellar ledger the app is
 * configured against, read from `NEXT_PUBLIC_STELLAR_NETWORK` via
 * `lib/config/env.js`.
 *
 * Accessibility / clarity contract:
 *  • The network is conveyed by a **text label** (e.g. "Testnet"), never by
 *    colour alone, and is announced to assistive tech via `aria-label`.
 *  • Non-mainnet networks get an extra dotted ring + a "!" marker so testnet
 *    is unmistakable even without colour perception.
 *  • An unset/unknown network renders a neutral "Unknown network" badge rather
 *    than hiding, so the ambiguity is visible instead of silent.
 *
 * @param {object} [props]
 * @param {string} [props.className] - Optional extra layout classes.
 * @returns {JSX.Element}
 */
export default function NetworkBadge({ className = "" }) {
  const network = env.stellarNetwork;

  // public === mainnet; everything else is treated as non-production.
  const isMainnet = network === "public";

  const { label, tone, marker } = isMainnet
    ? {
        label: "Mainnet",
        tone: "border-emerald-500/40 bg-emerald-900/30 text-emerald-300",
        marker: false,
      }
    : network === "testnet"
      ? {
          label: "Testnet",
          tone: "border-amber-500/60 bg-amber-900/30 text-amber-300 ring-1 ring-amber-400/40",
          marker: true,
        }
      : {
          label: "Unknown network",
          tone: "border-slate-600 bg-slate-800/60 text-slate-300 ring-1 ring-slate-500/40",
          marker: true,
        };

  return (
    <span
      data-network={network || "unset"}
      role="status"
      aria-label={`Stellar network: ${label}`}
      title={`Stellar network: ${label}`}
      className={[
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        tone,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {marker && (
        <span aria-hidden="true" className="font-bold leading-none">
          !
        </span>
      )}
      {label}
    </span>
  );
}
