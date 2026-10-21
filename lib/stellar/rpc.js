import { Networks, rpc } from "@stellar/stellar-sdk";
import { NETWORK } from "../config.js";

export const RPC_URL = process.env.NEXT_PUBLIC_STELLAR_RPC_URL || "https://soroban-testnet.stellar.org";
export function networkPassphrase() {
  if (NETWORK === "testnet") return Networks.TESTNET;
  if (NETWORK === "public") return Networks.PUBLIC;
  throw new Error("Unsupported Stellar network configuration.");
}
let server;
export function getRpcServer() {
  // Do not silently submit mainnet transactions to the testnet default.
  if (NETWORK !== "testnet" && !process.env.NEXT_PUBLIC_STELLAR_RPC_URL) {
    throw new Error("Configure the RPC URL for this Stellar network.");
  }
  return server ??= new rpc.Server(RPC_URL, { timeout: 10_000 });
}
