import { Address, BASE_FEE, Contract, nativeToScVal, TransactionBuilder } from "@stellar/stellar-sdk";
import { CONTRACT_ID } from "../config.js";
import { MAX_I128 } from "./amount.js";
import { getRpcServer, networkPassphrase } from "./rpc.js";

export async function buildFundTx({ contractId = CONTRACT_ID, investor, amountStroops, server = getRpcServer(), passphrase = networkPassphrase() }) {
  if (typeof amountStroops !== "bigint" || amountStroops <= 0n || amountStroops > MAX_I128) {
    throw new Error("Enter a positive amount within the i128 range.");
  }
  const source = await server.getAccount(investor);
  return new TransactionBuilder(source, { fee: BASE_FEE, networkPassphrase: passphrase })
    .addOperation(new Contract(contractId).call("fund", new Address(investor).toScVal(), nativeToScVal(amountStroops, { type: "i128" })))
    .setTimeout(180)
    .build();
}

export async function submitFund({ investor, amountStroops, sign, onStatus = () => {}, server = getRpcServer(),
  passphrase = networkPassphrase(), sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)), now = Date.now }) {
  onStatus("Preparing");
  const tx = await buildFundTx({ investor, amountStroops, server, passphrase });
  // Simulation failures propagate verbatim and must never open the signer.
  const prepared = await server.prepareTransaction(tx);
  onStatus("Waiting for signature");
  const signed = await sign(prepared.toXDR(), { networkPassphrase: passphrase, address: investor });
  if (signed.signerAddress !== investor) throw new Error("Wallet account changed. Reconnect before funding.");
  if (!signed.signedTxXdr) throw new Error("Freighter returned no signed transaction.");
  const transaction = TransactionBuilder.fromXDR(signed.signedTxXdr, passphrase);
  if (!transaction.hash().equals(prepared.hash())) throw new Error("The signed transaction differs from the prepared funding transaction.");
  onStatus("Submitting");
  const hash = transaction.hash().toString("hex");
  let sent;
  try { sent = await server.sendTransaction(transaction); } catch {
    // A lost response does not prove that the network rejected the transaction.
    return { status: "TIMEOUT", hash };
  }
  if (sent.status === "ERROR") throw new Error(`Transaction submission failed${sent.errorResult ? `: ${sent.errorResult.toXDR("base64")}` : "."}`);
  if (!["PENDING", "DUPLICATE"].includes(sent.status)) throw new Error(`Transaction submission failed: ${sent.status}`);
  const deadline = now() + 30_000;
  while (now() < deadline) {
    await sleep(Math.min(1500, deadline - now()));
    let result;
    let timer;
    try {
      result = await Promise.race([
        server.getTransaction(hash),
        new Promise((resolve) => { timer = setTimeout(() => resolve({ status: "NOT_FOUND" }), Math.max(0, deadline - now())); }),
      ]);
    } catch { continue; } finally { clearTimeout(timer); }
    if (result.status === "SUCCESS" || result.status === "FAILED") return { status: result.status, hash };
  }
  return { status: "TIMEOUT", hash };
}
