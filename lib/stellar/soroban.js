// SME escrow reads and actions (#1372): withdraw / settle via Freighter.
// Built on the shared Soroban helpers in ./rpc.js (stellar-sdk 17).
import { Contract, TransactionBuilder, rpc as SorobanRpc } from "@stellar/stellar-sdk";
import { CONTRACT_ID, NETWORK } from "../config.js";
import { NETWORK_PASSPHRASES, getRpcServer, simulateCall } from "./rpc.js";
import { signTransaction } from "./freighter.js";

const POLL_INTERVAL_MS = 1_500;
const POLL_TIMEOUT_MS = 90_000;

function rpcNetwork(networkName = NETWORK) {
  return networkName === "mainnet" || networkName === "pubnet" ? "public" : networkName;
}

/** Read-only contract call (simulation only — never signed or submitted). */
export async function simulateContractCall({ contractId = CONTRACT_ID, method, networkName = NETWORK, args = [], call = simulateCall }) {
  return call({ contractId, method, args, network: rpcNetwork(networkName) });
}

export async function readSmeEscrow({ contractId = CONTRACT_ID, networkName = NETWORK, call } = {}) {
  const read = (method) => simulateContractCall({ contractId, networkName, method, call });
  const [escrow, readiness, protocolFeeBps] = await Promise.all([
    read("get_escrow"),
    read("get_settlement_readiness"),
    read("get_protocol_fee_bps"),
  ]);
  return { escrow, readiness, protocolFeeBps: Number(protocolFeeBps) };
}

/**
 * Build → simulate → sign with Freighter → submit → poll an SME action
 * (e.g. `withdraw` or `settle`) on the escrow contract.
 */
export async function submitSmeAction({ contractId = CONTRACT_ID, source, method, networkName = NETWORK, server, sign = signTransaction }) {
  if (!source) throw new Error("A connected Stellar account is required to submit this action.");
  const network = rpcNetwork(networkName);
  const passphrase = NETWORK_PASSPHRASES[network] || NETWORK_PASSPHRASES.testnet;
  const rpcServer = server || getRpcServer({ network });

  const account = await rpcServer.getAccount(source);
  const transaction = new TransactionBuilder(account, { fee: "1000000", networkPassphrase: passphrase })
    .addOperation(new Contract(contractId).call(method))
    .setTimeout(30)
    .build();
  const simulation = await rpcServer.simulateTransaction(transaction);
  if (SorobanRpc.Api.isSimulationError(simulation)) throw new Error(simulation.error);

  const prepared = SorobanRpc.assembleTransaction(transaction, simulation).build();
  const signedXdr = await sign(prepared.toXDR(), passphrase);
  const signed = TransactionBuilder.fromXDR(signedXdr, passphrase);
  const submitted = await rpcServer.sendTransaction(signed);
  if (submitted.status === "ERROR") {
    throw new Error(submitted.errorResult?.toXDR?.("base64") || "Soroban rejected the transaction.");
  }

  const deadline = Date.now() + POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    const result = await rpcServer.getTransaction(submitted.hash);
    if (result.status === SorobanRpc.Api.GetTransactionStatus.SUCCESS) return { hash: submitted.hash };
    if (result.status === SorobanRpc.Api.GetTransactionStatus.FAILED) throw new Error("The Soroban transaction failed.");
  }
  throw new Error(`Transaction ${submitted.hash} is still pending. Check the Stellar explorer.`);
}
