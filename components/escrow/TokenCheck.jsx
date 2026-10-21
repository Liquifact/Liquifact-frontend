"use client";
import { useEffect, useState } from "react";
import { checkCurrency, identifyToken, resolveFundingToken } from "@/lib/escrow/token";

export default function TokenCheck({ invoice }) {
  const [state, setState] = useState({ loading: true, ok: false, reason: "unknown-token", identified: null, error: false });
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const tokenId = await resolveFundingToken(invoice?.escrowContractId || invoice?.contractId);
        const identified = identifyToken(tokenId);
        const res = checkCurrency(invoice?.currency, identified);
        if (alive) setState({ loading: false, ...res, identified, error: false });
      } catch (e) {
        if (alive) setState({ loading: false, ok: false, reason: "unknown-token", identified: null, error: true });
      }
    })();
    return () => { alive = false; };
  }, [invoice]);

  if (state.loading) return <div aria-live="polite">Verifying token…</div>;
  if (state.error) return <div className="notice notice-err" role="alert" aria-live="assertive">Couldn't verify token — funding disabled</div>;
  if (state.ok) return <div className="notice notice-ok" aria-live="polite">Pays in {state.identified?.code} ({state.identified?.issuer === "native" ? "native" : "issued"}) · verified on-chain</div>;
  if (state.reason === "unknown-token") return <div className="notice notice-err" role="alert">This escrow accepts an unknown token — funding disabled</div>;
  return <div className="notice notice-err" role="alert">This escrow accepts {state.identified?.code}, but the listing says {invoice?.currency} — funding disabled</div>;
}

export { useFundingTokenCheck } from "@/lib/escrow/token";
