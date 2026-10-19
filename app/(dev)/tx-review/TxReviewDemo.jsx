"use client";

import { useEffect, useState } from "react";
import {
  Account,
  Address,
  Keypair,
  Networks,
  Operation,
  TransactionBuilder,
  nativeToScVal,
} from "@stellar/stellar-sdk";
import { CONTRACT_ID, NETWORK } from "@/lib/config";
import { shortAddress } from "@/lib/format";
import { useTxReview } from "@/lib/wallet/useTxReview";

const BUYER = "GA7TXEBMEPQCLHIYCWDN7RKAO5IMRD2UV7O7TZXMEW6VZUMEXNR4XBB5";
const AMOUNT_STROOPS = 20_000_000n;

function buildPreparedTransaction() {
  const passphrase = NETWORK === "public" ? Networks.PUBLIC : Networks.TESTNET;
  const source = Keypair.random();
  const account = new Account(source.publicKey(), "1");
  const operation = Operation.invokeContractFunction({
    args: [new Address(BUYER).toScVal(), nativeToScVal(AMOUNT_STROOPS, { type: "i128" })],
    contract: CONTRACT_ID,
    function: "fund",
  });
  const transaction = new TransactionBuilder(account, {
    fee: "100",
    networkPassphrase: passphrase,
  })
    .addOperation(operation)
    .setTimeout(0)
    .build();

  return {
    intent: {
      args: [BUYER, AMOUNT_STROOPS],
      contractId: CONTRACT_ID,
      fn: "fund",
    },
    network: NETWORK,
    xdr: transaction.toXDR(),
  };
}

export default function TxReviewDemo() {
  const { dialog, review } = useTxReview();
  const [prepared, setPrepared] = useState(null);
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setPrepared(buildPreparedTransaction());
  }, []);

  async function onReview() {
    if (!prepared) return;
    setBusy(true);
    setStatus(null);
    const accepted = await review(prepared.xdr, prepared.intent, { asset: "XLM" });
    setBusy(false);
    setStatus(
      accepted
        ? "Accepted — the exact reviewed XDR would now be passed to signTransaction."
        : "Cancelled — Freighter was not opened.",
    );
  }

  return (
    <section className="section">
      <div className="container">
        <div className="eyebrow">Developer surface</div>
        <h1 style={{ fontSize: "clamp(1.8rem,4vw,2.6rem)" }}>Transaction review</h1>
        <p className="lead">
          Decode a prepared transaction into the app&apos;s own words, verify it
          against the intended contract call, and only then open the wallet.
        </p>

        <div className="card" style={{ marginTop: 24, maxWidth: 720 }}>
          <h3>Fund 2 XLM</h3>
          <div className="kv" style={{ marginTop: 12 }}>
            <div><span className="k">Contract</span><span className="mono">{shortAddress(CONTRACT_ID, 8)}</span></div>
            <div><span className="k">Function</span><span className="mono">fund</span></div>
            <div><span className="k">Amount</span>2 XLM</div>
            <div><span className="k">Network</span>{prepared?.network || NETWORK}</div>
          </div>
          <p className="hint" style={{ marginTop: 16 }}>
            The XDR is built in the browser. Nothing is signed until the dialog
            is accepted.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!prepared || busy}
            onClick={onReview}
          >
            {busy ? "Reviewing…" : "Prepare & review"}
          </button>
          {status && <div className="notice notice-ok" style={{ marginTop: 14 }}>{status}</div>}
        </div>
      </div>
      {dialog}
    </section>
  );
}
