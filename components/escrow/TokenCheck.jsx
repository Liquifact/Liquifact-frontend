"use client";
import { useEffect, useState } from "react";
import { checkCurrency, identifyToken, resolveFundingToken } from "@/lib/escrow/token";
import { NETWORK } from "@/lib/config";
import { useT } from "@/lib/i18n/I18nProvider";
import { rich } from "@/lib/i18n/rich";

const INITIAL = { loading: true, ok: false, reason: "unknown-token", identified: null, tokenId: null, error: false };

/**
 * Resolve and verify the escrow funding token for an invoice. Fails closed:
 * `ok` is only true once the on-chain token matches the invoice currency.
 */
export function useFundingTokenCheck(invoice, { enabled = true, resolve = resolveFundingToken } = {}) {
  const [state, setState] = useState(INITIAL);
  const contractId = invoice?.escrowContractId || invoice?.contractId;
  const currency = invoice?.currency;
  useEffect(() => {
    if (!enabled) return undefined;
    let alive = true;
    setState(INITIAL);
    (async () => {
      try {
        const tokenId = await resolve(contractId);
        const identified = identifyToken(tokenId);
        const res = checkCurrency(currency, identified);
        if (alive) setState({ loading: false, ...res, identified, tokenId, error: false });
      } catch {
        if (alive) setState({ loading: false, ok: false, reason: "unknown-token", identified: null, tokenId: null, error: true });
      }
    })();
    return () => {
      alive = false;
    };
  }, [enabled, contractId, currency, resolve]);
  return enabled ? state : { loading: false, ok: true, reason: "off-chain", identified: null, tokenId: null, error: false };
}

function TokenLink({ tokenId, children }) {
  if (!tokenId) return children;
  return (
    <a href={`https://stellar.expert/explorer/${NETWORK}/contract/${tokenId}`} target="_blank" rel="noreferrer">
      {children}
    </a>
  );
}

export default function TokenCheck({ invoice, check }) {
  const t = useT();
  const state = check;
  if (!state || state.loading) return <div aria-live="polite">{t("token.verifying")}</div>;
  if (state.error) return <div className="notice notice-err" role="alert">{t("token.verifyFailed")}</div>;
  if (state.ok) {
    return (
      <div className="notice notice-ok" aria-live="polite">
        {t("token.verified", {
          code: state.identified?.code,
          kind: state.identified?.issuer === "native" ? t("token.native") : t("token.issued"),
        })}
      </div>
    );
  }
  if (state.reason === "unknown-token") {
    return (
      <div className="notice notice-err" role="alert">
        {rich(t("token.unknown"), {
          token: <TokenLink tokenId={state.tokenId}>{t("token.unknownToken")}</TokenLink>,
        })}
      </div>
    );
  }
  return (
    <div className="notice notice-err" role="alert">
      {rich(t("token.mismatch", { currency: invoice?.currency }), {
        token: <TokenLink tokenId={state.tokenId}>{state.identified?.code}</TokenLink>,
      })}
    </div>
  );
}
