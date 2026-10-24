// Build and submit a single-op changeTrust transaction for one asset.
import { Account, Asset, Horizon, Operation, TransactionBuilder } from "@stellar/stellar-sdk";
import { HORIZON_URLS } from "./horizon.js";
import { NETWORK_PASSPHRASES } from "./rpc.js";
import { NETWORK } from "../config.js";
import { signTransaction } from "./freighter.js";

/**
 * Add a trustline for `asset` from `address`, signed with Freighter.
 * The transaction contains exactly one changeTrust operation for the asset
 * resolved from the static registry (never user-supplied issuers).
 */
export async function addTrustline({ address, asset, network = NETWORK, horizonUrl, signFn = signTransaction }) {
  if (!asset || asset.type === "native" || !asset.issuer) {
    throw new Error("Trustlines only apply to issued assets");
  }
  const base = (horizonUrl || HORIZON_URLS[network] || HORIZON_URLS.testnet).replace(/\/$/, "");
  const server = new Horizon.Server(base);
  const source = await server.loadAccount(address);
  const stellarAsset = new Asset(asset.code, asset.issuer);
  const tx = new TransactionBuilder(source, {
    fee: "100",
    networkPassphrase: NETWORK_PASSPHRASES[network] || NETWORK_PASSPHRASES.testnet,
  })
    .addOperation(Operation.changeTrust({ asset: stellarAsset }))
    .setTimeout(60)
    .build();
  const signedXdr = await signFn(tx.toXDR(), NETWORK_PASSPHRASES[network] || NETWORK_PASSPHRASES.testnet);
  const signedTx = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASES[network] || NETWORK_PASSPHRASES.testnet);
  return server.submitTransaction(signedTx);
}
