"use client";

import { useCallback, useEffect, useState } from "react";
import { loadBalances } from "@/lib/stellar/horizon";
import { resolveAsset } from "@/lib/stellar/assets";
import { spendable } from "@/lib/stellar/spendable";
import { addTrustline } from "@/lib/stellar/trustline";
import { NETWORK } from "@/lib/config";

/**
 * Spendable-balance hint + trustline status for the fund form.
 * @param {object} props
 * @param {string} props.currency - invoice asset code (XLM/USDC/EURC)
 * @param {string} props.address - connected wallet address (null when disconnected)
 * @param {string} props.amount - current amount input value
 * @param {function} [props.onUseMax] - called with the spendable amount
 * @param {function} [props.onValidation] - called with { ok, message }
 * @param {function} [props.loadBalancesFn] - injected loader (tests)
 * @param {function} [props.addTrustlineFn] - injected trustline action (tests)
 */
export default function BalanceHint({ currency, address, amount, onUseMax, onValidation, loadBalancesFn = loadBalances, addTrustlineFn = addTrustline }) {
  const [state, setState] = useState({ status: "idle", data: null, error: null });
  const [trustlineBusy, setTrustlineBusy] = useState(false);

  const asset = resolveAsset(currency, NETWORK);

  const load = useCallback(async () => {
    if (!address || asset === "unsupported") return;
    setState({ status: "loading", data: null, error: null });
    try {
      const data = await loadBalancesFn(address);
      setState({ status: "ready", data, error: null });
    } catch (err) {
      setState({ status: "error", data: null, error: err?.message || "Balance check failed" });
    }
  }, [address, asset, loadBalancesFn]);

  useEffect(() => {
    load();
  }, [load]);

  const data = state.data;
  const hasTrustline = data && !data.unfunded && (asset?.type === "native" || data.balances.some((b) => b.code === currency));
  const spendableAmount = data && !data.unfunded
    ? spendable({ balances: data.balances, subentryCount: data.subentryCount, numSponsoring: data.numSponsoring, numSponsored: data.numSponsored, code: currency })
    : null;
  const overBalance = spendableAmount != null && amount !== "" && Number(amount) > Number(spendableAmount);

  useEffect(() => {
    if (!onValidation) return;
    if (asset === "unsupported") onValidation({ ok: false, message: `Unsupported asset: ${currency}` });
    else if (overBalance) onValidation({ ok: false, message: `Amount exceeds your spendable balance of ${spendableAmount} ${currency}.` });
    else onValidation({ ok: true, message: null });
  }, [asset, currency, overBalance, spendableAmount, onValidation]);

  async function onAddTrustline() {
    setTrustlineBusy(true);
    try {
      await addTrustlineFn({ address, asset });
      await load();
    } catch {
      /* user rejected or submission failed; balances stay as-is */
    } finally {
      setTrustlineBusy(false);
    }
  }

  if (!address || asset === "unsupported") return null;

  return (
    <div className="balance-hint" aria-live="polite">
      {state.status === "loading" && <span className="hint">Checking your balance…</span>}
      {state.status === "error" && (
        <span className="hint balance-warn">
          Couldn’t check your balance.{" "}
          <button type="button" className="linklike" onClick={load}>
            Retry
          </button>
        </span>
      )}
      {state.status === "ready" && data?.unfunded && (
        <span className="hint balance-warn">
          This account isn’t funded on {NETWORK}. Fund it with{" "}
          <a href="https://friendbot.stellar.org" target="_blank" rel="noreferrer">
            Friendbot
          </a>{" "}
          on testnet.
        </span>
      )}
      {state.status === "ready" && data && !data.unfunded && !hasTrustline && (
        <span className="hint balance-warn">
          No {currency} trustline on this account.{" "}
          <button type="button" className="linklike" disabled={trustlineBusy} onClick={onAddTrustline}>
            {trustlineBusy ? "Adding…" : `Add ${currency} trustline`}
          </button>
        </span>
      )}
      {state.status === "ready" && data && !data.unfunded && hasTrustline && spendableAmount != null && (
        <span className="hint">
          Balance: {data.balances.find((b) => b.code === currency)?.balance ?? "0"} {currency} (spendable {spendableAmount})
          {onUseMax && (
            <>
              {" "}
              <button type="button" className="linklike" onClick={() => onUseMax(spendableAmount)}>
                Use max
              </button>
            </>
          )}
        </span>
      )}
      {overBalance && (
        <span className="hint balance-err" role="alert">
          Amount exceeds your spendable balance of {spendableAmount} {currency}.
        </span>
      )}
    </div>
  );
}
