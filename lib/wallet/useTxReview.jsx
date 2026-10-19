"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Networks } from "@stellar/stellar-sdk";
import TxReviewDialog from "@/components/wallet/TxReviewDialog";
import { assertMatchesIntent } from "@/lib/stellar/assertMatchesIntent";
import { describeTx } from "@/lib/stellar/describeTx";
import { NETWORK } from "@/lib/config";

const DEFAULT_PASSPHRASE =
  NETWORK === "public" ? Networks.PUBLIC : Networks.TESTNET;

export function useTxReview() {
  const [reviewState, setReviewState] = useState(null);
  const resolverRef = useRef(null);

  const settle = useCallback((confirmed) => {
    const resolve = resolverRef.current;
    resolverRef.current = null;
    setReviewState(null);
    resolve?.(confirmed);
  }, []);

  useEffect(
    () => () => {
      const resolve = resolverRef.current;
      resolverRef.current = null;
      resolve?.(false);
    },
    [],
  );

  const review = useCallback((xdr, intent, options = {}) => {
    resolverRef.current?.(false);
    const networkPassphrase = options.networkPassphrase ?? DEFAULT_PASSPHRASE;

    let description = null;
    let error = null;
    try {
      description = describeTx(xdr, networkPassphrase);
      assertMatchesIntent(description, intent);
    } catch (err) {
      error = err;
      if (!description) {
        try {
          description = describeTx(xdr, networkPassphrase);
        } catch {
          description = null;
        }
      }
    }

    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setReviewState({
        asset: options.asset ?? "XLM",
        description,
        error,
        intent,
        xdr,
      });
    });
  }, []);

  const dialog = reviewState ? (
    <TxReviewDialog
      asset={reviewState.asset}
      description={reviewState.description}
      error={reviewState.error}
      onCancel={() => settle(false)}
      onConfirm={() => settle(true)}
    />
  ) : null;

  return { dialog, review };
}
